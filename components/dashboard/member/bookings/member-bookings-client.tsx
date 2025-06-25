"use client"

import { useMemo, useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "@/lib/translations/i18n"
import { getBookingColumns } from "./bookings-columns"
import { DataTable } from "@/components/common/ui/data-table"
import { BookingsTableSkeleton } from "./bookings-table-skeleton"
import type { PopulatedBooking } from "@/types/booking"
import { Heading } from "@/components/common/ui/heading"
import { getUserBookings } from "@/actions/booking-actions"
import { Input } from "@/components/common/ui/input"
import { Button } from "@/components/common/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Search, RefreshCw, Filter, X } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import { Badge } from "@/components/common/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/common/ui/popover"
import { Separator } from "@/components/common/ui/separator"

/**
 * @file MemberBookingsClient.tsx
 * @description Client component for displaying member bookings.
 * Handles data fetching, state management, and rendering of the bookings table.
 * It uses `useTranslation` for internationalization and `getBookingColumns`
 * to define the table structure. It fetches bookings using the `getUserBookings` server action.
 *
 * @module components/dashboard/member/bookings/member-bookings-client
 *
 * @param {object} props - The component's props.
 * @param {string} props.userId - The ID of the current user to fetch bookings for.
 *
 * @example
 * <MemberBookingsClient userId="user123" />
 */
export default function MemberBookingsClient({ userId }: { userId: string }) {
  const { t, language, dir } = useTranslation()

  // Search and filters state
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [treatmentFilter, setTreatmentFilter] = useState<string>("all")
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("all")
  
  // UI state
  const [currentPage, setCurrentPage] = useState(1)
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // Debounce search term for real-time searching
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm, statusFilter, treatmentFilter, dateRangeFilter])

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<
    { bookings: PopulatedBooking[]; totalPages: number; totalBookings: number },
    Error
  >({
    queryKey: ["memberBookings", userId, language, debouncedSearchTerm, statusFilter, treatmentFilter, dateRangeFilter, currentPage],
    queryFn: () => getUserBookings(userId, {
      search: debouncedSearchTerm || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      treatment: treatmentFilter === "all" ? undefined : treatmentFilter,
      dateRange: dateRangeFilter === "all" ? undefined : dateRangeFilter,
      page: currentPage,
      limit: 20, // Increased from 5 to 20 bookings per page
    }),
    refetchOnWindowFocus: false,
    staleTime: 30000, // 30 seconds
  })

  const columns = useMemo(() => getBookingColumns(t, language), [t, language])

  const handleRefresh = () => {
    refetch()
  }

  const clearAllFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setTreatmentFilter("all")
    setDateRangeFilter("all")
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (statusFilter !== "all") count++
    if (treatmentFilter !== "all") count++
    if (dateRangeFilter !== "all") count++
    return count
  }

  const activeFiltersCount = getActiveFiltersCount()

  if (isLoading) {
    return (
      <div className="w-full max-w-full overflow-hidden">
        <div className="mb-6 text-center md:text-right">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{t("memberBookings.client.title")}</h2>
        </div>
        <BookingsTableSkeleton />
        <p className="mt-4 text-center text-muted-foreground">{t("memberBookings.client.loading")}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-500 w-full max-w-full overflow-hidden">
        <div className="mb-6 text-center md:text-right">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{t("memberBookings.client.title")}</h2>
        </div>
        <p>
          {t("memberBookings.client.error")}: {error.message}
        </p>
      </div>
    )
  }

  if (!data?.bookings || data.bookings.length === 0) {
    return (
      <div className="w-full max-w-full overflow-hidden">
        <div className="mb-6 text-center md:text-right">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{t("memberBookings.client.title")}</h2>
        </div>
        <p className="text-center text-muted-foreground">{t("memberBookings.client.noBookings")}</p>
      </div>
    )
  }

  return (
    <div dir={dir} className="h-full flex flex-col space-y-4">
      <div className="flex-shrink-0">
        <div className="mb-6 text-center md:text-right">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{t("memberBookings.client.title")}</h2>
        </div>
        
        {/* Search and Filters Bar - Responsive */}
        <div className="space-y-4">
          {/* Main search bar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-full sm:max-w-md">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("memberBookings.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full"
              />
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t("common.refresh")}
              </Button>
              
              <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    {t("memberBookings.filters")}
                    {activeFiltersCount > 0 && (
                      <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{t("memberBookings.advancedFilters")}</h4>
                      {activeFiltersCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                          <X className="h-4 w-4 mr-1" />
                          {t("common.clearAll")}
                        </Button>
                      )}
                    </div>
                    
                    <Separator />
                    
                    {/* Status Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t("memberBookings.filterByStatus")}</label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("memberBookings.allStatuses")}</SelectItem>
                          <SelectItem value="pending_payment">ממתין לתשלום</SelectItem>
                          <SelectItem value="confirmed">מאושר</SelectItem>
                          <SelectItem value="completed">הושלם</SelectItem>
                          <SelectItem value="cancelled">בוטל</SelectItem>
                          <SelectItem value="refunded">הוחזר</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Treatment Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t("memberBookings.filterByTreatment")}</label>
                      <Select value={treatmentFilter} onValueChange={setTreatmentFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("memberBookings.allTreatments")}</SelectItem>
                          {/* Add specific treatments when available */}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date Range Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t("memberBookings.filterByDate")}</label>
                      <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("memberBookings.allDates")}</SelectItem>
                          <SelectItem value="today">{t("memberBookings.today")}</SelectItem>
                          <SelectItem value="this_week">{t("memberBookings.thisWeek")}</SelectItem>
                          <SelectItem value="this_month">{t("memberBookings.thisMonth")}</SelectItem>
                          <SelectItem value="last_month">{t("memberBookings.lastMonth")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Responsive Table Container */}
        <div className="flex-1 min-h-0 overflow-hidden rounded-lg border bg-white">
          <div className="h-full overflow-auto">
            <DataTable
              columns={columns}
              data={data?.bookings || []}
              hideDefaultPagination={true}
              hideColumnsSelector={true}
            />
          </div>
        </div>
      </div>
      
      {/* Pagination and Footer - Fixed at Bottom */}
      {data && data.totalPages > 1 && (
        <div className="flex-shrink-0 flex items-center justify-between border-t pt-4 bg-white">
          <div className="text-sm text-muted-foreground">
            {t("memberBookings.showingPage")} - {t("common.page")}: {currentPage}, {t("common.totalPages")}: {data.totalPages}, {t("common.totalBookings")}: {data.totalBookings}
          </div>
          
          <div className="flex items-center space-x-2">
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
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                const page = Math.max(1, currentPage - 2) + i
                if (page > data.totalPages) return null
                
                return (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                )
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === data.totalPages}
            >
              {t("common.pagination.next")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(data.totalPages)}
              disabled={currentPage === data.totalPages}
            >
              {t("common.pagination.last")}
            </Button>
          </div>
        </div>
      )}

      {data && data.totalBookings > 0 && (
        <div className="mt-4 text-sm text-muted-foreground text-center">
          {t("memberBookings.totalBookings")}: {data.totalBookings}
        </div>
      )}
    </div>
  )
}
