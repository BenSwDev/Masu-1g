"use client"

import { useMemo } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Separator } from "@/components/common/ui/separator"
import { Skeleton } from "@/components/common/ui/skeleton"
import { Badge } from "@/components/common/ui/badge"
import { CheckCircle, Calendar, Clock, User, Mail, Phone, FileText, CreditCard } from "lucide-react"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import type { BookingInitialData, SelectedBookingOptions, CalculatedPriceDetails } from "@/types/booking"

interface GuestInfo {
  firstName: string
  lastName: string
  email: string
  phone: string
  notes?: string
}

interface GuestSummaryStepProps {
  initialData: BookingInitialData
  bookingOptions: Partial<SelectedBookingOptions>
  guestInfo: Partial<GuestInfo>
  calculatedPrice: CalculatedPriceDetails | null
  isPriceCalculating: boolean
  onNext: () => void
  onPrev: () => void
}

export function GuestSummaryStep({
  initialData,
  bookingOptions,
  guestInfo,
  calculatedPrice,
  isPriceCalculating,
  onNext,
  onPrev,
}: GuestSummaryStepProps) {
  const { t, language } = useTranslation()

  const selectedTreatment = useMemo(() => {
    return (initialData?.activeTreatments || []).find(
      (t) => t._id.toString() === bookingOptions.selectedTreatmentId
    )
  }, [initialData?.activeTreatments, bookingOptions.selectedTreatmentId])

  const selectedDuration = useMemo(() => {
    if (selectedTreatment?.pricingType === "duration_based" && selectedTreatment.durations) {
      return selectedTreatment.durations.find((d) => d._id.toString() === bookingOptions.selectedDurationId)
    }
    return null
  }, [selectedTreatment, bookingOptions.selectedDurationId])

  const formatDateString = (date: Date) => {
    return format(date, "EEEE, d MMMM yyyy", { locale: language === "he" ? he : undefined })
  }

  const getTreatmentDurationText = () => {
    if (selectedTreatment?.pricingType === "fixed") {
      return selectedTreatment.defaultDuration 
        ? `${selectedTreatment.defaultDuration} ${t("common.minutes")}`
        : t("treatments.standardDuration")
    }
    if (selectedDuration) {
      const hours = Math.floor((selectedDuration.minutes || 0) / 60)
      const mins = (selectedDuration.minutes || 0) % 60
      let durationString = ""
      if (hours > 0) {
        durationString += `${hours} ${t(hours === 1 ? "common.hour" : "common.hours")}`
      }
      if (mins > 0) {
        if (hours > 0) durationString += ` ${t("common.and")} `
        durationString += `${mins} ${t(mins === 1 ? "common.minute" : "common.minutes")}`
      }
      return durationString || `${selectedDuration.minutes} ${t("common.minutes")}`
    }
    return ""
  }

  const getGenderPreferenceText = () => {
    switch (bookingOptions.therapistGenderPreference) {
      case "male":
        return t("bookings.genderPreference.male")
      case "female":
        return t("bookings.genderPreference.female")
      case "any":
      default:
        return t("bookings.genderPreference.any")
    }
  }

  const formatPrice = (amount: number) => {
    return `₪${amount.toFixed(2)}`
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <CheckCircle className="mx-auto h-12 w-12 text-primary mb-4" />
        <h2 className="text-2xl font-semibold tracking-tight">{t("bookings.steps.summary.title")}</h2>
        <p className="text-muted-foreground mt-2">{t("bookings.steps.summary.description")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Guest Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t("bookings.guestInformation")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("common.name")}:</span>
                <span className="font-medium">{guestInfo.firstName} {guestInfo.lastName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {t("common.email")}:
                </span>
                <span className="font-medium">{guestInfo.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {t("common.phone")}:
                </span>
                <span className="font-medium">{guestInfo.phone}</span>
              </div>
              {guestInfo.notes && (
                <div>
                  <span className="text-muted-foreground flex items-center gap-1 mb-2">
                    <FileText className="h-4 w-4" />
                    {t("bookings.notes")}:
                  </span>
                  <p className="text-sm bg-muted p-3 rounded-lg">{guestInfo.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Booking Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t("bookings.bookingDetails")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("treatments.treatment")}:</span>
                <span className="font-medium">{selectedTreatment?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("treatments.category")}:</span>
                <Badge variant="secondary">{selectedTreatment?.category}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("treatments.duration")}:</span>
                <span className="font-medium">{getTreatmentDurationText()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {t("bookings.date")}:
                </span>
                <span className="font-medium">
                  {bookingOptions.bookingDate ? formatDateString(bookingOptions.bookingDate) : "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {t("bookings.time")}:
                </span>
                <span className="font-medium">{bookingOptions.bookingTime || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("bookings.therapistPreference")}:</span>
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
            {t("bookings.priceBreakdown")}
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
            <div className="space-y-4">
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

              {calculatedPrice.finalAmount === 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 text-sm font-medium">
                    {t("bookings.freeBooking")}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-4">
              <p>{t("bookings.priceCalculationFailed")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          {t("common.back")}
        </Button>
        <Button 
          onClick={onNext} 
          disabled={isPriceCalculating || !calculatedPrice}
        >
          {calculatedPrice?.finalAmount === 0 
            ? t("bookings.confirmBooking") 
            : t("bookings.proceedToPayment")
          }
        </Button>
      </div>
    </div>
  )
} 