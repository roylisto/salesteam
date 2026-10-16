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

const CURRENCIES = ["IDR", "USD", "SGD", "MYR", "PHP", "THB", "VND", "AUD", "EUR", "GBP"];
const TIMEZONES = [
  "Asia/Jakarta",
  "Asia/Makassar",
  "Asia/Jayapura",
  "Asia/Singapore",
  "Asia/Kuala_Lumpur",
  "Asia/Bangkok",
  "Asia/Manila",
  "Australia/Sydney",
  "UTC",
];

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
      toast.error("Please choose an image file.");
      event.target.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be smaller than 2 MB.");
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
        toast.success("Organization settings saved.");
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
            The logo and name appear at the top-left of the sidebar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <Avatar className="size-14 rounded-xl">
              {logoPreview ? (
                <AvatarImage
                  src={logoPreview}
                  alt="Company logo"
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
                Upload logo
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
                  Remove
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
            PNG, JPG, WEBP or SVG up to 2 MB. Stored in the organization folder
            in object storage.
          </p>
          <FieldError message={errors.logo} />
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Company details</CardTitle>
          <CardDescription>
            Basic information about this organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="org-name">Company name</Label>
            <Input
              id="org-name"
              name="name"
              defaultValue={organization.name}
              required
            />
            <FieldError message={errors.name} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="org-legal">Legal name</Label>
            <Input
              id="org-legal"
              name="legalName"
              defaultValue={organization.legalName ?? ""}
              placeholder="PT Example Tbk"
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
            <Label htmlFor="org-phone">Phone</Label>
            <Input
              id="org-phone"
              name="phone"
              defaultValue={organization.phone ?? ""}
              placeholder="+62 21 ..."
            />
            <FieldError message={errors.phone} />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="org-address">Address</Label>
            <Textarea
              id="org-address"
              name="address"
              defaultValue={organization.address ?? ""}
              rows={3}
              placeholder="Street, city, postal code"
            />
            <FieldError message={errors.address} />
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Regional</CardTitle>
          <CardDescription>
            Currency and timezone used across orders, finance and reports.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Currency</Label>
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
            <Label>Timezone</Label>
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

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          Save changes
        </Button>
      </div>
    </form>
  );
}
