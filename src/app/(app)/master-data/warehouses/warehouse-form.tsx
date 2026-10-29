"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useWilayahCascade } from "@/components/use-wilayah-cascade";
import {
  createWarehouse,
  deleteWarehouse,
  updateWarehouse,
} from "@/lib/actions/warehouses";

import type { AreaOption, BackOfficeUserOption, WarehouseDetail } from "./types";

const LIST_PATH = "/master-data/warehouses";

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
  const [postalCode, setPostalCode] = useState(warehouse?.postalCode ?? "");
  const [latitude, setLatitude] = useState(
    warehouse?.latitude != null ? String(warehouse.latitude) : "",
  );
  const [longitude, setLongitude] = useState(
    warehouse?.longitude != null ? String(warehouse.longitude) : "",
  );

  const [mapCentered, setMapCentered] = useState(false);

  const wilayah = useWilayahCascade({
    province: warehouse?.province ?? "",
    regency: warehouse?.regency ?? "",
    district: warehouse?.district ?? "",
    village: warehouse?.village ?? "",
  });
  const {
    province,
    regency,
    district,
    village,
    provinces,
    regencies,
    districts,
    villages,
    loadingProvince,
    loadingRegency,
    loadingDistrict,
    loadingVillage,
    setProvince,
    setRegency,
    setDistrict,
    setVillage,
    syncFromAddress,
  } = wilayah;

  const areaOptions = useMemo(
    () => areas.map((area) => ({ value: String(area.id), label: area.name })),
    [areas],
  );
  const picOptions = useMemo(
    () => backOfficeUsers.map((user) => ({ value: String(user.id), label: user.name })),
    [backOfficeUsers],
  );
  const provinceOptions = useMemo(
    () => provinces.map((item) => ({ value: item.nama, label: item.nama })),
    [provinces],
  );
  const regencyOptions = useMemo(
    () => regencies.map((item) => ({ value: item.nama, label: item.nama })),
    [regencies],
  );
  const districtOptions = useMemo(
    () => districts.map((item) => ({ value: item.nama, label: item.nama })),
    [districts],
  );
  const villageOptions = useMemo(
    () => villages.map((item) => ({ value: item.nama, label: item.nama })),
    [villages],
  );

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
            <Label htmlFor="warehouse-type">Tipe Gudang</Label>
            <Input
              id="warehouse-type"
              name="depotType"
              defaultValue={warehouse?.depotType ?? ""}
              placeholder="Opsional, mis. Utama / Transit"
            />
            <FieldError message={errors.depotType} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="warehouse-area">Area</Label>
            <Combobox
              id="warehouse-area"
              options={areaOptions}
              value={areaOfficeId}
              onValueChange={setAreaOfficeId}
              placeholder="Pilih area"
              emptyText="Area tidak ditemukan."
            />
            <FieldError message={errors.areaOfficeId} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="warehouse-pic">PIC penanggung jawab (Back Office)</Label>
            <Combobox
              id="warehouse-pic"
              options={picOptions}
              value={picUserId}
              onValueChange={setPicUserId}
              placeholder="Pilih PIC"
              emptyText="PIC tidak ditemukan."
            />
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
              onAddressChange={(result) => {
                if (result.address) setAddress(result.address);
                if (result.postalCode) setPostalCode(result.postalCode);
                if (result.latitude) setLatitude(result.latitude);
                if (result.longitude) setLongitude(result.longitude);

                syncFromAddress({
                  province: result.province,
                  regency: result.regency,
                  district: result.district,
                  village: result.village,
                });
              }}
              compact
            />
          </div>
          <div className="space-y-4 lg:max-h-[calc(100vh-200px)] lg:overflow-y-auto lg:pr-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="warehouse-province">
                  Provinsi <span className="text-destructive">*</span>
                </Label>
                <Combobox
                  id="warehouse-province"
                  options={provinceOptions}
                  value={province}
                  onValueChange={setProvince}
                  placeholder={loadingProvince ? "Memuat..." : "Cari provinsi"}
                  emptyText="Provinsi tidak ditemukan."
                />
                <FieldError message={errors.province} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="warehouse-regency">
                  Kabupaten/Kota <span className="text-destructive">*</span>
                </Label>
                <Combobox
                  id="warehouse-regency"
                  options={regencyOptions}
                  value={regency}
                  onValueChange={setRegency}
                  placeholder={loadingRegency ? "Memuat..." : "Cari kabupaten/kota"}
                  emptyText="Kabupaten/kota tidak ditemukan."
                  disabled={loadingRegency}
                />
                <FieldError message={errors.regency} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="warehouse-district">
                  Kecamatan <span className="text-destructive">*</span>
                </Label>
                <Combobox
                  id="warehouse-district"
                  options={districtOptions}
                  value={district}
                  onValueChange={setDistrict}
                  placeholder={loadingDistrict ? "Memuat..." : "Cari kecamatan"}
                  emptyText="Kecamatan tidak ditemukan."
                  disabled={loadingDistrict}
                />
                <FieldError message={errors.district} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="warehouse-village">
                  Kelurahan/Desa <span className="text-destructive">*</span>
                </Label>
                <Combobox
                  id="warehouse-village"
                  options={villageOptions}
                  value={village}
                  onValueChange={setVillage}
                  placeholder={loadingVillage ? "Memuat..." : "Cari kelurahan/desa"}
                  emptyText="Kelurahan/desa tidak ditemukan."
                  disabled={loadingVillage}
                />
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
                <Label htmlFor="warehouse-latitude">
                  Latitude <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="warehouse-latitude"
                  value={latitude}
                  onChange={(event) => setLatitude(event.target.value)}
                  required
                />
                <FieldError message={errors.latitude} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="warehouse-longitude">
                  Longitude <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="warehouse-longitude"
                  value={longitude}
                  onChange={(event) => setLongitude(event.target.value)}
                  required
                />
                <FieldError message={errors.longitude} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
