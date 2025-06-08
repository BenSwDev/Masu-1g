"use client"

import type { ColumnDef } from "@tanstack/react-table"
import {
  MoreHorizontal,
  ArrowUpDown,
  Eye,
  XCircle,
  Loader2,
  Hourglass,
  CheckCircle,
  Info,
  CalendarDays,
  MapPin,
  Users,
  Briefcase,
  Gift,
  ShoppingBag,
  Ticket,
  Clock,
  UserCheck,
  UserX,
  CreditCard,
  GiftIcon,
  X,
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
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerTrigger } from "@/components/common/ui/drawer"
import { ScrollArea } from "@/components/common/ui/scroll-area"
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

// Helper component for actions - accepts `t` as a prop
const BookingActions = ({ booking, t }: { booking: PopulatedBooking; t: TFunction }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  const canCancel = useMemo(() => {
    const cancelableStatuses = ["pending_professional_assignment", "confirmed", "professional_en_route"]
    const bookingDate = new Date(booking.bookingDateTime)
    const now = new Date()
    const hoursUntilBooking = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    return cancelableStatuses.includes(booking.status) && hoursUntilBooking > 2 // Can cancel if more than 2 hours before
  }, [booking.status, booking.bookingDateTime])

  const handleCancelBooking = async () => {
    if (!canCancel) return
    
    setIsCancelling(true)
    try {
      // Add cancellation logic here
      console.log("Cancelling booking:", booking._id)
      // await cancelBooking(booking._id)
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
            className="h-8 w-8 p-0 hover:bg-muted/50 data-[state=open]:bg-muted"
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

          {!canCancel && booking.status !== "completed" && booking.status !== "cancelled_by_user" && booking.status !== "cancelled_by_admin" && (
            <DropdownMenuItem disabled className="text-muted-foreground">
              <Info className="mr-2 h-4 w-4" />
              <span>לא ניתן לבטל</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Booking Details Modal */}
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

// Status component for reusability - accepts `t` as a prop
const BookingStatusBadge = ({ status, t }: { status: PopulatedBooking["status"]; t: TFunction }) => {
  const statusConfig = {
    pending_professional_assignment: {
      label: t("memberBookings.status.pending_professional_assignment_short") || "ממתין להקצאה",
      icon: "⏳",
      className: "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200",
    },
    confirmed: {
      label: t("memberBookings.status.confirmed_short") || "מאושר",
      icon: "✅",
      className: "bg-green-100 text-green-800 border-green-300 hover:bg-green-200",
    },
    professional_en_route: {
      label: t("memberBookings.status.professional_en_route_short") || "בדרך",
      icon: "🚗",
      className: "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200",
    },
    completed: {
      label: t("memberBookings.status.completed_short") || "הושלם",
      icon: "🎉",
      className: "bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200",
    },
    cancelled_by_user: {
      label: t("memberBookings.status.cancelled_by_user_short") || "בוטל",
      icon: "❌",
      className: "bg-red-100 text-red-800 border-red-300 hover:bg-red-200",
    },
    cancelled_by_admin: {
      label: t("memberBookings.status.cancelled_by_admin_short") || "בוטל",
      icon: "⛔",
      className: "bg-red-100 text-red-800 border-red-300 hover:bg-red-200",
    },
    no_show: {
      label: t("memberBookings.status.no_show_short") || "לא הופיע",
      icon: "👻",
      className: "bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200",
    },
  }

  const config = statusConfig[status] || {
    label: status,
    icon: "❓",
    className: "bg-gray-100 text-gray-800 border-gray-300",
  }

  return (
    <Badge
      variant="outline"
      className={`transition-colors duration-200 text-xs font-medium px-3 py-1 ${config.className}`}
    >
      <span className="mr-1.5">{config.icon}</span>
      {config.label}
    </Badge>
  )
}

const BookingSourceIcon = ({ source, t }: { source: PopulatedBooking["source"]; t: TFunction }) => {
  const sourceConfig = {
    subscription_redemption: {
      icon: "🎫",
      color: "text-purple-600",
      tooltip: t("bookings.source.subscription") || "מנוי",
    },
    gift_voucher_redemption: {
      icon: "🎁",
      color: "text-pink-600",
      tooltip: t("bookings.source.giftVoucher") || "שובר מתנה",
    },
    new_purchase: {
      icon: "💳",
      color: "text-blue-600",
      tooltip: t("bookings.source.newPurchase") || "רכישה חדשה",
    },
  }

  const config = sourceConfig[source] || {
    icon: "❓",
    color: "text-gray-600",
    tooltip: source || "לא ידוע",
  }

  return (
    <span 
      className={`text-sm ${config.color}`} 
      title={config.tooltip}
      aria-label={config.tooltip}
    >
      {config.icon}
    </span>
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
          className="px-1 hover:bg-muted/50 text-right"
        >
          {t("bookings.table.header.bookingId") || "מזהה הזמנה"}
          <ArrowUpDown className="ms-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-mono text-xs text-right">
          <span className="text-primary font-bold block">#{row.original.bookingNumber}</span>
          <div className="text-xs text-muted-foreground mt-1">
            {formatDateIsraeli(row.original.createdAt || row.original.bookingDateTime)}
          </div>
          <div className="text-xs text-blue-600 mt-0.5">
            {formatTimeIsraeli(row.original.createdAt || row.original.bookingDateTime)}
          </div>
        </div>
      ),
      size: 120,
    },
    {
      accessorKey: "treatmentId.name",
      header: () => <div className="whitespace-nowrap text-right">{t("bookings.table.header.treatmentDetails") || "פרטי טיפול"}</div>,
      cell: ({ row }) => {
        const booking = row.original
        const treatment = booking.treatmentId
        let durationDisplay = ""
        let priceDisplay = ""
        
        // Calculate duration display
        if (treatment?.pricingType === "duration_based" && booking.selectedDurationId && treatment.durations) {
          const selectedDuration = treatment.durations.find(
            (d: ITreatmentDuration) => d._id?.toString() === booking.selectedDurationId?.toString(),
          )
          if (selectedDuration) {
            durationDisplay = `${selectedDuration.minutes} ${t("common.minutes_short") || "דק'"}`
            priceDisplay = `₪${selectedDuration.price?.toFixed(0) || "0"}`
          }
        } else if (treatment?.pricingType === "fixed" && treatment.defaultDurationMinutes) {
          durationDisplay = `${treatment.defaultDurationMinutes} ${t("common.minutes_short") || "דק'"}`
          priceDisplay = `₪${treatment.fixedPrice?.toFixed(0) || "0"}`
        }

        return (
          <div className="flex flex-col min-w-[200px] max-w-[300px]">
            <span className="font-bold text-sm text-right truncate max-w-full hover:max-w-none hover:whitespace-normal">
              {treatment?.name || t("common.unknownTreatment") || "טיפול לא ידוע"}
            </span>
            
            {/* Duration and Price tags */}
            <div className="flex items-center gap-1 mt-2 flex-wrap justify-end">
              {durationDisplay && (
                <span className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded-full border border-blue-200">
                  ⏱️ {durationDisplay}
                </span>
              )}
              {priceDisplay && (
                <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full border border-green-200">
                  💰 {priceDisplay}
                </span>
              )}
            </div>

            {/* Recipient info */}
            {booking.recipientName && booking.recipientName !== booking.bookedByUserName && (
              <div className="text-xs text-purple-700 bg-purple-50 px-2 py-1.5 rounded mt-2 border border-purple-200">
                <Users className="h-3 w-3 inline-block ml-1" />
                <span className="font-medium">{t("bookings.table.forRecipient") || "עבור: "}</span>
                <span className="font-bold">{booking.recipientName}</span>
                {booking.recipientPhone && (
                  <div className="text-xs text-purple-600 mt-0.5">
                    📱 {booking.recipientPhone}
                  </div>
                )}
              </div>
            )}

            {/* Notes indicator */}
            {booking.notes && (
              <div className="text-xs text-orange-700 bg-orange-50 px-2 py-1 rounded mt-1 border border-orange-200">
                📝 <span className="font-medium">יש הערות</span>
                <div className="text-xs text-orange-600 mt-0.5 line-clamp-2">
                  {booking.notes.substring(0, 50)}{booking.notes.length > 50 && "..."}
                </div>
              </div>
            )}

            {/* Gender preference */}
            {booking.therapistGenderPreference && (
              <div className="text-xs text-indigo-700 bg-indigo-50 px-2 py-1 rounded mt-1 border border-indigo-200">
                👤 <span className="font-medium">העדפה: </span>
                {booking.therapistGenderPreference === 'male' ? 'גבר' : 
                 booking.therapistGenderPreference === 'female' ? 'אישה' : 'ללא העדפה'}
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
          className="px-1 hover:bg-muted/50 text-right"
        >
          {t("bookings.table.header.dateTime") || "תאריך ושעה"}
          <ArrowUpDown className="ms-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = new Date(row.original.bookingDateTime)
        const now = new Date()
        const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        
        let dateColorClass = ""
        let datePrefix = ""
        let urgencyIcon = ""
        
        if (diffDays < 0) {
          dateColorClass = "text-gray-500"
          datePrefix = "עבר "
          urgencyIcon = "⏪"
        } else if (diffDays === 0) {
          dateColorClass = "text-red-600 font-bold animate-pulse"
          datePrefix = "היום! "
          urgencyIcon = "🔥"
        } else if (diffDays === 1) {
          dateColorClass = "text-orange-600 font-bold"
          datePrefix = "מחר "
          urgencyIcon = "⚡"
        } else if (diffDays <= 3) {
          dateColorClass = "text-yellow-600 font-medium"
          datePrefix = `בעוד ${diffDays} ימים `
          urgencyIcon = "⚠️"
        } else if (diffDays <= 7) {
          dateColorClass = "text-blue-600"
          datePrefix = `בעוד ${diffDays} ימים `
          urgencyIcon = "📅"
        } else {
          dateColorClass = "text-gray-600"
          urgencyIcon = "📆"
        }

        return (
          <div className="flex flex-col text-sm whitespace-nowrap min-w-[140px] text-right">
            <div className={`flex items-center justify-end ${dateColorClass}`}>
              <span className="font-bold text-base">
                {urgencyIcon} {datePrefix}{formatDateIsraeli(date)}
              </span>
            </div>
            <div className="flex items-center justify-end text-muted-foreground mt-1">
              <span className="font-mono text-lg font-medium">
                🕐 {formatTimeIsraeli(date)}
              </span>
            </div>
            
            {/* Flexible time badge */}
            {row.original.isFlexibleTime && (
              <Badge
                variant="outline"
                className="mt-2 text-xs py-1 px-2 border-dashed border-amber-400 text-amber-800 bg-amber-50 self-end"
              >
                ⚡ {t("bookings.table.flexibleTime") || "זמן גמיש"}
                {row.original.flexibilityRangeHours && (
                  <span className="text-xs mr-1">±{row.original.flexibilityRangeHours}ש'</span>
                )}
              </Badge>
            )}

            {/* Time until booking */}
            {diffDays >= 0 && diffDays <= 7 && (
              <div className="text-xs text-gray-500 mt-1 bg-gray-50 px-2 py-1 rounded border">
                ⏳ {diffDays === 0 ? 'היום' : diffDays === 1 ? 'מחר' : `בעוד ${diffDays} ימים`}
              </div>
            )}
          </div>
        )
      },
      size: 160,
    },
    {
      accessorKey: "professionalId.name",
      header: () => (
        <div className="whitespace-nowrap text-right hidden sm:block">{t("bookings.table.header.professional") || "מטפל/ת"}</div>
      ),
      cell: ({ row }) => {
        const professionalName = row.original.professionalId?.name
        const hasAssigned = !!professionalName
        
        return (
          <div className="text-sm hidden sm:flex flex-col min-w-[160px] text-right">
            <div className="flex items-center justify-end">
              <span className={`truncate max-w-[140px] font-medium ${hasAssigned ? 'text-green-700' : 'text-orange-600'}`}>
                {professionalName || t("bookings.toBeAssigned") || "ממתין להקצאה"}
              </span>
              <Briefcase className={`h-4 w-4 mr-2 flex-shrink-0 ${hasAssigned ? 'text-green-600' : 'text-orange-500'}`} />
            </div>
            
            {!hasAssigned && (
              <div className="text-xs text-orange-700 bg-orange-100 px-2 py-1.5 rounded mt-2 border border-orange-200">
                🔍 <span className="font-medium">מחפשים מטפל מתאים</span>
              </div>
            )}
            
            {hasAssigned && (
              <div className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded mt-1 border border-green-200">
                ✅ <span className="font-medium">מטפל משובץ</span>
              </div>
            )}
          </div>
        )
      },
      enableHiding: true,
    },
    {
      accessorKey: "bookingAddressSnapshot.city",
      header: () => <div className="whitespace-nowrap text-right hidden md:block">{t("bookings.table.header.location") || "מיקום ופרטים"}</div>,
      cell: ({ row }) => {
        const address = row.original.bookingAddressSnapshot || row.original.customAddressDetails
        const city = address?.city
        const fullAddress = address?.fullAddress
        
        return (
          <div className="text-sm hidden md:flex flex-col min-w-[180px] text-right max-w-[220px]">
            <div className="flex items-center justify-end">
              <span className="truncate max-w-[150px] font-bold text-blue-700">
                {city || t("common.notAvailable") || "לא זמין"}
              </span>
              <MapPin className="h-4 w-4 mr-2 text-blue-600 flex-shrink-0" />
            </div>
            
            {fullAddress && (
              <div className="text-xs text-gray-600 mt-1 bg-gray-50 px-2 py-1 rounded border max-w-full">
                📍 <span className="break-words">{fullAddress}</span>
              </div>
            )}

            {/* Address details */}
            <div className="mt-2 space-y-1">
              {(address as any)?.hasPrivateParking && (
                <div className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded border border-green-200">
                  🚗 חנייה פרטית זמינה
                </div>
              )}
              
              {(address as any)?.entrance && (
                <div className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                  🚪 כניסה: {(address as any).entrance}
                </div>
              )}
              
              {(address as any)?.floor && (
                <div className="text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded border border-purple-200">
                  🏢 קומה: {(address as any).floor}
                </div>
              )}
              
              {(address as any)?.apartmentNumber && (
                <div className="text-xs text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-200">
                  🏠 דירה: {(address as any).apartmentNumber}
                </div>
              )}
              
              {(address as any)?.additionalNotes && (
                <div className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                  📝 הערות נוספות
                </div>
              )}
            </div>
          </div>
        )
      },
      enableHiding: true,
    },
    {
      accessorKey: "status",
      header: () => <div className="text-center whitespace-nowrap">{t("bookings.table.header.status") || "סטטוס"}</div>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <BookingStatusBadge status={row.original.status} t={t} />
        </div>
      ),
      size: 150,
    },
    {
      accessorKey: "priceDetails.finalAmount",
      header: ({ column }) => (
        <div className="text-right">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="px-1 hover:bg-muted/50"
          >
            {t("bookings.table.header.total") || "סה\"כ ותשלום"}
            <ArrowUpDown className="ms-2 h-3.5 w-3.5" />
          </Button>
        </div>
      ),
      cell: ({ row }) => {
        const { priceDetails, source, paymentDetails } = row.original
        const isFreeCovered = priceDetails.isFullyCoveredByVoucherOrSubscription
        const finalAmount = priceDetails.finalAmount || 0
        
        let paymentInfo = ""
        let paymentColor = "text-green-600"
        
        if (isFreeCovered) {
          if (source === "subscription_redemption") {
            paymentInfo = "🎫 מכוסה במנוי"
            paymentColor = "text-purple-600"
          } else if (source === "gift_voucher_redemption") {
            paymentInfo = "🎁 מכוסה בשובר"
            paymentColor = "text-pink-600"
          } else {
            paymentInfo = "🆓 חינם"
            paymentColor = "text-green-600"
          }
        } else {
          paymentInfo = `₪${finalAmount.toFixed(0)}`
          paymentColor = finalAmount > 0 ? "text-blue-600" : "text-green-600"
        }

        return (
          <div className="text-right font-medium text-sm whitespace-nowrap flex flex-col items-end min-w-[140px]">
            <div className="flex items-center">
              <span className={`font-bold text-base ${paymentColor}`}>{paymentInfo}</span>
              <BookingSourceIcon source={source} t={t} />
            </div>
            
            {/* Original price if different */}
            {priceDetails.basePrice > 0 && priceDetails.basePrice !== finalAmount && (
              <span className="text-xs text-muted-foreground line-through mt-1 bg-gray-50 px-2 py-1 rounded">
                מקורי: ₪{priceDetails.basePrice.toFixed(0)}
              </span>
            )}
            
            {/* Surcharges */}
            {priceDetails.surcharges && priceDetails.surcharges.length > 0 && (
              <span className="text-xs text-orange-700 bg-orange-50 px-2 py-1 rounded mt-1 border border-orange-200">
                + תוספות: ₪{priceDetails.totalSurchargesAmount?.toFixed(0) || "0"}
              </span>
            )}
            
            {/* Discounts */}
            {priceDetails.discountAmount > 0 && (
              <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded mt-1 border border-green-200">
                - הנחה: ₪{priceDetails.discountAmount.toFixed(0)}
              </span>
            )}
            
            {/* Payment status */}
            {paymentDetails?.paymentStatus && (
              <span className={`text-xs px-2 py-1 rounded-full mt-2 font-medium ${
                paymentDetails.paymentStatus === 'paid' ? 'bg-green-100 text-green-800 border border-green-200' :
                paymentDetails.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                paymentDetails.paymentStatus === 'failed' ? 'bg-red-100 text-red-800 border border-red-200' :
                'bg-gray-100 text-gray-800 border border-gray-200'
              }`}>
                💳 {paymentDetails.paymentStatus === 'paid' ? 'שולם' :
                     paymentDetails.paymentStatus === 'pending' ? 'ממתין לתשלום' :
                     paymentDetails.paymentStatus === 'failed' ? 'תשלום נכשל' :
                     paymentDetails.paymentStatus === 'not_required' ? 'לא נדרש תשלום' :
                     paymentDetails.paymentStatus}
              </span>
            )}
            
            {/* Payment method */}
            {paymentDetails?.paymentMethodId && finalAmount > 0 && (
              <div className="text-xs text-gray-600 mt-1 bg-gray-50 px-2 py-1 rounded border">
                💳 {String(paymentDetails.paymentMethodId.displayName) || 
                     `${paymentDetails.paymentMethodId.type} ****${paymentDetails.paymentMethodId.last4}`}
              </div>
            )}
          </div>
        )
      },
      size: 180,
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
