"use client"

import type { PopulatedBooking } from "@/actions/booking-actions"
import { useTranslation } from "@/lib/translations/i18n"
import { format } from "date-fns"
import { he, ru } from "date-fns/locale" // For localized date formatting
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Button } from "@/components/common/ui/button"
import { Separator } from "@/components/common/ui/separator"
import {
  CalendarDays,
  Clock,
  MapPin,
  Tag,
  Info,
  XCircle,
  CheckCircle2,
  Hourglass,
  FileText,
  ShoppingCart,
  Gift,
  UserCircle2,
} from "lucide-react"
import { useState } from "react"
import { cancelUserBooking } from "@/actions/booking-actions"
import { toast } from "@/components/common/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/common/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/common/ui/avatar"

interface BookingCardProps {
  booking: PopulatedBooking
}

export function BookingCard({ booking }: BookingCardProps) {
  const { t, language, dir } = useTranslation()
  const [isCancelling, setIsCancelling] = useState(false)

  const dateLocale = language === "he" ? he : language === "ru" ? ru : undefined

  const formattedDate = format(new Date(booking.bookingDate), "PPP", { locale: dateLocale })
  const formattedTime = format(new Date(booking.bookingDate), "p", { locale: dateLocale })

  const getStatusVariant = (
    status: PopulatedBooking["status"],
  ): "default" | "destructive" | "outline" | "secondary" | "warning" | "success" | "info" => {
    switch (status) {
      case "pending":
        return "warning"
      case "confirmed":
        return "info"
      case "professional_assigned":
        return "success"
      case "completed":
        return "default"
      case "cancelled_by_user":
      case "cancelled_by_admin":
      case "no_show":
        return "destructive"
      default:
        return "outline"
    }
  }

  const getStatusIcon = (status: PopulatedBooking["status"]) => {
    switch (status) {
      case "pending":
        return <Hourglass className="h-4 w-4" />
      case "confirmed":
        return <CheckCircle2 className="h-4 w-4 text-blue-500" />
      case "professional_assigned":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-gray-500" />
      case "cancelled_by_user":
      case "cancelled_by_admin":
      case "no_show":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  const addressString = booking.addressId
    ? `${booking.addressId.street} ${booking.addressId.streetNumber}, ${booking.addressId.city}`
    : t("bookings.card.addressNotSet")

  const professionalName = booking.professionalId?.name || t("bookings.card.notAssignedYet")
  const professionalInitials = booking.professionalId?.name
    ? booking.professionalId.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?"

  const isUpcoming =
    new Date(booking.bookingDate) >= new Date() &&
    booking.status !== "completed" &&
    booking.status !== "cancelled_by_user" &&
    booking.status !== "cancelled_by_admin" &&
    booking.status !== "no_show"
  const isCancellable =
    isUpcoming && !["completed", "cancelled_by_user", "cancelled_by_admin", "no_show"].includes(booking.status)

  const handleCancelBooking = async () => {
    setIsCancelling(true)
    const result = await cancelUserBooking(booking._id.toString())
    if (result.success) {
      toast({
        title: t("bookings.notifications.cancelSuccess"),
        variant: "default",
      })
      // Revalidation is handled by server action, client state might need update or rely on full page reload/refetch
    } else {
      toast({
        title: t("bookings.notifications.cancelError"),
        description: result.error || t("common.unexpectedError"),
        variant: "destructive",
      })
    }
    setIsCancelling(false)
  }

  const getBookingSourceIcon = () => {
    switch (booking.bookingSource) {
      case "subscription":
        return <ShoppingCart className="h-4 w-4 text-purple-500" />
      case "voucher":
        return <Gift className="h-4 w-4 text-orange-500" />
      default:
        return <Tag className="h-4 w-4 text-gray-500" />
    }
  }

  const getBookingSourceText = () => {
    switch (booking.bookingSource) {
      case "subscription":
        return t("bookings.card.coveredBySubscription")
      case "voucher":
        return t("bookings.card.coveredByVoucher")
      default:
        return booking.price ? `${booking.price} ${booking.currency || "ILS"}` : t("bookings.card.priceNotSet")
    }
  }

  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white border border-gray-200 rounded-xl">
      <CardHeader className="p-4 sm:p-5 bg-gradient-to-br from-turquoise-50 via-cyan-50 to-teal-50 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <CardTitle className="text-lg sm:text-xl font-semibold text-turquoise-700">
            {booking.treatmentId?.name || t("treatments.unknownTreatment")}
          </CardTitle>
          <Badge
            variant={getStatusVariant(booking.status)}
            className="flex items-center gap-1.5 py-1 px-2.5 text-xs sm:text-sm rounded-full"
          >
            {getStatusIcon(booking.status)}
            {t(`bookings.status.${booking.status}` as any, booking.status.replace(/_/g, " "))}
          </Badge>
        </div>
        {booking.treatmentDuration && (
          <p className="text-sm text-gray-500 mt-1">
            {t("bookings.card.duration")}: {booking.treatmentDuration} {t("common.minutes")}
          </p>
        )}
      </CardHeader>
      <CardContent className="p-4 sm:p-5 space-y-3 sm:space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
          <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-lg">
            <CalendarDays className="h-5 w-5 text-turquoise-600 mt-0.5 flex-shrink-0" />
            <div>
              <strong className="block text-gray-700">{t("bookings.card.date")}:</strong>
              <span className="text-gray-600">{formattedDate}</span>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-lg">
            <Clock className="h-5 w-5 text-turquoise-600 mt-0.5 flex-shrink-0" />
            <div>
              <strong className="block text-gray-700">{t("bookings.card.time")}:</strong>
              <span className="text-gray-600">{formattedTime}</span>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-lg col-span-1 sm:col-span-2">
            <UserCircle2 className="h-5 w-5 text-turquoise-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <strong className="block text-gray-700">{t("bookings.card.professional")}:</strong>
              <div className="flex items-center gap-2">
                {booking.professionalId?.profilePictureUrl ? (
                  <Avatar className="h-6 w-6 text-xs">
                    <AvatarImage
                      src={booking.professionalId.profilePictureUrl || "/placeholder.svg"}
                      alt={professionalName}
                    />
                    <AvatarFallback className="bg-turquoise-100 text-turquoise-700">
                      {professionalInitials}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Avatar className="h-6 w-6 text-xs">
                    <AvatarFallback className="bg-gray-200 text-gray-600">{professionalInitials}</AvatarFallback>
                  </Avatar>
                )}
                <span className="text-gray-600">{professionalName}</span>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-lg col-span-1 sm:col-span-2">
            <MapPin className="h-5 w-5 text-turquoise-600 mt-0.5 flex-shrink-0" />
            <div>
              <strong className="block text-gray-700">{t("bookings.card.address")}:</strong>
              <span className="text-gray-600">{addressString}</span>
            </div>
          </div>
        </div>

        <Separator className="my-3 sm:my-4" />

        <div className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-lg">
          {getBookingSourceIcon()}
          <div>
            <strong className="block text-gray-700">{t("bookings.card.priceDetails")}:</strong>
            <span className="text-gray-600">{getBookingSourceText()}</span>
          </div>
        </div>

        {booking.notes && (
          <div className="flex items-start gap-2.5 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
            <FileText className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <strong className="block text-gray-700">{t("bookings.card.notes")}:</strong>
              <p className="text-gray-600 text-xs whitespace-pre-wrap">{booking.notes}</p>
            </div>
          </div>
        )}
      </CardContent>
      {isCancellable && (
        <CardFooter className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="w-full sm:w-auto" disabled={isCancelling}>
                <XCircle className="mr-2 h-4 w-4" />
                {isCancelling ? t("common.cancelling") : t("bookings.card.cancelBooking")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent dir={dir}>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("bookings.cancelDialog.title")}</AlertDialogTitle>
                <AlertDialogDescription>{t("bookings.cancelDialog.description")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleCancelBooking}
                  disabled={isCancelling}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isCancelling ? t("bookings.cancelDialog.processing") : t("bookings.cancelDialog.confirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      )}
    </Card>
  )
}
