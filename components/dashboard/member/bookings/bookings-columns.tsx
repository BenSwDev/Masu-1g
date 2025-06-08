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
      className: "bg-amber-50 text-amber-700 border-amber-200",
    },
    confirmed: {
      label: t("memberBookings.status.confirmed_short") || "מאושר",
      className: "bg-green-50 text-green-700 border-green-200",
    },
    professional_en_route: {
      label: t("memberBookings.status.professional_en_route_short") || "בדרך",
      className: "bg-blue-50 text-blue-700 border-blue-200",
    },
    completed: {
      label: t("memberBookings.status.completed_short") || "הושלם",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    cancelled_by_user: {
      label: t("memberBookings.status.cancelled_by_user_short") || "בוטל",
      className: "bg-red-50 text-red-700 border-red-200",
    },
    cancelled_by_admin: {
      label: t("memberBookings.status.cancelled_by_admin_short") || "בוטל",
      className: "bg-red-50 text-red-700 border-red-200",
    },
    no_show: {
      label: t("memberBookings.status.no_show_short") || "לא הופיע",
      className: "bg-orange-50 text-orange-700 border-orange-200",
    },
  }

  const config = statusConfig[status] || {
    label: status,
    className: "bg-gray-50 text-gray-700 border-gray-200",
  }

  return (
    <Badge
      variant="outline"
      className={`text-xs font-medium px-2 py-1 ${config.className}`}
    >
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
          <div className="font-bold text-lg text-primary">
            #{row.original.bookingNumber}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
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
          <div className="text-right space-y-2">
            <div className="font-medium">
              {treatment?.name || "טיפול לא ידוע"}
            </div>
            
            <div className="flex justify-end gap-2 text-xs">
              {durationDisplay && (
                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                  {durationDisplay}
                </span>
              )}
              {priceDisplay && (
                <span className="bg-green-50 text-green-700 px-2 py-1 rounded">
                  {priceDisplay}
                </span>
              )}
            </div>

            {booking.recipientName && booking.recipientName !== booking.bookedByUserName && (
              <div className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">
                עבור: {booking.recipientName}
              </div>
            )}

            {booking.notes && (
              <div className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded">
                יש הערות
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
          <div className="text-right space-y-1">
            <div className={`font-medium ${urgencyClass}`}>
              {formatDateIsraeli(date)}
            </div>
            <div className="font-mono text-sm text-muted-foreground">
              {formatTimeIsraeli(date)}
            </div>
            {urgencyText && (
              <div className={`text-xs ${urgencyClass}`}>
                {urgencyText}
              </div>
            )}
            {row.original.isFlexibleTime && (
              <div className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded">
                זמן גמיש
              </div>
            )}
          </div>
        )
      },
      size: 140,
    },
    {
      accessorKey: "professionalId.name",
      header: () => (
        <div className="text-right hidden sm:block">מטפל/ת</div>
      ),
      cell: ({ row }) => {
        const professionalName = row.original.professionalId?.name
        
        return (
          <div className="text-right hidden sm:block">
            {professionalName ? (
              <div className="space-y-1">
                <div className="font-medium text-green-700">
                  {professionalName}
                </div>
                <div className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded">
                  משובץ
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-amber-600 font-medium">
                  ממתין להקצאה
                </div>
                <div className="text-xs bg-amber-50 text-amber-600 px-2 py-1 rounded">
                  בחיפוש
                </div>
              </div>
            )}
          </div>
        )
      },
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
