"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ImagePlusIcon,
  Loader2Icon,
  StoreIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
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
  createOutlet,
  deleteOutlet,
  updateOutlet,
} from "@/lib/actions/outlets";
import { toFileSrc } from "@/lib/files";

import { LocationPicker } from "./location-picker";
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
}: {
  outlet: OutletDetail | null;
  warehouses: WarehouseOption[];
  members: MemberOption[];
  outletTypes: OutletTypeOption[];
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
  const [imagePreview, setImagePreview] = useState<string | null>(() =>
    toFileSrc(outlet?.imageUrl ?? null),
  );
  const [imageRemoved, setImageRemoved] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const selectedWarehouse =
    warehouseId === ""
      ? "No warehouse"
      : warehouses.find((row) => String(row.id) === warehouseId)?.name;
  const selectedSales =
    salesId === ""
      ? "Unassigned"
      : members.find((row) => String(row.id) === salesId)?.name;
  const selectedOutletType =
    outletTypeId === ""
      ? "Not set"
      : outletTypes.find((row) => String(row.id) === outletTypeId)?.name;

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      event.target.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Photo must be smaller than 2 MB.");
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
    if (imageRemoved) formData.set("removeImage", "true");

    startTransition(async () => {
      const result = outlet
        ? await updateOutlet(undefined, formData)
        : await createOutlet(undefined, formData);

      if (result?.ok) {
        toast.success(outlet ? "Outlet saved." : "Outlet created.");
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
        toast.success("Outlet deleted.");
        router.push(LIST_PATH);
        router.refresh();
        return;
      }

      toast.error(result?.error ?? "Unable to delete this outlet.");
    });
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <Card size="sm">
        <CardHeader>
          <CardTitle>Outlet details</CardTitle>
          <CardDescription>
            Name and code identify the store; the type, warehouse and rep drive
            routing and stock.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="outlet-name">Name</Label>
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
            <Label htmlFor="outlet-code">Code</Label>
            <Input
              id="outlet-code"
              name="code"
              defaultValue={outlet?.code ?? ""}
              placeholder="Optional"
            />
            <FieldError message={errors.code} />
          </div>

          <div className="space-y-1.5">
            <Label>Outlet type</Label>
            <Select
              value={outletTypeId}
              onValueChange={(value) => setOutletTypeId(value ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue>{selectedOutletType}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Not set</SelectItem>
                {outletTypes.map((outletType) => (
                  <SelectItem key={outletType.id} value={String(outletType.id)}>
                    {outletType.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.outletTypeId} />
          </div>

          <div className="space-y-1.5">
            <Label>Warehouse</Label>
            <Select
              value={warehouseId}
              onValueChange={(value) => setWarehouseId(value ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue>{selectedWarehouse}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No warehouse</SelectItem>
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.warehouseId} />
          </div>

          <div className="space-y-1.5">
            <Label>Sales rep</Label>
            <Select
              value={salesId}
              onValueChange={(value) => setSalesId(value ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue>{selectedSales}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.id} value={String(member.id)}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.salesId} />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border p-3 sm:col-span-2">
            <div className="space-y-0.5">
              <Label htmlFor="outlet-active">Active</Label>
              <p className="text-muted-foreground text-xs">
                Inactive outlets are hidden from new visits and orders.
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
          <CardTitle>Storefront photo</CardTitle>
          <CardDescription>
            Optional storefront image used by reps during visits.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <Avatar className="size-16 rounded-xl">
              {imagePreview ? (
                <AvatarImage
                  src={imagePreview}
                  alt="Outlet photo"
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
                Upload photo
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
                  Remove
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
            PNG, JPG or WEBP up to 2 MB.
          </p>
          <FieldError message={errors.image} />
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Address</CardTitle>
          <CardDescription>
            Search or click the map to pick the exact coordinates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="outlet-address">Address</Label>
              <Textarea
                id="outlet-address"
                name="address"
                defaultValue={outlet?.address ?? ""}
                rows={2}
                placeholder="Street, number"
              />
              <FieldError message={errors.address} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="outlet-address-detail">Address detail</Label>
              <Input
                id="outlet-address-detail"
                name="addressDetail"
                defaultValue={outlet?.addressDetail ?? ""}
                placeholder="Building, floor, landmark"
              />
              <FieldError message={errors.addressDetail} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="outlet-village">Village / Kelurahan</Label>
              <Input
                id="outlet-village"
                name="village"
                defaultValue={outlet?.village ?? ""}
              />
              <FieldError message={errors.village} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="outlet-district">District / Kecamatan</Label>
              <Input
                id="outlet-district"
                name="district"
                defaultValue={outlet?.district ?? ""}
              />
              <FieldError message={errors.district} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="outlet-city">City / Regency</Label>
              <Input
                id="outlet-city"
                name="city"
                defaultValue={outlet?.city ?? ""}
              />
              <FieldError message={errors.city} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="outlet-province">Province</Label>
              <Input
                id="outlet-province"
                name="province"
                defaultValue={outlet?.province ?? ""}
              />
              <FieldError message={errors.province} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="outlet-country">Country</Label>
              <Input
                id="outlet-country"
                name="country"
                defaultValue={outlet?.country ?? ""}
              />
              <FieldError message={errors.country} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="outlet-postal">Postal code</Label>
              <Input
                id="outlet-postal"
                name="postalCode"
                defaultValue={outlet?.postalCode ?? ""}
              />
              <FieldError message={errors.postalCode} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="outlet-lat">Latitude</Label>
              <Input
                id="outlet-lat"
                inputMode="decimal"
                value={latitude}
                onChange={(event) => setLatitude(event.target.value)}
                placeholder="-6.2000000"
              />
              <FieldError message={errors.latitude} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="outlet-lng">Longitude</Label>
              <Input
                id="outlet-lng"
                inputMode="decimal"
                value={longitude}
                onChange={(event) => setLongitude(event.target.value)}
                placeholder="106.8166660"
              />
              <FieldError message={errors.longitude} />
            </div>
          </div>

          <Separator />

          <LocationPicker
            latitude={latitude}
            longitude={longitude}
            onChange={(nextLatitude, nextLongitude) => {
              setLatitude(nextLatitude);
              setLongitude(nextLongitude);
            }}
          />
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Owner &amp; contact</CardTitle>
          <CardDescription>Who runs the store and how to reach them.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="outlet-owner">Owner name</Label>
            <Input
              id="outlet-owner"
              name="ownerName"
              defaultValue={outlet?.ownerName ?? ""}
            />
            <FieldError message={errors.ownerName} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="outlet-phone">Phone</Label>
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
            <Label htmlFor="outlet-owner-address">Owner address</Label>
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
          <CardTitle>Legal identifiers</CardTitle>
          <CardDescription>
            Optional KYC details captured during onboarding.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="outlet-national-id">National ID (KTP)</Label>
            <Input
              id="outlet-national-id"
              name="nationalId"
              defaultValue={outlet?.nationalId ?? ""}
            />
            <FieldError message={errors.nationalId} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="outlet-family-card">Family card (KK)</Label>
            <Input
              id="outlet-family-card"
              name="familyCardNumber"
              defaultValue={outlet?.familyCardNumber ?? ""}
            />
            <FieldError message={errors.familyCardNumber} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="outlet-tax-id">Tax ID (NPWP)</Label>
            <Input
              id="outlet-tax-id"
              name="taxId"
              defaultValue={outlet?.taxId ?? ""}
            />
            <FieldError message={errors.taxId} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="outlet-business-id">Business ID (NIB)</Label>
            <Input
              id="outlet-business-id"
              name="businessId"
              defaultValue={outlet?.businessId ?? ""}
            />
            <FieldError message={errors.businessId} />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="outlet-notes">Notes</Label>
            <Textarea
              id="outlet-notes"
              name="notes"
              defaultValue={outlet?.notes ?? ""}
              rows={3}
              placeholder="Anything worth remembering on the visit"
            />
            <FieldError message={errors.notes} />
          </div>
        </CardContent>
      </Card>

      <div className="bg-background/80 sticky bottom-0 flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 backdrop-blur">
        <Button
          render={<Link href={LIST_PATH} />}
          nativeButton={false}
          variant="ghost"
        >
          <ArrowLeftIcon />
          Back
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          {isEdit ? (
            confirming ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setConfirming(false)}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={pending}
                >
                  {pending ? <Loader2Icon className="animate-spin" /> : null}
                  Confirm delete
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirming(true)}
                disabled={pending}
              >
                <Trash2Icon />
                Delete
              </Button>
            )
          ) : null}

          <Button type="submit" disabled={pending}>
            {pending ? <Loader2Icon className="animate-spin" /> : null}
            {isEdit ? "Save outlet" : "Create outlet"}
          </Button>
        </div>
      </div>
    </form>
  );
}
