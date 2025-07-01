"use client"

import { useMemo } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle,
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  FileText,
  CreditCard,
  Tag,
} from "lucide-react"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import type {
  BookingInitialData,
  SelectedBookingOptions,
  CalculatedPriceDetails,
} from "@/types/booking"
import { formatPhoneForDisplay } from "@/lib/phone-utils"

interface GuestInfo {
  firstName: string
  lastName: string
  email: string
  phone: string
  birthDate?: Date
  gender?: "male" | "female" | "other"
  notes?: string
  isBookingForSomeoneElse?: boolean
  recipientFirstName?: string
  recipientLastName?: string
  recipientEmail?: string
  recipientPhone?: string
  recipientBirthDate?: Date
  recipientGender?: "male" | "female" | "other"
}

interface GuestSummaryStepProps {
  initialData: BookingInitialData
  bookingOptions: Partial<SelectedBookingOptions>
  guestInfo: Partial<GuestInfo>
  calculatedPrice: CalculatedPriceDetails | null
  isPriceCalculating: boolean
  onNext: () => void
  onPrev: () => void
  setBookingOptions?: React.Dispatch<React.SetStateAction<Partial<SelectedBookingOptions>>>
  voucher?: any
  userSubscription?: any
}

export function GuestSummaryStep({
  initialData,
  bookingOptions,
  guestInfo,
  calculatedPrice,
  isPriceCalculating,
  onNext,
  onPrev,
  setBookingOptions,
  voucher,
  userSubscription,
}: GuestSummaryStepProps) {
  const { t, language, dir } = useTranslation()

  const isRedeeming = Boolean(voucher || userSubscription)

  const getSubscriptionName = () => {
    if (bookingOptions.source === "subscription_redemption" && userSubscription) {
      return userSubscription.subscriptionId?.name || t("bookings.unknownSubscription")
    }
    return null
  }

  const selectedGiftVoucherDisplay = useMemo(() => {
    if (bookingOptions.source === "gift_voucher_redemption" && voucher) {
      if (voucher.voucherType === "treatment") {
        return `${voucher.code} (${voucher.treatmentName}${voucher.selectedDurationName ? ` - ${voucher.selectedDurationName}` : ""})`
      }
      return `${voucher.code} (×©×•×‘×¨ ×›×¡×¤×™ - ×™×ª×¨×”: ${voucher.remainingAmount?.toFixed(2)} â‚ª)`
    }
    return null
  }, [bookingOptions.source, voucher])

  const selectedTreatment = useMemo(() => {
    return (initialData?.activeTreatments || []).find(
      t => t._id.toString?.() || '' === bookingOptions.selectedTreatmentId
    )
  }, [initialData?.activeTreatments, bookingOptions.selectedTreatmentId])

  const selectedDuration = useMemo(() => {
    if (selectedTreatment?.pricingType === "duration_based" && selectedTreatment.durations) {
      return selectedTreatment.durations.find(
        (d: any) => d._id.toString?.() || '' === bookingOptions.selectedDurationId
      )
    }
    return null
  }, [selectedTreatment, bookingOptions.selectedDurationId])

  const formatDateString = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date
    return format(dateObj, "EEEE, d MMMM yyyy", { locale: language === "he" ? he : undefined })
  }

  const getTreatmentDurationText = () => {
    if (selectedTreatment?.pricingType === "fixed") {
      return selectedTreatment.defaultDuration
        ? `${selectedTreatment.defaultDuration} ×“×§×•×ª`
        : "×ž×©×š ×¡×˜× ×“×¨×˜×™"
    }
    if (selectedDuration) {
      return `${selectedDuration.minutes || 0} ×“×§×•×ª`
    }
    return ""
  }

  const getGenderPreferenceText = () => {
    switch (bookingOptions.therapistGenderPreference) {
      case "male":
        return "×ž×˜×¤×œ ×’×‘×¨"
      case "female":
        return "×ž×˜×¤×œ×ª ××™×©×”"
      case "any":
      default:
        return "×œ×œ× ×”×¢×“×¤×”"
    }
  }

  const formatPrice = (amount: number) => {
    return `â‚ª${amount.toFixed(2)}`
  }

  return (
    <div className="space-y-6" dir={dir}>
      <div className="text-center">
        <CheckCircle className="mx-auto h-12 w-12 text-primary mb-4" />
        <h2 className="text-2xl font-semibold tracking-tight">×¡×™×›×•× ×”×”×–×ž× ×”</h2>
        <p className="text-muted-foreground mt-2">×‘×“×•×§ ××ª ×¤×¨×˜×™ ×”×”×–×ž× ×” ×œ×¤× ×™ ×”×ž×¢×‘×¨ ×œ×ª×©×œ×•×</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Guest Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {guestInfo.isBookingForSomeoneElse ? "×¤×¨×˜×™ ×”×ž×–×ž×™×Ÿ" : "×¤×¨×˜×™ ×”××•×¨×—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">×©×:</span>
                <span className="font-medium">
                  {guestInfo.firstName} {guestInfo.lastName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  ××™×ž×™×™×œ:
                </span>
                <span className="font-medium">{guestInfo.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  ×˜×œ×¤×•×Ÿ:
                </span>
                <span className="font-medium">{formatPhoneForDisplay(guestInfo.phone || "")}</span>
              </div>
              {!guestInfo.isBookingForSomeoneElse && (
                <>
                  {guestInfo.birthDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">×ª××¨×™×š ×œ×™×“×”:</span>
                      <span className="font-medium">
                        {format(guestInfo.birthDate, "dd/MM/yyyy")}
                      </span>
                    </div>
                  )}
                  {guestInfo.gender && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">×ž×’×“×¨:</span>
                      <span className="font-medium">
                        {guestInfo.gender === "male"
                          ? "×’×‘×¨"
                          : guestInfo.gender === "female"
                            ? "××™×©×”"
                            : "××—×¨"}
                      </span>
                    </div>
                  )}
                </>
              )}
              {guestInfo.notes && (
                <div>
                  <span className="text-muted-foreground flex items-center gap-1 mb-2">
                    <FileText className="h-4 w-4" />
                    ×”×¢×¨×•×ª:
                  </span>
                  <p className="text-sm bg-muted p-3 rounded-lg">{guestInfo.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recipient Information (when booking for someone else) */}
        {guestInfo.isBookingForSomeoneElse && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                ×¤×¨×˜×™ ×ž×§×‘×œ ×”×˜×™×¤×•×œ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">×©×:</span>
                  <span className="font-medium">
                    {guestInfo.recipientFirstName} {guestInfo.recipientLastName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    ××™×ž×™×™×œ:
                  </span>
                  <span className="font-medium">{guestInfo.recipientEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    ×˜×œ×¤×•×Ÿ:
                  </span>
                  <span className="font-medium">
                    {formatPhoneForDisplay(guestInfo.recipientPhone || "")}
                  </span>
                </div>
                {guestInfo.recipientBirthDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">×ª××¨×™×š ×œ×™×“×”:</span>
                    <span className="font-medium">
                      {format(guestInfo.recipientBirthDate, "dd/MM/yyyy")}
                    </span>
                  </div>
                )}
                {guestInfo.recipientGender && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">×ž×’×“×¨:</span>
                    <span className="font-medium">
                      {guestInfo.recipientGender === "male"
                        ? "×’×‘×¨"
                        : guestInfo.recipientGender === "female"
                          ? "××™×©×”"
                          : "××—×¨"}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Booking Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              ×¤×¨×˜×™ ×”×”×–×ž× ×”
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-muted-foreground">×˜×™×¤×•×œ:</span>
                <div className="font-medium text-right">
                  <span>{selectedTreatment?.name}</span>
                  {getSubscriptionName() && (
                    <span className="block text-xs text-primary mt-1">
                      ðŸŽ« ×ž×©×ª×ž×© ×‘×ž× ×•×™: {getSubscriptionName()}
                    </span>
                  )}
                  {selectedGiftVoucherDisplay && (
                    <span className="block text-xs text-primary mt-1">
                      ðŸŽ ×ž×©×ª×ž×© ×‘×©×•×‘×¨: {selectedGiftVoucherDisplay}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">×§×˜×’×•×¨×™×”:</span>
                <Badge variant="secondary">{selectedTreatment?.category}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">×ž×©×š ×–×ž×Ÿ:</span>
                <span className="font-medium">{getTreatmentDurationText()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  ×ª××¨×™×š:
                </span>
                <span className="font-medium">
                  {bookingOptions.bookingDate ? formatDateString(bookingOptions.bookingDate) : "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  ×©×¢×”:
                </span>
                <span className="font-medium">{bookingOptions.bookingTime || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">×”×¢×“×¤×ª ×ž×˜×¤×œ:</span>
                <span className="font-medium">{getGenderPreferenceText()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Price Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            ×¤×™×¨×•×˜ ×ž×—×™×¨
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isPriceCalculating ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
            </div>
          ) : calculatedPrice ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>×ž×—×™×¨ ×‘×¡×™×¡:</span>
                <span>{formatPrice(calculatedPrice.basePrice)}</span>
              </div>

              {/* Surcharges */}
              {calculatedPrice.surcharges && calculatedPrice.surcharges.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-orange-700">×ª×•×¡×¤×•×ª ×ž×—×™×¨:</div>
                  {calculatedPrice.surcharges.map((surcharge, index) => (
                    <div key={index} className="flex justify-between text-orange-600 text-sm pr-4">
                      <span>â€¢ {surcharge.description || "×ª×•×¡×¤×ª ×ž×—×™×¨"}:</span>
                      <span>+{formatPrice(surcharge.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-orange-600 font-medium border-t pt-2">
                    <span>×¡×”"×› ×ª×•×¡×¤×•×ª:</span>
                    <span>+{formatPrice(calculatedPrice.totalSurchargesAmount)}</span>
                  </div>
                </div>
              )}

              {/* After subscription/voucher coverage */}
              {(calculatedPrice.isBaseTreatmentCoveredBySubscription ||
                calculatedPrice.isBaseTreatmentCoveredByTreatmentVoucher) && (
                <div className="space-y-2">
                  <div className="flex justify-between text-green-600">
                    <span>
                      {calculatedPrice.isBaseTreatmentCoveredBySubscription
                        ? "×›×•×¡×” ×¢×œ ×™×“×™ ×ž× ×•×™:"
                        : "×›×•×¡×” ×¢×œ ×™×“×™ ×©×•×‘×¨ ×˜×™×¤×•×œ:"}
                    </span>
                    <span>-{formatPrice(calculatedPrice.basePrice)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>×ž×—×™×¨ ×œ××—×¨ ×›×™×¡×•×™ ×ž× ×•×™/×©×•×‘×¨:</span>
                    <span>
                      {formatPrice(
                        calculatedPrice.treatmentPriceAfterSubscriptionOrTreatmentVoucher
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Gift voucher application */}
              {calculatedPrice.voucherAppliedAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span className="flex items-center gap-1">
                    <Tag className="h-4 w-4" />
                    ×©×•×‘×¨ ×ž×ª× ×”:
                  </span>
                  <span>-{formatPrice(calculatedPrice.voucherAppliedAmount)}</span>
                </div>
              )}

              {/* Coupon discount */}
              {calculatedPrice.couponDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span className="flex items-center gap-1">
                    <Tag className="h-4 w-4" />
                    ×”× ×—×ª ×§×•×¤×•×Ÿ:
                  </span>
                  <span>-{formatPrice(calculatedPrice.couponDiscount)}</span>
                </div>
              )}

              <Separator />

              {/* Final amount with emphasis if fully covered */}
              <div
                className={`flex justify-between font-bold text-lg ${
                  calculatedPrice.isFullyCoveredByVoucherOrSubscription ? "text-green-600" : ""
                }`}
              >
                <span>×ž×—×™×¨ ×¡×•×¤×™:</span>
                <span>
                  {calculatedPrice.isFullyCoveredByVoucherOrSubscription ? (
                    <span className="text-green-600 font-bold">×ž×›×•×¡×” ×‘×ž×œ×•××”!</span>
                  ) : (
                    formatPrice(calculatedPrice.finalAmount)
                  )}
                </span>
              </div>

              {/* Fully covered message */}
              {calculatedPrice.isFullyCoveredByVoucherOrSubscription && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 text-center font-medium">
                    ðŸŽ‰ ×”×˜×™×¤×•×œ ×ž×›×•×¡×” ×‘×ž×œ×•××” ×¢×œ ×™×“×™ ×”×ž×™×ž×•×©!
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-4">
              <p>×œ× × ×™×ª×Ÿ ×œ×—×©×‘ ××ª ×”×ž×—×™×¨ ×›×¨×’×¢. ×× × × ×¡×” ×©×•×‘.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          ×—×–×•×¨
        </Button>
        <Button onClick={onNext} disabled={isPriceCalculating || !calculatedPrice}>
          {calculatedPrice?.finalAmount === 0 ? "××©×¨ ×”×–×ž× ×”" : "×”×ž×©×š ×œ×ª×©×œ×•×"}
        </Button>
      </div>
    </div>
  )
}


