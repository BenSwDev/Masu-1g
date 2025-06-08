"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "@/lib/translations/i18n"
import { getAdminBookingColumns } from "./admin-bookings-columns"
import { DataTable } from "@/components/common/ui/data-table"
import { BookingsTableSkeleton } from "@/components/dashboard/member/bookings/bookings-table-skeleton"
import ComprehensiveBookingEditModal from "./comprehensive-booking-edit-modal"
import type { PopulatedBooking } from "@/types/booking"
import { Heading } from "@/components/common/ui/heading"
import { getAllBookings } from "@/actions/booking-actions"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, RefreshCw } from "lucide-react"

/**
 * Admin Bookings Client Component
 * Displays all bookings in the system with admin controls
 */
export default function AdminBookingsClient() {
  const { t, language, dir } = useTranslation()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedBooking, setSelectedBooking] = useState<PopulatedBooking | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<
    { bookings: PopulatedBooking[]; totalPages: number; totalBookings: number },
    Error
  >({
    queryKey: ["adminBookings", language, searchTerm, statusFilter, currentPage],
    queryFn: () =>
      getAllBookings({
        search: searchTerm || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        page: currentPage,
        limit: 20,
      }),
  })

  const handleRowClick = (booking: PopulatedBooking) => {
    setSelectedBooking(booking)
    setIsEditModalOpen(true)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setSelectedBooking(null)
  }

  const columns = useMemo(() => getAdminBookingColumns(t, language, handleRowClick), [t, language])

  const handleSearch = () => {
    setCurrentPage(1)
    refetch()
  }

  const handleRefresh = () => {
    refetch()
  }

  if (isLoading) {
    return (
      <div>
        <Heading as="h2" size="xl" className="mb-6 text-center md:text-right">
          {t("adminBookings.title")}
        </Heading>
        <BookingsTableSkeleton />
        <p className="mt-4 text-center text-muted-foreground">{t("common.loading")}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-500">
        <Heading as="h2" size="xl" className="mb-6 text-center md:text-right">
          {t("adminBookings.title")}
        </Heading>
        <p>
          {t("common.error")}: {error.message}
        </p>
      </div>
    )
  }

  if (!data?.bookings || data.bookings.length === 0) {
    return (
      <div>
        <Heading as="h2" size="xl" className="mb-6 text-center md:text-right">
          {t("adminBookings.title")}
        </Heading>
        
        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("adminBookings.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} variant="outline" size="sm">
              {t("common.search")}
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("adminBookings.filterByStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("adminBookings.allStatuses")}</SelectItem>
                <SelectItem value="pending_professional_assignment">
                  {t("adminBookings.status.pendingAssignment")}
                </SelectItem>
                <SelectItem value="confirmed">{t("adminBookings.status.confirmed")}</SelectItem>
                <SelectItem value="professional_en_route">{t("adminBookings.status.enRoute")}</SelectItem>
                <SelectItem value="completed">{t("adminBookings.status.completed")}</SelectItem>
                <SelectItem value="cancelled_by_user">{t("adminBookings.status.cancelledByUser")}</SelectItem>
                <SelectItem value="cancelled_by_admin">{t("adminBookings.status.cancelledByAdmin")}</SelectItem>
                <SelectItem value="no_show">{t("adminBookings.status.noShow")}</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <p className="text-center text-muted-foreground">{t("adminBookings.noBookings")}</p>
      </div>
    )
  }

  return (
    <div dir={dir}>
      <Heading as="h2" size="xl" className="mb-6 text-center md:text-right">
        {t("adminBookings.title")}
      </Heading>
      
      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("adminBookings.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch} variant="outline" size="sm">
            {t("common.search")}
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("adminBookings.filterByStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("adminBookings.allStatuses")}</SelectItem>
              <SelectItem value="pending_professional_assignment">
                {t("adminBookings.status.pendingAssignment")}
              </SelectItem>
              <SelectItem value="confirmed">{t("adminBookings.status.confirmed")}</SelectItem>
              <SelectItem value="professional_en_route">{t("adminBookings.status.enRoute")}</SelectItem>
              <SelectItem value="completed">{t("adminBookings.status.completed")}</SelectItem>
              <SelectItem value="cancelled_by_user">{t("adminBookings.status.cancelledByUser")}</SelectItem>
              <SelectItem value="cancelled_by_admin">{t("adminBookings.status.cancelledByAdmin")}</SelectItem>
              <SelectItem value="no_show">{t("adminBookings.status.noShow")}</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-4 text-sm text-muted-foreground">
        {t("adminBookings.summary", { 
          total: data.totalBookings,
          showing: data.bookings.length 
        })}
      </div>

      {/* Helpful instruction for clicking rows */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800 text-center">
          💡 {t("adminBookings.clickRowToEdit")}
        </p>
      </div>

      <DataTable 
        columns={columns} 
        data={data.bookings}
        onRowClick={handleRowClick}
      />
      
      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            variant="outline"
            size="sm"
          >
            {t("common.previous")}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t("common.pageOf", { current: currentPage, total: data.totalPages })}
          </span>
          <Button
            onClick={() => setCurrentPage(prev => Math.min(data.totalPages, prev + 1))}
            disabled={currentPage === data.totalPages}
            variant="outline"
            size="sm"
          >
            {t("common.next")}
          </Button>
        </div>
      )}

      {/* Comprehensive Booking Edit Modal */}
      <ComprehensiveBookingEditModal
        booking={selectedBooking}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        t={t}
      />
    </div>
  )
} 