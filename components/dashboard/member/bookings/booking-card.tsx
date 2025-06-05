"use client"

import {
  CalendarDays,
  Clock,
  MapPin,
  User,
  DollarSign,
  Info,
  XCircle,
  CheckCircle,
  Loader2,
  Gift,
  Ticket,
  Hourglass,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Button } from "@/components/common/ui/button"
import { cn, formatDate, formatCurrency } from "@/lib/utils/utils"
import type { PopulatedBooking } from "@/actions/booking-actions" // We'll define this type in booking-actions
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { cancelBooking as cancelBookingAction } from "@/actions/booking-actions"
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
import { useState } from "react"

interface BookingCardProps {
  booking: PopulatedBooking
  currentUserId: string
}

export default function BookingCard({ booking, currentUserId }: BookingCardProps) {
  const queryClient = useQueryClient()
  const [isCancelling, setIsCancelling] = useState(false)

  const { mutate: cancelBooking, isPending: isCancelPending } = useMutation({
    mutationFn: async () => {
      setIsCancelling(true)
      const result = await cancelBookingAction(booking._id.toString(), currentUserId, "user", "Cancelled by user")
      if (!result.success) {
        throw new Error(
          result.error ? `Cancellation failed: ${result.error}` : "Cancellation failed due to an unknown error.",
        )
      }
      return result
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Booking cancelled successfully.",
        variant: "default",
      })
      queryClient.invalidateQueries({ queryKey: ["userBookings", currentUserId] })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    },
    onSettled: () => {
      setIsCancelling(false)
    },
  })

  const getStatusInfo = (status: PopulatedBooking["status"]) => {
    switch (status) {
      case "pending_professional_assignment":
        return {
          label: "Pending Assignment",
          icon: <Hourglass className="mr-1.5 h-4 w-4 text-amber-600" />,
          badgeClass: "bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200",
          textColor: "text-amber-700",
        }
      case "confirmed":
        return {
          label: "Confirmed",
          icon: <CheckCircle className="mr-1.5 h-4 w-4 text-green-600" />,
          badgeClass: "bg-green-100 text-green-700 border-green-300 hover:bg-green-200",
          textColor: "text-green-700",
        }
      case "completed":
        return {
          label: "Completed",
          icon: <CheckCircle className="mr-1.5 h-4 w-4 text-sky-600" />,
          badgeClass: "bg-sky-100 text-sky-700 border-sky-300 hover:bg-sky-200",
          textColor: "text-sky-700",
        }
      case "cancelled_by_user":
        return {
          label: "Cancelled by User",
          icon: <XCircle className="mr-1.5 h-4 w-4 text-red-600" />,
          badgeClass: "bg-red-100 text-red-700 border-red-300 hover:bg-red-200",
          textColor: "text-red-700",
        }
      case "cancelled_by_admin":
        return {
          label: "Cancelled by Admin",
          icon: <XCircle className="mr-1.5 h-4 w-4 text-red-600" />,
          badgeClass: "bg-red-100 text-red-700 border-red-300 hover:bg-red-200",
          textColor: "text-red-700",
        }
      case "no_show":
        return {
          label: "No Show",
          icon: <User className="mr-1.5 h-4 w-4 text-orange-600" />, // Or another appropriate icon
          badgeClass: "bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200",
          textColor: "text-orange-700",
        }
      default:
        return {
          label: status,
          icon: <Info className="mr-1.5 h-4 w-4 text-gray-600" />,
          badgeClass: "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200",
          textColor: "text-gray-700",
        }
    }
  }

  const statusInfo = getStatusInfo(booking.status)
  const bookingDateTime = new Date(booking.bookingDateTime)

  const isCancellable =
    (booking.status === "pending_professional_assignment" || booking.status === "confirmed") &&
    new Date(booking.bookingDateTime) > new Date() // Add more sophisticated logic based on lead time if needed

  const getSourceInfo = (source: PopulatedBooking["source"]) => {
    switch (source) {
      case "new_purchase":
        return { label: "New Purchase", icon: <DollarSign className="h-4 w-4 text-green-500" /> }
      case "subscription_redemption":
        return { label: "Subscription Redemption", icon: <Ticket className="h-4 w-4 text-blue-500" /> }
      case "gift_voucher_redemption":
        return { label: "Gift Voucher Redemption", icon: <Gift className="h-4 w-4 text-purple-500" /> }
      default:
        return { label: "", icon: null }
    }
  }
  const sourceInfo = getSourceInfo(booking.source)

  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-lg transition-all duration-300 ease-in-out hover:shadow-2xl dark:bg-gray-800">
      <CardHeader className="bg-slate-50 p-4 dark:bg-gray-700/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {booking.treatmentId?.name || "Unknown Treatment"}
          </CardTitle>
          <Badge variant="outline" className={cn("text-xs font-medium", statusInfo.badgeClass)}>
            {statusInfo.icon}
            {statusInfo.label}
          </Badge>
        </div>
        {booking.treatmentId?.selectedDuration?.minutes && (
          <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
            {`${booking.treatmentId.selectedDuration.minutes} minutes`}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex-grow space-y-3 p-4">
        <div className="flex items-start text-sm text-slate-600 dark:text-slate-300">
          <CalendarDays className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-teal-600 dark:text-teal-400" />
          <span>{formatDate(bookingDateTime)}</span>
        </div>
        <div className="flex items-start text-sm text-slate-600 dark:text-slate-300">
          <Clock className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-teal-600 dark:text-teal-400" />
          <span>{bookingDateTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
        <div className="flex items-start text-sm text-slate-600 dark:text-slate-300">
          <MapPin className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-teal-600 dark:text-teal-400" />
          <span>
            {booking.addressId
              ? `${booking.addressId.street || ""} ${booking.addressId.streetNumber || ""}, ${booking.addressId.city || ""}`
              : booking.customAddressDetails?.fullAddress || "Custom Address"}
          </span>
        </div>
        {booking.professionalId?.name && (
          <div className="flex items-start text-sm text-slate-600 dark:text-slate-300">
            <User className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-teal-600 dark:text-teal-400" />
            <span>Professional: {booking.professionalId.name}</span>
          </div>
        )}
        {booking.isFlexibleTime && (
          <div className="flex items-start text-xs text-slate-500 dark:text-slate-400">
            <Hourglass className="mr-2 mt-0.5 h-3 w-3 flex-shrink-0 text-sky-600 dark:text-sky-400" />
            <span>Flexible Time</span>
          </div>
        )}
        {sourceInfo.label && (
          <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
            {sourceInfo.icon && <span className="mr-1.5">{sourceInfo.icon}</span>}
            <span>Source: {sourceInfo.label}</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col items-stretch gap-2 border-t bg-slate-50 p-4 dark:border-gray-700 dark:bg-gray-700/50 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-lg font-semibold text-teal-700 dark:text-teal-400">
          {formatCurrency(booking.priceDetails.finalAmount, "USD")}
        </div>
        {isCancellable && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isCancelPending || isCancelling}>
                {isCancelPending || isCancelling ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="mr-2 h-4 w-4" />
                )}
                Cancel Booking
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Cancellation</AlertDialogTitle>
                <AlertDialogDescription>Are you sure you want to cancel this booking?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => cancelBooking()} className="bg-destructive hover:bg-destructive/90">
                  Confirm
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardFooter>
    </Card>
  )
}
