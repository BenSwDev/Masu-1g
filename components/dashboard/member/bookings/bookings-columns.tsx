"use client"

import type { ColumnDef } from "@tanstack/react-table"
import {
  MoreHorizontal,
  ArrowUpDown,
  Eye,
  X,
  Loader2,
  MapPin,
  Phone,
} from "lucide-react"
import { useState, useMemo } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/common/ui/dropdown-menu"
import { Badge } from "@/components/common/ui/badge"
import { toast } from "sonner"
import { cn, formatDateIsraeli, formatTimeIsraeli } from "@/lib/utils/utils"
import BookingDetailsView from "./booking-details-view"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/common/ui/dialog"
import { Button } from "@/components/common/ui/button"

import type { PopulatedBooking, ITreatmentDuration } from "@/types/booking"

type TFunction = (key: string, options?: any) => string

// Helper component for actions
const BookingActions = ({ booking, t }: { booking: PopulatedBooking; t: TFunction }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  const canCancel = useMemo(() => {
    const cancelableStatuses = ["pending_professional_assignment", "confirmed", "professional_en_route"]
    const bookingDate = new Date(booking.bookingDateTime)
    const now = new Date()
    const hoursUntilBooking = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    return cancelableStatuses.includes(booking.status) && hoursUntilBooking > 2
  }, [booking.status, booking.bookingDateTime])

  const handleCancelBooking = async () => {
    if (!canCancel) return
    
    setIsCancelling(true)
    try {
      console.log("Cancelling booking:", booking._id)
      toast.success(t("memberBookings.cancelSuccess") || "ההזמנה בוטלה בהצלחה")
    } catch (error) {
      toast.error("שגיאה בביטול ההזמנה")
    } finally {
      setIsCancelling(false)
      setIsOpen(false)
    }
  }

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
            aria-label={t("common.openMenu") || "פתח תפריט"}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">פעולות</p>
              <p className="text-xs text-muted-foreground">הזמנה #{booking.bookingNumber}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={() => setShowDetailsModal(true)}
            className="cursor-pointer"
          >
            <Eye className="mr-2 h-4 w-4" />
            <span>{t("common.viewDetails") || "צפה בפרטים"}</span>
          </DropdownMenuItem>

          {canCancel && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleCancelBooking}
                disabled={isCancelling}
                className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>{t("common.cancelling") || "מבטל..."}</span>
                  </>
                ) : (
                  <>
                    <X className="mr-2 h-4 w-4" />
                    <span>{t("memberBookings.cancelBooking") || "בטל הזמנה"}</span>
                  </>
                )}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-right">
              {t("bookingDetails.drawerTitle") || "פרטי הזמנה"} #{booking.bookingNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <BookingDetailsView booking={booking} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Status component - clean and minimal
const BookingStatusBadge = ({ status, t }: { status: PopulatedBooking["status"]; t: TFunction }) => {
  const statusConfig = {
    pending_professional_assignment: {
      label: t("memberBookings.status.pending_professional_assignment_short") || "ממתין להקצאה",
      className: "bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 border border-amber-300 shadow-sm",
      icon: "⏳"
    },
    confirmed: {
      label: t("memberBookings.status.confirmed_short") || "מאושר",
      className: "bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300 shadow-sm",
      icon: "✅"
    },
    professional_en_route: {
      label: t("memberBookings.status.professional_en_route_short") || "בדרך",
      className: "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300 shadow-sm",
      icon: "🚗"
    },
    completed: {
      label: t("memberBookings.status.completed_short") || "הושלם",
      className: "bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 border border-emerald-300 shadow-sm",
      icon: "🎉"
    },
    cancelled_by_user: {
      label: t("memberBookings.status.cancelled_by_user_short") || "בוטל",
      className: "bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300 shadow-sm",
      icon: "❌"
    },
    cancelled_by_admin: {
      label: t("memberBookings.status.cancelled_by_admin_short") || "בוטל",
      className: "bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300 shadow-sm",
      icon: "⛔"
    },
    no_show: {
      label: t("memberBookings.status.no_show_short") || "לא הופיע",
      className: "bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border border-orange-300 shadow-sm",
      icon: "👻"
    },
  }

  const config = statusConfig[status] || {
    label: status,
    className: "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300 shadow-sm",
    icon: "❓"
  }

  return (
    <Badge
      variant="outline"
      className={`text-xs font-semibold px-3 py-2 rounded-full transition-all duration-200 hover:scale-105 ${config.className}`}
    >
      <span className="mr-1.5">{config.icon}</span>
      {config.label}
    </Badge>
  )
}

export const getBookingColumns = (t: TFunction, locale: string): ColumnDef<PopulatedBooking>[] => {
  return [
    {
      accessorKey: "bookingNumber",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-1 text-right"
        >
          מספר הזמנה
          <ArrowUpDown className="mr-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-right">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-3 rounded-xl mb-2">
            <div className="font-bold text-xl text-primary bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              #{row.original.bookingNumber}
            </div>
          </div>
          <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
            נוצרה: {formatDateIsraeli(row.original.createdAt || row.original.bookingDateTime)}
          </div>
        </div>
      ),
      size: 120,
    },
    {
      accessorKey: "treatmentId.name",
      header: () => <div className="text-right">פרטי טיפול</div>,
      cell: ({ row }) => {
        const booking = row.original
        const treatment = booking.treatmentId
        let durationDisplay = ""
        let priceDisplay = ""
        
        if (treatment?.pricingType === "duration_based" && booking.selectedDurationId && treatment.durations) {
          const selectedDuration = treatment.durations.find(
            (d: ITreatmentDuration) => d._id?.toString() === booking.selectedDurationId?.toString(),
          )
          if (selectedDuration) {
            durationDisplay = `${selectedDuration.minutes} דק'`
            priceDisplay = `₪${selectedDuration.price?.toFixed(0) || "0"}`
          }
        } else if (treatment?.pricingType === "fixed" && treatment.defaultDurationMinutes) {
          durationDisplay = `${treatment.defaultDurationMinutes} דק'`
          priceDisplay = `₪${treatment.fixedPrice?.toFixed(0) || "0"}`
        }

        return (
          <div className="text-right space-y-3">
            <div className="font-bold text-lg text-gray-800 leading-tight">
              {treatment?.name || "טיפול לא ידוע"}
            </div>
            
            <div className="flex justify-end gap-2 text-xs">
              {durationDisplay && (
                <span className="bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 px-3 py-1.5 rounded-full font-semibold border border-blue-300 shadow-sm">
                  ⏱️ {durationDisplay}
                </span>
              )}
              {priceDisplay && (
                <span className="bg-gradient-to-r from-green-100 to-green-200 text-green-800 px-3 py-1.5 rounded-full font-semibold border border-green-300 shadow-sm">
                  💰 {priceDisplay}
                </span>
              )}
            </div>

            {booking.recipientName && booking.recipientName !== booking.bookedByUserName && (
              <div className="text-xs bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 px-3 py-2 rounded-xl border border-purple-300 shadow-sm">
                <span className="font-semibold">👤 עבור:</span> {booking.recipientName}
              </div>
            )}

            {booking.notes && (
              <div className="text-xs bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-3 py-2 rounded-xl border border-gray-300 shadow-sm">
                <span className="font-semibold">📝</span> יש הערות
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "bookingDateTime",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-1 text-right"
        >
          תאריך ושעה
          <ArrowUpDown className="mr-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = new Date(row.original.bookingDateTime)
        const now = new Date()
        const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        
        let urgencyClass = ""
        let urgencyText = ""
        
        if (diffDays < 0) {
          urgencyClass = "text-gray-500"
          urgencyText = "עבר"
        } else if (diffDays === 0) {
          urgencyClass = "text-red-600 font-bold"
          urgencyText = "היום"
        } else if (diffDays === 1) {
          urgencyClass = "text-orange-600 font-semibold"
          urgencyText = "מחר"
        } else if (diffDays <= 7) {
          urgencyClass = "text-blue-600"
          urgencyText = `בעוד ${diffDays} ימים`
        } else {
          urgencyClass = "text-gray-600"
        }

        return (
          <div className="text-right space-y-2">
            <div className={`font-bold text-lg px-3 py-2 rounded-xl ${urgencyClass} ${
              diffDays === 0 ? 'bg-red-50 border border-red-200' :
              diffDays === 1 ? 'bg-orange-50 border border-orange-200' :
              diffDays <= 7 ? 'bg-blue-50 border border-blue-200' :
              'bg-gray-50 border border-gray-200'
            }`}>
              {formatDateIsraeli(date)}
            </div>
            <div className="font-mono text-base text-gray-600 bg-gray-50 px-2 py-1 rounded-lg">
              {formatTimeIsraeli(date)}
            </div>
            {urgencyText && (
              <div className={`text-xs font-medium px-2 py-1 rounded-full ${urgencyClass} ${
                diffDays === 0 ? 'bg-red-100' :
                diffDays === 1 ? 'bg-orange-100' :
                diffDays <= 7 ? 'bg-blue-100' :
                'bg-gray-100'
              }`}>
                {urgencyText}
              </div>
            )}
            {row.original.isFlexibleTime && (
              <div className="text-xs bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 px-2 py-1 rounded-full border border-amber-300">
                ⚡ זמן גמיש
              </div>
            )}
          </div>
        )
      },
      size: 140,
    },
    {
      accessorKey: "bookingAddressSnapshot.city",
      header: () => <div className="text-right hidden md:block">מיקום</div>,
      cell: ({ row }) => {
        const address = row.original.bookingAddressSnapshot || row.original.customAddressDetails
        
        if (!address) {
          return (
            <div className="text-right hidden md:block">
              <div className="text-gray-500 text-sm">
                מיקום לא זמין
              </div>
            </div>
          )
        }

        const city = address?.city
        const fullAddress = address?.fullAddress
        
        return (
          <div className="text-right hidden md:block space-y-1">
            <div className="font-medium text-blue-700">
              {city || "עיר לא צוינה"}
            </div>
            
            {fullAddress && (
              <div className="text-xs text-gray-600 max-w-[200px] truncate">
                {fullAddress}
              </div>
            )}

            <div className="flex justify-end gap-1 text-xs">
              {(address as any)?.hasPrivateParking && (
                <span className="bg-green-50 text-green-600 px-1.5 py-0.5 rounded">
                  חנייה
                </span>
              )}
              
              {(address as any)?.isAccessible && (
                <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                  נגיש
                </span>
              )}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "status",
      header: () => <div className="text-center">סטטוס</div>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <BookingStatusBadge status={row.original.status} t={t} />
        </div>
      ),
      size: 120,
    },
    {
      accessorKey: "priceDetails.finalAmount",
      header: ({ column }) => (
        <div className="text-right">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="px-1"
          >
            מחיר
            <ArrowUpDown className="mr-2 h-3.5 w-3.5" />
          </Button>
        </div>
      ),
      cell: ({ row }) => {
        const { priceDetails, source } = row.original
        const isFreeCovered = priceDetails.isFullyCoveredByVoucherOrSubscription
        const finalAmount = priceDetails.finalAmount || 0
        
        let paymentInfo = ""
        let paymentColor = "text-blue-600"
        let sourceLabel = ""
        
        if (isFreeCovered) {
          if (source === "subscription_redemption") {
            paymentInfo = "חינם"
            sourceLabel = "מנוי"
            paymentColor = "text-purple-600"
          } else if (source === "gift_voucher_redemption") {
            paymentInfo = "חינם"
            sourceLabel = "שובר מתנה"
            paymentColor = "text-pink-600"
          } else {
            paymentInfo = "חינם"
            paymentColor = "text-green-600"
          }
        } else {
          paymentInfo = `₪${finalAmount.toFixed(0)}`
          paymentColor = "text-blue-600"
        }

        return (
          <div className="text-right space-y-1">
            <div className={`font-bold text-lg ${paymentColor}`}>
              {paymentInfo}
            </div>
            
            {sourceLabel && (
              <div className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded">
                {sourceLabel}
              </div>
            )}
            
            {priceDetails.basePrice > 0 && priceDetails.basePrice !== finalAmount && (
              <div className="text-xs text-muted-foreground line-through">
                ₪{priceDetails.basePrice.toFixed(0)}
              </div>
            )}
          </div>
        )
      },
      size: 100,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-center">
          <BookingActions booking={row.original} t={t} />
        </div>
      ),
      size: 60,
    },
  ]
}
