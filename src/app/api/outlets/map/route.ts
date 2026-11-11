import { and, between, count, eq, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { notDeleted, outlets, outletTypes } from "@/db/schema";
import { can, getCurrentUser } from "@/lib/auth";
import { OUTLET_MAP_MAX_ZOOM, OUTLET_PIN_ZOOM, outletMapRegion, type OutletMapRegion, type OutletMapResult } from "@/lib/outlet-map";

const PIN_LIMIT = 750;
const GROUP_LIMIT = 8_000;
const optionalId = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional();
const optionalRegion = z.string().trim().min(1).max(120).optional();
const querySchema = z.object({
  south: z.coerce.number().min(-90).max(90),
  north: z.coerce.number().min(-90).max(90),
  west: z.coerce.number().min(-180).max(180),
  east: z.coerce.number().min(-180).max(180),
  zoom: z.coerce.number().int().min(0).max(OUTLET_MAP_MAX_ZOOM),
  type: optionalId,
  province: optionalRegion,
  city: optionalRegion,
  district: optionalRegion,
  village: optionalRegion,
}).refine(({ south, north, west, east }) => south < north && west < east);

function reply(result: OutletMapResult) {
  return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 401 });
  if (!can(user, "outlets")) return new Response(null, { status: 403 });

  const query = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return new Response(null, { status: 400 });
  const { south, north, west, east, zoom, type } = query.data;
  const mode = outletMapRegion(zoom);
  const organizationId = user.organization.id;
  const regionName = (key: OutletMapRegion) => sql<string | null>`upper(nullif(btrim(${outlets[key]}), ''))`;
  const regionFilters = (["province", "city", "district", "village"] as const).map((key) => {
    const name = query.data[key];
    return name === undefined ? undefined : sql`${regionName(key)} = upper(${name})`;
  });

  const typeScope = type === undefined ? undefined : sql`exists (
    select 1 from ${outletTypes} where ${outletTypes.id} = ${type}
      and ${outletTypes.organizationId} = ${organizationId} and ${notDeleted(outletTypes)}
  )`;
  const filters = and(
    eq(outlets.organizationId, organizationId),
    notDeleted(outlets),
    ...regionFilters,
    mode === "province" ? undefined : and(
      isNotNull(outlets.latitude),
      isNotNull(outlets.longitude),
      between(outlets.latitude, south, north),
      between(outlets.longitude, west, east),
    ),
    type === undefined ? undefined : eq(outlets.outletTypeId, type),
    typeScope,
  );

  if (zoom >= OUTLET_PIN_ZOOM) {
    const pins = await db.select({
      id: outlets.id,
      name: outlets.name,
      typeName: outletTypes.name,
      icon: outletTypes.icon,
      color: outletTypes.color,
      latitude: sql<number>`${outlets.latitude}`,
      longitude: sql<number>`${outlets.longitude}`,
    }).from(outlets)
      .leftJoin(outletTypes, and(
        eq(outlets.outletTypeId, outletTypes.id),
        eq(outletTypes.organizationId, organizationId),
        notDeleted(outletTypes),
      ))
      .where(filters)
      .limit(PIN_LIMIT + 1);
    if (pins.length <= PIN_LIMIT) return reply({ mode: "pins", pins });
  }

  const province = regionName("province");
  const city = mode === "province" ? null : regionName("city");
  const district = mode === "province" || mode === "city" ? null : regionName("district");
  const village = mode === "village" ? regionName("village") : null;
  const validPoint = and(between(outlets.latitude, -90, 90), between(outlets.longitude, -180, 180));
  const groups = await db.select({
    province,
    city: city ?? sql<null>`null`,
    district: district ?? sql<null>`null`,
    village: village ?? sql<null>`null`,
    latitude: sql<number | null>`avg(${outlets.latitude}) filter (where ${validPoint})`,
    longitude: sql<number | null>`avg(${outlets.longitude}) filter (where ${validPoint})`,
    count: count(),
  }).from(outlets).where(filters)
    .groupBy(province, ...[city, district, village].filter((column) => column !== null))
    .limit(GROUP_LIMIT + 1);

  if (groups.length > GROUP_LIMIT) return reply({ mode: "overflow" });
  return reply({ mode, groups, dense: zoom >= OUTLET_PIN_ZOOM });
}
