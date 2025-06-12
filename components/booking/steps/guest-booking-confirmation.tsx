"use client"

import { useMemo } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Alert, AlertDescription } from "@/components/common/ui/alert"
import { CheckCircle, Calendar, Clock, MapPin, Phone, Mail, Home, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import Link from "next/link"
import type { BookingInitialData } from "@/types/booking"
import type { IBooking } from "@/lib/db/models/booking"

interface GuestBookingConfirmationProps {
  bookingResult: IBooking | null
  initialData: BookingInitialData
}

export function GuestBookingConfirmation({
  bookingResult,
  initialData,
}: GuestBookingConfirmationProps) {
  const { t, language, dir } = useTranslation()

  const bookingTreatment = useMemo(() => {
    if (!bookingResult?.treatmentId) return null
    return (initialData?.activeTreatments || []).find(
      (t) => t._id.toString() === bookingResult.treatmentId.toString()
    )
  }, [bookingResult?.treatmentId, initialData?.activeTreatments])

  const formatDateString = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date
    return format(dateObj, "EEEE, d MMMM yyyy", { locale: language === "he" ? he : undefined })
  }

  const formatTimeString = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date
    return format(dateObj, "HH:mm")
  }

  const getTreatmentDurationText = () => {
    if (!bookingTreatment) return ""
    
    if (bookingTreatment.pricingType === "fixed") {
      return bookingTreatment.defaultDuration 
        ? `${bookingTreatment.defaultDuration} ${t("common.minutes")}`
        : t("treatments.standardDuration")
    }
    
    if (bookingResult?.selectedDurationId && bookingTreatment.durations) {
      const duration = bookingTreatment.durations.find(
        (d) => d._id.toString() === bookingResult.selectedDurationId?.toString()
      )
      if (duration) {
        const hours = Math.floor((duration.minutes || 0) / 60)
        const mins = (duration.minutes || 0) % 60
        let durationString = ""
        if (hours > 0) {
          durationString += `${hours} ${t(hours === 1 ? "common.hour" : "common.hours")}`
        }
        if (mins > 0) {
          if (hours > 0) durationString += ` ${t("common.and")} `
          durationString += `${mins} ${t(mins === 1 ? "common.minute" : "common.minutes")}`
        }
        return durationString || `${duration.minutes} ${t("common.minutes")}`
      }
    }
    return ""
  }

  const getGenderPreferenceText = () => {
    switch (bookingResult?.therapistGenderPreference) {
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

  if (!bookingResult) {
    return (
      <div className="text-center py-8">
        <div className="text-destructive">
          <AlertCircle className="mx-auto h-12 w-12 mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t("bookings.errors.bookingNotFound")}</h3>
          <p className="text-muted-foreground">{t("bookings.errors.bookingNotFoundDescription")}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Success Header */}
      <div className="text-center">
        <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-green-600 mb-2">{t("bookings.steps.confirmation.title")}</h1>
        <p className="text-lg text-muted-foreground">{t("bookings.steps.confirmation.description")}</p>
      </div>

      {/* Booking Reference */}
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>{t("bookings.steps.confirmation.bookingReference")}:</strong> {bookingResult._id?.toString().slice(-8).toUpperCase()}
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Guest Information */}
        <Card>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
              <Phone className="h-5 w-5" />
              {t("bookings.steps.confirmation.contactInformation")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("bookings.steps.confirmation.recipient")}:</span>
                <span className="font-medium">
                  {bookingResult.recipientName || bookingResult.bookedByUserName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={`text-muted-foreground flex items-center gap-1 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                  <Mail className="h-4 w-4" />
                  {t("bookings.steps.confirmation.recipientEmail")}:
                </span>
                <span className="font-medium">{bookingResult.recipientEmail || bookingResult.bookedByUserEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className={`text-muted-foreground flex items-center gap-1 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                  <Phone className="h-4 w-4" />
                  {t("bookings.steps.confirmation.recipientPhone")}:
                </span>
                <span className="font-medium">{bookingResult.recipientPhone || bookingResult.bookedByUserPhone}</span>
              </div>
              {bookingResult.recipientBirthDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("bookings.steps.confirmation.birthDate")}:</span>
                  <span className="font-medium">{format(bookingResult.recipientBirthDate, "dd/MM/yyyy")}</span>
                </div>
              )}
              {bookingResult.recipientGender && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("bookings.steps.confirmation.gender")}:</span>
                  <span className="font-medium">
                    {bookingResult.recipientGender === "male" ? t("bookings.steps.guestInfo.genderMale") : 
                     bookingResult.recipientGender === "female" ? t("bookings.steps.guestInfo.genderFemale") : 
                     t("bookings.steps.guestInfo.genderOther")}
                  </span>
                </div>
              )}
              {(bookingResult.bookedByUserName !== bookingResult.recipientName) && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground mb-2">{t("bookings.steps.confirmation.bookerDetails")}:</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>{t("common.name")}:</span>
                      <span>{bookingResult.bookedByUserName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("common.email")}:</span>
                      <span>{bookingResult.bookedByUserEmail}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("common.phone")}:</span>
                      <span>{bookingResult.bookedByUserPhone}</span>
                    </div>
                  </div>
                </div>
              )}
              {bookingResult.notes && (
                <div>
                  <span className="text-muted-foreground mb-2 block">{t("bookings.notes")}:</span>
                  <p className="text-sm bg-muted p-3 rounded-lg">{bookingResult.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Appointment Details */}
        <Card>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
              <Calendar className="h-5 w-5" />
              {t("bookings.steps.confirmation.appointmentDetails")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("bookings.treatment")}:</span>
                <span className="font-medium">{bookingTreatment?.name || t("common.unknownTreatment")}</span>
              </div>
              {getTreatmentDurationText() && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("bookings.duration")}:</span>
                  <span className="font-medium">{getTreatmentDurationText()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className={`text-muted-foreground flex items-center gap-1 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                  <Calendar className="h-4 w-4" />
                  {t("bookings.date")}:
                </span>
                <span className="font-medium">{formatDateString(bookingResult.scheduledDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className={`text-muted-foreground flex items-center gap-1 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                  <Clock className="h-4 w-4" />
                  {t("bookings.time")}:
                </span>
                <span className="font-medium">
                  {bookingResult.flexibleTime ? t("bookings.flexibleTime") : formatTimeString(bookingResult.scheduledDate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("bookings.therapistPreference")}:</span>
                <span className="font-medium">{getGenderPreferenceText()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("bookings.totalAmount")}:</span>
                <span className="font-medium text-lg">{formatPrice(bookingResult.totalPrice)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
              <MapPin className="h-5 w-5" />
              {t("bookings.address")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg">
              <p className="font-medium">
                {[
                  bookingResult.address?.street,
                  bookingResult.address?.houseNumber,
                  bookingResult.address?.city
                ].filter(Boolean).join(", ")}
              </p>
              {(bookingResult.address?.floor || bookingResult.address?.apartmentNumber || bookingResult.address?.entrance) && (
                <p className="text-sm text-muted-foreground mt-1">
                  {[
                    bookingResult.address?.floor && `${t("bookings.floor")} ${bookingResult.address.floor}`,
                    bookingResult.address?.apartmentNumber && `${t("bookings.apartment")} ${bookingResult.address.apartmentNumber}`,
                    bookingResult.address?.entrance && `${t("bookings.entrance")} ${bookingResult.address.entrance}`
                  ].filter(Boolean).join(", ")}
                </p>
              )}
              {bookingResult.address?.notes && (
                <p className="text-sm text-muted-foreground mt-2">{bookingResult.address.notes}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className={`flex gap-4 justify-center ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
        <Button asChild size="lg">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            {t("bookings.steps.confirmation.backToHome")}
          </Link>
        </Button>
      </div>
    </div>
  )
} 