import type { OutletMapRegion } from "./outlet-map";

export const BIG_BOUNDARY_SOURCE = "https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH";

const layers: Record<OutletMapRegion, { service: string; id: number; width: number }> = {
  province: { service: "BATAS_WILAYAH", id: 8, width: 1.6 },
  city: { service: "BATAS_KABKOTA_AR", id: 0, width: 1.25 },
  district: { service: "BATAS_KECAMATAN_AR", id: 0, width: 1 },
  village: { service: "BATAS_DESAKEL_AR", id: 0, width: 0.8 },
};

/** A transparent BIG overlay. Only public viewport coordinates go to BIG. */
export function outletBoundaryImageUrl(
  region: OutletMapRegion,
  bbox: [number, number, number, number],
  size: [number, number],
) {
  const layer = layers[region];
  const outline = { type: "esriSLS", style: "esriSLSSolid", color: [49, 46, 129, 220], width: layer.width };
  const url = new URL(`${BIG_BOUNDARY_SOURCE}/${layer.service}/MapServer/export`);
  url.search = new URLSearchParams({
    f: "image",
    bbox: bbox.join(","),
    bboxSR: "3857",
    imageSR: "3857",
    size: size.join(","),
    format: "png32",
    transparent: "true",
    dynamicLayers: JSON.stringify([{
      id: layer.id,
      source: { type: "mapLayer", mapLayerId: layer.id },
      drawingInfo: {
        showLabels: false,
        renderer: {
          type: "simple",
          symbol: region === "province" ? outline : {
            type: "esriSFS", style: "esriSFSSolid", color: [49, 46, 129, 10], outline,
          },
        },
      },
    }]),
  }).toString();
  return url.toString();
}
