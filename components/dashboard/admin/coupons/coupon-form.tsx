"use client"

import * as React from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Textarea } from "@/components/common/ui/textarea"
import { Checkbox } from "@/components/common/ui/checkbox"
import { Label } from "@/components/common/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/common/ui/popover"
import { Calendar } from "@/components/common/ui/calendar"
import { CalendarIcon, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils/utils" // Assuming cn utility
import type { ICoupon } from "@/lib/db/models/coupon"
import { useTranslation } from "@/lib/translations/i18n"

const NO_PARTNER_SELECTED_VALUE = "__no-partner__" // Unique non-empty string

// Schema for form validation (client-side)
// Must align with server-side Zod schema in actions
const formSchema = z
  .object({
    code: z.string().min(3, "Code must be at least 3 characters").trim(),
    description: z.string().optional(),
    discountType: z.enum(["percentage", "fixedAmount"]),
    discountValue: z.coerce.number().min(0, "Discount value must be non-negative"),
    validFrom: z.date({ required_error: "Start date is required." }),
    validUntil: z.date({ required_error: "Expiration date is required." }),
    usageLimit: z.coerce.number().min(0, "Usage limit must be non-negative").default(1),
    usageLimitPerUser: z.coerce.number().min(0, "Usage limit per user must be non-negative").default(1),
    isActive: z.boolean().default(true),
    assignedPartnerId: z.string().optional().nullable(),
    notesForPartner: z.string().optional(),
  })
  .refine((data) => data.validUntil >= data.validFrom, {
    message: "Expiration date must be after or same as start date",
    path: ["validUntil"],
  })

export type CouponFormValues = z.infer<typeof formSchema>

interface CouponFormProps {
  initialData?: ICoupon | null
  partnersForSelect: { value: string; label: string }[]
  onSubmit: (values: CouponFormValues) => Promise<void>
  onCancel: () => void
  loading: boolean
}

export function CouponForm({ initialData, partnersForSelect, onSubmit, onCancel, loading }: CouponFormProps) {
  const { t, dir } = useTranslation()

  const defaultValues = React.useMemo(
    () => ({
      code: initialData?.code || "",
      description: initialData?.description || "",
      discountType: initialData?.discountType || "percentage",
      discountValue: initialData?.discountValue || 0,
      validFrom: initialData?.validFrom ? new Date(initialData.validFrom) : new Date(),
      validUntil: initialData?.validUntil
        ? new Date(initialData.validUntil)
        : new Date(new Date().setDate(new Date().getDate() + 30)), // Default 30 days
      usageLimit: initialData?.usageLimit || 1,
      usageLimitPerUser: initialData?.usageLimitPerUser || 1,
      isActive: initialData?.isActive !== undefined ? initialData.isActive : true,
      assignedPartnerId: initialData?.assignedPartnerId?.toString() || null,
      notesForPartner: initialData?.notesForPartner || "",
    }),
    [initialData],
  )

  const form = useForm<CouponFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  React.useEffect(() => {
    form.reset(defaultValues) // Reset form when initialData changes
  }, [defaultValues, form])

  const handleSubmit = form.handleSubmit(async (data) => {
    await onSubmit(data)
  })

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label htmlFor="code">{t("adminCoupons.form.codeLabel")}</Label>
          <Input id="code" {...form.register("code")} disabled={loading} />
          {form.formState.errors.code && (
            <p className="text-sm text-red-500 mt-1">
              {form.formState.errors.code.message === "Code must be at least 3 characters"
                ? t("adminCoupons.form.codeErrorMin")
                : form.formState.errors.code.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="discountType">{t("adminCoupons.form.discountTypeLabel")}</Label>
          <Controller
            name="discountType"
            control={form.control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder={t("adminCoupons.form.discountTypePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">{t("adminCoupons.form.discountTypePercentage")}</SelectItem>
                  <SelectItem value="fixedAmount">{t("adminCoupons.form.discountTypeFixedAmount")}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.discountType && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.discountType.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="discountValue">{t("adminCoupons.form.discountValueLabel")}</Label>
          <Input id="discountValue" type="number" step="0.01" {...form.register("discountValue")} disabled={loading} />
          {form.formState.errors.discountValue && (
            <p className="text-sm text-red-500 mt-1">
              {form.formState.errors.discountValue.message === "Discount value must be non-negative"
                ? t("adminCoupons.form.discountValueErrorMin")
                : form.formState.errors.discountValue.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="description">{t("adminCoupons.form.descriptionLabel")}</Label>
          <Textarea id="description" {...form.register("description")} disabled={loading} />
        </div>

        <div>
          <Label htmlFor="validFrom">{t("adminCoupons.form.validFromLabel")}</Label>
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
                      !field.value && "text-muted-foreground",
                    )}
                    disabled={loading}
                  >
                    <CalendarIcon className={cn(dir === "rtl" ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4")} />
                    {field.value ? formatDate(field.value) : <span>{t("common.pickDate")}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align={dir === "rtl" ? "end" : "start"}>
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                </PopoverContent>
              </Popover>
            )}
          />
          {form.formState.errors.validFrom && (
            <p className="text-sm text-red-500 mt-1">
              {form.formState.errors.validFrom.message === "Start date is required."
                ? t("adminCoupons.form.validFromError")
                : form.formState.errors.validFrom.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="validUntil">{t("adminCoupons.form.validUntilLabel")}</Label>
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
                      !field.value && "text-muted-foreground",
                    )}
                    disabled={loading}
                  >
                    <CalendarIcon className={cn(dir === "rtl" ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4")} />
                    {field.value ? formatDate(field.value) : <span>{t("common.pickDate")}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align={dir === "rtl" ? "end" : "start"}>
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date < (form.getValues("validFrom") || new Date(0))} // Disable dates before validFrom
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}
          />
          {form.formState.errors.validUntil && (
            <p className="text-sm text-red-500 mt-1">
              {form.formState.errors.validUntil.message === "Expiration date is required."
                ? t("adminCoupons.form.validUntilError")
                : form.formState.errors.validUntil.message === "Expiration date must be after or same as start date"
                  ? t("adminCoupons.form.validUntilAfterValidFromError")
                  : form.formState.errors.validUntil.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="usageLimit">{t("adminCoupons.form.usageLimitLabel")}</Label>
          <Input id="usageLimit" type="number" {...form.register("usageLimit")} disabled={loading} />
          {form.formState.errors.usageLimit && (
            <p className="text-sm text-red-500 mt-1">
              {form.formState.errors.usageLimit.message === "Usage limit must be non-negative"
                ? t("adminCoupons.form.usageLimitErrorMin")
                : form.formState.errors.usageLimit.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="usageLimitPerUser">{t("adminCoupons.form.usageLimitPerUserLabel")}</Label>
          <Input id="usageLimitPerUser" type="number" {...form.register("usageLimitPerUser")} disabled={loading} />
          {form.formState.errors.usageLimitPerUser && (
            <p className="text-sm text-red-500 mt-1">
              {form.formState.errors.usageLimitPerUser.message === "Usage limit per user must be non-negative"
                ? t("adminCoupons.form.usageLimitPerUserErrorMin")
                : form.formState.errors.usageLimitPerUser.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="assignedPartnerId">{t("adminCoupons.form.assignedPartnerLabel")}</Label>
          <Controller
            name="assignedPartnerId"
            control={form.control}
            render={({ field }) => (
              <Select
                onValueChange={(value) => {
                  field.onChange(value === NO_PARTNER_SELECTED_VALUE ? null : value)
                }}
                value={
                  field.value === null || field.value === undefined ? NO_PARTNER_SELECTED_VALUE : field.value.toString()
                }
                disabled={loading || partnersForSelect.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("adminCoupons.form.assignedPartnerPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PARTNER_SELECTED_VALUE}>{t("common.none")}</SelectItem>
                  {partnersForSelect.map((partner) => (
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
          <Label htmlFor="notesForPartner">{t("adminCoupons.form.notesForPartnerLabel")}</Label>
          <Textarea id="notesForPartner" {...form.register("notesForPartner")} disabled={loading} />
        </div>

        <div className="flex items-center space-x-2">
          <Controller
            name="isActive"
            control={form.control}
            render={({ field }) => (
              <Checkbox id="isActive" checked={field.value} onCheckedChange={field.onChange} disabled={loading} />
            )}
          />
          <Label
            htmlFor="isActive"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {t("adminCoupons.form.isActiveLabel")}
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
              <Loader2 className={dir === "rtl" ? "ml-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4 animate-spin"} />
            )}
            {initialData ? t("adminCoupons.form.saveChanges") : t("adminCoupons.form.createCoupon")}
          </Button>
        </div>
      </div>
    </form>
  )
}
