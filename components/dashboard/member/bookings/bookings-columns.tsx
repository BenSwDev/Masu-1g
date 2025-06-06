"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { MoreHorizontal, ArrowUpDown, Eye, XCircle, Loader2, Hourglass, CheckCircle, User, Info } from "lucide-react"

import type { PopulatedBooking } from "@/actions/booking-actions"
import { cancelBooking as cancelBookingAction } from "@/actions/booking-actions"
import { Button } from "@/components/common/ui/button"
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
import { useTranslation } from "@/lib/translations/i18n"
import { cn, formatDate, formatCurrency } from "@/lib/utils/utils"
import BookingDetailsView from "./booking-details-view"

// Helper component for actions to manage state within the cell
const BookingActions = ({ booking }: { booking: PopulatedBooking }) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const currentUserId = session?.user?.id

  const { mutate: cancelBooking, isPending: isCancelPending } = useMutation({
    mutationFn: async () => {
      if (!currentUserId) throw new Error("User not authenticated")
      const result = await cancelBookingAction(
        booking._id.toString(),
        currentUserId,
        "user",
        t("memberBookings.userCancellationReason"),
      )
      if (!result.success) {
        throw new Error(result.error ? t(`common.errors.${result.error}`) : t("common.errors.unknown"))
      }
      return result
    },
    onSuccess: () => {
      toast({
        title: t("common.success"),
        description: t("memberBookings.cancelSuccess"),
        variant: "default",
      })
      queryClient.invalidateQueries({ queryKey: ["member-bookings", currentUserId] })
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const isCancellable =
    (booking.status === "pending_professional_assignment" || booking.status === "confirmed") &&
    new Date(booking.bookingDateTime) > new Date()

  return (
    <Drawer>
      <AlertDialog>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">{t("common.openMenu")}</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("common.actions")}</DropdownMenuLabel>
            <DrawerTrigger asChild>
              <DropdownMenuItem>
                <Eye className="mr-2 h-4 w-4" />
                {t("memberBookings.viewDetailsButton")}
              </DropdownMenuItem>
            </DrawerTrigger>
            {isCancellable && (
              <>
                <DropdownMenuSeparator />
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem className="text-red-600 focus:text-red-600">
                    {isCancelPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="mr-2 h-4 w-4" />
                    )}
                    {t("memberBookings.cancelBooking")}
                  </DropdownMenuItem>
                </AlertDialogTrigger>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>{t("memberBookings.cancelConfirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => cancelBooking()} className="bg-destructive hover:bg-destructive/90">
              {t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DrawerContent className="max-h-[90vh]">
        <ScrollArea className="h-full p-4">
          <BookingDetailsView booking={booking} />
        </ScrollArea>
        <DrawerFooter className="pt-2 sticky bottom-0 bg-background border-t">
          <DrawerClose asChild>
            <Button variant="outline">{t("common.close")}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

// Status component for reusability
const BookingStatus = ({ status }: { status: PopulatedBooking["status"] }) => {
  const { t } = useTranslation()
  const getStatusInfo = (statusKey: PopulatedBooking["status"]) => {
    switch (statusKey) {
      case "pending_professional_assignment":
        return {
          label: t("memberBookings.status.pending_professional_assignment"),
          icon: <Hourglass className="mr-1.5 h-4 w-4 text-amber-600" />,
          badgeClass: "bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200",
        }
      case "confirmed":
        return {
          label: t("memberBookings.status.confirmed"),
          icon: <CheckCircle className="mr-1.5 h-4 w-4 text-green-600" />,
          badgeClass: "bg-green-100 text-green-700 border-green-300 hover:bg-green-200",
        }
      case "completed":
        return {
          label: t("memberBookings.status.completed"),
          icon: <CheckCircle className="mr-1.5 h-4 w-4 text-sky-600" />,
          badgeClass: "bg-sky-100 text-sky-700 border-sky-300 hover:bg-sky-200",
        }
      case "cancelled_by_user":
      case "cancelled_by_admin":
        return {
          label: t(`memberBookings.status.${statusKey}`),
          icon: <XCircle className="mr-1.5 h-4 w-4 text-red-600" />,
          badgeClass: "bg-red-100 text-red-700 border-red-300 hover:bg-red-200",
        }
      case "no_show":
        return {
          label: t("memberBookings.status.no_show"),
          icon: <User className="mr-1.5 h-4 w-4 text-orange-600" />,
          badgeClass: "bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200",
        }
      default:
        return {
          label: t(`memberBookings.status.${statusKey}`) || statusKey,
          icon: <Info className="mr-1.5 h-4 w-4 text-gray-600" />,
          badgeClass: "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200",
        }
    }
  }
  const statusInfo = getStatusInfo(status)
  return (
    <Badge variant="outline" className={cn("text-xs font-medium whitespace-nowrap", statusInfo.badgeClass)}>
      {statusInfo.icon}
      {statusInfo.label}
    </Badge>
  )
}

export const columns: ColumnDef<PopulatedBooking>[] = [
  {
    accessorKey: "bookingNumber",
    header: () => {
      const { t } = useTranslation()
      return <div className="whitespace-nowrap">{t("bookings.table.header.bookingNumber")}</div>
    },
    cell: ({ row }) => <div className="font-mono">#{row.original.bookingNumber}</div>,
  },
  {
    accessorKey: "treatment",
    header: () => {
      const { t } = useTranslation()
      return <div className="whitespace-nowrap">{t("bookings.table.header.treatment")}</div>
    },
    cell: ({ row }) => {
      const { t } = useTranslation()
      const booking = row.original
      const treatment = booking.treatmentId
      const duration =
        booking.treatmentId?.durations?.find((d) => d._id.toString() === booking.selectedDurationId?.toString())
          ?.minutes ||
        booking.treatmentId?.selectedDuration?.minutes ||
        booking.treatmentId?.defaultDurationMinutes
      return (
        <div className="flex flex-col">
          <span className="font-medium">{treatment?.name || t("common.notAvailable")}</span>
          {duration && (
            <span className="text-xs text-muted-foreground">{t("memberBookings.duration", { minutes: duration })}</span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "bookingDateTime",
    header: ({ column }) => {
      const { t } = useTranslation()
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          {t("bookings.table.header.dateTime")}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const { locale } = useTranslation()
      const date = new Date(row.getValue("bookingDateTime"))
      return (
        <div className="flex flex-col whitespace-nowrap">
          <span>{formatDate(date, locale)}</span>
          <span className="text-sm text-muted-foreground">
            {date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: "professional",
    header: () => {
      const { t } = useTranslation()
      return <div className="whitespace-nowrap">{t("bookings.table.header.professional")}</div>
    },
    cell: ({ row }) => {
      const { t } = useTranslation()
      return <div>{row.original.professionalId?.name || t("bookings.toBeAssigned")}</div>
    },
  },
  {
    accessorKey: "status",
    header: () => {
      const { t } = useTranslation()
      return <div className="whitespace-nowrap">{t("bookings.table.header.status")}</div>
    },
    cell: ({ row }) => <BookingStatus status={row.original.status} />,
  },
  {
    accessorKey: "priceDetails.finalAmount",
    header: ({ column }) => {
      const { t } = useTranslation()
      return (
        <div className="text-right">
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            {t("bookings.table.header.total")}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )
    },
    cell: ({ row }) => {
      const { t, locale } = useTranslation()
      const amount = Number.parseFloat(row.getValue("priceDetails_finalAmount"))
      const formatted = formatCurrency(amount, t("common.currency"), locale)
      return <div className="text-right font-medium whitespace-nowrap">{formatted}</div>
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <BookingActions booking={row.original} />,
  },
]
