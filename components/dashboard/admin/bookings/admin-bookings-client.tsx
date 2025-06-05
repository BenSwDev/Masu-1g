"use client"

import { Skeleton } from "@/components/ui/skeleton"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useTranslation } from "@/lib/translations/i18n"
import type { AdminPopulatedBooking } from "@/types/booking"
import { getAdminBookings, getProfessionalsForAssignment } from "@/actions/booking-actions"
import type { IUser } from "@/lib/db/models/user"
import { DataTable } from "@/components/common/ui/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/common/ui/button"
import { Checkbox } from "@/components/common/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/common/ui/dropdown-menu"
import { MoreHorizontal, Eye, Filter } from "lucide-react"
import { format } from "date-fns"
import { Badge } from "@/components/common/ui/badge"
import AdminBookingDetailsModal from "./admin-booking-details-modal"
import { toast } from "@/components/common/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Input } from "@/components/common/ui/input"
import { DatePicker } from "@/components/common/ui/date-picker" // Assuming you have a DatePicker component

interface AdminBookingsClientProps {
  initialBookings: AdminPopulatedBooking[]
  initialTotalPages: number
  initialTotalBookings: number
  errorLoadingBookings?: string
}

export default function AdminBookingsClient({
  initialBookings,
  initialTotalPages,
  initialTotalBookings,
  errorLoadingBookings,
}: AdminBookingsClientProps) {
  const { t, language } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [bookings, setBookings] = useState<AdminPopulatedBooking[]>(initialBookings)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [totalBookings, setTotalBookings] = useState(initialTotalBookings)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(errorLoadingBookings || null)

  const [selectedBooking, setSelectedBooking] = useState<AdminPopulatedBooking | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [professionals, setProfessionals] = useState<IUser[]>([])

  // Filters State
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all")
  const [userFilter, setUserFilter] = useState(searchParams.get("userId") || "")
  const [professionalFilter, setProfessionalFilter] = useState(searchParams.get("professionalId") || "")
  const [dateFromFilter, setDateFromFilter] = useState<Date | undefined>(
    searchParams.get("dateFrom") ? new Date(searchParams.get("dateFrom")!) : undefined,
  )
  const [dateToFilter, setDateToFilter] = useState<Date | undefined>(
    searchParams.get("dateTo") ? new Date(searchParams.get("dateTo")!) : undefined,
  )
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get("page")) || 1)

  const fetchBookings = async (page = 1, filters?: any) => {
    setLoading(true)
    setError(null)
    try {
      const queryParams = new URLSearchParams()
      queryParams.set("page", page.toString())
      queryParams.set("limit", "10") // Or make this configurable
      if (filters?.status && filters.status !== "all") queryParams.set("status", filters.status)
      if (filters?.userId) queryParams.set("userId", filters.userId)
      if (filters?.professionalId) queryParams.set("professionalId", filters.professionalId)
      if (filters?.dateFrom) queryParams.set("dateFrom", format(filters.dateFrom, "yyyy-MM-dd"))
      if (filters?.dateTo) queryParams.set("dateTo", format(filters.dateTo, "yyyy-MM-dd"))

      router.push(`${pathname}?${queryParams.toString()}`, { scroll: false })

      const result = await getAdminBookings({
        page,
        limit: 10,
        status: filters?.status,
        userId: filters?.userId,
        professionalId: filters?.professionalId,
        dateFrom: filters?.dateFrom ? format(filters.dateFrom, "yyyy-MM-dd") : undefined,
        dateTo: filters?.dateTo ? format(filters.dateTo, "yyyy-MM-dd") : undefined,
      })
      if (result.error) {
        throw new Error(result.error)
      }
      setBookings(result.bookings || [])
      setTotalPages(result.totalPages || 0)
      setTotalBookings(result.totalBookings || 0)
      setCurrentPage(page)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "unknownError"
      setError(t(`bookings.errors.${errorMessage}`, errorMessage))
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t(`bookings.errors.${errorMessage}`, errorMessage),
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Fetch professionals for assignment dropdown
    const fetchProfs = async () => {
      const result = await getProfessionalsForAssignment()
      if (result.success && result.professionals) {
        setProfessionals(result.professionals)
      } else {
        toast({
          variant: "destructive",
          title: t("common.error"),
          description: t(result.error || "professionals.errors.fetchFailed"),
        })
      }
    }
    fetchProfs()
  }, [t])

  useEffect(() => {
    // Initial fetch or fetch when searchParams change (e.g. browser back/forward)
    const pageFromUrl = Number(searchParams.get("page")) || 1
    const statusFromUrl = searchParams.get("status") || "all"
    const userIdFromUrl = searchParams.get("userId") || ""
    const profIdFromUrl = searchParams.get("professionalId") || ""
    const dateFromUrl = searchParams.get("dateFrom")
    const dateToUrl = searchParams.get("dateTo")

    // Update local state from URL to keep filters in sync
    setStatusFilter(statusFromUrl)
    setUserFilter(userIdFromUrl)
    setProfessionalFilter(profIdFromUrl)
    setDateFromFilter(dateFromUrl ? new Date(dateFromUrl) : undefined)
    setDateToFilter(dateToUrl ? new Date(dateToUrl) : undefined)

    fetchBookings(pageFromUrl, {
      status: statusFromUrl,
      userId: userIdFromUrl,
      professionalId: profIdFromUrl,
      dateFrom: dateFromUrl ? new Date(dateFromUrl) : undefined,
      dateTo: dateToUrl ? new Date(dateToUrl) : undefined,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, pathname]) // Rerun when URL search params change

  const handleApplyFilters = () => {
    fetchBookings(1, {
      // Reset to page 1 on new filter application
      status: statusFilter,
      userId: userFilter,
      professionalId: professionalFilter,
      dateFrom: dateFromFilter,
      dateTo: dateToFilter,
    })
  }

  const handleOpenModal = (booking: AdminPopulatedBooking) => {
    setSelectedBooking(booking)
    setIsModalOpen(true)
  }

  const handleCloseModal = (refresh?: boolean) => {
    setIsModalOpen(false)
    setSelectedBooking(null)
    if (refresh) {
      fetchBookings(currentPage, {
        status: statusFilter,
        userId: userFilter,
        professionalId: professionalFilter,
        dateFrom: dateFromFilter,
        dateTo: dateToFilter,
      })
    }
  }

  const columns: ColumnDef<AdminPopulatedBooking>[] = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label={t("dataTable.selectAll")}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label={t("dataTable.selectRow")}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "_id",
        header: t("adminBookingsPage.table.bookingId"),
        cell: ({ row }) => <span className="truncate w-20 inline-block">{row.original._id.toString()}</span>,
      },
      {
        accessorKey: "userId.name",
        header: t("adminBookingsPage.table.clientName"),
        cell: ({ row }) => row.original.userId?.name || t("common.notAvailable"),
      },
      {
        accessorKey: "treatmentId.name",
        header: t("adminBookingsPage.table.treatment"),
        cell: ({ row }) => row.original.treatmentId?.name || t("common.notAvailable"),
      },
      {
        accessorKey: "bookingDateTime",
        header: t("adminBookingsPage.table.dateTime"),
        cell: ({ row }) =>
          format(new Date(row.original.bookingDateTime), "PPpp", {
            locale: language === "he" ? require("date-fns/locale/he") : require("date-fns/locale/en-US"),
          }),
      },
      {
        accessorKey: "status",
        header: t("adminBookingsPage.table.status"),
        cell: ({ row }) => (
          <Badge variant={row.original.status.startsWith("cancelled") ? "destructive" : "default"}>
            {t(`bookingStatuses.${row.original.status}`, row.original.status)}
          </Badge>
        ),
      },
      {
        accessorKey: "professionalId.name",
        header: t("adminBookingsPage.table.professional"),
        cell: ({ row }) => row.original.professionalId?.name || t("common.unassigned"),
      },
      {
        accessorKey: "priceDetails.finalAmount",
        header: t("adminBookingsPage.table.finalPrice"),
        cell: ({ row }) => `${row.original.priceDetails.finalAmount.toFixed(2)} ${t("common.currencySymbol")}`,
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const booking = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">{t("common.openMenu")}</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t("common.actions")}</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleOpenModal(booking)}>
                  <Eye className="mr-2 h-4 w-4" /> {t("common.viewEdit")}
                </DropdownMenuItem>
                {/* Add more actions like quick assign, quick cancel if needed */}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [t, language],
  )

  if (error && !loading && bookings.length === 0) {
    // Show error prominently if initial load failed and no data
    return <div className="text-red-500 text-center p-8">{error}</div>
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 p-4 border rounded-md">
        <div>
          <label htmlFor="statusFilter" className="text-sm font-medium">
            {t("adminBookingsPage.filters.status")}
          </label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger id="statusFilter">
              <SelectValue placeholder={t("adminBookingsPage.filters.selectStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("adminBookingsPage.filters.allStatuses")}</SelectItem>
              <SelectItem value="pending_professional_assignment">
                {t("bookingStatuses.pending_professional_assignment")}
              </SelectItem>
              <SelectItem value="confirmed">{t("bookingStatuses.confirmed")}</SelectItem>
              <SelectItem value="professional_en_route">{t("bookingStatuses.professional_en_route")}</SelectItem>
              <SelectItem value="completed">{t("bookingStatuses.completed")}</SelectItem>
              <SelectItem value="cancelled_by_user">{t("bookingStatuses.cancelled_by_user")}</SelectItem>
              <SelectItem value="cancelled_by_admin">{t("bookingStatuses.cancelled_by_admin")}</SelectItem>
              <SelectItem value="no_show">{t("bookingStatuses.no_show")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor="userFilter" className="text-sm font-medium">
            {t("adminBookingsPage.filters.userId")}
          </label>
          <Input
            id="userFilter"
            placeholder={t("adminBookingsPage.filters.enterUserId")}
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="professionalFilter" className="text-sm font-medium">
            {t("adminBookingsPage.filters.professionalId")}
          </label>
          <Input
            id="professionalFilter"
            placeholder={t("adminBookingsPage.filters.enterProfessionalId")}
            value={professionalFilter}
            onChange={(e) => setProfessionalFilter(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="dateFromFilter" className="text-sm font-medium">
            {t("adminBookingsPage.filters.dateFrom")}
          </label>
          <DatePicker date={dateFromFilter} setDate={setDateFromFilter} />
        </div>
        <div>
          <label htmlFor="dateToFilter" className="text-sm font-medium">
            {t("adminBookingsPage.filters.dateTo")}
          </label>
          <DatePicker date={dateToFilter} setDate={setDateToFilter} />
        </div>
        <div className="col-span-full md:col-span-1 lg:col-span-1 flex items-end">
          <Button onClick={handleApplyFilters} disabled={loading} className="w-full">
            <Filter className="mr-2 h-4 w-4" /> {t("adminBookingsPage.filters.apply")}
          </Button>
        </div>
      </div>

      {loading && bookings.length === 0 ? ( // Show skeleton only if loading and no data yet
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : error && bookings.length === 0 ? ( // This case is handled above, but good for clarity
        <p className="text-red-500 text-center">{error}</p>
      ) : !loading && bookings.length === 0 ? (
        <p className="text-center py-4">{t("adminBookingsPage.noBookingsFound")}</p>
      ) : (
        <DataTable
          columns={columns}
          data={bookings}
          loading={loading}
          pagination={{
            currentPage,
            totalPages,
            totalItems: totalBookings,
            onPageChange: (page) =>
              fetchBookings(page, {
                status: statusFilter,
                userId: userFilter,
                professionalId: professionalFilter,
                dateFrom: dateFromFilter,
                dateTo: dateToFilter,
              }),
          }}
          search={
            {
              // Basic search can be added here if needed, or use specific filters above
              // placeholder: t("adminBookingsPage.searchPlaceholder"),
              // onSearchChange: (value) => { /* implement search logic */ }
            }
          }
        />
      )}

      {selectedBooking && (
        <AdminBookingDetailsModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          booking={selectedBooking}
          professionals={professionals}
        />
      )}
    </div>
  )
}
