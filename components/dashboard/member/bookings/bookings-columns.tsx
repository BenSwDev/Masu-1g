"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { format } from "date-fns"
import { he, enUS, ru } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useState, useMemo } from "react"
import { 
  ArrowUpDown, 
  MoreHorizontal, 
  Eye, 
  X, 
  Loader2,
  MessageSquare,
  Star,
  MessageCircle
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/common/ui/dropdown-menu"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle
} from "@/components/common/ui/dialog"
import { toast } from "sonner"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import BookingDetailsView from "./booking-details-view"
import type { PopulatedBooking, ITreatmentDuration } from "@/types/booking"
import { getReviewByBookingId } from "@/actions/review-actions"
import CreateReviewModal from "../reviews/create-review-modal"
import ReviewDetailModal from "../reviews/review-detail-modal"
import { Heading } from "@/components/common/ui/heading"

type TFunction = (key: string, options?: any) => string

// Review Action Component
const ReviewAction = ({ booking, t }: { booking: PopulatedBooking; t: TFunction }) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)

  // Check if booking can be reviewed (completed only)
  const canReview = booking.status === "completed"

  // Fetch existing review if any
  const { data: existingReview, refetch, isLoading, error } = useQuery({
    queryKey: ["review", booking._id],
    queryFn: () => getReviewByBookingId(booking._id.toString()),
    enabled: canReview,
    staleTime: 30000,
    retry: 1,
  })

  const hasReview = !!existingReview

  // Handle create review button click
  const handleCreateReview = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsCreateModalOpen(true)
  }

  // Handle view review button click
  const handleViewReview = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsViewModalOpen(true)
  }

  // Handle successful review creation
  const handleReviewSuccess = () => {
    refetch()
    setIsCreateModalOpen(false)
  }

  if (!canReview) {
    return (
      <Button variant="outline" size="sm" disabled className="text-xs">
        <MessageCircle className="h-3 w-3 mr-1" />
        {t("memberBookings.reviewNotAvailable")}
      </Button>
    )
  }

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled className="text-xs">
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        {t("common.loading")}
      </Button>
    )
  }

  if (error) {
    return (
      <Button variant="outline" size="sm" disabled className="text-xs text-red-600">
        <X className="h-3 w-3 mr-1" />
        {t("common.error")}
      </Button>
    )
  }

  if (hasReview) {
    return (
      <>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleViewReview}
          className="text-xs"
        >
          <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
          {t("memberBookings.viewReview")}
        </Button>

        {/* View Review Modal */}
        {existingReview && (
          <ReviewDetailModal
            review={existingReview}
            isOpen={isViewModalOpen}
            onClose={() => setIsViewModalOpen(false)}
            onUpdate={refetch}
          />
        )}
      </>
    )
  }

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleCreateReview}
        className="text-xs"
      >
        <MessageCircle className="h-3 w-3 mr-1" />
        {t("memberBookings.writeReview")}
      </Button>

      {/* Create Review Modal */}
      <CreateReviewModal
        booking={booking}
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleReviewSuccess}
      />
    </>
  )
}

// Helper component for actions
const BookingActions = ({ booking, t }: { booking: PopulatedBooking; t: TFunction }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showNotesModal, setShowNotesModal] = useState(false)

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
      toast.success(t("memberBookings.cancelSuccess"))
    } catch (error) {
      toast.error(t("common.errors.cancellationFailed"))
    } finally {
      setIsCancelling(false)
      setIsOpen(false)
    }
  }

  const hasNotes = booking.notes && booking.notes.trim().length > 0

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
            aria-label={t("common.openMenu")}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{t("common.actions")}</p>
              <p className="text-xs text-muted-foreground">
                {t("memberBookings.columns.bookingNumber")} #{booking.bookingNumber}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={() => setShowDetailsModal(true)}
            className="cursor-pointer"
          >
            <Eye className="mr-2 h-4 w-4" />
            <span>{t("common.viewDetails")}</span>
          </DropdownMenuItem>

          {hasNotes && (
            <DropdownMenuItem
              onClick={() => setShowNotesModal(true)}
              className="cursor-pointer"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              <span>{t("memberBookings.viewClientNotes")}</span>
            </DropdownMenuItem>
          )}

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
                    <span>{t("common.cancelling")}</span>
                  </>
                ) : (
                  <>
                    <X className="mr-2 h-4 w-4" />
                    <span>{t("memberBookings.cancelBooking")}</span>
                  </>
                )}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="booking-details-description">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-right">
              {t("bookingDetails.drawerTitle")} #{booking.bookingNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4" id="booking-details-description">
            <BookingDetailsView booking={booking} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showNotesModal} onOpenChange={setShowNotesModal}>
        <DialogContent className="max-w-md" aria-describedby="member-notes-description">
          <DialogHeader>
            <DialogTitle>{t("memberBookings.notesDialog.title")}</DialogTitle>
          </DialogHeader>
          <div className="mt-4" id="member-notes-description">
            <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-700">
              {booking.notes || t("memberBookings.notesDialog.noNotes")}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Status component - clean and minimal
const BookingStatusBadge = ({ status, t }: { status: PopulatedBooking["status"]; t: TFunction }) => {
  const statusConfig = {
    abandoned: {
      label: t("memberBookings.status.abandoned_short"),
      className: "bg-gray-100 text-gray-800 border-gray-200"
    },
    pending_professional_assignment: {
      label: t("memberBookings.status.pending_professional_assignment_short"),
      className: "bg-amber-100 text-amber-800 border-amber-200"
    },
    confirmed: {
      label: t("memberBookings.status.confirmed_short"),
      className: "bg-green-100 text-green-800 border-green-200"
    },
    professional_en_route: {
      label: t("memberBookings.status.professional_en_route_short"),
      className: "bg-blue-100 text-blue-800 border-blue-200"
    },
    completed: {
      label: t("memberBookings.status.completed_short"),
      className: "bg-gray-100 text-gray-800 border-gray-200"
    },
    cancelled_by_user: {
      label: t("memberBookings.status.cancelled_by_user_short"),
      className: "bg-red-100 text-red-800 border-red-200"
    },
    cancelled_by_admin: {
      label: t("memberBookings.status.cancelled_by_admin_short"),
      className: "bg-red-100 text-red-800 border-red-200"
    },
    cancelled_refunded: {
      label: t("memberBookings.status.cancelled_refunded_short"),
      className: "bg-purple-100 text-purple-800 border-purple-200"
    },
    no_show: {
      label: t("memberBookings.status.no_show_short"),
      className: "bg-orange-100 text-orange-800 border-orange-200"
    }
  } as const

  const config = statusConfig[status as keyof typeof statusConfig] || {
    label: status || t("common.status.unknown"),
    className: "bg-gray-100 text-gray-800 border-gray-200"
  }

  return (
    <Badge variant="outline" className={cn("text-xs px-2 py-1", config.className)}>
      {config.label}
    </Badge>
  )
}

// Notes Display Component
const NotesDisplay = ({ notes, t }: { notes?: string; t: TFunction }) => {
  const [showDialog, setShowDialog] = useState(false)

  if (!notes || notes.trim().length === 0) return null

  const isLong = notes.length > 50

  if (!isLong) {
    return (
      <div className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
        {notes}
      </div>
    )
  }

  const truncated = notes.substring(0, 50) + "..."

  return (
    <>
      <div 
        className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded cursor-pointer hover:bg-gray-100 flex items-center gap-1"
        onClick={() => setShowDialog(true)}
      >
        <MessageSquare className="w-3 h-3" />
        {truncated}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("memberBookings.notesDialog.title")}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-700">
              {notes || t("memberBookings.notesDialog.noNotes")}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Utility functions for formatting
const formatDateIsraeli = (date: string | Date) => {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, "d.M.yyyy", { locale: he })
}

const formatTimeIsraeli = (date: Date) => {
  return format(date, "HH:mm", { locale: he })
}

const getLocale = (locale: string) => {
  switch (locale) {
    case 'he':
      return he
    case 'ru':
      return ru
    default:
      return enUS
  }
}

export const getBookingColumns = (t: TFunction, locale: string): ColumnDef<PopulatedBooking>[] => {
  return [
    {
      accessorKey: "bookingNumber",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-1 text-right hover:bg-gray-50"
        >
          {t("memberBookings.columns.bookingNumber")}
          <ArrowUpDown className="mr-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-right">
          <div className="font-semibold text-lg text-gray-900 mb-1">
            #{row.original.bookingNumber}
          </div>
          <div className="text-xs text-gray-500">
            {t("memberBookings.table.createdAt")}: {formatDateIsraeli(row.original.createdAt || row.original.bookingDateTime)}
          </div>
        </div>
      ),
      size: 120,
    },
    {
      accessorKey: "treatmentId.name",
      header: () => <div className="text-right">{t("memberBookings.columns.treatment")}</div>,
      cell: ({ row }) => {
        const booking = row.original
        const treatment = booking.treatmentId
        let durationDisplay = ""
        
        if (treatment?.pricingType === "duration_based" && booking.selectedDurationId && treatment.durations) {
          const selectedDuration = treatment.durations.find(
            (d: ITreatmentDuration) => d._id?.toString() === booking.selectedDurationId?.toString(),
          )
          if (selectedDuration) {
            durationDisplay = t("memberBookings.table.duration", { minutes: selectedDuration.minutes })
          }
        } else if (treatment?.pricingType === "fixed" && treatment.defaultDurationMinutes) {
          durationDisplay = t("memberBookings.table.duration", { minutes: treatment.defaultDurationMinutes })
        }

        return (
          <div className="text-right">
            <div className="font-medium text-gray-900">
              {treatment?.name || t("common.unknownTreatment")}
              {durationDisplay && (
                <span className="text-sm text-gray-600 mr-2">
                  ({durationDisplay})
                </span>
              )}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "therapistGenderPreference",
      header: () => <div className="text-right">{t("bookings.steps.scheduling.therapistPreference")}</div>,
      cell: ({ row }) => {
        const preference = row.original.therapistGenderPreference

        const getPreferenceLabel = (pref: string) => {
          switch (pref) {
            case 'male':
              return t("preferences.treatment.genderMale")
            case 'female':
              return t("preferences.treatment.genderFemale")
            case 'any':
            default:
              return t("preferences.treatment.genderAny")
          }
        }

        return (
          <div className="text-right">
            <div className="text-sm font-medium text-gray-700 bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-md">
              {getPreferenceLabel(preference)}
            </div>
          </div>
        )
      },
      size: 140,
    },
    {
      accessorKey: "recipientName",
      header: () => <div className="text-right hidden sm:block">{t("memberBookings.columns.recipientDetails")}</div>,
      cell: ({ row }) => {
        const booking = row.original
        const isForSomeoneElse = booking.recipientName && booking.recipientName !== booking.bookedByUserName

        return (
          <div className="text-right hidden sm:block">
            {isForSomeoneElse ? (
              <div className="space-y-1">
                <div className="font-medium text-gray-900">{booking.recipientName}</div>
                {booking.recipientPhone && (
                  <div className="text-xs text-gray-600">{booking.recipientPhone}</div>
                )}
                <div className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded">
                  {t("memberBookings.table.bookingForOther")}
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-sm">{t("memberBookings.table.selfBooking")}</div>
            )}
          </div>
        )
      },
      size: 150,
    },
    {
      accessorKey: "bookingDateTime",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-1 text-right hover:bg-gray-50"
        >
          {t("memberBookings.columns.dateTime")}
          <ArrowUpDown className="mr-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const booking = row.original
        const bookingDate = new Date(booking.bookingDateTime)
        const now = new Date()
        const isToday = bookingDate.toDateString() === now.toDateString()
        const isTomorrow = bookingDate.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString()
        const isPast = bookingDate < now

        // Format date in Israeli style
        const dateStr = formatDateIsraeli(booking.bookingDateTime)
        const timeStr = formatTimeIsraeli(bookingDate)

        // Get day label
        let dayLabel = ""
        if (isToday) {
          dayLabel = t("memberBookings.table.today")
        } else if (isTomorrow) {
          dayLabel = t("memberBookings.table.tomorrow")
        } else if (!isPast) {
          const daysFromNow = Math.ceil((bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          dayLabel = t("memberBookings.table.daysRemaining", { days: daysFromNow })
        } else {
          dayLabel = t("memberBookings.table.past")
        }

        return (
          <div className="text-right space-y-1">
            <div className="font-medium text-gray-900">
              {timeStr}
              {booking.isFlexibleTime && (
                <span className="text-xs text-blue-600 mr-1">
                  {t("memberBookings.table.flexibleTime")}
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600">
              {dateStr}
            </div>
            <div className={cn(
              "text-xs px-2 py-1 rounded-full inline-block",
              isToday ? "bg-green-100 text-green-700" :
              isTomorrow ? "bg-blue-100 text-blue-700" :
              isPast ? "bg-gray-100 text-gray-600" :
              "bg-orange-100 text-orange-700"
            )}>
              {dayLabel}
            </div>
          </div>
        )
      },
      size: 140,
    },
    {
      accessorKey: "bookingAddressSnapshot.city",
      header: () => <div className="text-right hidden md:block">{t("memberBookings.columns.fullAddress")}</div>,
      cell: ({ row }) => {
        const address = row.original.bookingAddressSnapshot || row.original.customAddressDetails
        
        if (!address) {
          return (
            <div className="text-right hidden md:block">
              <div className="text-gray-500 text-sm">{t("memberBookings.table.locationNotAvailable")}</div>
            </div>
          )
        }

        const city = address?.city
        const street = address?.street
        const streetNumber = address?.streetNumber
        const apartment = (address as any)?.apartment || (address as any)?.apartmentNumber
        const floor = (address as any)?.floor
        const entrance = (address as any)?.entrance
        const addressNotes = (address as any)?.instructions || (address as any)?.additionalNotes
        const hasPrivateParking = (address as any)?.hasPrivateParking
        const isAccessible = (address as any)?.isAccessible
        
        return (
          <div className="text-right hidden md:block space-y-1 max-w-[250px]">
            <div className="font-medium text-gray-900">
              {city || t("memberBookings.table.cityNotSpecified")}
            </div>
            
            {street && streetNumber && (
              <div className="text-sm text-gray-700">
                {street} {streetNumber}
              </div>
            )}
            
            <div className="text-xs text-gray-600 space-y-1">
              {apartment && <div>{t("memberBookings.table.apartment")}: {apartment}</div>}
              {floor && <div>{t("memberBookings.table.floor")}: {floor}</div>}
              {entrance && <div>{t("memberBookings.table.entrance")}: {entrance}</div>}
            </div>

            {addressNotes && (
              <div className="text-xs text-gray-600 bg-yellow-50 border border-yellow-200 px-2 py-1 rounded">
                {addressNotes}
              </div>
            )}

            <div className="flex flex-wrap gap-1 text-xs">
              {hasPrivateParking && (
                <span className="text-green-700 bg-green-50 px-2 py-1 rounded">
                  {t("memberBookings.table.privateParking")}
                </span>
              )}
              {!hasPrivateParking && hasPrivateParking !== undefined && (
                <span className="text-red-700 bg-red-50 px-2 py-1 rounded">
                  {t("common.no")} {t("memberBookings.table.privateParking")}
                </span>
              )}
              {isAccessible && (
                <span className="text-blue-700 bg-blue-50 px-2 py-1 rounded">
                  {t("memberBookings.table.accessible")}
                </span>
              )}
            </div>
          </div>
        )
      },
      size: 200,
    },
    {
      accessorKey: "priceDetails.finalAmount",
      header: ({ column }) => (
        <div className="text-right">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="px-1 hover:bg-gray-50"
          >
            {t("memberBookings.columns.paymentDetails")}
            <ArrowUpDown className="mr-2 h-3.5 w-3.5" />
          </Button>
        </div>
      ),
      cell: ({ row }) => {
        const { priceDetails, source, paymentDetails } = row.original
        const isFreeCovered = priceDetails.isFullyCoveredByVoucherOrSubscription
        const finalAmount = priceDetails.finalAmount || 0
        const basePrice = priceDetails.basePrice || 0
        
        return (
          <div className="text-right space-y-1">
            <div className="font-semibold text-lg text-gray-900">
              {isFreeCovered ? t("memberBookings.table.paymentFree") : `₪${finalAmount.toFixed(0)}`}
            </div>
            
            {/* Source */}
            <div className="text-xs text-gray-600">
              {source === "subscription_redemption" && t("memberBookings.table.paymentSubscription")}
              {source === "gift_voucher_redemption" && t("memberBookings.table.paymentVoucher")}
              {source === "new_purchase" && t("memberBookings.table.paymentNew")}
            </div>
            
            {/* Price breakdown */}
            {basePrice > 0 && (
              <div className="text-xs text-gray-500">
                {t("memberBookings.table.basePrice")}: ₪{basePrice.toFixed(0)}
              </div>
            )}
            
            {priceDetails.discountAmount > 0 && (
              <div className="text-xs text-green-600">
                {t("memberBookings.table.discount")}: -₪{priceDetails.discountAmount.toFixed(0)}
              </div>
            )}
            
            {priceDetails.surcharges && priceDetails.surcharges.length > 0 && (
              <div className="text-xs text-orange-600">
                {t("memberBookings.table.surcharges")}: +₪{priceDetails.totalSurchargesAmount?.toFixed(0) || "0"}
              </div>
            )}
            
            {/* Payment status */}
            {paymentDetails?.paymentStatus && (
              <div className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                {paymentDetails.paymentStatus === 'paid' ? t("memberBookings.table.paymentPaid") :
                 paymentDetails.paymentStatus === 'pending' ? t("memberBookings.table.paymentPending") :
                 paymentDetails.paymentStatus === 'failed' ? t("memberBookings.table.paymentFailed") :
                 t("memberBookings.table.paymentNotRequired")}
              </div>
            )}
          </div>
        )
      },
      size: 150,
    },
    {
      id: "review",
      header: () => <div className="text-center">{t("memberBookings.columns.review")}</div>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <ReviewAction booking={row.original} t={t} />
        </div>
      ),
      size: 100,
    },
    {
      id: "actions",
      header: () => <div className="text-center">{t("memberBookings.columns.actions")}</div>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <BookingActions booking={row.original} t={t} />
        </div>
      ),
      size: 60,
    },
  ]
}
