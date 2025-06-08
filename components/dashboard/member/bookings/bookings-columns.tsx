"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
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
import { toast } from "@/components/common/ui/use-toast"
import { cn, formatDate, formatCurrency } from "@/lib/utils/utils"
import BookingDetailsView from "./booking-details-view"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/common/ui/dialog"

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
          className="px-1 hover:bg-muted/50"
        >
          {t("bookings.table.header.bookingId") || "מזהה הזמנה"}
          <ArrowUpDown className="ms-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-mono text-xs">
          <span className="text-primary font-bold">#{row.original.bookingNumber}</span>
          <div className="text-xs text-muted-foreground mt-1">
            {new Date(row.original.createdAt || row.original.bookingDateTime).toLocaleDateString(locale)}
          </div>
        </div>
      ),
      size: 130,
    },
    {
      accessorKey: "treatmentId.name",
      header: () => <div className="whitespace-nowrap">{t("bookings.table.header.treatmentDetails") || "פרטי טיפול"}</div>,
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
          <div className="flex flex-col min-w-[180px]">
            <span className="font-medium text-sm truncate max-w-[200px] group-hover:max-w-none">
              {treatment?.name || t("common.unknownTreatment") || "טיפול לא ידוע"}
            </span>
            <div className="flex items-center gap-2 mt-1">
              {durationDisplay && (
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                  ⏱️ {durationDisplay}
                </span>
              )}
              {priceDisplay && (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  💰 {priceDisplay}
                </span>
              )}
            </div>
            {booking.recipientName && booking.recipientName !== booking.bookedByUserName && (
              <span className="text-xs text-primary flex items-center mt-1 bg-purple-50 px-2 py-1 rounded">
                <Users className="h-3 w-3 mr-1" />
                {t("bookings.table.forRecipient") || "עבור: "}{booking.recipientName}
              </span>
            )}
            {booking.notes && (
              <span className="text-xs text-orange-600 flex items-center mt-1">
                📝 יש הערות
              </span>
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
          className="px-1 hover:bg-muted/50"
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
        if (diffDays < 0) {
          dateColorClass = "text-gray-500"
          datePrefix = "עבר לפני "
        } else if (diffDays === 0) {
          dateColorClass = "text-red-600 font-bold"
          datePrefix = "היום! "
        } else if (diffDays === 1) {
          dateColorClass = "text-orange-600 font-medium"
          datePrefix = "מחר "
        } else if (diffDays <= 7) {
          dateColorClass = "text-blue-600"
          datePrefix = `בעוד ${diffDays} ימים `
        }

        return (
          <div className="flex flex-col text-sm whitespace-nowrap min-w-[160px]">
            <div className={`flex items-center ${dateColorClass}`}>
              <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
              <span className="font-medium">
                {datePrefix}{formatDate(date, locale)}
              </span>
            </div>
            <div className="flex items-center text-muted-foreground mt-1">
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              <span className="font-mono">
                {date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            {row.original.isFlexibleTime && (
              <Badge
                variant="outline"
                className="mt-1 text-xs py-0.5 px-1.5 border-dashed border-amber-400 text-amber-700 bg-amber-50"
              >
                ⚡ {t("bookings.table.flexibleTime") || "זמן גמיש"}
              </Badge>
            )}
          </div>
        )
      },
      size: 180,
    },
    {
      accessorKey: "professionalId.name",
      header: () => (
        <div className="whitespace-nowrap hidden md:table-cell">{t("bookings.table.header.professional") || "מטפל/ת"}</div>
      ),
      cell: ({ row }) => {
        const professionalName = row.original.professionalId?.name
        const hasAssigned = !!professionalName
        
        return (
          <div className="text-sm hidden md:flex flex-col min-w-[140px]">
            <div className="flex items-center">
              <Briefcase className={`h-3.5 w-3.5 mr-1.5 flex-shrink-0 ${hasAssigned ? 'text-green-600' : 'text-orange-500'}`} />
              <span className={`truncate max-w-[120px] ${hasAssigned ? 'text-green-700 font-medium' : 'text-orange-600'}`}>
                {professionalName || t("bookings.toBeAssigned") || "יוקצה"}
              </span>
            </div>
            {!hasAssigned && (
              <span className="text-xs text-orange-500 mt-1 bg-orange-50 px-2 py-1 rounded">
                🔍 מחפשים מטפל
              </span>
            )}
            {row.original.therapistGenderPreference && (
              <span className="text-xs text-purple-600 mt-1">
                👤 העדפה: {row.original.therapistGenderPreference === 'male' ? 'גבר' : 
                         row.original.therapistGenderPreference === 'female' ? 'אישה' : 'ללא העדפה'}
              </span>
            )}
          </div>
        )
      },
      enableHiding: true,
    },
    {
      accessorKey: "bookingAddressSnapshot.city",
      header: () => <div className="whitespace-nowrap hidden lg:table-cell">{t("bookings.table.header.location") || "מיקום"}</div>,
      cell: ({ row }) => {
        const address = row.original.bookingAddressSnapshot || row.original.customAddressDetails
        const city = address?.city
        const fullAddress = address?.fullAddress
        
        return (
          <div className="text-sm hidden lg:flex flex-col min-w-[150px]">
            <div className="flex items-center">
              <MapPin className="h-3.5 w-3.5 mr-1.5 text-blue-600 flex-shrink-0" />
              <span className="truncate max-w-[130px] font-medium text-blue-700">
                {city || t("common.notAvailable") || "לא זמין"}
              </span>
            </div>
            {fullAddress && (
              <span className="text-xs text-muted-foreground mt-1 truncate max-w-[130px]" title={fullAddress}>
                📍 {fullAddress}
              </span>
            )}
            {address?.notes && (
              <span className="text-xs text-amber-600 mt-1">
                📝 יש הערות לכתובת
              </span>
            )}
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
            {t("bookings.table.header.total") || "סה\"כ"}
            <ArrowUpDown className="ms-2 h-3.5 w-3.5" />
          </Button>
        </div>
      ),
      cell: ({ row }) => {
        const { priceDetails, source } = row.original
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
          <div className="text-right font-medium text-sm whitespace-nowrap flex flex-col items-end min-w-[120px]">
            <div className="flex items-center">
              <BookingSourceIcon source={source} t={t} />
              <span className={`ms-1.5 font-bold ${paymentColor}`}>{paymentInfo}</span>
            </div>
            {priceDetails.basePrice > 0 && priceDetails.basePrice !== finalAmount && (
              <span className="text-xs text-muted-foreground line-through mt-1">
                מקורי: ₪{priceDetails.basePrice.toFixed(0)}
              </span>
            )}
            {priceDetails.surcharges && priceDetails.surcharges.length > 0 && (
              <span className="text-xs text-orange-600 mt-1">
                + תוספות: ₪{priceDetails.totalSurchargesAmount?.toFixed(0) || "0"}
              </span>
            )}
            {row.original.paymentDetails?.paymentStatus && (
              <span className={`text-xs px-2 py-1 rounded-full mt-1 ${
                row.original.paymentDetails.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                row.original.paymentDetails.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                row.original.paymentDetails.paymentStatus === 'failed' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                💳 {row.original.paymentDetails.paymentStatus === 'paid' ? 'שולם' :
                     row.original.paymentDetails.paymentStatus === 'pending' ? 'ממתין' :
                     row.original.paymentDetails.paymentStatus === 'failed' ? 'נכשל' :
                     row.original.paymentDetails.paymentStatus === 'not_required' ? 'לא נדרש' :
                     row.original.paymentDetails.paymentStatus}
              </span>
            )}
          </div>
        )
      },
      size: 160,
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
