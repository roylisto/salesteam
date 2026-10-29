"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ImagePlusIcon,
  Loader2Icon,
  StoreIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { LocationPicker, type AddressComponents } from "@/components/location-picker";
import { useWilayahCascade } from "@/components/use-wilayah-cascade";
import {
  createOutlet,
  deleteOutlet,
  updateOutlet,
} from "@/lib/actions/outlets";
import { toFileSrc } from "@/lib/files";

import type {
  MemberOption,
  OutletDetail,
  OutletTypeOption,
  WarehouseOption,
} from "./types";

const LIST_PATH = "/master-data/outlets";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-destructive text-xs">{message}</p>;
}

export function OutletForm({
  outlet,
  warehouses,
  members,
  outletTypes,
  defaultProvince,
  defaultCity,
}: {
  outlet: OutletDetail | null;
  warehouses: WarehouseOption[];
  members: MemberOption[];
  outletTypes: OutletTypeOption[];
  defaultProvince: string | null;
  defaultCity: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEdit = outlet !== null;

  const [active, setActive] = useState(outlet ? outlet.status === "active" : true);
  const [warehouseId, setWarehouseId] = useState(
    outlet?.warehouseId ? String(outlet.warehouseId) : "",
  );
  const [salesId, setSalesId] = useState(
    outlet?.salesId ? String(outlet.salesId) : "",
  );
  const [outletTypeId, setOutletTypeId] = useState(
    outlet?.outletTypeId ? String(outlet.outletTypeId) : "",
  );
  const [latitude, setLatitude] = useState(
    outlet?.latitude != null ? String(outlet.latitude) : "",
  );
  const [longitude, setLongitude] = useState(
    outlet?.longitude != null ? String(outlet.longitude) : "",
  );
  const [postalCode, setPostalCode] = useState(outlet?.postalCode ?? "");
  const [address, setAddress] = useState(outlet?.address ?? "");

  const [mapCentered, setMapCentered] = useState(false);

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
  } = useWilayahCascade({
    province: outlet?.province ?? "",
    regency: outlet?.city ?? "",
    district: outlet?.district ?? "",
    village: outlet?.village ?? "",
  });

  function handleAddressChange(result: AddressComponents) {
    if (result.address) setAddress(result.address);
    if (result.latitude) setLatitude(result.latitude);
    if (result.longitude) setLongitude(result.longitude);
    if (result.postalCode) setPostalCode(result.postalCode);

    syncFromAddress({
      province: result.province,
      regency: result.regency,
      district: result.district,
      village: result.village,
    });
  }

  // Geocode default province/city for new outlets to center the map
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

  const [imagePreview, setImagePreview] = useState<string | null>(() =>
    toFileSrc(outlet?.imageUrl ?? null),
  );
  const [imageRemoved, setImageRemoved] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const outletTypeOptions = useMemo(
    () => [
      { value: "", label: "Belum diatur" },
      ...outletTypes.map((type) => ({ value: String(type.id), label: type.name })),
    ],
    [outletTypes],
  );
  const warehouseOptions = useMemo(
    () => [
      { value: "", label: "Tanpa gudang" },
      ...warehouses.map((warehouse) => ({
        value: String(warehouse.id),
        label: warehouse.name,
      })),
    ],
    [warehouses],
  );
  const salesOptions = useMemo(
    () => [
      { value: "", label: "Belum ditugaskan" },
      ...members.map((member) => ({ value: String(member.id), label: member.name })),
    ],
    [members],
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

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Pilih berkas gambar.");
      event.target.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Foto harus lebih kecil dari 2 MB.");
      event.target.value = "";
      return;
    }
    setImageRemoved(false);
    setImagePreview(URL.createObjectURL(file));
  }

  function handleRemoveImage() {
    setImagePreview(null);
    setImageRemoved(true);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleSubmit(formData: FormData) {
    if (outlet) formData.set("id", String(outlet.id));
    formData.set("status", active ? "active" : "inactive");
    formData.set("warehouseId", warehouseId);
    formData.set("salesId", salesId);
    formData.set("outletTypeId", outletTypeId);
    formData.set("latitude", latitude);
    formData.set("longitude", longitude);
    formData.set("province", province);
    formData.set("city", regency);
    formData.set("district", district);
    formData.set("village", village);
    formData.set("postalCode", postalCode);
    if (imageRemoved) formData.set("removeImage", "true");

    startTransition(async () => {
      const result = outlet
        ? await updateOutlet(undefined, formData)
        : await createOutlet(undefined, formData);

      if (result?.ok) {
        toast.success(outlet ? "Outlet tersimpan." : "Outlet dibuat.");
        setErrors({});
        if (outlet) {
          setImageRemoved(false);
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
    if (!outlet) return;

    const formData = new FormData();
    formData.set("id", String(outlet.id));

    startTransition(async () => {
      const result = await deleteOutlet(formData);

      if (result?.ok) {
        toast.success("Outlet dihapus.");
        router.push(LIST_PATH);
        router.refresh();
        return;
      }

      toast.error(result?.error ?? "Tidak dapat menghapus outlet ini.");
    });
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <Card size="sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle>Detail outlet</CardTitle>
            <CardDescription>
              Nama dan kode mengidentifikasi toko; tipe, gudang, dan tenaga penjualan
              menentukan rute dan stok.
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
              {isEdit ? "Simpan outlet" : "Buat outlet"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="outlet-name">Nama</Label>
            <Input
              id="outlet-name"
              name="name"
              defaultValue={outlet?.name ?? ""}
              placeholder="Toko Sumber Rejeki"
              required
            />
            <FieldError message={errors.name} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="outlet-code">Kode</Label>
            <Input
              id="outlet-code"
              name="code"
              defaultValue={outlet?.code ?? ""}
              placeholder="Opsional"
            />
            <FieldError message={errors.code} />
          </div>

          <div className="space-y-1.5">
            <Label>Tipe outlet</Label>
            <Combobox
              options={outletTypeOptions}
              value={outletTypeId}
              onValueChange={setOutletTypeId}
              placeholder="Pilih tipe outlet"
              emptyText="Tipe outlet tidak ditemukan."
            />
            <FieldError message={errors.outletTypeId} />
          </div>

          <div className="space-y-1.5">
            <Label>Gudang</Label>
            <Combobox
              options={warehouseOptions}
              value={warehouseId}
              onValueChange={setWarehouseId}
              placeholder="Pilih gudang"
              emptyText="Gudang tidak ditemukan."
            />
            <FieldError message={errors.warehouseId} />
          </div>

          <div className="space-y-1.5">
            <Label>Tenaga penjualan</Label>
            <Combobox
              options={salesOptions}
              value={salesId}
              onValueChange={setSalesId}
              placeholder="Pilih tenaga penjualan"
              emptyText="Tenaga penjualan tidak ditemukan."
            />
            <FieldError message={errors.salesId} />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border p-3 sm:col-span-2">
            <div className="space-y-0.5">
              <Label htmlFor="outlet-active">Aktif</Label>
              <p className="text-muted-foreground text-xs">
                Outlet tidak aktif disembunyikan dari kunjungan dan pesanan baru.
              </p>
            </div>
            <Switch
              id="outlet-active"
              checked={active}
              onCheckedChange={setActive}
            />
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Foto toko</CardTitle>
          <CardDescription>
            Gambar foto toko opsional yang digunakan tenaga penjualan saat kunjungan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <Avatar className="size-16 rounded-xl">
              {imagePreview ? (
                <AvatarImage
                  src={imagePreview}
                  alt="Foto outlet"
                  className="rounded-xl"
                />
              ) : null}
              <AvatarFallback className="rounded-xl">
                <StoreIcon className="size-6" />
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={pending}
              >
                <ImagePlusIcon />
                Unggah foto
              </Button>
              {imagePreview ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveImage}
                  disabled={pending}
                >
                  <Trash2Icon />
                  Hapus
                </Button>
              ) : null}
              <input
                ref={fileRef}
                type="file"
                name="image"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>
          <p className="text-muted-foreground mt-2 text-xs">
            PNG, JPG, atau WEBP maksimal 2 MB.
          </p>
          <FieldError message={errors.image} />
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Alamat & lokasi</CardTitle>
          <CardDescription>
            Cari atau klik peta untuk memilih koordinat yang tepat. Wilayah (provinsi–kelurahan) dan kode pos diisi otomatis dari peta.
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
              onAddressChange={handleAddressChange}
              compact
            />
          </div>
          <div className="space-y-4 lg:max-h-[calc(100vh-200px)] lg:overflow-y-auto lg:pr-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Provinsi</Label>
                <Combobox
                  options={provinceOptions}
                  value={province}
                  onValueChange={setProvince}
                  placeholder={loadingProvince ? "Memuat..." : "Cari provinsi"}
                  emptyText="Provinsi tidak ditemukan."
                  disabled={loadingProvince}
                />
                <FieldError message={errors.province} />
              </div>

              <div className="space-y-1.5">
                <Label>Kabupaten/Kota</Label>
                <Combobox
                  options={regencyOptions}
                  value={regency}
                  onValueChange={setRegency}
                  placeholder={loadingRegency ? "Memuat..." : "Cari kabupaten/kota"}
                  emptyText="Kabupaten/kota tidak ditemukan."
                  disabled={loadingRegency}
                />
                <FieldError message={errors.city} />
              </div>

              <div className="space-y-1.5">
                <Label>Kecamatan</Label>
                <Combobox
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
                <Label>Kelurahan/Desa</Label>
                <Combobox
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

            <div className="space-y-1.5">
              <Label htmlFor="outlet-address">Alamat</Label>
              <Textarea
                id="outlet-address"
                name="address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                rows={2}
                placeholder="Jalan, nomor"
              />
              <FieldError message={errors.address} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="outlet-address-detail">Detail alamat</Label>
              <Input
                id="outlet-address-detail"
                name="addressDetail"
                defaultValue={outlet?.addressDetail ?? ""}
                placeholder="Gedung, lantai, patokan"
              />
              <FieldError message={errors.addressDetail} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="outlet-postal-code">Kode pos</Label>
              <Input
                id="outlet-postal-code"
                value={postalCode}
                onChange={(event) => setPostalCode(event.target.value)}
                placeholder="Otomatis dari peta"
              />
              <FieldError message={errors.postalCode} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="outlet-country">Negara</Label>
              <Input
                id="outlet-country"
                name="country"
                defaultValue={outlet?.country ?? ""}
              />
              <FieldError message={errors.country} />
            </div>

            <Separator />
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Pemilik &amp; kontak</CardTitle>
          <CardDescription>Siapa yang mengelola toko dan bagaimana menghubunginya.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="outlet-owner">Nama pemilik</Label>
            <Input
              id="outlet-owner"
              name="ownerName"
              defaultValue={outlet?.ownerName ?? ""}
            />
            <FieldError message={errors.ownerName} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="outlet-phone">Telepon</Label>
            <Input
              id="outlet-phone"
              name="phone"
              defaultValue={outlet?.phone ?? ""}
            />
            <FieldError message={errors.phone} />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="outlet-email">Email</Label>
            <Input
              id="outlet-email"
              name="email"
              type="email"
              defaultValue={outlet?.email ?? ""}
            />
            <FieldError message={errors.email} />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="outlet-owner-address">Alamat pemilik</Label>
            <Textarea
              id="outlet-owner-address"
              name="ownerAddress"
              defaultValue={outlet?.ownerAddress ?? ""}
              rows={2}
            />
            <FieldError message={errors.ownerAddress} />
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Identitas legal</CardTitle>
          <CardDescription>
            Detail KYC opsional yang dicatat saat pendaftaran.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="outlet-national-id">NIK (KTP)</Label>
            <Input
              id="outlet-national-id"
              name="nationalId"
              defaultValue={outlet?.nationalId ?? ""}
            />
            <FieldError message={errors.nationalId} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="outlet-family-card">Kartu Keluarga (KK)</Label>
            <Input
              id="outlet-family-card"
              name="familyCardNumber"
              defaultValue={outlet?.familyCardNumber ?? ""}
            />
            <FieldError message={errors.familyCardNumber} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="outlet-tax-id">NPWP</Label>
            <Input
              id="outlet-tax-id"
              name="taxId"
              defaultValue={outlet?.taxId ?? ""}
            />
            <FieldError message={errors.taxId} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="outlet-business-id">NIB</Label>
            <Input
              id="outlet-business-id"
              name="businessId"
              defaultValue={outlet?.businessId ?? ""}
            />
            <FieldError message={errors.businessId} />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="outlet-notes">Catatan</Label>
            <Textarea
              id="outlet-notes"
              name="notes"
              defaultValue={outlet?.notes ?? ""}
              rows={3}
              placeholder="Hal yang perlu diingat saat kunjungan"
            />
            <FieldError message={errors.notes} />
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
