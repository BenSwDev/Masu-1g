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
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{t("common.actions")}</p>
              <p className="text-xs text-muted-foreground">
                #{booking.bookingNumber || "N/A"}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {hasNotes && (
            <DropdownMenuItem
              onClick={() => setShowNotesModal(true)}
              className="cursor-pointer"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              <span>{t("adminBookings.viewClientNotes")}</span>
            </DropdownMenuItem>
          )}

          {canAssignProfessional && (
            <DropdownMenuItem
              onClick={() => setShowAssignModal(true)}
              className="cursor-pointer"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              <span>{t("adminBookings.assignProfessional")}</span>
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

  return (
    <div className="space-y-1">
      <div className="font-medium">{booking.recipientName}</div>
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
    </div>
  )
}

const TreatmentTimeInfo = ({ booking, t }: { booking: PopulatedBooking; t: TFunction }) => {
  const treatment = booking.treatmentId as any
  const selectedTime = (booking as any).selectedTime
  
  if (!selectedTime && !treatment) {
    return <div className="text-sm text-muted-foreground">-</div>
  }

  return (
    <div className="space-y-1">
      {selectedTime && (
        <div className="font-medium">{selectedTime}</div>
      )}
      {treatment?.duration && (
        <div className="text-xs text-muted-foreground">
          {treatment.duration} {t("common.minutes")}
        </div>
      )}
    </div>
  )
}

const AddressDetailsInfo = ({ booking, t }: { booking: PopulatedBooking; t: TFunction }) => {
  const address = (booking as any).addressDetails || booking.addressId
  
  if (!address) {
    return <div className="text-sm text-muted-foreground">-</div>
  }

  return (
    <div className="space-y-1 max-w-[200px]">
      <div className="font-medium text-sm">
        {address.street} {address.houseNumber || address.streetNumber}, {address.city}
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
      
      {address.hasPrivateParking !== undefined && (
        <div className="flex items-center gap-1">
          <span className={`text-xs px-2 py-1 rounded ${
            address.hasPrivateParking 
              ? "text-green-700 bg-green-100" 
              : "text-red-700 bg-red-100"
          }`}>
            {address.hasPrivateParking 
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

// Export the column definition function
export const getAdminBookingColumns = (
  t: TFunction, 
  locale: string,
  onRowClick?: (booking: PopulatedBooking) => void
): ColumnDef<PopulatedBooking>[] => [
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
      return (
        <div className="font-mono text-sm font-medium">
          #{bookingNumber || "Unknown"}
        </div>
      )
    },
  },
  {
    accessorKey: "userId",
    header: t("adminBookings.columns.client"),
    cell: ({ row }) => <ClientInfo booking={row.original} t={t} />,
  },
  {
    accessorKey: "treatmentId",
    header: t("adminBookings.columns.treatment"),
    cell: ({ row }) => {
      const treatment = row.original.treatmentId as any
      return (
        <div className="max-w-[200px]">
          <span className="text-sm font-medium">
            {treatment?.name || t("common.unknown")}
          </span>
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
        className="h-auto p-0 font-semibold hover:bg-transparent"
      >
        {t("adminBookings.columns.dateTime")}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const bookingDateTime = row.getValue("bookingDateTime") as string | Date
      return (
        <div className="text-sm">
          <div className="font-medium">{formatDateSafe(bookingDateTime)}</div>
          <div className="text-muted-foreground">{formatTimeSafe(bookingDateTime)}</div>
        </div>
      )
    },
  },
  {
    accessorKey: "professionalId",
    header: t("adminBookings.columns.professional"),
    cell: ({ row }) => <ProfessionalInfo booking={row.original} t={t} />,
  },
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
  {
    accessorKey: "recipientInfo",
    header: t("adminBookings.columns.recipient"),
    cell: ({ row }) => <RecipientInfo booking={row.original} t={t} />,
  },
  {
    accessorKey: "selectedTime",
    header: t("adminBookings.columns.selectedTime"),
    cell: ({ row }) => <TreatmentTimeInfo booking={row.original} t={t} />,
  },
  {
    accessorKey: "addressDetails",
    header: t("adminBookings.columns.addressDetails"),
    cell: ({ row }) => <AddressDetailsInfo booking={row.original} t={t} />,
  },
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