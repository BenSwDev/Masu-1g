"use client"

import { useMemo } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Alert, AlertDescription } from "@/components/common/ui/alert"
import { CheckCircle, Calendar, Clock, MapPin, Phone, Mail, Home } from "lucide-react"
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
  const { t, language } = useTranslation()

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
        <h1 className="text-3xl font-bold text-green-600 mb-2">{t("bookings.success.title")}</h1>
        <p className="text-lg text-muted-foreground">{t("bookings.success.subtitle")}</p>
      </div>

      {/* Booking Reference */}
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>{t("bookings.bookingReference")}:</strong> {bookingResult._id?.toString().slice(-8).toUpperCase()}
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Guest Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              {t("bookings.contactInformation")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("common.name")}:</span>
                <span className="font-medium">
                  {bookingResult.guestInfo?.firstName} {bookingResult.guestInfo?.lastName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {t("common.email")}:
                </span>
                <span className="font-medium">{bookingResult.guestInfo?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {t("common.phone")}:
                </span>
                <span className="font-medium">{bookingResult.guestInfo?.phone}</span>
              </div>
              {bookingResult.guestInfo?.notes && (
                <div>
                  <span className="text-muted-foreground mb-2 block">{t("bookings.notes")}:</span>
                  <p className="text-sm bg-muted p-3 rounded-lg">{bookingResult.guestInfo.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Appointment Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t("bookings.appointmentDetails")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("treatments.treatment")}:</span>
                <span className="font-medium">{bookingTreatment?.name}</span>
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
                  {bookingResult.bookingDateTime ? formatDateString(bookingResult.bookingDateTime) : "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {t("bookings.time")}:
                </span>
                <span className="font-medium">
                  {bookingResult.bookingDateTime ? formatTimeString(bookingResult.bookingDateTime) : "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("bookings.therapistPreference")}:</span>
                <span className="font-medium">{getGenderPreferenceText()}</span>
              </div>
              {bookingResult.finalAmount !== undefined && (
                <div className="flex justify-between text-lg font-semibold">
                  <span className="text-muted-foreground">{t("bookings.totalPaid")}:</span>
                  <span className="text-primary">{formatPrice(bookingResult.finalAmount)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Important Information */}
      <Card>
        <CardHeader>
          <CardTitle>{t("bookings.importantInformation")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• {t("bookings.confirmationEmail")}</li>
            <li>• {t("bookings.arriveEarly")}</li>
            <li>• {t("bookings.cancellationPolicy")}</li>
            <li>• {t("bookings.contactSupport")}</li>
          </ul>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button asChild size="lg">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            {t("navigation.home")}
          </Link>
        </Button>
        <Button variant="outline" asChild size="lg">
          <Link href="/book-treatment">
            {t("bookings.bookAnother")}
          </Link>
        </Button>
      </div>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {t("common.contactUs")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium mb-1">{t("common.phone")}:</p>
              <p className="text-muted-foreground">03-1234567</p>
            </div>
            <div>
              <p className="font-medium mb-1">{t("common.email")}:</p>
              <p className="text-muted-foreground">info@masu.co.il</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 