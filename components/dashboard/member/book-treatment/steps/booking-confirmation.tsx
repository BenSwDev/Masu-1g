"use client"
import type { IBooking } from "@/lib/db/models/booking"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/ui/card"
import {
  CheckCircle2,
  AlertTriangle,
  CalendarDays,
  MapPin,
  User,
  Info,
  AlertCircle,
  CreditCard,
  CheckCircle,
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { Alert, AlertDescription } from "@/components/common/ui/alert"
import { useTranslation } from "@/lib/translations/i18n" // Added import

interface BookingConfirmationProps {
  bookingResult: IBooking | null
  // translations: Record<string, string> // Removed prop
}

export default function BookingConfirmation({ bookingResult }: BookingConfirmationProps) {
  // Removed translations from destructuring
  const { t } = useTranslation() // Added useTranslation hook

  if (!bookingResult) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[400px] text-center p-6"
        dir={t("dir") === "rtl" ? "rtl" : "ltr"}
      >
        <AlertTriangle className="mx-auto h-20 w-20 text-destructive mb-6" />
        <h2 className="text-3xl font-semibold text-destructive mb-3">{t("bookings.confirmation.errorTitle")}</h2>
        <p className="text-muted-foreground max-w-md mb-8">{t("bookings.confirmation.errorDescription")}</p>
        <Button asChild size="lg">
          <Link href="/dashboard/member/book-treatment">{t("bookings.confirmation.tryAgain")}</Link>
        </Button>
      </div>
    )
  }

  const treatmentName =
    (bookingResult.treatmentId as any)?.name ||
    `${t("bookings.confirmation.treatmentIdPrefix")}: ${bookingResult.treatmentId.toString()}`
  const bookingDateTime = format(new Date(bookingResult.bookingDateTime), "PPPp") // e.g., Jun 21, 2024, 2:00 PM
  const addressLine = bookingResult.customAddressDetails
    ? `${bookingResult.customAddressDetails.fullAddress}`
    : (bookingResult.addressId as any)?.street
      ? `${(bookingResult.addressId as any).street} ${(bookingResult.addressId as any).streetNumber || ""}, ${(bookingResult.addressId as any).city}`
      : t("common.addressNotSpecified")

  const getStatusText = (statusKey: string) => {
    const key = `bookings.status.${statusKey.replace(/_/g, "")}`
    return t(key, statusKey) // Use t with fallback
  }

  const getGenderPreferenceText = (preferenceKey?: string) => {
    if (!preferenceKey) return t("preferences.treatment.genderAny")
    const key = `preferences.treatment.gender${preferenceKey.charAt(0).toUpperCase()}${preferenceKey.slice(1)}`
    return t(key, preferenceKey) // Use t with fallback
  }

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[400px] text-center p-6"
      dir={t("dir") === "rtl" ? "rtl" : "ltr"}
    >
      <CheckCircle2 className="mx-auto h-20 w-20 text-green-500 mb-6" />
      <h2 className="text-3xl font-semibold mb-3">{t("bookings.confirmation.successTitle")}</h2>
      <p className="text-muted-foreground max-w-lg mb-8">{t("bookings.confirmation.successDescription")}</p>

      <Card className="w-full max-w-lg mx-auto text-left shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">{t("bookings.confirmation.bookingSummary")}</CardTitle>
          <CardDescription>
            {t("bookings.confirmation.bookingId")}: {bookingResult._id.toString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-primary mr-3 mt-0.5 shrink-0" />
            <div>
              <p className="text-muted-foreground font-medium">{t("bookings.confirmation.treatment")}</p>
              <p className="font-semibold">{treatmentName}</p>
            </div>
          </div>
          <div className="flex items-start">
            <CalendarDays className="h-5 w-5 text-primary mr-3 mt-0.5 shrink-0" />
            <div>
              <p className="text-muted-foreground font-medium">{t("bookings.confirmation.dateTime")}</p>
              <p className="font-semibold">{bookingDateTime}</p>
            </div>
          </div>
          <div className="flex items-start">
            <MapPin className="h-5 w-5 text-primary mr-3 mt-0.5 shrink-0" />
            <div>
              <p className="text-muted-foreground font-medium">{t("common.address")}</p>
              <p className="font-semibold">{addressLine}</p>
            </div>
          </div>
          <div className="flex items-start">
            <User className="h-5 w-5 text-primary mr-3 mt-0.5 shrink-0" />
            <div>
              <p className="text-muted-foreground font-medium">{t("bookings.steps.scheduling.therapistPreference")}</p>
              <p className="font-semibold">{getGenderPreferenceText(bookingResult.therapistGenderPreference)}</p>
            </div>
          </div>
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-primary mr-3 mt-0.5 shrink-0" />
            <div>
              <p className="text-muted-foreground font-medium">{t("bookings.confirmation.status")}</p>
              <p className="font-semibold capitalize text-blue-600">{getStatusText(bookingResult.status)}</p>
            </div>
          </div>
          {bookingResult.priceDetails.finalAmount > 0 && (
            <div className="flex items-start pt-2 border-t mt-4">
              <CreditCard className="h-5 w-5 text-primary mr-3 mt-0.5 shrink-0" />
              <div>
                <p className="text-muted-foreground font-medium">{t("common.totalPrice")}</p>
                <p className="font-bold text-lg text-primary">
                  {bookingResult.priceDetails.finalAmount.toFixed(2)} {t("common.currency")}
                </p>
              </div>
            </div>
          )}
          {bookingResult.priceDetails.finalAmount === 0 && bookingResult.source !== "new_purchase" && (
            <Alert variant="default" className="mt-3 bg-green-50 border-green-200 text-green-700">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <AlertDescription className="font-medium">
                {bookingResult.source === "subscription_redemption"
                  ? t("bookings.confirmation.coveredBySubscription")
                  : t("bookings.confirmation.coveredByVoucher")}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground mt-8 max-w-md">{t("bookings.confirmation.notificationSent")}</p>

      <div className="flex flex-col sm:flex-row justify-center gap-4 pt-8">
        <Button asChild variant="outline" size="lg">
          <Link href="/dashboard/member/my-bookings">{t("bookings.confirmation.viewMyBookings")}</Link>
        </Button>
        <Button asChild size="lg">
          <Link href="/dashboard/member/book-treatment">{t("bookings.confirmation.bookAnother")}</Link>
        </Button>
      </div>
    </div>
  )
}

// Helper to get the correct translation for booking status
// This should ideally live in a shared utility or be part of the i18n setup
// const getBookingStatusTranslation = (status: string, translations: Record<string, string>): string => { // Removed helper function as getStatusText now uses 't'
//   const key = `bookings.status.${status.toLowerCase().replace(/_/g, "")}`
//   return translations[key] || status
// }
