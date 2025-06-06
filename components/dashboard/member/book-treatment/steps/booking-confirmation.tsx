"use client"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/common/ui/card"
import { CheckCircle, CalendarDays, MapPin, User, Tag } from "lucide-react"
import Link from "next/link"
import { useTranslation } from "@/lib/translations/i18n"
import type { IBooking } from "@/lib/db/models/booking" // Assuming IBooking is the type for bookingResult
import { format } from "date-fns"

interface BookingConfirmationProps {
  bookingResult: IBooking | null // Use the IBooking type
}

export default function BookingConfirmation({ bookingResult }: BookingConfirmationProps) {
  const { t, language } = useTranslation()

  if (!bookingResult) {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="text-center text-2xl">{t("bookings.confirmation.errorTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p>{t("bookings.confirmation.errorMessage")}</p>
          <Button asChild className="mt-6">
            <Link href="/dashboard/member/book-treatment">{t("bookings.confirmation.tryAgain")}</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const bookingDateTime = new Date(bookingResult.bookingDateTime)
  const formattedDate = format(bookingDateTime, "PPP", {
    locale: language === "he" ? require("date-fns/locale/he") : undefined,
  })
  const formattedTime = format(bookingDateTime, "p", {
    locale: language === "he" ? require("date-fns/locale/he") : undefined,
  })

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl">
      <CardHeader className="items-center text-center bg-green-50 dark:bg-green-900/30 p-6 rounded-t-lg">
        <CheckCircle className="h-16 w-16 text-green-500 mb-3" />
        <CardTitle className="text-3xl font-bold text-green-700 dark:text-green-400">
          {t("bookings.confirmation.title")}
        </CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          {t("bookings.confirmation.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {bookingResult.bookingNumber && (
          <div className="flex items-center text-lg">
            <Tag className="mr-3 h-5 w-5 text-primary" />
            <strong>{t("bookings.confirmation.bookingNumberLabel")}:</strong>
            <span className="ml-2 font-mono bg-muted px-2 py-1 rounded">{bookingResult.bookingNumber}</span>
          </div>
        )}
        <div className="flex items-center">
          <CalendarDays className="mr-3 h-5 w-5 text-primary" />
          <div>
            <span className="font-semibold">{t("bookings.confirmation.dateTimeLabel")}:</span> {formattedDate}{" "}
            {t("common.atTime")} {formattedTime}
          </div>
        </div>
        {bookingResult.bookingAddressSnapshot?.fullAddress && (
          <div className="flex items-start">
            <MapPin className="mr-3 h-5 w-5 text-primary mt-1" />
            <div>
              <span className="font-semibold">{t("bookings.confirmation.addressLabel")}:</span>{" "}
              {bookingResult.bookingAddressSnapshot.fullAddress}
            </div>
          </div>
        )}
        {bookingResult.recipientName ? (
          <div className="flex items-center">
            <User className="mr-3 h-5 w-5 text-primary" />
            <div>
              <span className="font-semibold">{t("bookings.confirmation.recipientLabel")}:</span>{" "}
              {bookingResult.recipientName}
              {bookingResult.recipientPhone && ` (${bookingResult.recipientPhone})`}
            </div>
          </div>
        ) : (
          bookingResult.bookedByUserName && (
            <div className="flex items-center">
              <User className="mr-3 h-5 w-5 text-primary" />
              <div>
                <span className="font-semibold">{t("bookings.confirmation.bookedByLabel")}:</span>{" "}
                {bookingResult.bookedByUserName}
              </div>
            </div>
          )
        )}

        <p className="text-sm text-muted-foreground pt-2">{t("bookings.confirmation.emailConfirmation")}</p>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button asChild className="flex-1" size="lg">
            <Link href="/dashboard/member/bookings">{t("bookings.confirmation.viewMyBookings")}</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1" size="lg">
            <Link href="/dashboard/member/book-treatment">{t("bookings.confirmation.bookAnother")}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
