"use client"

import type React from "react"
import { useEffect, useState } from "react"
import type { BookingInitialData, SelectedBookingOptions, CalculatedPriceDetails } from "@/types/booking"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Loader2, CreditCard, CheckCircle, Tag } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { PaymentDetailsSchema, type PaymentFormValues } from "@/lib/validation/booking-schemas"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/common/ui/form"
import type { IPaymentMethod } from "@/lib/db/models/payment-method"
import { useTranslation } from "@/lib/translations/i18n"
import { Input } from "@/components/common/ui/input"
import { Checkbox } from "@/components/common/ui/checkbox"
import Link from "next/link"
import { PaymentMethodSelector } from "@/components/common/purchase/payment-method-selector"

interface PaymentStepProps {
  initialData: BookingInitialData
  bookingOptions: Partial<SelectedBookingOptions>
  setBookingOptions: React.Dispatch<React.SetStateAction<Partial<SelectedBookingOptions>>>
  calculatedPrice: CalculatedPriceDetails | null
  onSubmit: () => Promise<void>
  isLoading: boolean
  onPrev: () => void
}

export default function PaymentStep({
  initialData,
  bookingOptions,
  setBookingOptions,
  calculatedPrice,
  onSubmit,
  isLoading,
  onPrev,
}: PaymentStepProps) {
  const { t } = useTranslation()
  const [isClientLoading, setIsClientLoading] = useState(true)
  const [localPaymentMethods, setLocalPaymentMethods] = useState<IPaymentMethod[]>(initialData.userPaymentMethods || [])

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(PaymentDetailsSchema),
    defaultValues: {
      selectedPaymentMethodId: bookingOptions.selectedPaymentMethodId || undefined,
      appliedCouponCode: bookingOptions.appliedCouponCode || "",
      agreedToTerms: false,
      agreedToMarketing: true,
    },
  })

  useEffect(() => {
    setIsClientLoading(false)
  }, [])

  useEffect(() => {
    setLocalPaymentMethods(initialData.userPaymentMethods || [])
  }, [initialData.userPaymentMethods])

  useEffect(() => {
    if (localPaymentMethods.length > 0 && !form.getValues("selectedPaymentMethodId")) {
      const defaultMethod = localPaymentMethods.find((pm) => pm.isDefault) || localPaymentMethods[0]
      if (defaultMethod) {
        form.setValue("selectedPaymentMethodId", defaultMethod._id.toString())
      }
    }
  }, [localPaymentMethods, form])

  useEffect(() => {
    const subscription = form.watch((values) => {
      setBookingOptions((prev) => ({
        ...prev,
        selectedPaymentMethodId: values.selectedPaymentMethodId,
        appliedCouponCode: values.appliedCouponCode,
      }))
    })
    return () => subscription.unsubscribe()
  }, [form, setBookingOptions])

  const handlePaymentMethodUpserted = (upsertedMethod: IPaymentMethod) => {
    setLocalPaymentMethods((prev) => {
      const existingIndex = prev.findIndex((pm) => pm._id.toString() === upsertedMethod._id.toString())
      let newMethods = existingIndex !== -1 ? [...prev] : [...prev, upsertedMethod]
      if (existingIndex !== -1) newMethods[existingIndex] = upsertedMethod
      if (upsertedMethod.isDefault) {
        newMethods = newMethods.map((pm) =>
          pm._id.toString() === upsertedMethod._id.toString() ? pm : { ...pm, isDefault: false },
        )
      }
      return newMethods
    })
    form.setValue("selectedPaymentMethodId", upsertedMethod._id.toString())
  }

  const onSubmitValidated = async (data: PaymentFormValues) => {
    await onSubmit()
  }

  if (isClientLoading || !calculatedPrice) {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[300px] text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <span>{t("bookings.steps.payment.loadingPrice")}</span>
      </div>
    )
  }

  if (calculatedPrice.isFullyCoveredByVoucherOrSubscription && calculatedPrice.finalAmount === 0) {
    return (
      <div className="space-y-8 text-center">
        <div className="flex flex-col items-center">
          <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
          <h2 className="text-2xl font-semibold tracking-tight">{t("bookings.steps.payment.confirmTitleNoPayment")}</h2>
          <p className="text-muted-foreground mt-1 max-w-md mx-auto">
            {t("bookings.steps.payment.confirmDescNoPayment")}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
          <Button variant="outline" onClick={onPrev} disabled={isLoading} type="button" size="lg">
            {t("common.back")}
          </Button>
          <Button onClick={onSubmit} disabled={isLoading} type="button" size="lg">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("bookings.steps.payment.confirmBooking")}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmitValidated)} className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight">{t("bookings.steps.payment.title")}</h2>
          <p className="text-muted-foreground mt-1">
            {t("bookings.steps.payment.description")}
            <span className="font-semibold text-primary">
              {" "}
              {t("common.totalPrice")}: {calculatedPrice.finalAmount?.toFixed(2) || '0.00'} {t("common.currency")}
            </span>
          </p>
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <CreditCard className="mr-2 h-5 w-5 text-primary" />
              {t("bookings.steps.payment.selectPaymentMethod")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="selectedPaymentMethodId"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <PaymentMethodSelector
                      paymentMethods={localPaymentMethods}
                      selectedPaymentMethodId={field.value || ""}
                      onPaymentMethodSelect={field.onChange}
                      onPaymentMethodUpserted={handlePaymentMethodUpserted}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Tag className="mr-2 h-5 w-5 text-primary" />
              {t("bookings.steps.summary.couponCode")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="appliedCouponCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="coupon-code" className="sr-only">
                    {t("bookings.steps.summary.couponCode")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      id="coupon-code"
                      placeholder={t("bookings.steps.summary.couponPlaceholder")}
                      {...field}
                      className="text-base"
                    />
                  </FormControl>
                  <FormDescription>{t("bookings.steps.summary.couponDesc")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="agreedToTerms"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>{t("bookings.steps.payment.agreeToTermsLabel")}</FormLabel>
                  <FormDescription>
                    {t("bookings.steps.payment.agreeToTermsDesc")}{" "}
                    <Link href="/terms" className="text-primary underline">
                      {t("common.termsOfService")}
                    </Link>
                    .
                  </FormDescription>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="agreedToMarketing"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>{t("bookings.steps.payment.agreeToMarketingLabel")}</FormLabel>
                </div>
              </FormItem>
            )}
          />
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6">
          <Button
            variant="outline"
            onClick={onPrev}
            disabled={isLoading}
            type="button"
            size="lg"
            className="w-full sm:w-auto"
          >
            {t("common.back")}
          </Button>
          <Button type="submit" disabled={isLoading || !form.formState.isValid} size="lg" className="w-full sm:w-auto">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("bookings.steps.payment.payAndConfirm")} {calculatedPrice.finalAmount?.toFixed(2) || '0.00'} {t("common.currency")}
          </Button>
        </div>
      </form>
    </Form>
  )
}
