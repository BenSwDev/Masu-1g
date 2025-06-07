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
} from "lucide-react"

import type { PopulatedBooking, ITreatmentDuration } from "@/types/booking" // Updated import path
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

// Helper component for actions
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
    new Date(booking.bookingDateTime) > new Date(Date.now() + 2 * 60 * 60 * 1000) // Example: cancellable if more than 2 hours in future

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
          <DropdownMenuContent align="end" className="bg-card border shadow-lg rounded-md">
            <DropdownMenuLabel>{t("common.actions")}</DropdownMenuLabel>
            <DrawerTrigger asChild>
              <DropdownMenuItem className="flex items-center hover:bg-muted/50">
                <Eye className="mr-2 h-4 w-4 text-primary" />
                {t("memberBookings.viewDetailsButton")}
              </DropdownMenuItem>
            </DrawerTrigger>
            {isCancellable && (
              <>
                <DropdownMenuSeparator />
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem className="flex items-center text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive">
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

      <DrawerContent className="max-h-[90vh] bg-card">
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
const BookingStatusBadge = ({ status }: { status: PopulatedBooking["status"] }) => {
  const { t } = useTranslation()
  const getStatusInfo = (statusKey: PopulatedBooking["status"]) => {
    switch (statusKey) {
      case "pending_professional_assignment":
        return {
          label: t("memberBookings.status.pending_professional_assignment_short", "Pending Assign."),
          icon: <Hourglass className="mr-1.5 h-3.5 w-3.5 text-amber-600" />,
          badgeClass: "bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200",
        }
      case "confirmed":
        return {
          label: t("memberBookings.status.confirmed_short", "Confirmed"),
          icon: <CheckCircle className="mr-1.5 h-3.5 w-3.5 text-green-600" />,
          badgeClass: "bg-green-100 text-green-700 border-green-300 hover:bg-green-200",
        }
      case "professional_en_route":
        return {
          label: t("memberBookings.status.professional_en_route_short", "En Route"),
          icon: <UserCheck className="mr-1.5 h-3.5 w-3.5 text-blue-600" />,
          badgeClass: "bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200",
        }
      case "completed":
        return {
          label: t("memberBookings.status.completed_short", "Completed"),
          icon: <CheckCircle className="mr-1.5 h-3.5 w-3.5 text-sky-600" />,
          badgeClass: "bg-sky-100 text-sky-700 border-sky-300 hover:bg-sky-200",
        }
      case "cancelled_by_user":
      case "cancelled_by_admin":
        return {
          label: t(`memberBookings.status.${statusKey}_short`, "Cancelled"),
          icon: <XCircle className="mr-1.5 h-3.5 w-3.5 text-red-600" />,
          badgeClass: "bg-red-100 text-red-700 border-red-300 hover:bg-red-200",
        }
      case "no_show":
        return {
          label: t("memberBookings.status.no_show_short", "No Show"),
          icon: <UserX className="mr-1.5 h-3.5 w-3.5 text-orange-600" />,
          badgeClass: "bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200",
        }
      default:
        return {
          label: t(`memberBookings.status.${statusKey}_short`, statusKey) || statusKey,
          icon: <Info className="mr-1.5 h-3.5 w-3.5 text-gray-600" />,
          badgeClass: "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200",
        }
    }
  }
  const statusInfo = getStatusInfo(status)
  return (
    <Badge variant="outline" className={cn("text-xs font-medium whitespace-nowrap py-1 px-2", statusInfo.badgeClass)}>
      {statusInfo.icon}
      {statusInfo.label}
    </Badge>
  )
}

const BookingSourceIcon = ({ source }: { source: PopulatedBooking["source"] }) => {
  const { t } = useTranslation()
  switch (source) {
    case "subscription_redemption":
      return <Ticket className="h-4 w-4 text-purple-600" title={t("bookings.source.subscription")} />
    case "gift_voucher_redemption":
      return <Gift className="h-4 w-4 text-pink-600" title={t("bookings.source.giftVoucher")} />
    case "new_purchase":
    default:
      return <ShoppingBag className="h-4 w-4 text-teal-600" title={t("bookings.source.newPurchase")} />
  }
}

export const getBookingColumns = (
  t: (key: string, options?: any) => string,
  locale: string,
): ColumnDef<PopulatedBooking>[] => {
  return [
    {
      accessorKey: "bookingNumber",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="px-1 hover:bg-muted/50"
          >
            {t("bookings.table.header.bookingId")}
            <ArrowUpDown className="ms-2 h-3.5 w-3.5" />
          </Button>
        )
      },
      cell: ({ row }) => <div className="font-mono text-xs">#{row.original.bookingNumber}</div>,
      size: 120,
    },
    {
      accessorKey: "treatmentDetails", // This accessor might need adjustment if treatmentId is an object
      header: () => {
        return <div className="whitespace-nowrap">{t("bookings.table.header.treatmentDetails")}</div>
      },
      cell: ({ row }) => {
        const booking = row.original
        const treatment = booking.treatmentId // Now PopulatedBookingTreatment | null
        let durationDisplay = ""
        if (treatment?.pricingType === "duration_based" && booking.selectedDurationId && treatment.durations) {
          // Ensure selectedDurationId (string) is compared correctly with ITreatmentDuration._id (Types.ObjectId)
          const selectedDuration = treatment.durations.find(
            (d: ITreatmentDuration) => d._id?.toString() === booking.selectedDurationId?.toString(),
          )
          if (selectedDuration) {
            durationDisplay = `${selectedDuration.minutes} ${t("common.minutes_short", "min")}`
          }
        } else if (treatment?.pricingType === "fixed" && treatment.defaultDurationMinutes) {
          durationDisplay = `${treatment.defaultDurationMinutes} ${t("common.minutes_short", "min")}`
        }

        return (
          <div className="flex flex-col">
            <span className="font-medium text-sm truncate max-w-[200px] group-hover:max-w-none">
              {treatment?.name || t("common.unknownTreatment")}
            </span>
            {durationDisplay && <span className="text-xs text-muted-foreground">{durationDisplay}</span>}
            {booking.recipientName && booking.recipientName !== booking.bookedByUserName && (
              <span className="text-xs text-primary flex items-center mt-0.5">
                <Users className="h-3 w-3 mr-1" />
                {t("bookings.table.forRecipient", { name: booking.recipientName })}
              </span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "bookingDateTime",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="px-1 hover:bg-muted/50"
          >
            {t("bookings.table.header.dateTime")}
            <ArrowUpDown className="ms-2 h-3.5 w-3.5" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const booking = row.original
        const date = new Date(booking.bookingDateTime)
        return (
          <div className="flex flex-col text-sm whitespace-nowrap">
            <div className="flex items-center">
              <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              {formatDate(date, locale)}
            </div>
            <div className="flex items-center text-muted-foreground">
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              {new Date(booking.bookingDateTime).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
            </div>
            {booking.isFlexibleTime && (
              <Badge
                variant="outline"
                className="mt-1 text-xs py-0.5 px-1.5 border-dashed border-primary/50 text-primary/80"
              >
                {t("bookings.table.flexibleTime")}
              </Badge>
            )}
          </div>
        )
      },
      size: 180,
    },
    {
      accessorKey: "professionalId.name",
      header: () => {
        return <div className="whitespace-nowrap hidden md:table-cell">{t("bookings.table.header.professional")}</div>
      },
      cell: ({ row }) => {
        const booking = row.original
        return (
          <div className="text-sm hidden md:flex items-center">
            <Briefcase className="h-3.5 w-3.5 mr-1.5 text-muted-foreground flex-shrink-0" />
            <span className="truncate max-w-[150px]">{booking.professionalId?.name || t("bookings.toBeAssigned")}</span>
          </div>
        )
      },
      enableHiding: true,
    },
    {
      accessorKey: "bookingAddressSnapshot.city", // bookingAddressSnapshot is part of IBooking, not addressId
      header: () => {
        return <div className="whitespace-nowrap hidden lg:table-cell">{t("bookings.table.header.location")}</div>
      },
      cell: ({ row }) => {
        const booking = row.original
        return (
          <div className="text-sm hidden lg:flex items-center">
            <MapPin className="h-3.5 w-3.5 mr-1.5 text-muted-foreground flex-shrink-0" />
            <span className="truncate max-w-[150px]">
              {booking.bookingAddressSnapshot?.city || booking.customAddressDetails?.city || t("common.notAvailable")}
            </span>
          </div>
        )
      },
      enableHiding: true,
    },
    {
      accessorKey: "status",
      header: () => {
        return <div className="text-center whitespace-nowrap">{t("bookings.table.header.status")}</div>
      },
      cell: ({ row }) => (
        <div className="flex justify-center">
          <BookingStatusBadge status={row.original.status} />
        </div>
      ),
      size: 150,
    },
    {
      accessorKey: "priceDetails.finalAmount",
      header: ({ column }) => {
        return (
          <div className="text-right">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="px-1 hover:bg-muted/50"
            >
              {t("bookings.table.header.total")}
              <ArrowUpDown className="ms-2 h-3.5 w-3.5" />
            </Button>
          </div>
        )
      },
      cell: ({ row }) => {
        const booking = row.original
        const amount = booking.priceDetails.finalAmount
        const formatted = booking.priceDetails.isFullyCoveredByVoucherOrSubscription
          ? t("bookings.confirmation.gift")
          : formatCurrency(amount, t("common.currency"), locale)
        return (
          <div className="text-right font-medium text-sm whitespace-nowrap flex items-center justify-end">
            <BookingSourceIcon source={booking.source} />
            <span className="ms-1.5">{formatted}</span>
          </div>
        )
      },
      size: 130,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-center">
          <BookingActions booking={row.original} />
        </div>
      ),
      size: 60,
    },
  ]
}
