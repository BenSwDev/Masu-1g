"use client"

import * as React from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/utils"
import type { IPartnerCouponBatch } from "@/lib/db/models/partner-coupon-batch"
import { useTranslation } from "@/lib/translations/i18n"

const NO_PARTNER_SELECTED_VALUE = "__no-partner__"

// Schema for form validation (client-side)
const formSchema = z
  .object({
    name: z.string().min(1, "Name is required").trim(),
    description: z.string().optional(),
    assignedPartnerId: z.string().optional().nullable(),
    couponCount: z.coerce
      .number()
      .min(1, "Must have at least 1 coupon")
      .max(1000, "Cannot exceed 1000 coupons"),
    discountType: z.enum(["percentage", "fixedAmount"]),
    discountValue: z.coerce.number().min(0, "Discount value must be non-negative"),
    validFrom: z.date({ required_error: "Start date is required." }),
    validUntil: z.date({ required_error: "Expiration date is required." }),
    usageLimit: z.coerce.number().min(0, "Usage limit must be non-negative"),
    usageLimitPerUser: z.coerce.number().min(0, "Usage limit per user must be non-negative"),
    isActive: z.boolean().default(true),

    notesForPartner: z.string().optional(),
  })
  .refine(data => data.validUntil >= data.validFrom, {
    message: "Expiration date must be after or same as start date",
    path: ["validUntil"],
  })

export type PartnerCouponBatchFormValues = z.infer<typeof formSchema>

interface PartnerCouponBatchFormProps {
  initialData?: IPartnerCouponBatch | null
  partnersForSelect: { value: string; label: string }[]
  onSubmit: (values: PartnerCouponBatchFormValues) => Promise<void>
  onCancel: () => void
  loading: boolean
}

export function PartnerCouponBatchForm({
  initialData,
  partnersForSelect,
  onSubmit,
  onCancel,
  loading,
}: PartnerCouponBatchFormProps) {
  const { t, dir } = useTranslation()

  const defaultValues = React.useMemo(
    () => ({
      name: initialData?.name || "",
      description: initialData?.description || "",
      assignedPartnerId: initialData?.assignedPartnerId?.toString() || null,
      couponCount: initialData?.couponCount || 10,
      discountType: initialData?.discountType || "percentage",
      discountValue: initialData?.discountValue || 0,
      validFrom: initialData?.validFrom ? new Date(initialData.validFrom) : new Date(),
      validUntil: initialData?.validUntil
        ? new Date(initialData.validUntil)
        : new Date(new Date().setDate(new Date().getDate() + 30)),
      usageLimit: initialData?.usageLimit ?? 1,
      usageLimitPerUser: initialData?.usageLimitPerUser ?? 1,
      isActive: initialData?.isActive !== undefined ? initialData.isActive : true,

      notesForPartner: initialData?.notesForPartner || "",
    }),
    [initialData]
  )

  const form = useForm<PartnerCouponBatchFormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues,
  })

  React.useEffect(() => {
    form.reset(defaultValues)
  }, [defaultValues, form])

  const handleSubmit = form.handleSubmit(async (data: PartnerCouponBatchFormValues) => {
    await onSubmit(data)
  })

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label htmlFor="name">{t("adminPartnerCouponBatches.form.nameLabel")}</Label>
          <Input id="name" {...form.register("name")} disabled={loading} />
          {form.formState.errors.name && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="description">
            {t("adminPartnerCouponBatches.form.descriptionLabel")}
          </Label>
          <Textarea id="description" {...form.register("description")} disabled={loading} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="couponCount">
              {t("adminPartnerCouponBatches.form.couponCountLabel")}
            </Label>
            <Input
              id="couponCount"
              type="number"
              min="1"
              max="1000"
              {...form.register("couponCount")}
              disabled={loading || !!initialData} // Disable editing count for existing batches
            />
            {form.formState.errors.couponCount && (
              <p className="text-sm text-red-500 mt-1">
                {form.formState.errors.couponCount.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="discountType">
              {t("adminPartnerCouponBatches.form.discountTypeLabel")}
            </Label>
            <Controller
              name="discountType"
              control={form.control}
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("adminPartnerCouponBatches.form.discountTypePlaceholder")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">
                      {t("adminPartnerCouponBatches.form.discountTypePercentage")}
                    </SelectItem>
                    <SelectItem value="fixedAmount">
                      {t("adminPartnerCouponBatches.form.discountTypeFixedAmount")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.discountType && (
              <p className="text-sm text-red-500 mt-1">
                {form.formState.errors.discountType.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="discountValue">
              {t("adminPartnerCouponBatches.form.discountValueLabel")}
            </Label>
            <Input
              id="discountValue"
              type="number"
              step="0.01"
              {...form.register("discountValue")}
              disabled={loading}
            />
            {form.formState.errors.discountValue && (
              <p className="text-sm text-red-500 mt-1">
                {form.formState.errors.discountValue.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="validFrom">{t("adminPartnerCouponBatches.form.validFromLabel")}</Label>
            <Controller
              name="validFrom"
              control={form.control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                      disabled={loading}
                    >
                      <CalendarIcon
                        className={cn(dir === "rtl" ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4")}
                      />
                      {field.value ? formatDate(field.value) : <span>{t("common.pickDate")}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align={dir === "rtl" ? "end" : "start"}>
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            {form.formState.errors.validFrom && (
              <p className="text-sm text-red-500 mt-1">{form.formState.errors.validFrom.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="validUntil">
              {t("adminPartnerCouponBatches.form.validUntilLabel")}
            </Label>
            <Controller
              name="validUntil"
              control={form.control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                      disabled={loading}
                    >
                      <CalendarIcon
                        className={cn(dir === "rtl" ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4")}
                      />
                      {field.value ? formatDate(field.value) : <span>{t("common.pickDate")}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align={dir === "rtl" ? "end" : "start"}>
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={date => date < (form.getValues("validFrom") || new Date(0))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            {form.formState.errors.validUntil && (
              <p className="text-sm text-red-500 mt-1">
                {form.formState.errors.validUntil.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="usageLimit">
              {t("adminPartnerCouponBatches.form.usageLimitLabel")}
            </Label>
            <Input
              id="usageLimit"
              type="number"
              {...form.register("usageLimit")}
              disabled={loading}
            />
            {form.formState.errors.usageLimit && (
              <p className="text-sm text-red-500 mt-1">
                {form.formState.errors.usageLimit.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="usageLimitPerUser">
              {t("adminPartnerCouponBatches.form.usageLimitPerUserLabel")}
            </Label>
            <Input
              id="usageLimitPerUser"
              type="number"
              {...form.register("usageLimitPerUser")}
              disabled={loading}
            />
            {form.formState.errors.usageLimitPerUser && (
              <p className="text-sm text-red-500 mt-1">
                {form.formState.errors.usageLimitPerUser.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="assignedPartnerId">
            {t("adminPartnerCouponBatches.form.assignedPartnerLabel")}
          </Label>
          <Controller
            name="assignedPartnerId"
            control={form.control}
            render={({ field }) => (
              <Select
                onValueChange={value => {
                  field.onChange(value === NO_PARTNER_SELECTED_VALUE ? null : value)
                }}
                value={
                  field.value === null || field.value === undefined
                    ? NO_PARTNER_SELECTED_VALUE
                    : field.value.toString()
                }
                disabled={loading || partnersForSelect.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("adminPartnerCouponBatches.form.assignedPartnerPlaceholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PARTNER_SELECTED_VALUE}>{t("common.none")}</SelectItem>
                  {partnersForSelect.map(partner => (
                    <SelectItem key={partner.value} value={partner.value}>
                      {partner.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div>
          <Label htmlFor="notesForPartner">
            {t("adminPartnerCouponBatches.form.notesForPartnerLabel")}
          </Label>
          <Textarea id="notesForPartner" {...form.register("notesForPartner")} disabled={loading} />
        </div>

        <div className="flex items-center space-x-2">
          <Controller
            name="isActive"
            control={form.control}
            render={({ field }) => (
              <Checkbox
                id="isActive"
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={loading}
              />
            )}
          />
          <Label
            htmlFor="isActive"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {t("adminPartnerCouponBatches.form.isActiveLabel")}
          </Label>
        </div>

        {form.formState.errors.root && (
          <p className="text-sm text-red-500 mt-1">{form.formState.errors.root.message}</p>
        )}

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && (
              <Loader2
                className={
                  dir === "rtl" ? "ml-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4 animate-spin"
                }
              />
            )}
            {initialData
              ? t("adminPartnerCouponBatches.form.saveChanges")
              : t("adminPartnerCouponBatches.form.createBatch")}
          </Button>
        </div>
      </div>
    </form>
  )
}
