"use client"

import type React from "react"

import type { PopulatedBooking } from "@/types/booking"
import { useTranslation } from "@/lib/translations/i18n"
import { cn, formatCurrency, formatDate } from "@/lib/utils/utils"
import { Card, CardContent, CardHeader, CardFooter, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import {
  CalendarDays,
  Clock,
  MapPin,
  UserCircle,
  CreditCard,
  Sparkles,
  Tag,
  Info,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Hourglass,
} from "lucide-react"
import { format, parseISO } from "date-fns" // For time formatting

interface BookingCardProps {
  booking: PopulatedBooking
  onViewDetails: (booking: PopulatedBooking) => void
  // onCancelBooking: (bookingId: string) => void; // If cancel is directly on card
}

export default function BookingCard({ booking, onViewDetails }: BookingCardProps) {
  const { t, dir, language } = useTranslation()

  const getStatusInfo = (
    status: PopulatedBooking["status"],
  ): { labelKey: string; colorClass: string; icon: React.ElementType } => {
    switch (status) {
      case "pending_professional_assignment":
        return {
          labelKey: "memberBookings.status.pending_professional_assignment",
          colorClass:
            "bg-yellow-400/20 text-yellow-700 border-yellow-400/50 dark:text-yellow-300 dark:bg-yellow-500/10 dark:border-yellow-500/30",
          icon: Hourglass,
        }
      case "confirmed":
        return {
          labelKey: "memberBookings.status.confirmed",
          colorClass:
            "bg-sky-400/20 text-sky-700 border-sky-400/50 dark:text-sky-300 dark:bg-sky-500/10 dark:border-sky-500/30",
          icon: CheckCircle2,
        }
      case "completed":
        return {
          labelKey: "memberBookings.status.completed",
          colorClass:
            "bg-green-400/20 text-green-700 border-green-400/50 dark:text-green-300 dark:bg-green-500/10 dark:border-green-500/30",
          icon: CheckCircle2,
        }
      case "cancelled_by_user":
        return {
          labelKey: "memberBookings.status.cancelled_by_user",
          colorClass:
            "bg-red-400/20 text-red-700 border-red-400/50 dark:text-red-300 dark:bg-red-500/10 dark:border-red-500/30",
          icon: XCircle,
        }
      case "cancelled_by_admin":
        return {
          labelKey: "memberBookings.status.cancelled_by_admin",
          colorClass:
            "bg-red-400/20 text-red-700 border-red-400/50 dark:text-red-300 dark:bg-red-500/10 dark:border-red-500/30",
          icon: XCircle,
        }
      case "no_show":
        return {
          labelKey: "memberBookings.status.no_show",
          colorClass:
            "bg-gray-400/20 text-gray-700 border-gray-400/50 dark:text-gray-300 dark:bg-gray-500/10 dark:border-gray-500/30",
          icon: AlertCircle,
        }
      default:
        return { labelKey: "common.unknown", colorClass: "bg-gray-400/20 text-gray-700 border-gray-400/50", icon: Info }
    }
  }

  const statusInfo = getStatusInfo(booking.status)
  const StatusIcon = statusInfo.icon

  const bookingDate = parseISO(booking.bookingDateTime)
  const formattedDate = formatDate(bookingDate)
  const formattedTime = format(bookingDate, "HH:mm")

  const treatmentName = booking.treatmentId?.name || t("common.unknown")
  const durationMinutes = booking.selectedDuration?.minutes

  const addressLine = booking.addressId
    ? `${booking.addressId.street || ""} ${booking.addressId.streetNumber || ""}, ${booking.addressId.city || ""}`
        .trim()
        .replace(/^,|,$/, "")
    : booking.customAddressDetails
      ? `${booking.customAddressDetails.street || ""} ${booking.customAddressDetails.streetNumber || ""}, ${booking.customAddressDetails.city || ""}`
          .trim()
          .replace(/^,|,$/, "")
      : t("memberBookings.addressNotSet")

  const priceDisplay = booking.priceDetails.isFullyCoveredByVoucherOrSubscription
    ? booking.priceDetails.isBaseTreatmentCoveredBySubscription
      ? t("memberBookings.coveredBySubscription")
      : t("memberBookings.coveredByVoucher")
    : formatCurrency(booking.priceDetails.finalAmount, t("common.currency"), language)

  return (
    <Card className="flex flex-col overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
      <CardHeader className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-base font-semibold text-turquoise-700 dark:text-turquoise-400 leading-tight">
            {treatmentName}
            {durationMinutes && (
              <span className="text-xs text-gray-500 dark:text-gray-400 font-normal block sm:inline sm:ms-1">
                ({durationMinutes} {t("common.minutes")})
              </span>
            )}
          </CardTitle>
          <Badge
            variant="outline"
            className={cn("text-xs px-2 py-1 whitespace-nowrap capitalize", statusInfo.colorClass)}
          >
            <StatusIcon
              className={cn(
                "h-3.5 w-3.5 me-1.5 rtl:ms-1.5 rtl:me-0",
                statusInfo.colorClass.includes("text-") ? "" : "text-current",
              )}
            />
            {t(statusInfo.labelKey)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-2.5 text-sm text-gray-700 dark:text-gray-300 flex-grow">
        <div className="flex items-center">
          <CalendarDays className="h-4 w-4 me-2 rtl:ms-2 rtl:me-0 text-turquoise-600 dark:text-turquoise-500 flex-shrink-0" />
          <span>{formattedDate}</span>
        </div>
        <div className="flex items-center">
          <Clock className="h-4 w-4 me-2 rtl:ms-2 rtl:me-0 text-turquoise-600 dark:text-turquoise-500 flex-shrink-0" />
          <span>
            {formattedTime} {booking.isFlexibleTime && `(${t("memberBookings.flexibleTime")})`}
          </span>
        </div>
        <div className="flex items-start">
          <MapPin className="h-4 w-4 me-2 rtl:ms-2 rtl:me-0 text-turquoise-600 dark:text-turquoise-500 flex-shrink-0 mt-0.5" />
          <span className="break-words">{addressLine}</span>
        </div>
        {booking.professionalId?.name && (
          <div className="flex items-center">
            <UserCircle className="h-4 w-4 me-2 rtl:ms-2 rtl:me-0 text-turquoise-600 dark:text-turquoise-500 flex-shrink-0" />
            <span>
              {t("memberBookings.professional")}: {booking.professionalId.name}
            </span>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 bg-gray-50 dark:bg-gray-700/30 border-t dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4">
        <div className="flex items-center text-sm font-medium text-gray-800 dark:text-gray-100">
          {booking.priceDetails.isFullyCoveredByVoucherOrSubscription ? (
            booking.priceDetails.isBaseTreatmentCoveredBySubscription ? (
              <Tag className="h-4 w-4 me-1.5 rtl:ms-1.5 rtl:me-0 text-green-600 dark:text-green-500" />
            ) : (
              <Sparkles className="h-4 w-4 me-1.5 rtl:ms-1.5 rtl:me-0 text-purple-600 dark:text-purple-500" />
            )
          ) : (
            <CreditCard className="h-4 w-4 me-1.5 rtl:ms-1.5 rtl:me-0 text-gray-500 dark:text-gray-400" />
          )}
          <span>{priceDisplay}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewDetails(booking)}
          className="w-full sm:w-auto border-turquoise-500 text-turquoise-600 hover:bg-turquoise-50 hover:text-turquoise-700 dark:border-turquoise-600 dark:text-turquoise-400 dark:hover:bg-turquoise-700/20 dark:hover:text-turquoise-300"
        >
          {t("memberBookings.viewDetails")}
        </Button>
      </CardFooter>
    </Card>
  )
}
