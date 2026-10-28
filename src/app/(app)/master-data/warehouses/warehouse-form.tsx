"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { LocationPicker } from "@/components/location-picker";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  createWarehouse,
  deleteWarehouse,
  updateWarehouse,
} from "@/lib/actions/warehouses";

import type { AreaOption, BackOfficeUserOption, WarehouseDetail } from "./types";

const LIST_PATH = "/master-data/warehouses";
const WILAYAH_API = "https://api.kodewilayah.web.id";

type WilayahItem = { code: number | string; name: string };

async function fetchWilayah(path: string): Promise<WilayahItem[]> {
  const response = await fetch(`${WILAYAH_API}${path}`);
  const json = (await response.json()) as { data?: WilayahItem[] };
  return Array.isArray(json?.data) ? json.data : [];
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-destructive text-xs">{message}</p>;
}

export function WarehouseForm({
  warehouse,
  areas,
  backOfficeUsers,
  defaultProvince,
  defaultCity,
}: {
  warehouse: WarehouseDetail | null;
  areas: AreaOption[];
  backOfficeUsers: BackOfficeUserOption[];
  defaultProvince: string | null;
  defaultCity: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);

  const isEdit = warehouse !== null;

  const [areaOfficeId, setAreaOfficeId] = useState(
    warehouse?.areaOfficeId ? String(warehouse.areaOfficeId) : "",
  );
  const [picUserId, setPicUserId] = useState(
    warehouse?.picUserId ? String(warehouse.picUserId) : "",
  );
  const [active, setActive] = useState(warehouse?.isActive ?? true);
  const [address, setAddress] = useState(warehouse?.address ?? "");
  const [province, setProvince] = useState(warehouse?.province ?? "");
  const [regency, setRegency] = useState(warehouse?.regency ?? "");
  const [district, setDistrict] = useState(warehouse?.district ?? "");
  const [village, setVillage] = useState(warehouse?.village ?? "");
  const [postalCode, setPostalCode] = useState(warehouse?.postalCode ?? "");
  const [latitude, setLatitude] = useState(
    warehouse?.latitude != null ? String(warehouse.latitude) : "",
  );
  const [longitude, setLongitude] = useState(
    warehouse?.longitude != null ? String(warehouse.longitude) : "",
  );

  const [mapCentered, setMapCentered] = useState(false);

  const [provinces, setProvinces] = useState<WilayahItem[]>([]);
  const [regencies, setRegencies] = useState<WilayahItem[]>([]);
  const [districts, setDistricts] = useState<WilayahItem[]>([]);
  const [villages, setVillages] = useState<WilayahItem[]>([]);
  const [loadingProvince, setLoadingProvince] = useState(false);
  const [loadingRegency, setLoadingRegency] = useState(false);
  const [loadingDistrict, setLoadingDistrict] = useState(false);
  const [loadingVillage, setLoadingVillage] = useState(false);

  const selectedAreaName =
    areas.find((area) => String(area.id) === areaOfficeId)?.name ?? undefined;
  const selectedPicName =
    backOfficeUsers.find((user) => String(user.id) === picUserId)?.name ?? undefined;

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        if (!ignore) setLoadingProvince(true);
        const data = await fetchWilayah("/provinces");
        if (!ignore) setProvinces(data);
      } catch {
        if (!ignore) setProvinces([]);
      } finally {
        if (!ignore) setLoadingProvince(false);
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, []);

  // Geocode default province/city for new warehouses to center the map
  useEffect(() => {
    if (isEdit || mapCentered) return;
    if (!defaultProvince && !defaultCity) return;
    if (latitude.trim() !== "" && longitude.trim() !== "") return;

    let ignore = false;

    async function geocodeDefaultLocation() {
      try {
        const query = `${defaultCity ? defaultCity + ", " : ""}${defaultProvince}, Indonesia`;
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`,
        );
        const results = (await response.json()) as Array<{ lat: string; lon: string }>;
        if (results.length > 0 && !ignore) {
          setLatitude(results[0].lat);
          setLongitude(results[0].lon);
          setMapCentered(true);
        }
      } catch {
        // Ignore geocoding errors
      }
    }

    geocodeDefaultLocation();

    return () => {
      ignore = true;
    };
  }, [defaultProvince, defaultCity, isEdit, latitude, longitude, mapCentered]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      const code = provinces.find((item) => item.name === province)?.code;
      if (code === undefined) {
        if (!ignore) {
          setRegencies([]);
          setLoadingRegency(false);
        }
        return;
      }

      try {
        if (!ignore) setLoadingRegency(true);
        const data = await fetchWilayah(`/regencies/${code}`);
        if (!ignore) setRegencies(data);
      } catch {
        if (!ignore) setRegencies([]);
      } finally {
        if (!ignore) setLoadingRegency(false);
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [province, provinces]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      const code = regencies.find((item) => item.name === regency)?.code;
      if (code === undefined) {
        if (!ignore) {
          setDistricts([]);
          setLoadingDistrict(false);
        }
        return;
      }

      try {
        if (!ignore) setLoadingDistrict(true);
        const data = await fetchWilayah(`/districts/${code}`);
        if (!ignore) setDistricts(data);
      } catch {
        if (!ignore) setDistricts([]);
      } finally {
        if (!ignore) setLoadingDistrict(false);
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [regency, regencies]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      const code = districts.find((item) => item.name === district)?.code;
      if (code === undefined) {
        if (!ignore) {
          setVillages([]);
          setLoadingVillage(false);
        }
        return;
      }

      try {
        if (!ignore) setLoadingVillage(true);
        const data = await fetchWilayah(`/villages/${code}`);
        if (!ignore) setVillages(data);
      } catch {
        if (!ignore) setVillages([]);
      } finally {
        if (!ignore) setLoadingVillage(false);
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [district, districts]);

  function handleSubmit(formData: FormData) {
    if (warehouse) formData.set("id", String(warehouse.id));
    formData.set("areaOfficeId", areaOfficeId);
    formData.set("picUserId", picUserId);
    formData.set("isActive", active ? "true" : "false");
    formData.set("address", address);
    formData.set("province", province);
    formData.set("regency", regency);
    formData.set("district", district);
    formData.set("village", village);
    formData.set("postalCode", postalCode);
    formData.set("latitude", latitude);
    formData.set("longitude", longitude);

    startTransition(async () => {
      const result = warehouse
        ? await updateWarehouse(undefined, formData)
        : await createWarehouse(undefined, formData);

      if (result?.ok) {
        toast.success(warehouse ? "Gudang tersimpan." : "Gudang dibuat.");
        setErrors({});
        if (warehouse) {
          router.refresh();
        } else {
          router.push(LIST_PATH);
        }
        return;
      }

      setErrors(result?.fieldErrors ?? {});
      if (result?.error) toast.error(result.error);
    });
  }

  function handleDelete() {
    if (!warehouse) return;

    const formData = new FormData();
    formData.set("id", String(warehouse.id));

    startTransition(async () => {
      const result = await deleteWarehouse(formData);

      if (result?.ok) {
        toast.success("Gudang dihapus.");
        router.push(LIST_PATH);
        router.refresh();
        return;
      }

      toast.error(result?.error ?? "Tidak dapat menghapus gudang ini.");
    });
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <Card size="sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle>Detail gudang</CardTitle>
            <CardDescription>
              Setiap gudang termasuk dalam satu area. Satu area dapat menampung banyak
              gudang.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {isEdit ? (
              confirming ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setConfirming(false)}
                    disabled={pending}
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={pending}
                  >
                    {pending ? <Loader2Icon className="animate-spin" /> : null}
                    Konfirmasi hapus
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setConfirming(true)}
                  disabled={pending}
                >
                  <Trash2Icon />
                  Hapus
                </Button>
              )
            ) : null}
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2Icon className="animate-spin" /> : null}
              {isEdit ? "Simpan gudang" : "Buat gudang"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="warehouse-name">Nama</Label>
            <Input
              id="warehouse-name"
              name="name"
              defaultValue={warehouse?.name ?? ""}
              placeholder="Gudang Utama"
              required
            />
            <FieldError message={errors.name} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="warehouse-type">Tipe depo</Label>
            <Input
              id="warehouse-type"
              name="depotType"
              defaultValue={warehouse?.depotType ?? ""}
              placeholder="Opsional, mis. Utama / Transit"
            />
            <FieldError message={errors.depotType} />
          </div>

          <div className="space-y-1.5">
            <Label>Area</Label>
            <Select
              value={areaOfficeId}
              onValueChange={(value) => setAreaOfficeId(value ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih area">{selectedAreaName}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {areas.map((area) => (
                  <SelectItem key={area.id} value={String(area.id)}>
                    {area.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.areaOfficeId} />
          </div>

          <div className="space-y-1.5">
            <Label>PIC penanggung jawab (Back Office)</Label>
            <Select
              value={picUserId}
              onValueChange={(value) => setPicUserId(value ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih PIC">{selectedPicName}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {backOfficeUsers.map((user) => (
                  <SelectItem key={user.id} value={String(user.id)}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.picUserId} />
          </div>

          <div className="flex items-center justify-end sm:col-span-2">
            <Switch
              id="warehouse-active"
              checked={active}
              onCheckedChange={setActive}
            />
            <Label htmlFor="warehouse-active" className="ml-2 text-sm">
              Aktif
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Wilayah & lokasi</CardTitle>
          <CardDescription>
            Pilih provinsi sampai kelurahan/desa. Cari atau klik peta untuk memilih koordinat gudang.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[500px_1fr]">
          <div className="lg:sticky lg:top-4 lg:self-start">
            <LocationPicker
              latitude={latitude}
              longitude={longitude}
              onChange={(nextLatitude, nextLongitude) => {
                setLatitude(nextLatitude);
                setLongitude(nextLongitude);
              }}
              onAddressChange={(address) => {
                if (address.postalCode) setPostalCode(address.postalCode);
                if (address.latitude) setLatitude(address.latitude);
                if (address.longitude) setLongitude(address.longitude);
              }}
              compact
            />
          </div>
          <div className="space-y-4 lg:max-h-[calc(100vh-200px)] lg:overflow-y-auto lg:pr-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Provinsi</Label>
                <Select
                  value={province}
                  onValueChange={(value) => {
                    setProvince(value ?? "");
                    setRegency("");
                    setDistrict("");
                    setVillage("");
                    setRegencies([]);
                    setDistricts([]);
                    setVillages([]);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={loadingProvince ? "Memuat..." : "Pilih provinsi"}>
                      {province}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {provinces.map((item) => (
                      <SelectItem key={String(item.code)} value={item.name}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.province} />
              </div>

              <div className="space-y-1.5">
                <Label>Kabupaten/Kota</Label>
                <Select
                  value={regency}
                  onValueChange={(value) => {
                    setRegency(value ?? "");
                    setDistrict("");
                    setVillage("");
                    setDistricts([]);
                    setVillages([]);
                  }}
                  disabled={!province || loadingRegency}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={loadingRegency ? "Memuat..." : "Pilih kabupaten/kota"}
                    >
                      {regency}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {regencies.map((item) => (
                      <SelectItem key={String(item.code)} value={item.name}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.regency} />
              </div>

              <div className="space-y-1.5">
                <Label>Kecamatan</Label>
                <Select
                  value={district}
                  onValueChange={(value) => {
                    setDistrict(value ?? "");
                    setVillage("");
                    setVillages([]);
                  }}
                  disabled={!regency || loadingDistrict}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={loadingDistrict ? "Memuat..." : "Pilih kecamatan"}>
                      {district}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {districts.map((item) => (
                      <SelectItem key={String(item.code)} value={item.name}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.district} />
              </div>

              <div className="space-y-1.5">
                <Label>Kelurahan/Desa</Label>
                <Select
                  value={village}
                  onValueChange={(value) => setVillage(value ?? "")}
                  disabled={!district || loadingVillage}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={loadingVillage ? "Memuat..." : "Pilih kelurahan/desa"}
                    >
                      {village}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {villages.map((item) => (
                      <SelectItem key={String(item.code)} value={item.name}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.village} />
              </div>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label htmlFor="warehouse-address">Alamat</Label>
              <Textarea
                id="warehouse-address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                rows={3}
                placeholder="Nama jalan, nomor, RT/RW, patokan"
              />
              <FieldError message={errors.address} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="warehouse-latitude">Latitude</Label>
                <Input
                  id="warehouse-latitude"
                  value={latitude}
                  onChange={(event) => setLatitude(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="warehouse-longitude">Longitude</Label>
                <Input
                  id="warehouse-longitude"
                  value={longitude}
                  onChange={(event) => setLongitude(event.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
