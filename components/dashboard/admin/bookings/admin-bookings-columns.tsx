"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
} from "@/components/ui/dropdown-menu"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import type { PopulatedBooking } from "@/types/booking"
import { assignProfessionalToBooking, getAvailableProfessionals } from "@/actions/booking-actions"
import { useQuery, useQueryClient } from "@tanstack/react-query"

type TFunction = (key: string, options?: any) => string

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
                {professionalsData?.professionals?.map((professional) => (
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
  t, 
  onRowClick 
}: { 
  booking: PopulatedBooking; 
  t: TFunction;
  onRowClick?: (e: React.MouseEvent) => void;
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)

  const canAssignProfessional = !booking.professionalId && !["completed", "cancelled_by_user", "cancelled_by_admin", "no_show"].includes(booking.status)
  const hasNotes = booking.notes && booking.notes.trim().length > 0

  // Debug logging
  console.log('Booking debug:', {
    bookingNumber: booking.bookingNumber,
    professionalId: booking.professionalId,
    status: booking.status,
    canAssignProfessional
  })

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
                #{booking.bookingNumber}
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
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowAssignModal(true)}
                className="cursor-pointer text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                <span>{t("adminBookings.assignProfessional")}</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showNotesModal} onOpenChange={setShowNotesModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("adminBookings.notesDialog.title")}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-700">
              {booking.notes || t("adminBookings.notesDialog.noNotes")}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
const AdminBookingStatusBadge = ({ status, t }: { status: PopulatedBooking["status"]; t: TFunction }) => {
  const statusConfig = {
    pending_professional_assignment: {
      label: t("adminBookings.status.pendingAssignment"),
      className: "bg-amber-100 text-amber-800 border-amber-200"
    },
    confirmed: {
      label: t("adminBookings.status.confirmed"),
      className: "bg-green-100 text-green-800 border-green-200"
    },
    professional_en_route: {
      label: t("adminBookings.status.enRoute"),
      className: "bg-blue-100 text-blue-800 border-blue-200"
    },
    completed: {
      label: t("adminBookings.status.completed"),
      className: "bg-gray-100 text-gray-800 border-gray-200"
    },
    cancelled_by_user: {
      label: t("adminBookings.status.cancelledByUser"),
      className: "bg-red-100 text-red-800 border-red-200"
    },
    cancelled_by_admin: {
      label: t("adminBookings.status.cancelledByAdmin"),
      className: "bg-red-100 text-red-800 border-red-200"
    },
    no_show: {
      label: t("adminBookings.status.noShow"),
      className: "bg-orange-100 text-orange-800 border-orange-200"
    }
  } as const

  const config = statusConfig[status as keyof typeof statusConfig] || {
    label: status || t("common.status.unknown"),
    className: "bg-gray-100 text-gray-800 border-gray-200"
  }

  return (
    <Badge 
      variant="outline" 
      className={cn("text-xs font-medium", config.className)}
    >
      {config.label}
    </Badge>
  )
}

// Client Info Component
const ClientInfo = ({ booking, t }: { booking: PopulatedBooking; t: TFunction }) => {
  const clientName = booking.bookedByUserName || (booking.userId as any)?.name || t("common.unknown")
  const clientEmail = booking.bookedByUserEmail || (booking.userId as any)?.email
  const clientPhone = booking.bookedByUserPhone || (booking.userId as any)?.phone

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <User className="h-3 w-3 text-muted-foreground" />
        <span className="text-sm font-medium">{clientName}</span>
      </div>
      {clientEmail && (
        <div className="flex items-center gap-1">
          <Mail className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{clientEmail}</span>
        </div>
      )}
      {clientPhone && (
        <div className="flex items-center gap-1">
          <Phone className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{clientPhone}</span>
        </div>
      )}
    </div>
  )
}

// Professional Info Component
const ProfessionalInfo = ({ booking, t }: { booking: PopulatedBooking; t: TFunction }) => {
  if (!booking.professionalId) {
    return (
      <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
        {t("adminBookings.noProfessional")}
      </Badge>
    )
  }

  const professionalName = (booking.professionalId as any)?.name || t("common.unknown")
  const professionalPhone = (booking.professionalId as any)?.phone

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <User className="h-3 w-3 text-green-600" />
        <span className="text-sm font-medium text-green-700">{professionalName}</span>
      </div>
      {professionalPhone && (
        <div className="flex items-center gap-1">
          <Phone className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{professionalPhone}</span>
        </div>
      )}
    </div>
  )
}

const formatDateIsraeli = (date: string | Date) => {
  return format(new Date(date), "dd/MM/yyyy")
}

const formatTimeIsraeli = (date: Date) => {
  return format(date, "HH:mm")
}

const getLocale = (locale: string) => {
  switch (locale) {
    case "he":
      return he
    case "en":
      return enUS
    case "ru":
      return ru
    default:
      return he
  }
}

// Create a clickable row component
const ClickableRow = ({ 
  children, 
  onClick, 
  className 
}: { 
  children: React.ReactNode; 
  onClick: () => void; 
  className?: string;
}) => {
  return (
    <tr 
      className={cn(
        "cursor-pointer hover:bg-muted/50 transition-colors", 
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}

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
    cell: ({ row }) => (
      <div className="font-mono text-sm font-medium">
        #{row.getValue("bookingNumber")}
      </div>
    ),
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
      const date = new Date(row.getValue("bookingDateTime"))
      return (
        <div className="text-sm">
          <div className="font-medium">{formatDateIsraeli(date)}</div>
          <div className="text-muted-foreground">{formatTimeIsraeli(date)}</div>
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
    cell: ({ row }) => (
      <AdminBookingStatusBadge status={row.getValue("status")} t={t} />
    ),
  },
  {
    accessorKey: "priceDetails.finalAmount",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-auto p-0 font-semibold hover:bg-transparent"
      >
        {t("adminBookings.columns.amount")}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const amount = row.original.priceDetails?.finalAmount || 0
      return (
        <div className="text-sm font-medium">
          ₪{amount.toFixed(2)}
        </div>
      )
    },
  },
  {
    id: "actions",
    header: t("common.actions"),
    cell: ({ row }) => (
      <AdminBookingActions 
        booking={row.original} 
        t={t} 
        onRowClick={onRowClick ? () => onRowClick(row.original) : undefined}
      />
    ),
  },
] 