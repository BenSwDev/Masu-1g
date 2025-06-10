"use client"

import type React from "react"
import { useMemo } from "react"
import type { BookingInitialData, SelectedBookingOptions, CalculatedPriceDetails } from "@/types/booking"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Separator } from "@/components/common/ui/separator"
import { Loader2, AlertCircle, CheckCircle, Tag, GiftIcon, Ticket, User, Phone, Mail, MapPin } from "lucide-react"
import { format } from "date-fns"
import { Alert, AlertDescription, AlertTitle } from "@/components/common/ui/alert"
import { useTranslation } from "@/lib/translations/i18n"
import type { IAddress } from "@/lib/db/models/address" // Import IAddress

interface SummaryStepProps {
  initialData: BookingInitialData
  bookingOptions: Partial<SelectedBookingOptions>
  setBookingOptions: React.Dispatch<React.SetStateAction<Partial<SelectedBookingOptions>>> // Not used here, but kept for consistency
  calculatedPrice: CalculatedPriceDetails | null
  isLoadingPrice: boolean
  onNext: () => void
  onPrev: () => void
}

export default function SummaryStep({
  initialData,
  bookingOptions,
  calculatedPrice,
  isLoadingPrice,
  onNext,
  onPrev,
}: SummaryStepProps) {
  const { t, dir } = useTranslation()

  const currentUserDetails = initialData.currentUser
  const selectedTreatment = initialData.activeTreatments.find(
    (treat) => treat._id.toString() === bookingOptions.selectedTreatmentId,
  )
  const selectedDuration = selectedTreatment?.durations?.find(
    (d) => d._id.toString() === bookingOptions.selectedDurationId,
  )

  const addressToDisplay: Partial<IAddress & { notes?: string; fullAddress?: string }> | null = useMemo(() => {
    if (bookingOptions.customAddressDetails) {
      return bookingOptions.customAddressDetails
    }
    if (bookingOptions.selectedAddressId) {
      return initialData.userAddresses.find((addr) => addr._id.toString() === bookingOptions.selectedAddressId) || null
    }
    return null
  }, [bookingOptions.selectedAddressId, bookingOptions.customAddressDetails, initialData.userAddresses])

  const isNextDisabled = isLoadingPrice || !calculatedPrice

  const getGenderPreferenceText = (preferenceKey?: string) => {
    if (!preferenceKey) return t("preferences.treatment.genderAny")
    const key = `preferences.treatment.gender${preferenceKey.charAt(0).toUpperCase()}${preferenceKey.slice(1)}`
    return t(key) || preferenceKey
  }

  const getSubscriptionName = () => {
    if (bookingOptions.source === "subscription_redemption" && bookingOptions.selectedUserSubscriptionId) {
      const sub = initialData.activeUserSubscriptions.find(
        (s) => s._id.toString() === bookingOptions.selectedUserSubscriptionId,
      )
      return (sub?.subscriptionId as any)?.name || t("bookings.unknownSubscription")
    }
    return null
  }
  const subscriptionName = getSubscriptionName()

  const selectedGiftVoucherDisplay = useMemo(() => {
    if (bookingOptions.source === "gift_voucher_redemption" && bookingOptions.selectedGiftVoucherId) {
      const voucher = initialData.usableGiftVouchers.find(
        (v) => v._id.toString() === bookingOptions.selectedGiftVoucherId,
      )
      if (voucher) {
        if (voucher.voucherType === "treatment") {
          return `${voucher.code} (${voucher.treatmentName}${voucher.selectedDurationName ? ` - ${voucher.selectedDurationName}` : ""})`
        }
        return `${voucher.code} (${t("bookings.monetaryVoucher")} - ${t("bookings.balance")}: ${voucher.remainingAmount?.toFixed(2)} ${t("common.currency")})`
      }
    }
    return null
  }, [bookingOptions.source, bookingOptions.selectedGiftVoucherId, initialData.usableGiftVouchers, t])

  const priceSummaryContent = () => {
    if (!calculatedPrice) return null
    const {
      basePrice,
      surcharges,
      couponDiscount,
      voucherAppliedAmount,
      finalAmount,
      isBaseTreatmentCoveredBySubscription,
      isBaseTreatmentCoveredByTreatmentVoucher,
      isFullyCoveredByVoucherOrSubscription,
      appliedGiftVoucherId,
    } = calculatedPrice

    if (isFullyCoveredByVoucherOrSubscription) {
      return (
        <>
          <Alert variant="default" className="mt-3 bg-green-50 border-green-200 text-green-700">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <AlertTitle className="font-semibold">{t("bookings.steps.summary.bookingCovered")}</AlertTitle>
            <AlertDescription>{t("bookings.steps.summary.noAdditionalPayment")}</AlertDescription>
          </Alert>
          <Separator className="my-3" />
          <div className="flex justify-between font-bold text-lg">
            <span>{t("bookings.steps.summary.totalAmount")}:</span>
            <span className="text-primary">{t("bookings.steps.summary.gift")}</span>
          </div>
        </>
      )
    }

    return (
      <>
        <div className="flex justify-between">
          <span>{t("bookings.steps.summary.basePrice")}:</span>
          <span>
            {basePrice.toFixed(2)} {t("common.currency")}
          </span>
        </div>
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
        {surcharges.map((surcharge, index) => (
          <div key={index} className="flex justify-between">
            <span>{t(surcharge.description) || surcharge.description}:</span>
            <span className="text-orange-600">
              + {surcharge.amount.toFixed(2)} {t("common.currency")}
            </span>
          </div>
        ))}
        {appliedGiftVoucherId && voucherAppliedAmount > 0 && (
          <div className="flex justify-between items-center font-medium text-green-600">
            <span className="flex items-center">
              <GiftIcon className="mr-2 h-4 w-4" />
              {t("bookings.steps.summary.monetaryVoucherApplied")}
            </span>
            <span>
              - {voucherAppliedAmount.toFixed(2)} {t("common.currency")}
            </span>
          </div>
        )}
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
      </>
    )
  }

  const renderAddressLine = (labelKey: string, value?: string) =>
    value && (
      <p>
        <span className="text-muted-foreground">{t(labelKey)}:</span> {value}
      </p>
    )

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight">{t("bookings.steps.summary.title")}</h2>
        <p className="text-muted-foreground mt-1">{t("bookings.steps.summary.description")}</p>
      </div>

      {/* Booking For Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("bookings.steps.summary.bookingForTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {bookingOptions.isBookingForSomeoneElse && bookingOptions.recipientName ? (
            <>
              <div className="flex items-center">
                <User className={`h-4 w-4 text-primary ${dir === "rtl" ? "ml-2" : "mr-2"}`} />
                <span>
                  {t("bookings.steps.summary.recipientName")}: {bookingOptions.recipientName}
                </span>
              </div>
              {bookingOptions.recipientPhone && (
                <div className="flex items-center">
                  <Phone className={`h-4 w-4 text-primary ${dir === "rtl" ? "ml-2" : "mr-2"}`} />
                  <span>
                    {t("bookings.steps.summary.recipientPhone")}: {bookingOptions.recipientPhone}
                  </span>
                </div>
              )}
              {bookingOptions.recipientEmail && (
                <div className="flex items-center">
                  <Mail className={`h-4 w-4 text-primary ${dir === "rtl" ? "ml-2" : "mr-2"}`} />
                  <span>
                    {t("bookings.steps.summary.recipientEmail")}: {bookingOptions.recipientEmail}
                  </span>
                </div>
              )}
              <Separator className="my-2" />
              <p className="text-xs text-muted-foreground">{t("bookings.steps.summary.bookedBy")}:</p>
              <div className="flex items-center">
                <User className={`h-4 w-4 text-gray-500 ${dir === "rtl" ? "ml-2" : "mr-2"}`} />
                <span>{currentUserDetails?.name || t("common.notAvailable")}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center">
                <User className="mr-2 h-4 w-4 text-primary" />
                <span>{currentUserDetails?.name || t("common.notAvailable")}</span>
              </div>
              {currentUserDetails?.email && (
                <div className="flex items-center">
                  <Mail className="mr-2 h-4 w-4 text-primary" />
                  <span>{currentUserDetails.email}</span>
                </div>
              )}
              {currentUserDetails?.phone && (
                <div className="flex items-center">
                  <Phone className="mr-2 h-4 w-4 text-primary" />
                  <span>{currentUserDetails.phone}</span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Treatment Details Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("bookings.steps.summary.treatmentDetails")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
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
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground font-medium">{t("bookings.steps.summary.dateTime")}:</span>
            <span className="font-semibold text-right">
              {bookingOptions.bookingDate && bookingOptions.bookingTime
                ? `${format(new Date(bookingOptions.bookingDate), "PPP", { locale: initialData.locale })} @ ${bookingOptions.bookingTime}`
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

      {/* Address Details Section */}
      {addressToDisplay && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <MapPin className="mr-2 h-5 w-5 text-primary" />
              {t("bookings.steps.summary.addressTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-semibold">
              {addressToDisplay.fullAddress ||
                `${addressToDisplay.street} ${addressToDisplay.streetNumber || ""}, ${addressToDisplay.city}`}
            </p>
            {renderAddressLine("addresses.fields.city", addressToDisplay.city)}
            {renderAddressLine("addresses.fields.street", addressToDisplay.street)}
            {renderAddressLine("addresses.fields.streetNumber", addressToDisplay.streetNumber)}
            {renderAddressLine("addresses.fields.apartment", addressToDisplay.apartment)}
            {renderAddressLine("addresses.fields.entrance", addressToDisplay.entrance)}
            {renderAddressLine("addresses.fields.floor", addressToDisplay.floor)}
            {addressToDisplay.notes && (
              <>
                <Separator className="my-2" />
                <p className="text-xs">
                  <span className="text-muted-foreground">{t("addresses.fields.notes")}:</span> {addressToDisplay.notes}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Price Summary Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("common.priceSummary")}</CardTitle>
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

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6">
        <Button
          variant="outline"
          type="button"
          onClick={onPrev}
          disabled={isLoadingPrice}
          size="lg"
          className="w-full sm:w-auto"
        >
          {t("common.back")}
        </Button>
        <Button type="button" onClick={onNext} disabled={isNextDisabled} size="lg" className="w-full sm:w-auto">
          {isLoadingPrice && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {calculatedPrice?.finalAmount === 0 ? t("bookings.steps.summary.confirmBooking") : t("common.next")}
        </Button>
      </div>
    </div>
  )
}
