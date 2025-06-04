"use client"

import { FormDescription } from "@/components/common/ui/form"

import type React from "react"
import { useEffect, useMemo } from "react"
import type { BookingInitialData, SelectedBookingOptions, CalculatedPriceDetails } from "@/types/booking"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Input } from "@/components/common/ui/input"
import { Separator } from "@/components/common/ui/separator"
import { Loader2, AlertCircle, CheckCircle, Tag, GiftIcon, Ticket } from "lucide-react"
import { format } from "date-fns"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { SummarySchema, type SummaryFormValues } from "@/lib/validation/booking-schemas"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/common/ui/form"
import { Alert, AlertDescription, AlertTitle } from "@/components/common/ui/alert"

interface SummaryStepProps {
  initialData: BookingInitialData
  bookingOptions: Partial<SelectedBookingOptions>
  setBookingOptions: React.Dispatch<React.SetStateAction<Partial<SelectedBookingOptions>>>
  calculatedPrice: CalculatedPriceDetails | null
  isLoadingPrice: boolean
  onNext: () => void
  onPrev: () => void
  translations: Record<string, string>
}

export default function SummaryStep({
  initialData,
  bookingOptions,
  setBookingOptions,
  calculatedPrice,
  isLoadingPrice,
  onNext,
  onPrev,
  translations,
}: SummaryStepProps) {
  const selectedTreatment = initialData.activeTreatments.find(
    (t) => t._id.toString() === bookingOptions.selectedTreatmentId,
  )
  const selectedDuration = selectedTreatment?.durations?.find(
    (d) => d._id.toString() === bookingOptions.selectedDurationId,
  )
  const selectedAddress = initialData.userAddresses.find((a) => a._id.toString() === bookingOptions.selectedAddressId)

  const form = useForm<SummaryFormValues>({
    resolver: zodResolver(SummarySchema),
    defaultValues: {
      appliedCouponCode: bookingOptions.appliedCouponCode || "",
    },
  })

  const selectedGiftVoucherDisplay = useMemo(() => {
    if (bookingOptions.source === "gift_voucher_redemption" && bookingOptions.selectedGiftVoucherId) {
      const voucher = initialData.usableGiftVouchers.find(
        (v) => v._id.toString() === bookingOptions.selectedGiftVoucherId,
      )
      if (voucher) {
        if (voucher.voucherType === "treatment") {
          return `${voucher.code} (${voucher.treatmentName}${voucher.selectedDurationName ? ` - ${voucher.selectedDurationName}` : ""})`
        } else if (voucher.voucherType === "monetary") {
          // For monetary voucher, we'll show its effect in the price breakdown,
          // but we can still acknowledge its selection here.
          return `${voucher.code} (${translations["bookings.monetaryVoucher"] || "Monetary Voucher"})`
        }
      }
    }
    return null
  }, [bookingOptions.source, bookingOptions.selectedGiftVoucherId, initialData.usableGiftVouchers, translations])

  useEffect(() => {
    const subscription = form.watch((values) => {
      setBookingOptions((prev) => ({
        ...prev,
        appliedCouponCode: values.appliedCouponCode,
      }))
    })
    return () => subscription.unsubscribe()
  }, [form, setBookingOptions])

  const onSubmitValidated = (data: SummaryFormValues) => {
    onNext()
  }

  const isNextDisabled = isLoadingPrice || !calculatedPrice

  const getGenderPreferenceText = (preferenceKey?: string) => {
    if (!preferenceKey) return translations["preferences.treatment.genderAny"] || "Any"
    const key = `preferences.treatment.gender${preferenceKey.charAt(0).toUpperCase()}${preferenceKey.slice(1)}`
    return translations[key] || preferenceKey
  }

  const getSubscriptionName = () => {
    if (bookingOptions.source === "subscription_redemption" && bookingOptions.selectedUserSubscriptionId) {
      const sub = initialData.activeUserSubscriptions.find(
        (s) => s._id.toString() === bookingOptions.selectedUserSubscriptionId,
      )
      if (sub && (sub.subscriptionId as any)?.name) {
        return (sub.subscriptionId as any).name
      }
      return translations["bookings.unknownSubscription"] || "Unknown Subscription"
    }
    return null
  }

  const subscriptionName = getSubscriptionName()

  const treatmentDisplayDiv = (
    <div className="flex justify-between items-start">
      <span className="text-muted-foreground font-medium">
        {translations["bookings.steps.summary.treatment"] || "Treatment"}:
      </span>
      <div className="font-semibold text-right">
        <span>
          {selectedTreatment?.name}
          {selectedDuration ? ` (${selectedDuration.minutes} ${translations["common.minutes"] || "min"})` : ""}
        </span>
        {subscriptionName && (
          <span className="block text-xs text-primary mt-1">
            <Ticket className="inline-block h-3 w-3 mr-1" />
            {translations["bookings.steps.summary.usingSubscription"] || "Using subscription"}: {subscriptionName}
          </span>
        )}
        {selectedGiftVoucherDisplay && (
          <span className="block text-xs text-primary mt-1">
            <GiftIcon className="inline-block h-3 w-3 mr-1" />
            {translations["bookings.steps.summary.usingGiftVoucher"] || "Using Gift Voucher"}:{" "}
            {selectedGiftVoucherDisplay}
          </span>
        )}
      </div>
    </div>
  )

  const showCouponCard =
    bookingOptions.source === "new_purchase" &&
    (!calculatedPrice ||
      (calculatedPrice && !calculatedPrice.isFullyCoveredByVoucherOrSubscription && calculatedPrice.finalAmount > 0))

  const priceSummaryContent = () => {
    if (!calculatedPrice) return null

    if (calculatedPrice.isFullyCoveredByVoucherOrSubscription && calculatedPrice.finalAmount === 0) {
      let coveredByMessage = ""
      if (bookingOptions.source === "subscription_redemption") {
        coveredByMessage =
          translations["bookings.steps.summary.fullyCoveredBySubscription"] || "Fully covered by your subscription."
      } else if (bookingOptions.source === "gift_voucher_redemption") {
        const voucher = initialData.usableGiftVouchers.find(
          (v) => v._id.toString() === calculatedPrice.appliedGiftVoucherId,
        )
        if (voucher?.voucherType === "treatment") {
          coveredByMessage =
            translations["bookings.steps.summary.fullyCoveredByGiftVoucherTreatment"] ||
            "Your treatment is fully covered by the gift voucher."
        } else {
          // Monetary voucher that covered everything
          coveredByMessage =
            translations["bookings.steps.summary.fullyCoveredByGiftVoucherMonetary"] ||
            "The cost is fully covered by your gift voucher."
        }
      }

      return (
        <>
          <Alert variant="default" className="mt-3 bg-green-50 border-green-200 text-green-700">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <AlertTitle className="font-semibold">
              {translations["bookings.steps.summary.bookingCovered"] || "Booking Covered!"}
            </AlertTitle>
            <AlertDescription>{coveredByMessage}</AlertDescription>
          </Alert>
          <Separator className="my-3" />
          <div className="flex justify-between font-bold text-lg">
            <span>{translations["bookings.steps.summary.totalAmount"] || "Total Amount"}:</span>
            <span className="text-primary">{translations["bookings.steps.summary.gift"] || "Gift"}</span>
          </div>
        </>
      )
    }

    return (
      <>
        <div className="flex justify-between">
          <span>{translations["bookings.steps.summary.basePrice"] || "Base Price"}:</span>
          <span>
            {calculatedPrice.basePrice.toFixed(2)} {translations["common.currency"] || "ILS"}
          </span>
        </div>
        {calculatedPrice.surcharges.map((surcharge, index) => (
          <div key={index} className="flex justify-between">
            <span>{translations[surcharge.description] || surcharge.description}:</span>
            <span className="text-orange-600">
              + {surcharge.amount.toFixed(2)} {translations["common.currency"] || "ILS"}
            </span>
          </div>
        ))}

        {calculatedPrice.redeemedUserSubscriptionId && (
          <div className="flex justify-between items-center font-medium text-green-600">
            <span className="flex items-center">
              <Ticket className="mr-2 h-4 w-4" />
              {translations["bookings.steps.summary.redeemedFromSubscription"] || "Subscription Redemption"}:
            </span>
            <span>
              -{" "}
              {(calculatedPrice.basePrice + calculatedPrice.surcharges.reduce((sum, s) => sum + s.amount, 0)).toFixed(
                2,
              )}{" "}
              {translations["common.currency"] || "ILS"}
            </span>
          </div>
        )}
        {calculatedPrice.voucherAppliedAmount > 0 &&
          !(
            calculatedPrice.isFullyCoveredByVoucherOrSubscription &&
            calculatedPrice.finalAmount === 0 &&
            initialData.usableGiftVouchers.find((v) => v._id.toString() === calculatedPrice.appliedGiftVoucherId)
              ?.voucherType === "treatment"
          ) && (
            <div className="flex justify-between items-center font-medium text-green-600">
              <span className="flex items-center">
                <GiftIcon className="mr-2 h-4 w-4" />
                {translations["bookings.steps.summary.voucherApplied"] || "Gift Voucher Applied"}:
              </span>
              <span>
                - {calculatedPrice.voucherAppliedAmount.toFixed(2)} {translations["common.currency"] || "ILS"}
              </span>
            </div>
          )}
        {calculatedPrice.couponDiscount > 0 && (
          <div className="flex justify-between items-center font-medium text-green-600">
            <span className="flex items-center">
              <Tag className="mr-2 h-4 w-4" />
              {translations["bookings.steps.summary.couponDiscount"] || "Coupon Discount"}:
            </span>
            <span>
              - {calculatedPrice.couponDiscount.toFixed(2)} {translations["common.currency"] || "ILS"}
            </span>
          </div>
        )}
        <Separator className="my-3" />
        <div className="flex justify-between font-bold text-lg">
          <span>{translations["bookings.steps.summary.totalAmount"] || "Total Amount"}:</span>
          <span className="text-primary">
            {calculatedPrice.finalAmount.toFixed(2)} {translations["common.currency"] || "ILS"}
          </span>
        </div>
      </>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmitValidated)} className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            {translations["bookings.steps.summary.title"] || "Review Your Booking"}
          </h2>
          <p className="text-muted-foreground mt-1">
            {translations["bookings.steps.summary.description"] ||
              "Please confirm the details below before proceeding."}
          </p>
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">
              {translations["bookings.steps.summary.bookingDetails"] || "Booking Details"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {treatmentDisplayDiv}
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">
                {translations["bookings.steps.summary.dateTime"] || "Date & Time"}:
              </span>
              <span className="font-semibold text-right">
                {bookingOptions.bookingDate && bookingOptions.bookingTime
                  ? `${format(new Date(bookingOptions.bookingDate), "PPP")} @ ${bookingOptions.bookingTime}`
                  : translations["common.notAvailable"] || "N/A"}
              </span>
            </div>
            {bookingOptions.isFlexibleTime && (
              <>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">
                    {translations["bookings.steps.summary.flexibleTime"] || "Flexible Time"}:
                  </span>
                  <span className="font-semibold text-primary text-right">
                    {translations["common.yes"] || "Yes"} (+/- {bookingOptions.flexibilityRangeHours || 2}{" "}
                    {translations["common.hours"] || "hours"})
                  </span>
                </div>
              </>
            )}
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">
                {translations["bookings.steps.summary.address"] || "Address"}:
              </span>
              <span className="font-semibold text-right">
                {selectedAddress
                  ? `${selectedAddress.street} ${selectedAddress.streetNumber || ""}, ${selectedAddress.city}`
                  : translations["common.notAvailable"] || "N/A"}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">
                {translations["bookings.steps.summary.therapistPreference"] || "Therapist Preference"}:
              </span>
              <span className="font-semibold text-right">
                {getGenderPreferenceText(bookingOptions.therapistGenderPreference)}
              </span>
            </div>
            {bookingOptions.notes && (
              <>
                <Separator />
                <div className="space-y-1">
                  <span className="text-muted-foreground font-medium">
                    {translations["bookings.steps.summary.notes"] || "Notes"}:
                  </span>
                  <p className="font-semibold text-sm bg-muted p-2 rounded-md whitespace-pre-wrap">
                    {bookingOptions.notes}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {showCouponCard && (
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Tag className="mr-2 h-5 w-5 text-primary" />
                {translations["bookings.steps.summary.couponCode"] || "Have a Coupon Code?"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="appliedCouponCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="coupon-code" className="sr-only">
                      {translations["bookings.steps.summary.couponCode"]}
                    </FormLabel>
                    <FormControl>
                      <Input
                        id="coupon-code"
                        placeholder={translations["bookings.steps.summary.couponPlaceholder"] || "Enter coupon code"}
                        {...field}
                        className="text-base"
                      />
                    </FormControl>
                    <FormDescription>
                      {translations["bookings.steps.summary.couponDesc"] ||
                        "If you have a coupon, enter it here to apply the discount."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )}

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">{translations["common.priceSummary"] || "Price Summary"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {isLoadingPrice && (
              <div className="flex items-center justify-center p-6 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary mr-3" />
                <span>{translations["bookings.steps.summary.calculatingPrice"] || "Calculating price..."}</span>
              </div>
            )}
            {!isLoadingPrice && !calculatedPrice && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{translations["common.error"] || "Error"}</AlertTitle>
                <AlertDescription>
                  {translations["bookings.errors.priceCalculationUnavailable"] ||
                    "Price details are currently unavailable. Please ensure all previous steps are completed correctly."}
                </AlertDescription>
              </Alert>
            )}
            {!isLoadingPrice && calculatedPrice && priceSummaryContent()}
          </CardContent>
        </Card>

        <div className="flex justify-between pt-6">
          <Button
            variant="outline"
            type="button"
            onClick={onPrev}
            disabled={form.formState.isSubmitting || isLoadingPrice}
            size="lg"
          >
            {translations["common.back"] || "Back"}
          </Button>
          <Button type="submit" disabled={isNextDisabled || form.formState.isSubmitting} size="lg">
            {(form.formState.isSubmitting || isLoadingPrice) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {calculatedPrice?.finalAmount === 0
              ? translations["bookings.steps.summary.confirmBooking"] || "Confirm Booking"
              : translations["common.next"] || "Next"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
