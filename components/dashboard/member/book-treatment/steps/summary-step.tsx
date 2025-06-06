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
import { useTranslation } from "@/lib/translations/i18n"

interface SummaryStepProps {
  initialData: BookingInitialData
  bookingOptions: Partial<SelectedBookingOptions>
  setBookingOptions: React.Dispatch<React.SetStateAction<Partial<SelectedBookingOptions>>>
  calculatedPrice: CalculatedPriceDetails | null
  isLoadingPrice: boolean
  onNext: () => void
  onPrev: () => void
}

export default function SummaryStep({
  initialData,
  bookingOptions,
  setBookingOptions,
  calculatedPrice,
  isLoadingPrice,
  onNext,
  onPrev,
}: SummaryStepProps) {
  const { t } = useTranslation()
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

  const appliedVoucherDetails = useMemo(() => {
    if (calculatedPrice?.appliedGiftVoucherId) {
      return initialData.usableGiftVouchers.find((v) => v._id.toString() === calculatedPrice.appliedGiftVoucherId)
    }
    return null
  }, [calculatedPrice?.appliedGiftVoucherId, initialData.usableGiftVouchers])

  const selectedGiftVoucherDisplay = useMemo(() => {
    if (bookingOptions.source === "gift_voucher_redemption" && bookingOptions.selectedGiftVoucherId) {
      const voucher = initialData.usableGiftVouchers.find(
        (v) => v._id.toString() === bookingOptions.selectedGiftVoucherId,
      )
      if (voucher) {
        if (voucher.voucherType === "treatment") {
          return `${voucher.code} (${voucher.treatmentName}${voucher.selectedDurationName ? ` - ${voucher.selectedDurationName}` : ""})`
        } else if (voucher.voucherType === "monetary") {
          return `${voucher.code} (${t("bookings.monetaryVoucher")} - ${t("bookings.balance")}: ${voucher.remainingAmount?.toFixed(2)} ${t("common.currency")})`
        }
      }
    }
    return null
  }, [bookingOptions.source, bookingOptions.selectedGiftVoucherId, initialData.usableGiftVouchers, t])

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
    if (!preferenceKey) return t("preferences.treatment.genderAny")
    const key = `preferences.treatment.gender${preferenceKey.charAt(0).toUpperCase()}${preferenceKey.slice(1)}`
    return t(key)
  }

  const getSubscriptionName = () => {
    if (bookingOptions.source === "subscription_redemption" && bookingOptions.selectedUserSubscriptionId) {
      const sub = initialData.activeUserSubscriptions.find(
        (s) => s._id.toString() === bookingOptions.selectedUserSubscriptionId,
      )
      if (sub && (sub.subscriptionId as any)?.name) {
        return (sub.subscriptionId as any).name
      }
      return t("bookings.unknownSubscription")
    }
    return null
  }

  const subscriptionName = getSubscriptionName()

  const treatmentDisplayDiv = (
    <div className="flex justify-between items-start">
      <span className="text-muted-foreground font-medium">{t("bookings.steps.summary.treatment")}:</span>
      <div className="font-semibold text-right">
        <span>
          {selectedTreatment?.name}
          {selectedDuration ? ` (${selectedDuration.minutes} ${t("common.minutes")})` : ""}
        </span>
        {subscriptionName && (
          <span className="block text-xs text-primary mt-1">
            <Ticket className="inline-block h-3 w-3 mr-1" />
            {t("bookings.steps.summary.usingSubscription")}: {subscriptionName}
          </span>
        )}
        {selectedGiftVoucherDisplay && (
          <span className="block text-xs text-primary mt-1">
            <GiftIcon className="inline-block h-3 w-3 mr-1" />
            {t("bookings.steps.summary.usingGiftVoucher")}: {selectedGiftVoucherDisplay}
          </span>
        )}
      </div>
    </div>
  )

  const showCouponCard =
    bookingOptions.source === "new_purchase" && // Only allow coupons for new purchases
    (!calculatedPrice ||
      (calculatedPrice &&
        !calculatedPrice.isFullyCoveredByVoucherOrSubscription &&
        calculatedPrice.finalAmount > 0 &&
        !calculatedPrice.appliedGiftVoucherId)) // Also hide if a gift voucher is already applied

  const priceSummaryContent = () => {
    if (!calculatedPrice) return null

    const {
      basePrice,
      surcharges,
      totalSurchargesAmount,
      treatmentPriceAfterSubscriptionOrTreatmentVoucher,
      couponDiscount,
      voucherAppliedAmount, // Amount ACTUALLY applied from voucher
      finalAmount,
      isBaseTreatmentCoveredBySubscription,
      isBaseTreatmentCoveredByTreatmentVoucher,
      isFullyCoveredByVoucherOrSubscription,
      appliedGiftVoucherId,
    } = calculatedPrice

    if (isFullyCoveredByVoucherOrSubscription) {
      let coveredByMessage = ""
      if (isBaseTreatmentCoveredBySubscription && totalSurchargesAmount === 0) {
        coveredByMessage = t("bookings.steps.summary.fullyCoveredBySubscription")
      } else if (isBaseTreatmentCoveredByTreatmentVoucher && totalSurchargesAmount === 0) {
        coveredByMessage = t("bookings.steps.summary.fullyCoveredByGiftVoucherTreatment")
      } else if (appliedGiftVoucherId && voucherAppliedAmount > 0 && finalAmount === 0) {
        // This case implies a monetary voucher covered everything (base + surcharges, or just surcharges if base was covered by sub/treatment voucher)
        const voucher = initialData.usableGiftVouchers.find((v) => v._id.toString() === appliedGiftVoucherId)
        if (voucher?.voucherType === "monetary") {
          coveredByMessage = t("bookings.steps.summary.fullyCoveredByGiftVoucherMonetary")
        } else {
          // Fallback if it's a treatment voucher that somehow led to full coverage with surcharges (less likely)
          coveredByMessage = t("bookings.steps.summary.fullyCoveredByGiftVoucher")
        }
      } else if (isBaseTreatmentCoveredBySubscription && totalSurchargesAmount > 0 && finalAmount === 0) {
        coveredByMessage = t("bookings.steps.summary.treatmentCoveredSurchargesPaidByOther")
      } else if (isBaseTreatmentCoveredByTreatmentVoucher && totalSurchargesAmount > 0 && finalAmount === 0) {
        coveredByMessage = t("bookings.steps.summary.treatmentVoucherCoveredSurchargesPaidByOther")
      }

      return (
        <>
          <Alert variant="default" className="mt-3 bg-green-50 border-green-200 text-green-700">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <AlertTitle className="font-semibold">{t("bookings.steps.summary.bookingCovered")}</AlertTitle>
            <AlertDescription>{coveredByMessage || t("bookings.steps.summary.noAdditionalPayment")}</AlertDescription>
          </Alert>
          <Separator className="my-3" />
          <div className="flex justify-between font-bold text-lg">
            <span>{t("bookings.steps.summary.totalAmount")}:</span>
            <span className="text-primary">{t("bookings.steps.summary.gift")}</span>
          </div>
        </>
      )
    }

    // Case 2: There is a finalAmount > 0 to pay
    return (
      <>
        {/* Display Base Price */}
        <div className="flex justify-between">
          <span>{t("bookings.steps.summary.basePrice")}:</span>
          <span>
            {basePrice.toFixed(2)} {t("common.currency")}
          </span>
        </div>

        {/* Indicate if base treatment was covered by subscription */}
        {isBaseTreatmentCoveredBySubscription && (
          <div className="flex justify-between items-center font-medium text-green-600">
            <span className="flex items-center">
              <Ticket className="mr-2 h-4 w-4" />
              {t("bookings.steps.summary.treatmentCoveredBySubscription")}
            </span>
            <span className="line-through text-muted-foreground">
              (-{basePrice.toFixed(2)} {t("common.currency")})
            </span>
          </div>
        )}
        {/* Indicate if base treatment was covered by a treatment-specific gift voucher */}
        {isBaseTreatmentCoveredByTreatmentVoucher && !isBaseTreatmentCoveredBySubscription && (
          <div className="flex justify-between items-center font-medium text-green-600">
            <span className="flex items-center">
              <GiftIcon className="mr-2 h-4 w-4" />
              {t("bookings.steps.summary.treatmentCoveredByVoucher")}
            </span>
            <span className="line-through text-muted-foreground">
              (-{basePrice.toFixed(2)} {t("common.currency")})
            </span>
          </div>
        )}

        {/* Display Surcharges */}
        {surcharges.map((surcharge, index) => (
          <div key={index} className="flex justify-between">
            <span>{t(surcharge.description) || surcharge.description}:</span>
            <span className="text-orange-600">
              + {surcharge.amount.toFixed(2)} {t("common.currency")}
            </span>
          </div>
        ))}

        {/* Display Monetary Voucher Application if any */}
        {appliedVoucherDetails && appliedVoucherDetails.voucherType === "monetary" && voucherAppliedAmount > 0 && (
          <div className="flex justify-between items-center font-medium text-green-600">
            <span className="flex items-center">
              <GiftIcon className="mr-2 h-4 w-4" />
              {t("bookings.steps.summary.monetaryVoucherApplied")} ({appliedVoucherDetails.code}):
            </span>
            <span>
              - {voucherAppliedAmount.toFixed(2)} {t("common.currency")}
            </span>
          </div>
        )}

        {/* Display Coupon Discount if any */}
        {couponDiscount > 0 && (
          <div className="flex justify-between items-center font-medium text-green-600">
            <span className="flex items-center">
              <Tag className="mr-2 h-4 w-4" />
              {t("bookings.steps.summary.couponDiscount")}:
            </span>
            <span>
              - {couponDiscount.toFixed(2)} {t("common.currency")}
            </span>
          </div>
        )}
        <Separator className="my-3" />
        <div className="flex justify-between font-bold text-lg">
          <span>{t("bookings.steps.summary.totalAmount")}:</span>
          <span className="text-primary">
            {finalAmount.toFixed(2)} {t("common.currency")}
          </span>
        </div>

        {/* Alert if base was covered by sub/treatment_voucher but there are still charges (surcharges not covered by monetary voucher) */}
        {(isBaseTreatmentCoveredBySubscription || isBaseTreatmentCoveredByTreatmentVoucher) && finalAmount > 0 && (
          <Alert variant="info" className="mt-3">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("bookings.steps.summary.additionalPaymentTitle")}</AlertTitle>
            <AlertDescription>{t("bookings.steps.summary.additionalPaymentDescSurcharges")}</AlertDescription>
          </Alert>
        )}
        {/* Alert if monetary voucher was used but didn't cover everything */}
        {appliedVoucherDetails &&
          appliedVoucherDetails.voucherType === "monetary" &&
          voucherAppliedAmount > 0 &&
          finalAmount > 0 && (
            <Alert variant="info" className="mt-3">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t("bookings.steps.summary.voucherPartialCoverageTitle")}</AlertTitle>
              <AlertDescription>{t("bookings.steps.summary.voucherPartialCoverageDesc")}</AlertDescription>
            </Alert>
          )}
      </>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmitValidated)} className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight">{t("bookings.steps.summary.title")}</h2>
          <p className="text-muted-foreground mt-1">{t("bookings.steps.summary.description")}</p>
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">{t("bookings.steps.summary.bookingDetails")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {treatmentDisplayDiv}
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">{t("bookings.steps.summary.dateTime")}:</span>
              <span className="font-semibold text-right">
                {bookingOptions.bookingDate && bookingOptions.bookingTime
                  ? `${format(new Date(bookingOptions.bookingDate), "PPP")} @ ${bookingOptions.bookingTime}`
                  : t("common.notAvailable")}
              </span>
            </div>
            {bookingOptions.isFlexibleTime && (
              <>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">{t("bookings.steps.summary.flexibleTime")}:</span>
                  <span className="font-semibold text-primary text-right">
                    {t("common.yes")} (+/- {bookingOptions.flexibilityRangeHours || 2} {t("common.hours")})
                  </span>
                </div>
              </>
            )}
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">{t("bookings.steps.summary.address")}:</span>
              <span className="font-semibold text-right">
                {selectedAddress
                  ? `${selectedAddress.street} ${selectedAddress.streetNumber || ""}, ${selectedAddress.city}`
                  : t("common.notAvailable")}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">
                {t("bookings.steps.summary.therapistPreference")}:
              </span>
              <span className="font-semibold text-right">
                {getGenderPreferenceText(bookingOptions.therapistGenderPreference)}
              </span>
            </div>
            {bookingOptions.notes && (
              <>
                <Separator />
                <div className="space-y-1">
                  <span className="text-muted-foreground font-medium">{t("bookings.steps.summary.notes")}:</span>
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
        )}

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">{t("common.priceSummary")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {isLoadingPrice && (
              <div className="flex items-center justify-center p-6 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary mr-3" />
                <span>{t("bookings.steps.summary.calculatingPrice")}</span>
              </div>
            )}
            {!isLoadingPrice && !calculatedPrice && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t("common.error")}</AlertTitle>
                <AlertDescription>{t("bookings.errors.priceCalculationUnavailable")}</AlertDescription>
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
            {t("common.back")}
          </Button>
          <Button type="submit" disabled={isNextDisabled || form.formState.isSubmitting} size="lg">
            {(form.formState.isSubmitting || isLoadingPrice) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {calculatedPrice?.finalAmount === 0 ? t("bookings.steps.summary.confirmBooking") : t("common.next")}
          </Button>
        </div>
      </form>
    </Form>
  )
}
