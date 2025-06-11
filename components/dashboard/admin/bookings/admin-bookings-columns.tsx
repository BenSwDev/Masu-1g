"use client"

import React from "react"
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
  UserPlus, 
  X,
  Loader2,
  MessageSquare,
  User,
  Phone,
  Mail
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/ui/select"
import { toast } from "sonner"
import type { PopulatedBooking } from "@/types/booking"
import { assignProfessionalToBooking, getAvailableProfessionals } from "@/actions/booking-actions"
import { useQuery, useQueryClient } from "@tanstack/react-query"

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

// Professional Assignment Component
const ProfessionalAssignmentDialog = ({ 
  booking, 
  isOpen, 
  onClose, 
  t 
}: { 
  booking: PopulatedBooking
  isOpen: boolean
  onClose: () => void
  t: TFunction 
}) => {
  const [selectedProfessional, setSelectedProfessional] = useState<string>("")
  const [isAssigning, setIsAssigning] = useState(false)
  const queryClient = useQueryClient()

  const { data: professionalsData } = useQuery({
    queryKey: ["availableProfessionals"],
    queryFn: getAvailableProfessionals,
    enabled: isOpen,
  })

  const handleAssign = async () => {
    if (!selectedProfessional) return

    setIsAssigning(true)
    try {
      const result = await assignProfessionalToBooking(booking._id, selectedProfessional)
      if (result.success) {
        toast.success(t("adminBookings.assignSuccess"))
        queryClient.invalidateQueries({ queryKey: ["adminBookings"] })
        onClose()
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
      setIsAssigning(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("adminBookings.assignProfessional")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">
              {t("adminBookings.selectProfessional")}
            </label>
            <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={t("adminBookings.chooseProfessional")} />
              </SelectTrigger>
              <SelectContent>
                {professionalsData?.professionals?.map((professional: any) => (
                  <SelectItem key={professional._id} value={professional._id}>
                    <div className="flex items-center gap-2">
                      <span>{professional.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({professional.gender === "male" ? t("common.male") : t("common.female")})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isAssigning}>
              {t("common.cancel")}
            </Button>
            <Button 
              onClick={handleAssign} 
              disabled={!selectedProfessional || isAssigning}
            >
              {isAssigning ? (
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
  )
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
  const [showAssignModal, setShowAssignModal] = useState(false)

  if (!booking) {
    return <div className="text-sm text-muted-foreground">-</div>
  }

  const canAssignProfessional = !booking.professionalId && !["completed", "cancelled_by_user", "cancelled_by_admin", "no_show"].includes(booking.status)
  const hasNotes = booking.notes && booking.notes.trim().length > 0
  const canCancel = !["completed", "cancelled_by_user", "cancelled_by_admin"].includes(booking.status)

  const handleDropdownClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent row click when clicking dropdown
  }

  return (
    <>
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

          {canAssignProfessional && (
            <DropdownMenuItem
              onClick={() => setShowAssignModal(true)}
              className="cursor-pointer"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              <span>{t("adminBookings.assignEditRemoveProfessional")}</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem className="cursor-pointer text-muted-foreground" disabled>
            <MessageSquare className="mr-2 h-4 w-4" />
            <span>{t("adminBookings.sendToProfessionals")} ({t("common.notActive")})</span>
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

      {/* Assignment Modal */}
      <ProfessionalAssignmentDialog
        booking={booking}
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        t={t}
      />
    </>
  )
}

// Status Badge Component
const AdminBookingStatusBadge = ({ status, t }: { status: string; t: TFunction }) => {
  if (!status) {
    return <Badge variant="secondary">{t("common.unknown")}</Badge>
  }

  const statusConfig: Record<string, { variant: "secondary" | "destructive"; color: string }> = {
    pending: { variant: "secondary" as const, color: "bg-yellow-100 text-yellow-800" },
    pending_professional_assignment: { variant: "secondary" as const, color: "bg-yellow-100 text-yellow-800" },
    confirmed: { variant: "secondary" as const, color: "bg-blue-100 text-blue-800" },
    in_progress: { variant: "secondary" as const, color: "bg-purple-100 text-purple-800" },
    professional_en_route: { variant: "secondary" as const, color: "bg-blue-100 text-blue-800" },
    completed: { variant: "secondary" as const, color: "bg-green-100 text-green-800" },
    cancelled_by_user: { variant: "destructive" as const, color: "bg-red-100 text-red-800" },
    cancelled_by_admin: { variant: "destructive" as const, color: "bg-red-100 text-red-800" },
    no_show: { variant: "destructive" as const, color: "bg-orange-100 text-orange-800" },
  }

  const config = statusConfig[status] || statusConfig.pending

  return (
    <Badge variant={config.variant} className={config.color}>
      {t(`bookings.status.${status}`)}
    </Badge>
  )
}

// Info Components with null safety
const ClientInfo = ({ booking, t }: { booking: PopulatedBooking; t: TFunction }) => {
  if (!booking?.userId) {
    return <div className="text-sm text-muted-foreground">-</div>
  }

  const user = booking.userId as any
  return (
    <div className="space-y-1">
      <div className="font-medium">{user.name || t("common.unknown")}</div>
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <Phone className="h-3 w-3" />
        {user.phone || "-"}
      </div>
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <Mail className="h-3 w-3" />
        {user.email || "-"}
      </div>
    </div>
  )
}

const ProfessionalInfo = ({ booking, t }: { booking: PopulatedBooking; t: TFunction }) => {
  if (!booking?.professionalId) {
    return (
      <Badge variant="outline" className="text-orange-600 border-orange-200">
        {t("adminBookings.unassigned")}
      </Badge>
    )
  }

  const professional = booking.professionalId as any
  return (
    <div className="space-y-1">
      <div className="font-medium">{professional.name || t("common.unknown")}</div>
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <Phone className="h-3 w-3" />
        {professional.phone || "-"}
      </div>
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <Mail className="h-3 w-3" />
        {professional.email || "-"}
      </div>
    </div>
  )
}

const PriceDetailsInfo = ({ booking, t }: { booking: PopulatedBooking; t: TFunction }) => {
  if (!booking?.priceDetails) {
    return <div className="text-sm text-muted-foreground">-</div>
  }

  const price = booking.priceDetails as any
  return (
    <div className="space-y-1">
      <div className="font-medium">
        ₪{price.finalAmount?.toFixed(2) || "0.00"}
      </div>
      {price.basePrice && price.basePrice !== price.finalAmount && (
        <div className="text-xs text-muted-foreground">
          {t("adminBookings.basePrice")}: ₪{price.basePrice.toFixed(2)}
        </div>
      )}
      {price.couponDiscount && price.couponDiscount > 0 && (
        <div className="text-xs text-green-600">
          {t("adminBookings.discount")}: -₪{price.couponDiscount.toFixed(2)}
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
          {booking.recipientPhone}
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
        {address.street && streetNumber 
          ? `${address.street} ${streetNumber}, ${address.city}`
          : address.fullAddress || `${address.city}`
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
      
      {address.additionalNotes && (
        <div className="text-xs text-muted-foreground">
          {address.additionalNotes}
        </div>
      )}
    </div>
  )
}

// Add new component for redemption details (מימוש)
const RedemptionInfo = ({ booking, t }: { booking: PopulatedBooking; t: TFunction }) => {
  const priceDetails = booking.priceDetails
  
  if (!priceDetails) {
    return <div className="text-sm text-muted-foreground">-</div>
  }

  const hasRedemption = priceDetails.isBaseTreatmentCoveredBySubscription || 
                       priceDetails.isBaseTreatmentCoveredByTreatmentVoucher ||
                       priceDetails.discountAmount > 0 ||
                       priceDetails.voucherAppliedAmount > 0

  if (!hasRedemption) {
    return <div className="text-sm text-muted-foreground">-</div>
  }

  return (
    <div className="space-y-1 max-w-[180px]">
      {priceDetails.isBaseTreatmentCoveredBySubscription && (
        <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
          {t("adminBookings.subscriptionRedemption")}
        </div>
      )}
      {priceDetails.isBaseTreatmentCoveredByTreatmentVoucher && (
        <div className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
          {t("adminBookings.treatmentVoucherRedemption")}
        </div>
      )}
      {priceDetails.voucherAppliedAmount > 0 && !priceDetails.isBaseTreatmentCoveredByTreatmentVoucher && (
        <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
          {t("adminBookings.monetaryVoucherRedemption")}: ₪{priceDetails.voucherAppliedAmount.toFixed(2)}
        </div>
      )}
      {priceDetails.discountAmount > 0 && (
        <div className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
          {t("adminBookings.couponDiscount")}: ₪{priceDetails.discountAmount.toFixed(2)}
        </div>
      )}
    </div>
  )
}

// Add new component for financial summary (סיכום כספי)
const FinancialSummaryInfo = ({ booking, t }: { booking: PopulatedBooking; t: TFunction }) => {
  const priceDetails = booking.priceDetails
  const treatment = booking.treatmentId as any
  
  if (!priceDetails) {
    return <div className="text-sm text-muted-foreground">-</div>
  }

  // Calculate professional fee and office commission
  let professionalFee = 0
  let officeFee = 0

  if (treatment && priceDetails.finalAmount > 0) {
    // Get professional price based on treatment type
    let professionalPrice = 0
    if (treatment.pricingType === "fixed") {
      professionalPrice = treatment.fixedProfessionalPrice || 0
    } else if (treatment.pricingType === "duration_based" && booking.selectedDurationId && treatment.durations) {
      const selectedDuration = treatment.durations.find(
        (d: any) => d._id?.toString() === booking.selectedDurationId?.toString()
      )
      if (selectedDuration) {
        professionalPrice = selectedDuration.professionalPrice || 0
      }
    }

    professionalFee = professionalPrice
    officeFee = priceDetails.finalAmount - professionalPrice
  }

  const actualPaid = priceDetails.finalAmount

  return (
    <div className="space-y-1 max-w-[180px]">
      <div className="font-medium text-sm">
        {t("adminBookings.finalCost")}: ₪{priceDetails.finalAmount.toFixed(2)}
      </div>
      <div className="text-xs text-muted-foreground">
        {t("adminBookings.actualPaid")}: ₪{actualPaid.toFixed(2)}
      </div>
      <div className="text-xs text-green-600">
        {t("adminBookings.professionalFee")}: ₪{professionalFee.toFixed(2)}
      </div>
      <div className="text-xs text-blue-600">
        {t("adminBookings.officeFee")}: ₪{officeFee.toFixed(2)}
      </div>
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
          {booking.recipientPhone}
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
  onRowClick?: (booking: PopulatedBooking) => void
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
      return (
        <div className="space-y-1">
          <div className="font-mono text-sm font-medium">
            #{bookingNumber || "Unknown"}
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
  // 5. Treatment with Category and Duration
  {
    accessorKey: "treatmentId",
    header: t("adminBookings.columns.treatment"),
    cell: ({ row }) => <TreatmentInfo booking={row.original} t={t} />,
  },
  // 6. Recipient with Age
  {
    accessorKey: "recipientInfo",
    header: t("adminBookings.columns.recipient"),
    cell: ({ row }) => <RecipientInfo booking={row.original} t={t} />,
  },
  // 7. Professional
  {
    accessorKey: "professionalId",
    header: t("adminBookings.columns.professional"),
    cell: ({ row }) => <ProfessionalInfo booking={row.original} t={t} />,
  },
  // 8. Price Details
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
  // 9. NEW: Redemption Details (מימוש)
  {
    accessorKey: "redemption",
    header: t("adminBookings.columns.redemption"),
    cell: ({ row }) => <RedemptionInfo booking={row.original} t={t} />,
  },
  // 10. NEW: Financial Summary (סיכום כספי)
  {
    accessorKey: "financialSummary",
    header: t("adminBookings.columns.financialSummary"),
    cell: ({ row }) => <FinancialSummaryInfo booking={row.original} t={t} />,
  },
  // 11. Actions
  {
    id: "actions",
    header: t("common.actions"),
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <AdminBookingActions 
          booking={row.original} 
          t={t} 
        />
      </div>
    ),
  },
] 