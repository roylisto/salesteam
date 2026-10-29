"use client";

import { useRef, useState, useTransition } from "react";
import { Building2Icon, ImagePlusIcon, Loader2Icon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { LocationPicker } from "@/components/location-picker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useWilayahCascade } from "@/components/use-wilayah-cascade";
import { updateOrganization } from "@/lib/actions/organization";
import { toFileSrc } from "@/lib/files";

import type { OrganizationDetail } from "./types";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-destructive text-xs">{message}</p>;
}

const CURRENCIES = ["IDR"];
const TIMEZONES = ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"];

export function OrganizationForm({
  organization,
}: {
  organization: OrganizationDetail;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currency, setCurrency] = useState(organization.currency);
  const [timezone, setTimezone] = useState(organization.timezone);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    () => toFileSrc(organization.logoUrl),
  );
  const [logoRemoved, setLogoRemoved] = useState(false);

  const [address, setAddress] = useState(organization.address ?? "");
  const [latitude, setLatitude] = useState(
    organization.latitude != null ? String(organization.latitude) : "",
  );
  const [longitude, setLongitude] = useState(
    organization.longitude != null ? String(organization.longitude) : "",
  );

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
    province: organization.province ?? "",
    regency: organization.city ?? "",
    district: organization.district ?? "",
    village: organization.village ?? "",
  });

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Silakan pilih berkas gambar.");
      event.target.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo harus lebih kecil dari 2 MB.");
      event.target.value = "";
      return;
    }
    setLogoRemoved(false);
    setLogoPreview(URL.createObjectURL(file));
  }

  function handleRemoveLogo() {
    setLogoPreview(null);
    setLogoRemoved(true);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleSubmit(formData: FormData) {
    formData.set("currency", currency);
    formData.set("timezone", timezone);
    formData.set("address", address);
    formData.set("province", province);
    formData.set("city", regency);
    formData.set("district", district);
    formData.set("village", village);
    formData.set("latitude", latitude);
    formData.set("longitude", longitude);
    if (logoRemoved) formData.set("removeLogo", "true");

    startTransition(async () => {
      const result = await updateOrganization(undefined, formData);

      if (result?.ok) {
        toast.success("Pengaturan organisasi tersimpan.");
        setErrors({});
        setLogoRemoved(false);
        return;
      }

      setErrors(result?.fieldErrors ?? {});
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
        <div className="space-y-3">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>
                Logo dan nama muncul di kiri atas sidebar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4">
                <Avatar className="size-14 rounded-xl">
                  {logoPreview ? (
                    <AvatarImage
                      src={logoPreview}
                      alt="Logo perusahaan"
                      className="rounded-xl"
                    />
                  ) : null}
                  <AvatarFallback className="rounded-xl">
                    <Building2Icon className="size-6" />
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
                    Unggah logo
                  </Button>
                  {logoPreview ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveLogo}
                      disabled={pending}
                    >
                      <Trash2Icon />
                      Hapus
                    </Button>
                  ) : null}
                  <input
                    ref={fileRef}
                    type="file"
                    name="logo"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                PNG, JPG, WEBP, atau SVG maksimal 2 MB. Disimpan di folder
                organisasi pada penyimpanan objek.
              </p>
              <FieldError message={errors.logo} />
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Detail perusahaan</CardTitle>
              <CardDescription>
                Informasi dasar tentang organisasi ini.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="org-name">Nama perusahaan</Label>
                <Input
                  id="org-name"
                  name="name"
                  defaultValue={organization.name}
                  required
                />
                <FieldError message={errors.name} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="org-legal">Nama legal</Label>
                <Input
                  id="org-legal"
                  name="legalName"
                  defaultValue={organization.legalName ?? ""}
                  placeholder="PT Contoh Sejahtera Tbk"
                />
                <FieldError message={errors.legalName} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="org-email">Email</Label>
                <Input
                  id="org-email"
                  name="email"
                  type="email"
                  defaultValue={organization.email ?? ""}
                  placeholder="hello@company.com"
                />
                <FieldError message={errors.email} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="org-phone">Telepon</Label>
                <Input
                  id="org-phone"
                  name="phone"
                  defaultValue={organization.phone ?? ""}
                  placeholder="+62 21 ..."
                />
                <FieldError message={errors.phone} />
              </div>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Regional</CardTitle>
              <CardDescription>
                Mata uang dan zona waktu yang dipakai aplikasi.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Mata uang</Label>
                <Select
                  value={currency}
                  onValueChange={(value) => setCurrency(value ?? "IDR")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{currency}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.currency} />
              </div>

              <div className="space-y-1.5">
                <Label>Zona waktu</Label>
                <Select
                  value={timezone}
                  onValueChange={(value) => setTimezone(value ?? "Asia/Jakarta")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{timezone}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((zone) => (
                      <SelectItem key={zone} value={zone}>
                        {zone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.timezone} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Wilayah & lokasi kantor</CardTitle>
              <CardDescription>
                Wilayah kantor pusat. Cari atau klik peta untuk menetapkan koordinat.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <LocationPicker
                latitude={latitude}
                longitude={longitude}
                onChange={(nextLatitude, nextLongitude) => {
                  setLatitude(nextLatitude);
                  setLongitude(nextLongitude);
                }}
                onAddressChange={(result) => {
                  if (result.address) setAddress(result.address);
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

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>
                    Provinsi <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={province}
                    onValueChange={(value) => setProvince(value ?? "")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={loadingProvince ? "Memuat..." : "Pilih provinsi"}
                      >
                        {province}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {provinces.map((item) => (
                        <SelectItem key={item.kode} value={item.nama}>
                          {item.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={errors.province} />
                </div>

                <div className="space-y-1.5">
                  <Label>
                    Kabupaten/Kota <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={regency}
                    onValueChange={(value) => setRegency(value ?? "")}
                    disabled={loadingRegency}
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
                        <SelectItem key={item.kode} value={item.nama}>
                          {item.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={errors.city} />
                </div>

                <div className="space-y-1.5">
                  <Label>
                    Kecamatan <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={district}
                    onValueChange={(value) => setDistrict(value ?? "")}
                    disabled={loadingDistrict}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={loadingDistrict ? "Memuat..." : "Pilih kecamatan"}
                      >
                        {district}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {districts.map((item) => (
                        <SelectItem key={item.kode} value={item.nama}>
                          {item.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={errors.district} />
                </div>

                <div className="space-y-1.5">
                  <Label>
                    Kelurahan/Desa <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={village}
                    onValueChange={(value) => setVillage(value ?? "")}
                    disabled={loadingVillage}
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
                        <SelectItem key={item.kode} value={item.nama}>
                          {item.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={errors.village} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="org-address">Alamat</Label>
                <Textarea
                  id="org-address"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  rows={2}
                  placeholder="Nama jalan, nomor, RT/RW, patokan"
                />
                <FieldError message={errors.address} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="org-latitude">
                    Latitude <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="org-latitude"
                    value={latitude}
                    onChange={(event) => setLatitude(event.target.value)}
                    required
                  />
                  <FieldError message={errors.latitude} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="org-longitude">
                    Longitude <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="org-longitude"
                    value={longitude}
                    onChange={(event) => setLongitude(event.target.value)}
                    required
                  />
                  <FieldError message={errors.longitude} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          Simpan perubahan
        </Button>
      </div>
    </form>
  );
}
