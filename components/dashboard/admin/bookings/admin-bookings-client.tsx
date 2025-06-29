"use client"

import { useMemo, useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "@/lib/translations/i18n"
import { getAdminBookingColumns } from "./admin-bookings-columns"
import { DataTable } from "@/components/ui/data-table"
import { BookingsTableSkeleton } from "@/components/dashboard/member/bookings/bookings-table-skeleton"
import EnhancedBookingModal from "./enhanced-booking-modal"
import type { PopulatedBooking } from "@/types/booking"
import { Heading } from "@/components/ui/heading"
import { getAllBookings } from "@/actions/booking-actions"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, RefreshCw, Filter, X, Plus } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"

/**
 * Admin Bookings Client Component
 * Displays all bookings in the system with admin controls
 */
export default function AdminBookingsClient() {
  const { t, language, dir } = useTranslation()
  
  // Search and filters state
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [professionalFilter, setProfessionalFilter] = useState<string>("all")
  const [treatmentFilter, setTreatmentFilter] = useState<string>("all")
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("all")
  const [priceRangeFilter, setPriceRangeFilter] = useState<string>("all")
  const [addressFilter, setAddressFilter] = useState<string>("all")
  
  // UI state
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedBooking, setSelectedBooking] = useState<PopulatedBooking | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // Debounce search term for real-time searching
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm, statusFilter, professionalFilter, treatmentFilter, dateRangeFilter, priceRangeFilter, addressFilter])

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<
    { bookings: PopulatedBooking[]; totalPages: number; totalBookings: number },
    Error
  >({
    queryKey: ["adminBookings", language, debouncedSearchTerm, statusFilter, professionalFilter, treatmentFilter, dateRangeFilter, priceRangeFilter, addressFilter, currentPage],
    queryFn: async () => {
      try {
        console.log("Fetching bookings with filters:", {
          search: debouncedSearchTerm || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
          professional: professionalFilter === "all" ? undefined : professionalFilter,
          treatment: treatmentFilter === "all" ? undefined : treatmentFilter,
          dateRange: dateRangeFilter === "all" ? undefined : dateRangeFilter,
          priceRange: priceRangeFilter === "all" ? undefined : priceRangeFilter,
          address: addressFilter === "all" ? undefined : addressFilter,
          page: currentPage,
          limit: 20,
        })

        const result = await getAllBookings({
          search: debouncedSearchTerm || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
          professional: professionalFilter === "all" ? undefined : professionalFilter,
          treatment: treatmentFilter === "all" ? undefined : treatmentFilter,
          dateRange: dateRangeFilter === "all" ? undefined : dateRangeFilter,
          priceRange: priceRangeFilter === "all" ? undefined : priceRangeFilter,
          address: addressFilter === "all" ? undefined : addressFilter,
          page: currentPage,
          limit: 20,
          sortBy: "createdAt",
          sortDirection: "desc",
        })

        // TODO: Remove debug log

        return result
      } catch (error) {
        console.error("Error in getAllBookings query:", error)
        throw error
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 30000, // 30 seconds
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  })

  const handleRowClick = (booking: PopulatedBooking) => {
    // Navigate to the booking edit page instead of opening modal
    window.location.href = `/dashboard/admin/bookings/${booking._id}`
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setSelectedBooking(null)
  }

  const handleCreateNewBooking = () => {
    window.location.href = "/dashboard/admin/bookings/new"
  }

  const columns = useMemo(() => getAdminBookingColumns(t, language, handleRowClick), [t, language, handleRowClick])

  const handleRefresh = () => {
    refetch()
  }

  const clearAllFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setProfessionalFilter("all")
    setTreatmentFilter("all")
    setDateRangeFilter("all")
    setPriceRangeFilter("all")
    setAddressFilter("all")
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (statusFilter !== "all") count++
    if (professionalFilter !== "all") count++
    if (treatmentFilter !== "all") count++
    if (dateRangeFilter !== "all") count++
    if (priceRangeFilter !== "all") count++
    if (addressFilter !== "all") count++
    return count
  }

  const activeFiltersCount = getActiveFiltersCount()

  if (isLoading) {
    return (
      <div className="w-full max-w-full overflow-hidden">
        <div className="mb-6 text-center md:text-right">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{t("adminBookings.title")}</h2>
        </div>
        <BookingsTableSkeleton />
        <p className="mt-4 text-center text-muted-foreground">{t("common.loading")}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full max-w-full overflow-hidden">
        <div className="mb-6 text-center md:text-right">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{t("adminBookings.title")}</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-destructive">{t("common.error")}: {error.message}</p>
          <Button onClick={handleRefresh} className="mt-4">
            {t("common.tryAgain")}
          </Button>
        </div>
      </div>
    )
  }

  const totalBookings = data?.totalBookings || 0
  const totalPages = data?.totalPages || 1

  return (
    <div className="w-full max-w-full overflow-hidden" dir={dir}>
      {/* Header with Create Button */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{t("adminBookings.title")}</h2>
          <p className="text-muted-foreground">
            ניהול כל ההזמנות במערכת - סה"כ {totalBookings} הזמנות
          </p>
        </div>
        <Button 
          onClick={handleCreateNewBooking}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          הזמנה חדשה
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder={t("adminBookings.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t("adminBookings.filterByStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="pending_payment">ממתין לתשלום</SelectItem>
                <SelectItem value="in_process">בטיפול</SelectItem>
                <SelectItem value="confirmed">מאושר</SelectItem>
                <SelectItem value="completed">הושלם</SelectItem>
                <SelectItem value="cancelled">בוטל</SelectItem>
                <SelectItem value="refunded">הוחזר</SelectItem>
              </SelectContent>
            </Select>

            <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="relative">
                  <Filter className="w-4 h-4 mr-2" />
                  {t("common.filters")}
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">{t("common.advancedFilters")}</h4>
                    {activeFiltersCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                        <X className="w-4 h-4 mr-1" />
                        {t("common.clearAll")}
                      </Button>
                    )}
                  </div>
                  <Separator />
                  
                  {/* Additional filter controls would go here */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">{t("adminBookings.filterByProfessional")}</label>
                      <Select value={professionalFilter} onValueChange={setProfessionalFilter}>
                        <SelectTrigger className="w-full mt-1">
                          <SelectValue placeholder={t("common.selectProfessional")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("common.all")}</SelectItem>
                          <SelectItem value="assigned">משויך למטפל</SelectItem>
                          <SelectItem value="unassigned">לא משויך למטפל</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <DataTable
          columns={columns}
          data={data?.bookings || []}
          searchKey="bookingNumber"
          onRowClick={handleRowClick}
        />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            {t("common.pagination.showing")} {((currentPage - 1) * 20) + 1} - {Math.min(currentPage * 20, totalBookings)} {t("common.pagination.of")} {totalBookings}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              {t("common.pagination.first")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              {t("common.pagination.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === data?.totalPages}
            >
              {t("common.pagination.next")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(data?.totalPages || 1)}
              disabled={currentPage === data?.totalPages}
            >
              {t("common.pagination.last")}
            </Button>
          </div>
        </div>
      )}

      {/* Keep the old modal for backward compatibility, but it won't be used anymore */}
      <EnhancedBookingModal
        booking={selectedBooking}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        t={t}
      />
    </div>
  )
} 
