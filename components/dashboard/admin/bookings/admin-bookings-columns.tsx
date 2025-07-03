"use client"

import React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { format } from "date-fns"
import { he, enUS, ru } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useState, useMemo, useEffect } from "react"
import { 
  ArrowUpDown, 
  MoreHorizontal, 
  UserPlus, 
  X,
  Loader2,
  MessageSquare,
  User,
  Phone,
  Mail,
  UserCheck,
  UserX,
  Eye
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
  DialogTitle,
  DialogDescription
} from "@/components/common/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/ui/select"
import { toast } from "sonner"
import { useToast } from "@/components/common/ui/use-toast"
import type { PopulatedBooking } from "@/types/booking"
import { assignProfessionalToBooking, getAvailableProfessionals, getSuitableProfessionalsForBooking, unassignProfessionalFromBooking } from "@/actions/booking-actions"
// Removed unused import - now using unified notification system
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ProfessionalResponsesDialog } from "./professional-responses-dialog"
import { ProfessionalNotificationModal } from "./professional-notification-modal"
import ReviewDetailModal from "../reviews/review-detail-modal"
import SendReviewDialog from "./send-review-dialog"
import { getReviewByBookingId } from "@/actions/review-actions"
import { formatPhoneForDisplay } from "@/lib/utils/phone-utils"

type TFunction = (key: string, options?: any) => string

// Safe date formatting functions
const formatDateSafe = (date: string | Date | null | undefined): string => {
  if (!date) return "-"
  try {
    return format(new Date(date), "dd/MM/yyyy")
  } catch {
    return "-"
  }
}

const formatTimeSafe = (date: string | Date | null | undefined): string => {
  if (!date) return "-"
  try {
    return format(new Date(date), "HH:mm")
  } catch {
    return "-"
  }
}

const formatDateTimeSafe = (date: string | Date | null | undefined, language: string): string => {
  if (!date) return "-"
  try {
    const d = new Date(date)
    const locale = language === "he" ? he : language === "ru" ? ru : enUS
    return format(d, "dd/MM/yyyy HH:mm", { locale })
  } catch {
    return "-"
  }
}

// Add function for formatting creation date
const formatCreatedAtSafe = (date: string | Date | null | undefined): string => {
  if (!date) return "-"
  try {
    return format(new Date(date), "dd/MM/yyyy HH:mm")
  } catch {
    return "-"
  }
}

// Add function for booking date and time
const BookingDateTimeInfo = ({ booking, t }: { booking: PopulatedBooking; t: TFunction }) => {
  if (!booking?.bookingDateTime) {
    return <div className="text-sm text-muted-foreground">-</div>
  }

  try {
    const bookingDate = new Date(booking.bookingDateTime)
    return (
      <div className="space-y-1">
        <div className="font-medium text-sm">
          {format(bookingDate, "dd/MM/yyyy")}
        </div>
        <div className="text-xs text-muted-foreground">
          {format(bookingDate, "HH:mm")}
        </div>
        <div className="text-xs text-muted-foreground">
          {format(bookingDate, "EEEE", { locale: he })}
        </div>
      </div>
    )
  } catch {
    return <div className="text-sm text-muted-foreground">תאריך לא תקין</div>
  }
}



// Admin Actions Component
const AdminBookingActions = ({ 
  booking, 
  t
}: { 
  booking: PopulatedBooking; 
  t: TFunction;
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [showResponsesModal, setShowResponsesModal] = useState(false)
  const [showSendReviewModal, setShowSendReviewModal] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [showNotificationModal, setShowNotificationModal] = useState(false)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: existingReview, isLoading: loadingReview, refetch: refetchReview } = useQuery({
    queryKey: ["bookingReview", booking._id],
    queryFn: () => getReviewByBookingId(booking._id.toString()),
    enabled: booking.status === "completed",
    staleTime: 30000,
  })

  if (!booking) {
    return <div className="text-sm text-muted-foreground">-</div>
  }

  const canAssignProfessional = !booking.professionalId && !["completed", "cancelled", "refunded"].includes(booking.status)
  const hasNotes = booking.notes && booking.notes.trim().length > 0
  const canCancel = !["completed", "cancelled", "refunded"].includes(booking.status)
  const canSendToProfessionals = !booking.professionalId && ["confirmed", "in_process"].includes(booking.status)
  const canViewResponses = ["confirmed", "in_process"].includes(booking.status)

  const handleDropdownClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.nativeEvent.stopImmediatePropagation()
  }

  const handleSendReviewReminder = () => {
    toast({
      title: t("adminBookings.actions.reviewReminderSent"),
      description: t("adminBookings.actions.reviewReminderDescription"),
    })
  }

  return (
    <div className="flex items-center space-x-1">
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
            aria-label={t("common.openMenu")}
            onClick={handleDropdownClick}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{t("adminBookings.actions")}</p>
              <p className="text-xs text-muted-foreground">
                #{booking.bookingNumber || "N/A"}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>{t("adminBookings.view")}</span>
          </DropdownMenuItem>

          <DropdownMenuItem className="cursor-pointer text-muted-foreground" disabled>
            <Mail className="mr-2 h-4 w-4" />
            <span>{t("adminBookings.resendToClient")} ({t("common.notActive")})</span>
          </DropdownMenuItem>

          <DropdownMenuItem className="cursor-pointer text-muted-foreground" disabled>
            <UserPlus className="mr-2 h-4 w-4" />
            <span>{t("adminBookings.assignProfessional")} - {t("adminBookings.useColumnInstead")}</span>
          </DropdownMenuItem>

          {canSendToProfessionals && (
            <DropdownMenuItem
              onClick={() => setShowNotificationModal(true)}
              className="cursor-pointer"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              <span>שלח התראות למטפלים</span>
            </DropdownMenuItem>
          )}

          {canViewResponses && (
            <DropdownMenuItem
              onClick={() => setShowResponsesModal(true)}
              className="cursor-pointer"
            >
              <Phone className="mr-2 h-4 w-4" />
              <span>בדוק תגובות מטפלים</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onClick={existingReview ? () => setShowReviewModal(true) : handleSendReviewReminder}
            className="cursor-pointer"
            disabled={!existingReview && booking.status !== "completed"}
          >
            {loadingReview ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>{t("common.loading")}</span>
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                <span>
                  {existingReview
                    ? t("adminBookings.viewReview")
                    : booking.reviewReminderSentAt
                      ? t("adminBookings.resendReviewRequest")
                      : t("adminBookings.sendReviewRequest")}
                </span>
              </>
            )}
          </DropdownMenuItem>

          {canCancel && (
            <DropdownMenuItem className="cursor-pointer text-red-600">
              <X className="mr-2 h-4 w-4" />
              <span>{t("adminBookings.cancelBooking")}</span>
            </DropdownMenuItem>
          )}

          {hasNotes && (
            <DropdownMenuItem
              onClick={() => setShowNotesModal(true)}
              className="cursor-pointer"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              <span>{t("adminBookings.viewClientNotes")}</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Notes Modal */}
      {showNotesModal && (
        <Dialog open={showNotesModal} onOpenChange={setShowNotesModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("adminBookings.clientNotes")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {booking.notes || t("adminBookings.noNotes")}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Professional Responses Modal */}
      <ProfessionalResponsesDialog
        open={showResponsesModal}
        onOpenChange={setShowResponsesModal}
        bookingId={booking._id}
        bookingStatus={booking.status}
      />

      {/* Professional Notification Modal */}
      <ProfessionalNotificationModal
        open={showNotificationModal}
        onOpenChange={setShowNotificationModal}
        booking={booking}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["adminBookings"] })
        }}
      />

      <SendReviewDialog
        booking={booking}
        open={showSendReviewModal}
        onOpenChange={setShowSendReviewModal}
        onSent={() => {
          refetchReview()
          queryClient.invalidateQueries({ queryKey: ["adminBookings"] })
        }}
      />

      {existingReview && (
        <ReviewDetailModal
          review={existingReview}
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          onUpdate={refetchReview}
        />
      )}
    </div>
  )
}

// Status Badge Component
const AdminBookingStatusBadge = ({ status, t }: { status: string; t: TFunction }) => {
  if (!status) {
    return <Badge variant="secondary">{t("common.unknown")}</Badge>
  }

  const statusConfig: Record<string, { variant: "secondary" | "destructive"; color: string }> = {
    pending_payment: { variant: "secondary" as const, color: "bg-yellow-100 text-yellow-800" },
    pending_professional: { variant: "secondary" as const, color: "bg-orange-100 text-orange-800" },
    confirmed: { variant: "secondary" as const, color: "bg-green-100 text-green-800" },
    completed: { variant: "secondary" as const, color: "bg-green-100 text-green-800" },
    cancelled: { variant: "destructive" as const, color: "bg-red-100 text-red-800" },
    refunded: { variant: "secondary" as const, color: "bg-purple-100 text-purple-800" },
  }

  const config = statusConfig[status] || statusConfig.pending_payment

  const statusLabels: Record<string, string> = {
    pending_payment: "ממתין לתשלום",
    pending_professional: "ממתינה לשיוך מטפל",
    confirmed: "מאושר",
    completed: "הושלם",
    cancelled: "בוטל",
    refunded: "הוחזר",
  }

  return (
    <Badge variant={config.variant} className={config.color}>
      {statusLabels[status] || status}
    </Badge>
  )
}

// Info Components with null safety
const ClientInfo = ({ booking, t }: { booking: PopulatedBooking; t: TFunction }) => {
  // Handle both populated and non-populated userId
  const user = booking?.userId && typeof booking.userId === 'object' && 'name' in booking.userId 
    ? booking.userId as any 
    : null

  const clientName = booking?.recipientName || user?.name || t("common.unknown")
  const clientPhone = booking?.recipientPhone || user?.phone || ""
  const clientEmail = booking?.recipientEmail || user?.email || ""

  return (
    <div className="space-y-1">
      <div className="font-medium text-sm">{clientName}</div>
      {clientPhone && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Phone className="h-3 w-3" />
          {formatPhoneForDisplay(clientPhone)}
        </div>
      )}
      {clientEmail && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Mail className="h-3 w-3" />
          {clientEmail}
        </div>
      )}
    </div>
  )
}

// Enhanced Professional Info Component with inline assignment
const ProfessionalInfo = ({ booking, t }: { booking: PopulatedBooking; t: TFunction }) => {
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [selectedProfessional, setSelectedProfessional] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showNotificationModal, setShowNotificationModal] = useState(false)
  const queryClient = useQueryClient()

  const { data: suitableProfessionals, isLoading: loadingSuitable } = useQuery({
    queryKey: ["suitableProfessionals", booking._id],
    queryFn: () => getSuitableProfessionalsForBooking(booking._id),
    enabled: !!booking._id && !booking.professionalId,
    staleTime: 30000,
  })

  const { data: allProfessionals, isLoading: loadingAll } = useQuery({
    queryKey: ["allProfessionals"],
    queryFn: () => getAvailableProfessionals(),
    enabled: !booking.professionalId,
    staleTime: 60000,
  })

  const handleOpenAssignDialog = async (e: React.MouseEvent) => {
    e.preventDefault() // Prevent any default behavior
    e.stopPropagation() // Prevent row click
    e.nativeEvent.stopImmediatePropagation() // Stop all event propagation
    
    setShowAssignDialog(true)
  }

  const handleAssign = async () => {
    if (!selectedProfessional) return

    setIsLoading(true)
    try {
      const result = await assignProfessionalToBooking(booking._id, selectedProfessional)
      if (result.success) {
        toast.success(t("adminBookings.assignSuccess"))
        queryClient.invalidateQueries({ queryKey: ["adminBookings"] })
        setShowAssignDialog(false)
        setSelectedProfessional("")
      } else {
        const errorMessage = result.error && result.error.startsWith("bookings.errors.") 
          ? t(result.error) 
          : t("adminBookings.assignError")
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error("Assignment error:", error)
      toast.error(t("adminBookings.assignError"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnassign = async (e: React.MouseEvent) => {
    e.preventDefault() // Prevent any default behavior
    e.stopPropagation() // Prevent row click
    e.nativeEvent.stopImmediatePropagation() // Stop all event propagation
    
    setIsLoading(true)
    try {
      const result = await unassignProfessionalFromBooking(booking._id)
      if (result.success) {
        toast.success(t("adminBookings.unassignSuccess"))
        queryClient.invalidateQueries({ queryKey: ["adminBookings"] })
      } else {
        toast.error(t("adminBookings.unassignError"))
      }
    } catch (error) {
      console.error("Unassign error:", error)
      toast.error(t("adminBookings.unassignError"))
    } finally {
      setIsLoading(false)
    }
  }

  // Get the list of professionals to show
  const professionalsToShow = suitableProfessionals?.success && (suitableProfessionals?.professionals?.length || 0) > 0
    ? suitableProfessionals.professionals
    : allProfessionals?.professionals || []

  const hasSuitableProfessionals = suitableProfessionals?.success && (suitableProfessionals?.professionals?.length || 0) > 0
  const hasAnyProfessionals = (professionalsToShow?.length || 0) > 0
  const canSendNotifications = !booking.professionalId && ["confirmed", "pending_professional"].includes(booking.status)

  // If professional is assigned
  if (booking?.professionalId) {
    const professional = booking.professionalId as any
    return (
      <>
        <div className="space-y-2">
          <div className="space-y-1">
            <div className="font-medium text-sm">{professional.name || t("common.unknown")}</div>
            <div className="text-xs text-muted-foreground">
              {professional.gender === "male" ? "זכר" : professional.gender === "female" ? "נקבה" : "-"}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              📍 {professional.city || "לא צוין"}
              {professional.distanceKm && <span className="ml-2">🚗 {professional.distanceKm} ק"מ</span>}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {formatPhoneForDisplay(professional.phone || "")}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {professional.email || "-"}
            </div>
          </div>
          
          {/* Action buttons - always visible */}
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenAssignDialog}
              disabled={isLoading}
              className="text-xs h-6"
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
            >
              <UserCheck className="h-3 w-3 mr-1" />
              עריכה
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleUnassign}
              disabled={isLoading}
              className="text-xs h-6 text-red-600 hover:text-red-700"
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
            >
              <UserX className="h-3 w-3 mr-1" />
              ביטול
            </Button>
          </div>
        </div>

        {/* Assignment Dialog */}
        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("adminBookings.changeProfessionalAssignment")}</DialogTitle>
              <DialogDescription>
                {t("adminBookings.currentlyAssignedTo")}: {professional.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">
                  {t("adminBookings.selectNewProfessional")}
                </label>
                <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t("adminBookings.chooseProfessional")} />
                  </SelectTrigger>
                  <SelectContent>
                    {!hasAnyProfessionals ? (
                      <div className="p-2 text-center text-muted-foreground text-sm">
                        {isLoading ? "טוען מטפלים..." : "לא נמצאו מטפלים זמינים"}
                      </div>
                    ) : (
                                          professionalsToShow?.map((prof: any) => (
                      <SelectItem key={prof._id} value={prof._id}>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{prof.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({prof.gender === "male" ? t("common.male") : t("common.female")})
                            </span>
                            {hasSuitableProfessionals && suitableProfessionals?.professionals?.some((sp: any) => sp._id === prof._id) && (
                              <Badge variant="secondary" className="text-xs">
                                {t("adminBookings.suitable")}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-3">
                            <span>📍 {prof.city || "לא צוין"}</span>
                            {prof.distanceKm && <span>🚗 {prof.distanceKm} ק"מ</span>}
                            <span>📞 {formatPhoneForDisplay(prof.phone || "")}</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAssignDialog(false)} disabled={isLoading}>
                  {t("common.cancel")}
                </Button>
                <Button 
                  onClick={handleAssign} 
                  disabled={!selectedProfessional || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("common.assigning")}
                    </>
                  ) : (
                    t("adminBookings.reassign")
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // If no professional assigned
  return (
    <>
      <div className="space-y-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenAssignDialog}
          disabled={isLoading}
          className="text-orange-600 border-orange-200 hover:bg-orange-50 w-full"
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              {t("common.loading")}
            </>
          ) : (
            <>
              <UserPlus className="mr-2 h-3 w-3" />
              {t("adminBookings.assignProfessional")}
            </>
          )}
        </Button>

        {canSendNotifications && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNotificationModal(true)}
            className="text-blue-600 border-blue-200 hover:bg-blue-50 w-full"
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
          >
            <MessageSquare className="mr-2 h-3 w-3" />
            שלח לתפוצה
          </Button>
        )}
      </div>

      {/* Assignment Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("adminBookings.assignProfessional")}</DialogTitle>
            <DialogDescription>
              {t("adminBookings.selectProfessionalForBooking")} #{booking.bookingNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                {hasSuitableProfessionals 
                  ? t("adminBookings.suitableProfessionals") 
                  : t("adminBookings.availableProfessionals")
                }
              </label>
              <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t("adminBookings.chooseProfessional")} />
                </SelectTrigger>
                <SelectContent>
                  {!hasAnyProfessionals ? (
                    <div className="p-2 text-center text-muted-foreground text-sm">
                      {loadingSuitable || loadingAll ? "טוען מטפלים..." : "לא נמצאו מטפלים זמינים"}
                    </div>
                  ) : (
                    professionalsToShow?.map((prof: any) => (
                      <SelectItem key={prof._id} value={prof._id}>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{prof.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({prof.gender === "male" ? t("common.male") : t("common.female")})
                            </span>
                            {hasSuitableProfessionals && suitableProfessionals?.professionals?.some((sp: any) => sp._id === prof._id) && (
                              <Badge variant="secondary" className="text-xs">
                                {t("adminBookings.suitable")}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-3">
                            <span>📍 {prof.city || "לא צוין"}</span>
                            {prof.distanceKm && <span>🚗 {prof.distanceKm} ק"מ</span>}
                            <span>📞 {formatPhoneForDisplay(prof.phone || "")}</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAssignDialog(false)} disabled={isLoading}>
                {t("common.cancel")}
              </Button>
              <Button 
                onClick={handleAssign} 
                disabled={!selectedProfessional || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("common.assigning")}
                  </>
                ) : (
                  t("adminBookings.assign")
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Professional Notification Modal */}
      <ProfessionalNotificationModal
        open={showNotificationModal}
        onOpenChange={setShowNotificationModal}
        booking={booking}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["adminBookings"] })
        }}
      />
    </>
  )
}

const PriceDetailsInfo = ({ booking, t }: { booking: PopulatedBooking; t: TFunction }) => {
  if (!booking?.priceDetails) {
    return <div className="text-sm text-muted-foreground">-</div>
  }

  const priceDetails = booking.priceDetails
  const basePrice = priceDetails.basePrice || 0
  const totalSurcharges = priceDetails.totalSurchargesAmount || 0
  const totalPriceBeforeDiscounts = basePrice + totalSurcharges

  return (
    <div className="space-y-1 max-w-[180px]">
      <div className="text-sm">
        מחיר בסיס: ₪{basePrice.toFixed(2)}
      </div>
      {totalSurcharges > 0 && (
        <div className="text-sm text-orange-600">
          כולל תוספות: ₪{totalSurcharges.toFixed(2)}
        </div>
      )}
      <div className="font-medium text-sm border-t pt-1">
        מחיר כללי: ₪{totalPriceBeforeDiscounts.toFixed(2)}
      </div>
    </div>
  )
}

// Add missing RedemptionInfo component
const RedemptionInfo = ({ booking, t }: { booking: PopulatedBooking; t: TFunction }) => {
  if (!booking) {
    return <div className="text-sm text-muted-foreground">-</div>
  }

  const { priceDetails, source } = booking
  const hasRedemption = priceDetails?.appliedCouponId || 
                       priceDetails?.appliedGiftVoucherId || 
                       priceDetails?.redeemedUserSubscriptionId

  if (!hasRedemption) {
    return <div className="text-sm text-muted-foreground">ללא מימוש</div>
  }

  return (
    <div className="space-y-1 max-w-[150px]">
      {priceDetails.redeemedUserSubscriptionId && (
        <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
          מנוי
        </div>
      )}
      {priceDetails.appliedGiftVoucherId && (
        <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
          שובר מתנה
        </div>
      )}
      {priceDetails.appliedCouponId && (
        <div className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
          קופון
        </div>
      )}
      {priceDetails.voucherAppliedAmount > 0 && (
        <div className="text-xs text-green-600">
          נוצל: ₪{priceDetails.voucherAppliedAmount.toFixed(0)}
        </div>
      )}
    </div>
  )
}

// Add missing FinancialSummaryInfo component
const FinancialSummaryInfo = ({ booking, t }: { booking: PopulatedBooking; t: TFunction }) => {
  if (!booking?.priceDetails) {
    return <div className="text-sm text-muted-foreground">-</div>
  }

  const { priceDetails } = booking
  const finalAmount = priceDetails.finalAmount || 0
  const professionalPayment = priceDetails.totalProfessionalPayment || 0
  const officeCommission = priceDetails.totalOfficeCommission || 0

  return (
    <div className="space-y-1 max-w-[150px]">
      <div className="text-sm font-medium">
        סה"כ: ₪{finalAmount.toFixed(0)}
      </div>
      <div className="text-xs text-gray-600">
        למטפל: ₪{professionalPayment.toFixed(0)}
      </div>
      <div className={`text-xs ${officeCommission >= 0 ? 'text-gray-600' : 'text-red-600'}`}>
        לחברה: {officeCommission >= 0 ? '₪' : '-₪'}{Math.abs(officeCommission).toFixed(0)}
      </div>
      {priceDetails.isFullyCoveredByVoucherOrSubscription && (
        <div className="text-xs bg-green-100 text-green-800 px-1 py-0.5 rounded">
          מכוסה במלואו
        </div>
      )}
    </div>
  )
}

const RecipientInfo = ({ booking, t }: { booking: PopulatedBooking; t: TFunction }) => {
  if (!booking?.recipientName) {
    return <div className="text-sm text-muted-foreground">-</div>
  }

  // Calculate age if birth date is available
  let age = null
  if (booking.recipientBirthDate) {
    const today = new Date()
    const birthDate = new Date(booking.recipientBirthDate)
    age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
  }

  return (
    <div className="space-y-1 max-w-[180px]">
      <div className="font-medium text-sm">{booking.recipientName}</div>
      {booking.recipientPhone && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Phone className="h-3 w-3" />
          {formatPhoneForDisplay(booking.recipientPhone || "")}
        </div>
      )}
      {booking.recipientEmail && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Mail className="h-3 w-3" />
          {booking.recipientEmail}
        </div>
      )}
      {age && (
        <div className="text-xs text-muted-foreground">
          {t("adminBookings.age")}: {age}
        </div>
      )}
    </div>
  )
}

// Update TreatmentInfo component to show more details with correct duration logic
const TreatmentInfo = ({ booking, t }: { booking: PopulatedBooking; t: TFunction }) => {
  const treatment = booking.treatmentId as any
  
  if (!treatment) {
    return <div className="text-sm text-muted-foreground">-</div>
  }

  // Get duration information based on treatment type
  let durationInfo = null
  if (treatment.pricingType === "duration_based" && booking.selectedDurationId && treatment.durations) {
    const selectedDuration = treatment.durations.find(
      (d: any) => d._id?.toString() === booking.selectedDurationId?.toString()
    )
    if (selectedDuration) {
      durationInfo = `${selectedDuration.minutes} ${t("common.minutes")}`
    }
  } else if (treatment.pricingType === "fixed" && treatment.defaultDurationMinutes) {
    durationInfo = `${treatment.defaultDurationMinutes} ${t("common.minutes")}`
  }

  return (
    <div className="space-y-1 max-w-[200px]">
      <div className="font-medium text-sm">{treatment.name}</div>
      {treatment.category && (
        <div className="text-xs text-muted-foreground">
          {treatment.category}
        </div>
      )}
      {durationInfo && (
        <div className="text-xs text-blue-600">
          {durationInfo}
        </div>
      )}
    </div>
  )
}

// Fix AddressDetailsInfo to properly handle parking information
const AddressDetailsInfo = ({ booking, t }: { booking: PopulatedBooking; t: TFunction }) => {
  // First try bookingAddressSnapshot, then addressId, then customAddressDetails
  const address = booking.bookingAddressSnapshot || booking.customAddressDetails || (booking as any).addressId
  
  if (!address) {
    return <div className="text-sm text-muted-foreground">-</div>
  }

  // Handle different address structure formats
  const streetNumber = address.streetNumber || address.houseNumber
  const hasParking = address.hasPrivateParking

  return (
    <div className="space-y-1 max-w-[200px]">
      <div className="font-medium text-sm">
        {address.fullAddress || 
         (address.street && streetNumber 
          ? `${address.street} ${streetNumber}, ${address.city}`
          : `${address.city}`
         )
        }
      </div>
      
      {address.floor && (
        <div className="text-xs text-muted-foreground">
          {t("adminBookings.floor")}: {address.floor}
        </div>
      )}
      
      {address.apartment && (
        <div className="text-xs text-muted-foreground">
          {t("adminBookings.apartment")}: {address.apartment}
        </div>
      )}

      {address.entrance && (
        <div className="text-xs text-muted-foreground">
          {t("adminBookings.entrance")}: {address.entrance}
        </div>
      )}

      {address.doorName && (
        <div className="text-xs text-muted-foreground bg-purple-50 px-2 py-1 rounded">
          {t("adminBookings.doorName")}: {address.doorName}
        </div>
      )}

      {address.buildingName && (
        <div className="text-xs text-muted-foreground bg-indigo-50 px-2 py-1 rounded">
          {t("adminBookings.buildingName")}: {address.buildingName}
        </div>
      )}

      {address.hotelName && (
        <div className="text-xs text-muted-foreground bg-pink-50 px-2 py-1 rounded">
          {t("adminBookings.hotelName")}: {address.hotelName}
        </div>
      )}

      {address.roomNumber && (
        <div className="text-xs text-muted-foreground bg-yellow-50 px-2 py-1 rounded">
          {t("adminBookings.roomNumber")}: {address.roomNumber}
        </div>
      )}

      {address.otherInstructions && (
        <div className="text-xs text-muted-foreground bg-gray-50 px-2 py-1 rounded">
          {t("adminBookings.otherInstructions")}: {address.otherInstructions}
        </div>
      )}
      
      {hasParking !== undefined && (
        <div className="flex items-center gap-1">
          <span className={`text-xs px-2 py-1 rounded ${
            hasParking 
              ? "text-green-700 bg-green-100" 
              : "text-red-700 bg-red-100"
          }`}>
            {hasParking 
              ? t("adminBookings.hasParking") 
              : t("adminBookings.noParking")
            }
          </span>
        </div>
      )}
      
      {(address.additionalNotes || address.notes) && (
        <div className="text-xs text-muted-foreground bg-orange-50 px-2 py-1 rounded">
          {address.additionalNotes || address.notes}
        </div>
      )}
    </div>
  )
}

// Update RecipientInfo to show more details including age
const EnhancedRecipientInfo = ({ booking, t }: { booking: PopulatedBooking; t: TFunction }) => {
  if (!booking?.recipientName) {
    return <div className="text-sm text-muted-foreground">-</div>
  }

  // Calculate age if birth date is available
  let age = null
  if (booking.recipientBirthDate) {
    const today = new Date()
    const birthDate = new Date(booking.recipientBirthDate)
    age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
  }

  return (
    <div className="space-y-1 max-w-[180px]">
      <div className="font-medium text-sm">{booking.recipientName}</div>
      {booking.recipientPhone && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Phone className="h-3 w-3" />
          {formatPhoneForDisplay(booking.recipientPhone || "")}
        </div>
      )}
      {booking.recipientEmail && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Mail className="h-3 w-3" />
          {booking.recipientEmail}
        </div>
      )}
      {age && (
        <div className="text-xs text-muted-foreground">
          {t("adminBookings.age")}: {age}
        </div>
      )}
    </div>
  )
}

// Export the updated column definition function
export const getAdminBookingColumns = (
  t: TFunction, 
  locale: string,
  onViewBooking?: (booking: PopulatedBooking) => void
): ColumnDef<PopulatedBooking>[] => [
  // 1. Booking Number with Creation Date (default sort by createdAt DESC)
  {
    accessorKey: "bookingNumber",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-auto p-0 font-semibold hover:bg-transparent"
      >
        {t("adminBookings.columns.bookingNumber")}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const bookingNumber = row.getValue("bookingNumber") as string
      const createdAt = row.original.createdAt
      const booking = row.original
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="font-mono text-sm font-medium">
              #{bookingNumber || "Unknown"}
            </div>
            {onViewBooking && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onViewBooking(booking)
                }}
                className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50"
              >
                <Eye className="h-3 w-3 mr-1" />
                צפה
              </Button>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatCreatedAtSafe(createdAt)}
          </div>
        </div>
      )
    },
    sortingFn: (rowA, rowB) => {
      // Default sort by createdAt desc (newest first)
      const dateA = new Date(rowA.original.createdAt || 0).getTime()
      const dateB = new Date(rowB.original.createdAt || 0).getTime()
      return dateB - dateA
    },
  },
  // 2. Status
  {
    accessorKey: "status",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-auto p-0 font-semibold hover:bg-transparent"
      >
        {t("adminBookings.columns.status")}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      return <AdminBookingStatusBadge status={status || "pending"} t={t} />
    },
  },
  // 3. Client
  {
    accessorKey: "userId",
    header: t("adminBookings.columns.client"),
    cell: ({ row }) => <ClientInfo booking={row.original} t={t} />,
  },
  // 4. Address with Parking
  {
    accessorKey: "addressDetails",
    header: t("adminBookings.columns.addressDetails"),
    cell: ({ row }) => <AddressDetailsInfo booking={row.original} t={t} />,
  },
  // 5. Booking Date and Time
  {
    accessorKey: "bookingDateTime",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-auto p-0 font-semibold hover:bg-transparent"
      >
        תאריך ושעת הטיפול
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <BookingDateTimeInfo booking={row.original} t={t} />,
  },
  // 6. Treatment with Category and Duration
  {
    accessorKey: "treatmentId",
    header: t("adminBookings.columns.treatment"),
    cell: ({ row }) => <TreatmentInfo booking={row.original} t={t} />,
  },
  // 7. Recipient with Age
  {
    accessorKey: "recipientInfo",
    header: t("adminBookings.columns.recipient"),
    cell: ({ row }) => <RecipientInfo booking={row.original} t={t} />,
  },
  // 8. Professional
  {
    accessorKey: "professionalId",
    header: t("adminBookings.columns.professional"),
    cell: ({ row }) => <ProfessionalInfo booking={row.original} t={t} />,
  },
  // 9. Price Details
  {
    accessorKey: "priceDetails.finalAmount",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-auto p-0 font-semibold hover:bg-transparent"
      >
        {t("adminBookings.columns.priceDetails")}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <PriceDetailsInfo booking={row.original} t={t} />,
  },
  // 10. NEW: Redemption Details (מימוש)
  {
    accessorKey: "redemption",
    header: t("adminBookings.columns.redemption"),
    cell: ({ row }) => <RedemptionInfo booking={row.original} t={t} />,
  },
  // 11. NEW: Financial Summary (סיכום כספי)
  {
    accessorKey: "financialSummary",
    header: t("adminBookings.columns.financialSummary"),
    cell: ({ row }) => <FinancialSummaryInfo booking={row.original} t={t} />,
  },
  // 12. Actions
  {
    id: "actions",
    header: t("common.actions"),
    cell: ({ row }) => (
      <div 
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          e.nativeEvent.stopImmediatePropagation()
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        <AdminBookingActions 
          booking={row.original} 
          t={t}
        />
      </div>
    ),
  },
] 