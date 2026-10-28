"use client";

import { useRef, useState, useTransition } from "react";
import { Building2Icon, ImagePlusIcon, Loader2Icon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

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
            PNG, JPG, WEBP, atau SVG maksimal 2 MB. Disimpan di folder organisasi
            pada penyimpanan objek.
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
        <CardContent className="grid gap-4 sm:grid-cols-2">
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

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="org-address">Alamat</Label>
            <Textarea
              id="org-address"
              name="address"
              defaultValue={organization.address ?? ""}
              rows={3}
              placeholder="Jalan, kota, kode pos"
            />
            <FieldError message={errors.address} />
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Regional</CardTitle>
          <CardDescription>
            Mata uang, zona waktu, dan lokasi default untuk peta saat menambah
            gudang/outlet.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
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

          <div className="space-y-1.5">
            <Label htmlFor="org-province">Provinsi</Label>
            <Input
              id="org-province"
              name="province"
              defaultValue={organization.province ?? ""}
              placeholder="Misal: DKI Jakarta"
            />
            <FieldError message={errors.province} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="org-city">Kota/Kabupaten</Label>
            <Input
              id="org-city"
              name="city"
              defaultValue={organization.city ?? ""}
              placeholder="Misal: Jakarta Pusat"
            />
            <FieldError message={errors.city} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          Simpan perubahan
        </Button>
      </div>
    </form>
  );
}
