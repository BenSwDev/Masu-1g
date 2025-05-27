"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/common/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/common/ui/form"
import { Input } from "@/components/common/ui/input"
import { Button } from "@/components/common/ui/button"
import { Checkbox } from "@/components/common/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { createPaymentMethod, updatePaymentMethod, type PaymentMethodFormData } from "@/actions/payment-method-actions"
import type { IPaymentMethod } from "@/lib/db/models/payment-method"
import { toast } from "sonner"
import { useTranslation } from "@/lib/translations/i18n"

const paymentMethodSchema = z.object({
  cardNumber: z
    .string()
    .min(13, "מספר כרטיס חייב להכיל לפחות 13 ספרות")
    .max(19, "מספר כרטיס לא יכול להכיל יותר מ-19 ספרות")
    .regex(/^\d+$/, "מספר כרטיס חייב להכיל רק ספרות"),
  expiryMonth: z.string().min(1, "חודש תוקף נדרש"),
  expiryYear: z.string().min(1, "שנת תוקף נדרשת"),
  cvv: z
    .string()
    .min(3, "CVV חייב להכיל לפחות 3 ספרות")
    .max(4, "CVV לא יכול להכיל יותר מ-4 ספרות")
    .regex(/^\d+$/, "CVV חייב להכיל רק ספרות"),
  cardHolderName: z.string().min(2, "שם בעל הכרטיס נדרש"),
  cardName: z.string().optional(),
  isDefault: z.boolean().optional(),
})

type PaymentMethodFormValues = z.infer<typeof paymentMethodSchema>

interface PaymentMethodFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  paymentMethod?: IPaymentMethod
}

export function PaymentMethodForm({ open, onOpenChange, paymentMethod }: PaymentMethodFormProps) {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const isEditing = !!paymentMethod

  const form = useForm<PaymentMethodFormValues>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: {
      cardNumber: paymentMethod?.cardNumber || "",
      expiryMonth: paymentMethod?.expiryMonth || "",
      expiryYear: paymentMethod?.expiryYear || "",
      cvv: paymentMethod?.cvv || "",
      cardHolderName: paymentMethod?.cardHolderName || "",
      cardName: paymentMethod?.cardName || "",
      isDefault: paymentMethod?.isDefault || false,
    },
  })

  useEffect(() => {
    if (paymentMethod) {
      form.reset({
        cardNumber: paymentMethod.cardNumber || "",
        expiryMonth: paymentMethod.expiryMonth || "",
        expiryYear: paymentMethod.expiryYear || "",
        cvv: paymentMethod.cvv || "",
        cardHolderName: paymentMethod.cardHolderName || "",
        cardName: paymentMethod.cardName || "",
        isDefault: paymentMethod.isDefault || false,
      })
    }
  }, [paymentMethod, form])

  const onSubmit = async (data: PaymentMethodFormValues) => {
    setIsLoading(true)
    try {
      const formData: PaymentMethodFormData = {
        cardNumber: data.cardNumber,
        expiryMonth: data.expiryMonth,
        expiryYear: data.expiryYear,
        cvv: data.cvv,
        cardHolderName: data.cardHolderName,
        cardName: data.cardName,
        isDefault: data.isDefault,
      }

      const result = isEditing
        ? await updatePaymentMethod(paymentMethod._id, formData)
        : await createPaymentMethod(formData)

      if (result.success) {
        toast.success(isEditing ? t("paymentMethods.updated") : t("paymentMethods.created"))
        onOpenChange(false)
        form.reset()
      } else {
        toast.error(isEditing ? t("paymentMethods.updateError") : t("paymentMethods.createError"))
      }
    } catch (error) {
      toast.error(t("paymentMethods.error"))
    } finally {
      setIsLoading(false)
    }
  }

  const formatCardNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, "")
    // Add spaces every 4 digits
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ")
  }

  const handleCardNumberChange = (value: string) => {
    const formatted = formatCardNumber(value)
    const digitsOnly = formatted.replace(/\s/g, "")
    form.setValue("cardNumber", digitsOnly)
  }

  // Generate month options
  const months = Array.from({ length: 12 }, (_, i) => {
    const month = (i + 1).toString().padStart(2, "0")
    return { value: month, label: month }
  })

  // Generate year options (current year + 10 years)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 11 }, (_, i) => {
    const year = (currentYear + i).toString()
    return { value: year, label: year }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("paymentMethods.edit") : t("paymentMethods.addNew")}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="cardNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("paymentMethods.fields.cardNumber")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="1234 5678 9012 3456"
                      value={formatCardNumber(field.value)}
                      onChange={(e) => handleCardNumberChange(e.target.value)}
                      maxLength={19}
                      className="text-center"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="expiryMonth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("paymentMethods.fields.expiryMonth")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="חודש" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {months.map((month) => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiryYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("paymentMethods.fields.expiryYear")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="שנה" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year.value} value={year.value}>
                            {year.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="cvv"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("paymentMethods.fields.cvv")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="123"
                      maxLength={4}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "")
                        field.onChange(value)
                      }}
                      className="text-center"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cardHolderName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("paymentMethods.fields.cardHolderName")}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="שם בעל הכרטיס" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cardName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("paymentMethods.fields.cardName")}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="שם הכרטיס (אופציונלי)" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isDefault"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>{t("paymentMethods.fields.isDefault")}</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-turquoise-500 hover:bg-turquoise-600">
                {isLoading ? t("common.loading") : t("common.save")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
