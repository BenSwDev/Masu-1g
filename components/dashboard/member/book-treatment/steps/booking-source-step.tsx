"use client"

import type React from "react"
import type { BookingInitialData, SelectedBookingOptions } from "@/types/booking"
import { Button } from "@/components/common/ui/button"
import { Card, CardDescription, CardTitle } from "@/components/common/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/common/ui/radio-group"
import { Label } from "@/components/common/ui/label"
import { Gift, Star, CalendarPlus, Info } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { BookingSourceSchema, type BookingSourceFormValues } from "@/lib/validation/booking-schemas"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/common/ui/form"
import { useEffect } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/common/ui/alert"
import { format } from "date-fns" // For formatting expiry date
import type { ITreatment } from "@/types"
import { useTranslation } from "@/lib/translations/i18n"

interface BookingSourceStepProps {
  initialData: BookingInitialData
  bookingOptions: Partial<SelectedBookingOptions>
  setBookingOptions: React.Dispatch<React.SetStateAction<Partial<SelectedBookingOptions>>>
  onNext: () => void
}

export default function BookingSourceStep({
  initialData,
  bookingOptions,
  setBookingOptions,
  onNext,
}: BookingSourceStepProps) {
  const { t } = useTranslation()
  const hasSubscriptions = initialData.activeUserSubscriptions && initialData.activeUserSubscriptions.length > 0
  const hasVouchers = initialData.usableGiftVouchers && initialData.usableGiftVouchers.length > 0

  const form = useForm<BookingSourceFormValues>({
    resolver: zodResolver(BookingSourceSchema),
    defaultValues: {
      source: bookingOptions.source || (hasSubscriptions || hasVouchers ? undefined : "new_purchase"),
    },
  })

  useEffect(() => {
    const subscription = form.watch((values) => {
      setBookingOptions((prev) => ({
        ...prev,
        source: values.source,
        selectedUserSubscriptionId:
          values.source !== "subscription_redemption" ? undefined : prev.selectedUserSubscriptionId,
        selectedGiftVoucherId: values.source !== "gift_voucher_redemption" ? undefined : prev.selectedGiftVoucherId,
      }))
    })
    return () => subscription.unsubscribe()
  }, [form, setBookingOptions])

  useEffect(() => {
    if (!hasSubscriptions && !hasVouchers && !form.getValues("source")) {
      form.setValue("source", "new_purchase", { shouldValidate: true })
    }
  }, [hasSubscriptions, hasVouchers, form])

  const onSubmitValidated = (data: BookingSourceFormValues) => {
    onNext()
  }

  const noOptionsAvailable = !hasSubscriptions && !hasVouchers

  // Helper to get subscription display details
  const getSubscriptionDisplayDetails = (sub: any) => {
    let details = `${(sub.subscriptionId as any)?.name || t("bookings.unknownSubscription") || "Unknown Subscription"}`
    details += ` (${t("bookings.subscriptions.remaining")}: ${sub.remainingQuantity})`

    const treatmentFromSub = sub.treatmentId as ITreatment | undefined
    if (treatmentFromSub) {
      details += ` - ${treatmentFromSub.name}`
      if (treatmentFromSub.pricingType === "duration_based" && sub.selectedDurationId) {
        const duration = treatmentFromSub.durations?.find((d) => d._id.toString() === sub.selectedDurationId.toString())
        if (duration) {
          details += ` (${duration.minutes} ${t("common.minutes")})`
        }
      }
    }
    if (sub.expiryDate) {
      details += ` (${t("subscriptions.expiry")}: ${format(new Date(sub.expiryDate), "PP")})`
    }
    return details
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmitValidated)} className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight">{t("bookings.steps.source.title")}</h2>
          <p className="text-muted-foreground mt-1">{t("bookings.steps.source.description")}</p>
        </div>

        <FormField
          control={form.control}
          name="source"
          render={({ field }) => (
            <FormItem className="space-y-4">
              <FormLabel className="sr-only">{t("bookings.steps.source.title")}</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {hasSubscriptions && (
                    <FormItem>
                      <FormControl>
                        <RadioGroupItem
                          value="subscription_redemption"
                          id="source_subscription"
                          className="peer sr-only"
                        />
                      </FormControl>
                      <Label htmlFor="source_subscription" className="block h-full">
                        <Card
                          className={`flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:shadow-lg transition-all h-full ${field.value === "subscription_redemption" ? "ring-2 ring-primary border-primary shadow-lg" : "border-border hover:border-muted-foreground/50"}`}
                        >
                          <Star className="w-12 h-12 mb-3 text-primary" />
                          <CardTitle className="mb-1 text-lg">
                            {t("bookings.steps.source.redeemSubscription")}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {t("bookings.steps.source.redeemSubscriptionDesc")} (
                            {initialData.activeUserSubscriptions.length} {t("bookings.steps.source.available")})
                          </CardDescription>
                          {/* Display more details about subscriptions if needed, or in the next step */}
                        </Card>
                      </Label>
                    </FormItem>
                  )}

                  {hasVouchers && (
                    <FormItem>
                      <FormControl>
                        <RadioGroupItem value="gift_voucher_redemption" id="source_voucher" className="peer sr-only" />
                      </FormControl>
                      <Label htmlFor="source_voucher" className="block h-full">
                        <Card
                          className={`flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:shadow-lg transition-all h-full ${field.value === "gift_voucher_redemption" ? "ring-2 ring-primary border-primary shadow-lg" : "border-border hover:border-muted-foreground/50"}`}
                        >
                          <Gift className="w-12 h-12 mb-3 text-primary" />
                          <CardTitle className="mb-1 text-lg">{t("bookings.steps.source.redeemVoucher")}</CardTitle>
                          <CardDescription className="text-xs">
                            {t("bookings.steps.source.redeemVoucherDesc")} ({initialData.usableGiftVouchers.length}{" "}
                            {t("bookings.steps.source.available")})
                          </CardDescription>
                        </Card>
                      </Label>
                    </FormItem>
                  )}

                  {/* Always show New Purchase, make it prominent if it's the only option */}
                  <FormItem className={noOptionsAvailable ? "lg:col-span-3 sm:col-span-2" : ""}>
                    <FormControl>
                      <RadioGroupItem value="new_purchase" id="source_new" className="peer sr-only" />
                    </FormControl>
                    <Label htmlFor="source_new" className="block h-full">
                      <Card
                        className={`flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:shadow-lg transition-all h-full ${field.value === "new_purchase" || noOptionsAvailable ? "ring-2 ring-primary border-primary shadow-lg" : "border-border hover:border-muted-foreground/50"}`}
                      >
                        <CalendarPlus className="w-12 h-12 mb-3 text-primary" />
                        <CardTitle className="mb-1 text-lg">{t("bookings.steps.source.newBooking")}</CardTitle>
                        <CardDescription className="text-xs">
                          {t("bookings.steps.source.newBookingDesc")}
                        </CardDescription>
                      </Card>
                    </Label>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage className="text-center" />
            </FormItem>
          )}
        />

        {!hasSubscriptions && !hasVouchers && (
          <Alert variant="default" className="mt-6">
            <Info className="h-4 w-4" />
            <AlertTitle>{t("bookings.steps.source.newBookingOnlyTitle")}</AlertTitle>
            <AlertDescription>{t("bookings.steps.source.newBookingOnlyDesc")}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end pt-6">
          <Button type="submit" disabled={!form.formState.isValid || form.formState.isSubmitting} size="lg">
            {t("common.next")}
          </Button>
        </div>
      </form>
    </Form>
  )
}
