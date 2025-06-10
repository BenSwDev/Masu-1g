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
import { format } from "date-fns"
import { he, enUS, ru } from "date-fns/locale"

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
  const [selectedBooking, setSelectedBooking] = useState<PopulatedBooking | null>(null)
  const [isBookingDetailOpen, setIsBookingDetailOpen] = useState(false)

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
      limit: 5, // Limit to 5 bookings per page
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

  const handleRowClick = (booking: PopulatedBooking) => {
    setSelectedBooking(booking)
    setIsBookingDetailOpen(true)
  }

  const handleCloseBookingDetail = () => {
    setIsBookingDetailOpen(false)
    setSelectedBooking(null)
  }

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
    <div dir={dir} className="w-full max-w-full overflow-hidden space-y-4">
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
                        <SelectItem value="pending_professional_assignment">
                          {t("adminBookings.status.pendingAssignment")}
                        </SelectItem>
                        <SelectItem value="confirmed">
                          {t("adminBookings.status.confirmed")}
                        </SelectItem>
                        <SelectItem value="en_route">
                          {t("adminBookings.status.enRoute")}
                        </SelectItem>
                        <SelectItem value="completed">
                          {t("adminBookings.status.completed")}
                        </SelectItem>
                        <SelectItem value="cancelled_by_user">
                          {t("adminBookings.status.cancelledByUser")}
                        </SelectItem>
                        <SelectItem value="cancelled_by_admin">
                          {t("adminBookings.status.cancelledByAdmin")}
                        </SelectItem>
                        <SelectItem value="no_show">
                          {t("adminBookings.status.noShow")}
                        </SelectItem>
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

      {/* Responsive Table Container */}
      <div className="w-full overflow-hidden rounded-lg border bg-white">
        <div className="w-full overflow-x-auto">
          <DataTable
            columns={columns}
            data={data.bookings}
            searchPlaceholder={t("memberBookings.searchPlaceholder")}
            emptyMessage={t("memberBookings.noBookings")}
            totalPages={data?.totalPages || 1}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onRowClick={handleRowClick}
            className="min-w-full"
          />
        </div>
      </div>
      
      {data && data.totalBookings > 0 && (
        <div className="mt-4 text-sm text-muted-foreground text-center">
          {t("memberBookings.totalBookings", { count: data.totalBookings })}
        </div>
      )}

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" dir={dir}>
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg md:text-xl font-semibold">{t("memberBookings.bookingDetails")}</h3>
                <Button variant="ghost" size="sm" onClick={handleCloseBookingDetail}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t("memberBookings.bookingNumber")}</p>
                  <p className="font-medium">#{selectedBooking.bookingNumber}</p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">{t("memberBookings.treatment")}</p>
                  <p className="font-medium">{selectedBooking.treatment?.name || "N/A"}</p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">{t("memberBookings.dateTime")}</p>
                  <p>{format(new Date(selectedBooking.bookingDateTime), "dd/MM/yyyy HH:mm", { locale: getLocale(language) })}</p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">{t("memberBookings.status")}</p>
                  <Badge variant="outline">{t(`memberBookings.status.${selectedBooking.status}`)}</Badge>
                </div>
                
                {selectedBooking.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t("memberBookings.notes")}</p>
                    <p className="mt-1">{selectedBooking.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
