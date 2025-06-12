"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/common/ui/form"
import { Input } from "@/components/common/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Separator } from "@/components/common/ui/separator"
import { Loader2, CreditCard, Shield, Lock } from "lucide-react"
import type { CalculatedPriceDetails } from "@/types/booking"

interface GuestInfo {
  firstName: string
  lastName: string
  email: string
  phone: string
  notes?: string
}

interface GuestPaymentStepProps {
  calculatedPrice: CalculatedPriceDetails | null
  guestInfo: Partial<GuestInfo>
  onConfirm: () => void
  onPrev: () => void
  isLoading: boolean
}

const paymentSchema = z.object({
  cardNumber: z.string().min(16, { message: "מספר כרטיס אשראי חייב להכיל 16 ספרות" }),
  expiryMonth: z.string().min(1, { message: "בחר חודש תפוגה" }),
  expiryYear: z.string().min(1, { message: "בחר שנת תפוגה" }),
  cvv: z.string().min(3, { message: "CVV חייב להכיל לפחות 3 ספרות" }),
  cardholderName: z.string().min(2, { message: "שם בעל הכרטיס חייב להכיל לפחות 2 תווים" }),
})

type PaymentFormData = z.infer<typeof paymentSchema>

export function GuestPaymentStep({
  calculatedPrice,
  guestInfo,
  onConfirm,
  onPrev,
  isLoading,
}: GuestPaymentStepProps) {
  const { t } = useTranslation()

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      cardNumber: "",
      expiryMonth: "",
      expiryYear: "",
      cvv: "",
      cardholderName: `${guestInfo.firstName || ""} ${guestInfo.lastName || ""}`.trim(),
    },
  })

  const formatPrice = (amount: number) => {
    return `₪${amount.toFixed(2)}`
  }

  const formatCardNumber = (value: string) => {
    // Remove all non-digit characters
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    // Add spaces every 4 digits
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ""
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    if (parts.length) {
      return parts.join(" ")
    } else {
      return v
    }
  }

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value)
    form.setValue("cardNumber", formatted.replace(/\s/g, ""), { shouldValidate: true })
    e.target.value = formatted
  }

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 4)
    form.setValue("cvv", value, { shouldValidate: true })
    e.target.value = value
  }

  const onSubmit = (data: PaymentFormData) => {
    onConfirm()
  }

  // Generate month and year options
  const months = Array.from({ length: 12 }, (_, i) => {
    const month = (i + 1).toString().padStart(2, "0")
    return { value: month, label: month }
  })

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 10 }, (_, i) => {
    const year = (currentYear + i).toString()
    return { value: year, label: year }
  })

  if (!calculatedPrice || calculatedPrice.finalAmount === 0) {
    return (
      <div className="text-center py-8">
        <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">{t("bookings.noPaymentRequired")}</h3>
        <p className="text-muted-foreground mb-6">{t("bookings.freeBookingMessage")}</p>
        <div className="flex justify-between">
          <Button variant="outline" onClick={onPrev}>
            {t("common.back")}
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("bookings.confirmBooking")}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <CreditCard className="mx-auto h-12 w-12 text-primary mb-4" />
        <h2 className="text-2xl font-semibold tracking-tight">{t("bookings.steps.payment.title")}</h2>
        <p className="text-muted-foreground mt-2">{t("bookings.steps.payment.description")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {t("payments.paymentDetails")}
            </CardTitle>
            <CardDescription>{t("payments.securePaymentDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="cardholderName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("payments.cardholderName")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("payments.cardholderNamePlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cardNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("payments.cardNumber")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="1234 5678 9012 3456"
                          onChange={handleCardNumberChange}
                          maxLength={19}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="expiryMonth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("payments.month")}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="MM" />
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
                        <FormLabel>{t("payments.year")}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="YYYY" />
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

                  <FormField
                    control={form.control}
                    name="cvv"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CVV</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="123"
                            onChange={handleCvvChange}
                            maxLength={4}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>{t("payments.securePaymentNotice")}</span>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>{t("bookings.orderSummary")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>{t("bookings.basePrice")}:</span>
                <span>{formatPrice(calculatedPrice.basePrice)}</span>
              </div>
              
              {calculatedPrice.appliedDiscounts && calculatedPrice.appliedDiscounts.length > 0 && (
                <div className="space-y-2">
                  {calculatedPrice.appliedDiscounts.map((discount, index) => (
                    <div key={index} className="flex justify-between text-green-600">
                      <span>{discount.description}:</span>
                      <span>-{formatPrice(discount.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              {calculatedPrice.taxes && calculatedPrice.taxes > 0 && (
                <div className="flex justify-between">
                  <span>{t("bookings.taxes")}:</span>
                  <span>{formatPrice(calculatedPrice.taxes)}</span>
                </div>
              )}

              <Separator />
              
              <div className="flex justify-between text-lg font-semibold">
                <span>{t("bookings.totalAmount")}:</span>
                <span className="text-primary">{formatPrice(calculatedPrice.finalAmount)}</span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-800 text-sm">
                <Lock className="h-4 w-4" />
                <span>{t("payments.encryptedPayment")}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev} disabled={isLoading}>
          {t("common.back")}
        </Button>
        <Button 
          onClick={form.handleSubmit(onSubmit)} 
          disabled={isLoading}
          size="lg"
          className="min-w-32"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("payments.payNow")} {formatPrice(calculatedPrice.finalAmount)}
        </Button>
      </div>
    </div>
  )
} 