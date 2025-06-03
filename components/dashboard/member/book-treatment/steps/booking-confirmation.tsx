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

interface BookingConfirmationProps {
  bookingResult: IBooking | null
  translations: Record<string, string>
}

export default function BookingConfirmation({ bookingResult, translations }: BookingConfirmationProps) {
  if (!bookingResult) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
        <AlertTriangle className="mx-auto h-20 w-20 text-destructive mb-6" />
        <h2 className="text-3xl font-semibold text-destructive mb-3">
          {translations["bookings.confirmation.errorTitle"] || "Booking Failed"}
        </h2>
        <p className="text-muted-foreground max-w-md mb-8">
          {translations["bookings.confirmation.errorDescription"] ||
            "We encountered an issue while confirming your booking. Please try again or contact support if the problem persists."}
        </p>
        <Button asChild size="lg">
          <Link href="/dashboard/member/book-treatment">
            {translations["bookings.confirmation.tryAgain"] || "Try Again"}
          </Link>
        </Button>
      </div>
    )
  }

  const treatmentName =
    (bookingResult.treatmentId as any)?.name ||
    `${translations["bookings.confirmation.treatmentIdPrefix"] || "Treatment ID"}: ${bookingResult.treatmentId.toString()}`
  const bookingDateTime = format(new Date(bookingResult.bookingDateTime), "PPPp") // e.g., Jun 21, 2024, 2:00 PM
  const addressLine = bookingResult.customAddressDetails
    ? `${bookingResult.customAddressDetails.fullAddress}`
    : (bookingResult.addressId as any)?.street
      ? `${(bookingResult.addressId as any).street} ${(bookingResult.addressId as any).streetNumber || ""}, ${(bookingResult.addressId as any).city}`
      : translations["common.addressNotSpecified"] || "Address not specified"

  const getStatusText = (statusKey: string) => {
    const key = `bookings.status.${statusKey.replace(/_/g, "")}`
    return translations[key] || statusKey
  }

  const getGenderPreferenceText = (preferenceKey?: string) => {
    if (!preferenceKey) return translations["preferences.treatment.genderAny"] || "Any"
    const key = `preferences.treatment.gender${preferenceKey.charAt(0).toUpperCase()}${preferenceKey.slice(1)}`
    return translations[key] || preferenceKey
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
      <CheckCircle2 className="mx-auto h-20 w-20 text-green-500 mb-6" />
      <h2 className="text-3xl font-semibold mb-3">
        {translations["bookings.confirmation.successTitle"] || "Booking Confirmed!"}
      </h2>
      <p className="text-muted-foreground max-w-lg mb-8">
        {translations["bookings.confirmation.successDescription"] ||
          "Your treatment has been successfully booked. You will receive a confirmation email shortly with all the details."}
      </p>

      <Card className="w-full max-w-lg mx-auto text-left shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">
            {translations["bookings.confirmation.bookingSummary"] || "Booking Summary"}
          </CardTitle>
          <CardDescription>
            {translations["bookings.confirmation.bookingId"] || "Booking ID"}: {bookingResult._id.toString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-primary mr-3 mt-0.5 shrink-0" />
            <div>
              <p className="text-muted-foreground font-medium">
                {translations["bookings.confirmation.treatment"] || "Treatment"}
              </p>
              <p className="font-semibold">{treatmentName}</p>
            </div>
          </div>
          <div className="flex items-start">
            <CalendarDays className="h-5 w-5 text-primary mr-3 mt-0.5 shrink-0" />
            <div>
              <p className="text-muted-foreground font-medium">
                {translations["bookings.confirmation.dateTime"] || "Date & Time"}
              </p>
              <p className="font-semibold">{bookingDateTime}</p>
            </div>
          </div>
          <div className="flex items-start">
            <MapPin className="h-5 w-5 text-primary mr-3 mt-0.5 shrink-0" />
            <div>
              <p className="text-muted-foreground font-medium">{translations["common.address"] || "Address"}</p>
              <p className="font-semibold">{addressLine}</p>
            </div>
          </div>
          <div className="flex items-start">
            <User className="h-5 w-5 text-primary mr-3 mt-0.5 shrink-0" />
            <div>
              <p className="text-muted-foreground font-medium">
                {translations["bookings.steps.scheduling.therapistPreference"] || "Therapist Preference"}
              </p>
              <p className="font-semibold">{getGenderPreferenceText(bookingResult.therapistGenderPreference)}</p>
            </div>
          </div>
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-primary mr-3 mt-0.5 shrink-0" />
            <div>
              <p className="text-muted-foreground font-medium">
                {translations["bookings.confirmation.status"] || "Status"}
              </p>
              <p className="font-semibold capitalize text-blue-600">{getStatusText(bookingResult.status)}</p>
            </div>
          </div>
          {bookingResult.priceDetails.finalAmount > 0 && (
            <div className="flex items-start pt-2 border-t mt-4">
              <CreditCard className="h-5 w-5 text-primary mr-3 mt-0.5 shrink-0" />
              <div>
                <p className="text-muted-foreground font-medium">
                  {translations["common.totalPrice"] || "Total Price"}
                </p>
                <p className="font-bold text-lg text-primary">
                  {bookingResult.priceDetails.finalAmount.toFixed(2)} {translations["common.currency"] || "ILS"}
                </p>
              </div>
            </div>
          )}
          {bookingResult.priceDetails.finalAmount === 0 && bookingResult.source !== "new_purchase" && (
            <Alert variant="default" className="mt-3 bg-green-50 border-green-200 text-green-700">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <AlertDescription className="font-medium">
                {bookingResult.source === "subscription_redemption"
                  ? translations["bookings.confirmation.coveredBySubscription"] ||
                    "This booking is covered by your subscription."
                  : translations["bookings.confirmation.coveredByVoucher"] ||
                    "This booking is covered by your gift voucher."}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground mt-8 max-w-md">
        {translations["bookings.confirmation.notificationSent"] ||
          "A confirmation email with these details has been sent to your registered email address. If you have any questions, please contact our support."}
      </p>

      <div className="flex flex-col sm:flex-row justify-center gap-4 pt-8">
        <Button asChild variant="outline" size="lg">
          <Link href="/dashboard/member/my-bookings">
            {translations["bookings.confirmation.viewMyBookings"] || "View My Bookings"}
          </Link>
        </Button>
        <Button asChild size="lg">
          <Link href="/dashboard/member/book-treatment">
            {translations["bookings.confirmation.bookAnother"] || "Book Another Treatment"}
          </Link>
        </Button>
      </div>
    </div>
  )
}

// Helper to get the correct translation for booking status
// This should ideally live in a shared utility or be part of the i18n setup
const getBookingStatusTranslation = (status: string, translations: Record<string, string>): string => {
  const key = `bookings.status.${status.toLowerCase().replace(/_/g, "")}`
  return translations[key] || status
}
