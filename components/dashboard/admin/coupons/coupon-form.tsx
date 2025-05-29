"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/common/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { useTranslation } from "next-i18next"
import { format } from "date-fns"

export interface CouponPlain {
  _id?: string
  code: string
  discountValue: number
  discountType: "percentage" | "fixed"
  expiryDate: string // yyyy-MM-dd
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

const formSchema = z.object({
  code: z.string().min(3, { message: "coupons.validation.codeMinLength" }).max(20, { message: "coupons.validation.codeMaxLength" }),
  discountValue: z.coerce.number().min(0, { message: "coupons.validation.discountValueMin" }).max(100, { message: "coupons.validation.discountValueMax" }),
  discountType: z.enum(["percentage", "fixed"]),
  expiryDate: z.string().min(1, { message: "coupons.validation.expiryDateFuture" }),
  isActive: z.boolean(),
})

interface CouponFormProps {
  initialData?: CouponPlain
  onSubmit: (data: CouponPlain) => void
  onCancel?: () => void
  isLoading?: boolean
}

export default function CouponForm({ initialData, onSubmit, onCancel, isLoading }: CouponFormProps) {
  const { t } = useTranslation()
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: initialData?.code ?? "",
      discountValue: initialData?.discountValue ?? 0,
      discountType: initialData?.discountType ?? "percentage",
      expiryDate: initialData?.expiryDate ? format(new Date(initialData.expiryDate), "yyyy-MM-dd") : "",
      isActive: initialData?.isActive ?? true,
    },
  })

  async function handleSubmit(values: z.infer<typeof formSchema>) {
    setSubmitting(true)
    try {
      // Convert expiryDate to yyyy-MM-dd string
      const coupon: CouponPlain = {
        ...values,
        expiryDate: values.expiryDate,
      }
      onSubmit(coupon)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("coupons.fields.code")}</FormLabel>
              <FormControl>
                <Input {...field} disabled={isLoading || submitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="discountValue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("coupons.fields.discountValue")}</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} disabled={isLoading || submitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="discountType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("coupons.fields.discountType")}</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange} disabled={isLoading || submitting}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("coupons.fields.discountType")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">{t("coupons.discountTypes.percentage")}</SelectItem>
                    <SelectItem value="fixed">{t("coupons.discountTypes.fixed")}</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="expiryDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("coupons.fields.expiryDate")}</FormLabel>
              <FormControl>
                <Input type="date" {...field} disabled={isLoading || submitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>{t("coupons.fields.isActive")}</FormLabel>
              </div>
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={e => field.onChange(e.target.checked)}
                  disabled={isLoading || submitting}
                  className="form-checkbox h-5 w-5 text-blue-600"
                />
              </FormControl>
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading || submitting}>
              {t("common.cancel")}
            </Button>
          )}
          <Button type="submit" disabled={isLoading || submitting}>
            {submitting ? t("common.saving") : initialData ? t("common.update") : t("common.create")}
          </Button>
        </div>
      </form>
    </Form>
  )
}
