"use client"

import React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { Input } from "@/components/common/ui/input"
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
  Eye,
  Edit,
  CheckCircle,
  XCircle
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
import { SuitableProfessionalsModal } from "./suitable-professionals-modal"
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
  const canSendToProfessionals = !booking.professionalId && ["confirmed", "pending_professional"].includes(booking.status)
  const canViewResponses = ["confirmed", "pending_professional"].includes(booking.status)

  const handleDropdownClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.nativeEvent.stopImmediatePropagation()
  }

  const handleSendReviewReminder = () => {
    setShowSendReviewModal(true)
  }

  const handleSendToAllSuitableProfessionals = async () => {
    try {
      toast({
        title: "שולח התראות...",
        description: "מוצא מטפלים מתאימים ושולח התראות"
      })

      const response = await fetch(`/api/admin/bookings/${booking._id}/send-to-all-suitable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "הצלחה!",
          description: `התראות נשלחו ל-${result.sentCount} מטפלים מתאימים`
        })
        queryClient.invalidateQueries({ queryKey: ["adminBookings"] })
      } else {
        throw new Error(result.error || "שגיאה בשליחת התראות")
      }
    } catch (error) {
      console.error("Error sending to all suitable professionals:", error)
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "שגיאה בשליחת התראות למטפלים"
      })
    }
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
            <>
              <DropdownMenuItem
                onClick={() => setShowNotificationModal(true)}
                className="cursor-pointer"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                <span>שלח התראות למטפלים</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleSendToAllSuitableProfessionals}
                className="cursor-pointer text-blue-600"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                <span>שלח לכל המטפלים המתאימים</span>
              </DropdownMenuItem>
            </>
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
  const [showSuitableProfessionalsModal, setShowSuitableProfessionalsModal] = useState(false)
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
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowNotificationModal(true)
            }}
            className="text-blue-600 border-blue-200 hover:bg-blue-50 w-full"
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
          >
            <MessageSquare className="mr-2 h-3 w-3" />
            שלח לתפוצה
          </Button>
        )}

        {canSendNotifications && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowSuitableProfessionalsModal(true)
            }}
            className="text-purple-600 border-purple-200 hover:bg-purple-50 w-full"
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
          >
            <Eye className="mr-2 h-3 w-3" />
            מטפלים מתאימים
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

      {/* Suitable Professionals Modal */}
      <SuitableProfessionalsModal
        open={showSuitableProfessionalsModal}
        onOpenChange={setShowSuitableProfessionalsModal}
        booking={booking}
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

// Enhanced FinancialSummaryInfo component with professional payment editing
const FinancialSummaryInfo = ({ booking, t }: { booking: PopulatedBooking; t: TFunction }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState("")
  const [updating, setUpdating] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  if (!booking?.priceDetails) {
    return <div className="text-sm text-muted-foreground">-</div>
  }

  const { priceDetails } = booking
  const finalAmount = priceDetails.finalAmount || 0
  const professionalPayment = priceDetails.totalProfessionalPayment || 0
  const officeCommission = priceDetails.totalOfficeCommission || 0
  const hasProfessional = !!booking.professionalId

  const handleEditStart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setEditValue(professionalPayment.toString())
    setIsEditing(true)
  }

  const handleEditSave = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const newAmount = parseFloat(editValue)
    if (isNaN(newAmount) || newAmount < 0) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "סכום לא תקין"
      })
      return
    }

    setUpdating(true)
    try {
      // Call the update action
      const { updateProfessionalPaymentForBooking } = await import("@/actions/booking-actions")
      const result = await updateProfessionalPaymentForBooking(booking._id, newAmount)
      
      if (result.success) {
        toast({
          title: "הצלחה",
          description: "מחיר מטפל עודכן בהצלחה"
        })
        setIsEditing(false)
        queryClient.invalidateQueries({ queryKey: ["adminBookings"] })
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: result.error || "שגיאה בעדכון מחיר מטפל"
        })
      }
    } catch (error) {
      console.error("Error updating professional payment:", error)
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "שגיאה בעדכון מחיר מטפל"
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleEditCancel = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsEditing(false)
    setEditValue("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleEditSave(e as any)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleEditCancel(e as any)
    }
  }

  return (
    <div className="space-y-1 max-w-[150px]">
      <div className="text-sm font-medium">
        סה"כ: ₪{finalAmount.toFixed(0)}
      </div>
      
      {/* Professional payment with edit capability */}
      <div className="flex items-center gap-1">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-6 w-16 text-xs"
              min="0"
              step="1"
              disabled={updating}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              size="sm"
              variant="ghost"
              className="h-5 w-5 p-0"
              onClick={handleEditSave}
              disabled={updating}
            >
              <CheckCircle className="h-3 w-3 text-green-600" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-5 w-5 p-0"
              onClick={handleEditCancel}
              disabled={updating}
            >
              <XCircle className="h-3 w-3 text-red-600" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-600">
              למטפל: ₪{professionalPayment.toFixed(0)}
            </span>
            {hasProfessional && (
              <Button
                size="sm"
                variant="ghost"
                className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100"
                onClick={handleEditStart}
                title="ערוך מחיר מטפל"
              >
                <Edit className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
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

// Enhanced AddressDetailsInfo to display address type and relevant fields
const AddressDetailsInfo = ({ booking, t }: { booking: PopulatedBooking; t: TFunction }) => {
  // First try bookingAddressSnapshot, then addressId, then customAddressDetails
  const address = booking.bookingAddressSnapshot || booking.customAddressDetails || (booking as any).addressId
  
  if (!address) {
    return <div className="text-sm text-muted-foreground">-</div>
  }

  // Handle different address structure formats
  const streetNumber = address.streetNumber || address.houseNumber
  const hasParking = address.hasPrivateParking
  const addressType = address.addressType || "apartment" // Default fallback

  // Get address type display name and icon
  const getAddressTypeInfo = (type: string) => {
    switch (type) {
      case "apartment": return { name: "דירה", icon: "🏠", color: "bg-blue-100 text-blue-800" }
      case "house": return { name: "בית פרטי", icon: "🏡", color: "bg-green-100 text-green-800" }
      case "office": return { name: "משרד", icon: "🏢", color: "bg-purple-100 text-purple-800" }
      case "hotel": return { name: "מלון/צימר", icon: "🏨", color: "bg-pink-100 text-pink-800" }
      case "other": return { name: "אחר", icon: "📍", color: "bg-gray-100 text-gray-800" }
      default: return { name: "דירה", icon: "🏠", color: "bg-blue-100 text-blue-800" }
    }
  }

  const typeInfo = getAddressTypeInfo(addressType)

  return (
    <div className="space-y-1 max-w-[220px]">
      {/* Address Type Badge */}
      <div className="flex items-center gap-1 mb-1">
        <span className={`text-xs px-2 py-1 rounded font-medium ${typeInfo.color}`}>
          {typeInfo.icon} {typeInfo.name}
        </span>
      </div>

      {/* Main Address */}
      <div className="font-medium text-sm">
        {address.fullAddress || 
         (address.street && streetNumber 
          ? `${address.street} ${streetNumber}, ${address.city}`
          : `${address.city}`
         )
        }
      </div>

      {/* Type-specific fields */}
      {addressType === "apartment" && (
        <div className="space-y-1">
          {address.floor && (
            <div className="text-xs text-muted-foreground">
              קומה: {address.floor}
            </div>
          )}
          {address.apartment && (
            <div className="text-xs text-muted-foreground">
              דירה: {address.apartment}
            </div>
          )}
          {address.entrance && (
            <div className="text-xs text-muted-foreground">
              כניסה: {address.entrance}
            </div>
          )}
        </div>
      )}

      {addressType === "house" && (
        <div className="space-y-1">
          {address.doorName && (
            <div className="text-xs text-muted-foreground bg-green-50 px-2 py-1 rounded">
              שם על הדלת: {address.doorName}
            </div>
          )}
          {address.entrance && (
            <div className="text-xs text-muted-foreground">
              כניסה: {address.entrance}
            </div>
          )}
        </div>
      )}

      {addressType === "office" && (
        <div className="space-y-1">
          {address.buildingName && (
            <div className="text-xs text-muted-foreground bg-purple-50 px-2 py-1 rounded">
              בניין: {address.buildingName}
            </div>
          )}
          {address.floor && (
            <div className="text-xs text-muted-foreground">
              קומה: {address.floor}
            </div>
          )}
          {address.entrance && (
            <div className="text-xs text-muted-foreground">
              כניסה: {address.entrance}
            </div>
          )}
        </div>
      )}

      {addressType === "hotel" && (
        <div className="space-y-1">
          {address.hotelName && (
            <div className="text-xs text-muted-foreground bg-pink-50 px-2 py-1 rounded">
              מלון: {address.hotelName}
            </div>
          )}
          {address.roomNumber && (
            <div className="text-xs text-muted-foreground bg-yellow-50 px-2 py-1 rounded">
              חדר: {address.roomNumber}
            </div>
          )}
        </div>
      )}

      {addressType === "other" && (
        <div className="space-y-1">
          {(address.instructions || address.otherInstructions) && (
            <div className="text-xs text-muted-foreground bg-gray-50 px-2 py-1 rounded">
              הוראות: {address.instructions || address.otherInstructions}
            </div>
          )}
        </div>
      )}
      
      {/* Parking */}
      {hasParking !== undefined && (
        <div className="flex items-center gap-1">
          <span className={`text-xs px-2 py-1 rounded ${
            hasParking 
              ? "text-green-700 bg-green-100" 
              : "text-red-700 bg-red-100"
          }`}>
            {hasParking ? "🅿️ יש חניה" : "🚫 אין חניה"}
          </span>
        </div>
      )}
      
      {/* General Notes */}
      {(address.additionalNotes || address.notes) && (
        <div className="text-xs text-muted-foreground bg-orange-50 px-2 py-1 rounded">
          💬 {address.additionalNotes || address.notes}
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
  // 12. Payment Bonus
  {
    accessorKey: "paymentBonus",
    header: "תוספת תשלום",
    cell: ({ row }) => <PaymentBonusColumn booking={row.original} t={t} />,
  },
  // 13. Actions
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

// Payment Bonus Column Component
const PaymentBonusColumn = ({ booking, t }: { booking: PopulatedBooking; t: TFunction }) => {
  const [showPaymentBonusModal, setShowPaymentBonusModal] = useState(false)
  const [showEditPaymentBonusModal, setShowEditPaymentBonusModal] = useState(false)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Check if booking can receive payment bonus - handle older bookings without all fields
  const canAddPaymentBonus = booking.status === "pending_professional" && 
    !booking.professionalId && 
    !booking.priceDetails?.paymentBonus &&
    booking.priceDetails  // Must have priceDetails

  const canEditPaymentBonus = booking.priceDetails?.paymentBonus && 
    booking.status === "pending_professional" && 
    !booking.professionalId

  const handleAddPaymentBonus = async (amount: number, description: string) => {
    console.log("Adding payment bonus:", { bookingId: booking._id, amount, description })
    
    try {
      const response = await fetch(`/api/admin/bookings/${booking._id}/add-payment-bonus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount, description }),
      })
      
      const result = await response.json()
      console.log("Payment bonus result:", result)
      
      if (result.success) {
        toast({
          title: "הצלחה",
          description: "תוספת תשלום נוספה בהצלחה"
        })
        if (result.notificationsSent) {
          toast({
            title: "הצלחה", 
            description: "הודעות נשלחו למטפלים המתאימים"
          })
        }
        queryClient.invalidateQueries({ queryKey: ["adminBookings"] })
        setShowPaymentBonusModal(false)
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: result.error || "שגיאה בהוספת תוספת תשלום"
        })
      }
    } catch (error) {
      console.error("Add payment bonus error:", error)
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "שגיאה בהוספת תוספת תשלום"
      })
    }
  }

  const handleEditPaymentBonus = async (amount: number, description: string) => {
    try {
      const response = await fetch(`/api/admin/bookings/${booking._id}/edit-payment-bonus`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount, description }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "הצלחה",
          description: "תוספת תשלום עודכנה בהצלחה"
        })
        queryClient.invalidateQueries({ queryKey: ["adminBookings"] })
        setShowEditPaymentBonusModal(false)
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: result.error || "שגיאה בעדכון תוספת תשלום"
        })
      }
    } catch (error) {
      console.error("Edit payment bonus error:", error)
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "שגיאה בעדכון תוספת תשלום"
      })
    }
  }

  const handleDeletePaymentBonus = async () => {
    try {
      const response = await fetch(`/api/admin/bookings/${booking._id}/edit-payment-bonus`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "הצלחה",
          description: "תוספת תשלום נמחקה בהצלחה"
        })
        queryClient.invalidateQueries({ queryKey: ["adminBookings"] })
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: result.error || "שגיאה במחיקת תוספת תשלום"
        })
      }
    } catch (error) {
      console.error("Delete payment bonus error:", error)
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "שגיאה במחיקת תוספת תשלום"
      })
    }
  }

  if (booking.priceDetails?.paymentBonus) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <span className="text-green-600 font-medium">₪{booking.priceDetails.paymentBonus.amount}</span>
        </div>
        <div className="text-xs text-gray-500 max-w-[120px] truncate">
          {booking.priceDetails.paymentBonus.description}
        </div>
        {canEditPaymentBonus && (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation()
                setShowEditPaymentBonusModal(true)
              }}
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
              onClick={(e) => {
                e.stopPropagation()
                handleDeletePaymentBonus()
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Edit Payment Bonus Modal */}
        <PaymentBonusModal
          isOpen={showEditPaymentBonusModal}
          onClose={() => setShowEditPaymentBonusModal(false)}
          onSubmit={handleEditPaymentBonus}
          existingAmount={booking.priceDetails?.paymentBonus?.amount}
          existingDescription={booking.priceDetails?.paymentBonus?.description}
          isEdit={true}
        />
      </div>
    )
  }

  if (canAddPaymentBonus) {
    return (
      <div>
        <Button
          size="sm"
          className="h-7 px-3 text-xs bg-green-600 hover:bg-green-700"
          onClick={(e) => {
            e.stopPropagation()
            setShowPaymentBonusModal(true)
          }}
        >
          <CheckCircle className="h-3 w-3 mr-1" />
          הוסף בונוס
        </Button>

        {/* Add Payment Bonus Modal */}
        <PaymentBonusModal
          isOpen={showPaymentBonusModal}
          onClose={() => setShowPaymentBonusModal(false)}
          onSubmit={handleAddPaymentBonus}
        />
      </div>
    )
  }

  return <span className="text-gray-400 text-xs">לא זמין</span>
}

// Payment Bonus Modal Component
const PaymentBonusModal = ({ 
  isOpen, 
  onClose, 
  onSubmit,
  existingAmount,
  existingDescription,
  isEdit = false
}: { 
  isOpen: boolean
  onClose: () => void
  onSubmit: (amount: number, description: string) => Promise<void>
  existingAmount?: number
  existingDescription?: string
  isEdit?: boolean
}) => {
  const [amount, setAmount] = useState(existingAmount?.toString() || "")
  const [description, setDescription] = useState(existingDescription || "")
  const [loading, setLoading] = useState(false)

  // Update state when modal opens with existing data
  React.useEffect(() => {
    if (isOpen) {
      setAmount(existingAmount?.toString() || "")
      setDescription(existingDescription || "")
    }
  }, [isOpen, existingAmount, existingDescription])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      return
    }
    
    if (!description.trim()) {
      return
    }

    setLoading(true)
    try {
      await onSubmit(numAmount, description.trim())
      setAmount("")
      setDescription("")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "ערוך תוספת תשלום למטפלים" : "הוסף תוספת תשלום למטפלים"}</DialogTitle>
          <DialogDescription>
            {isEdit 
              ? "עדכן את פרטי תוספת התשלום. שמירת השינויים לא תשלח הודעות נוספות למטפלים."
              : "תוספת התשלום תשלח הודעות לכל המטפלים המתאימים ותעודד אותם לקחת את ההזמנה"
            }
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              סכום התוספת (₪)
            </label>
            <Input
              id="amount"
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="הכנס סכום"
              required
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              תיאור התוספת
            </label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="לדוגמה: תמריץ מיוחד לשעות הערב"
              required
            />
          </div>
          
          <div className="flex justify-end space-x-2 space-x-reverse">
            <Button type="button" variant="outline" onClick={onClose}>
              ביטול
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (isEdit ? "עדכן תוספת" : "הוסף תוספת")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 