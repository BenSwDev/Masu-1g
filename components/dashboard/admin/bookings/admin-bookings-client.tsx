"use client"

import { useMemo, useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "@/lib/translations/i18n"
import { getAdminBookingColumns } from "./admin-bookings-columns"
import { DataTable } from "@/components/common/ui/data-table"
import { BookingsTableSkeleton } from "@/components/dashboard/member/bookings/bookings-table-skeleton"
import ComprehensiveBookingEditModal from "./comprehensive-booking-edit-modal"
import type { PopulatedBooking } from "@/types/booking"
import { Heading } from "@/components/common/ui/heading"
import { getAllBookings } from "@/actions/booking-actions"
import { Input } from "@/components/common/ui/input"
import { Button } from "@/components/common/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Search, RefreshCw, Filter, X } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import { Badge } from "@/components/common/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/common/ui/popover"
import { Separator } from "@/components/common/ui/separator"

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
        return await getAllBookings({
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
      } catch (error) {
        console.error("Error in getAllBookings query:", error)
        throw error
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 30000, // 30 seconds
  })

  const handleRowClick = (booking: PopulatedBooking) => {
    setSelectedBooking(booking)
    setIsEditModalOpen(true)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setSelectedBooking(null)
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
      <div className="text-center text-red-500 w-full max-w-full overflow-hidden">
        <div className="mb-6 text-center md:text-right">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{t("adminBookings.title")}</h2>
        </div>
        <p>
          {t("common.error")}: {error.message}
        </p>
      </div>
    )
  }

  return (
    <div dir={dir} className="h-full flex flex-col space-y-4">
      <div className="flex-shrink-0">
        <div className="mb-6 text-center md:text-right">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{t("adminBookings.title")}</h2>
        </div>
        
        {/* Search and Filters Bar - Responsive */}
        <div className="space-y-4">
          {/* Main search bar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-full sm:max-w-md">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("adminBookings.searchPlaceholder")}
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
                    {t("adminBookings.filters")}
                    {activeFiltersCount > 0 && (
                      <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{t("adminBookings.advancedFilters")}</h4>
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
                      <label className="text-sm font-medium">{t("adminBookings.filterByStatus")}</label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("adminBookings.allStatuses")}</SelectItem>
                          <SelectItem value="pending_payment">ממתין לתשלום</SelectItem>
                          <SelectItem value="in_process">בטיפול</SelectItem>
                          <SelectItem value="confirmed">מאושר</SelectItem>
                          <SelectItem value="completed">הושלם</SelectItem>
                          <SelectItem value="cancelled">בוטל</SelectItem>
                          <SelectItem value="refunded">הוחזר</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Professional Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t("adminBookings.filterByProfessional")}</label>
                      <Select value={professionalFilter} onValueChange={setProfessionalFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("adminBookings.allProfessionals")}</SelectItem>
                          <SelectItem value="assigned">{t("adminBookings.assignedOnly")}</SelectItem>
                          <SelectItem value="unassigned">{t("adminBookings.unassignedOnly")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date Range Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t("adminBookings.filterByDate")}</label>
                      <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("adminBookings.allDates")}</SelectItem>
                          <SelectItem value="today">{t("adminBookings.today")}</SelectItem>
                          <SelectItem value="tomorrow">{t("adminBookings.tomorrow")}</SelectItem>
                          <SelectItem value="this_week">{t("adminBookings.thisWeek")}</SelectItem>
                          <SelectItem value="next_week">{t("adminBookings.nextWeek")}</SelectItem>
                          <SelectItem value="this_month">{t("adminBookings.thisMonth")}</SelectItem>
                          <SelectItem value="next_month">{t("adminBookings.nextMonth")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Price Range Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t("adminBookings.filterByPrice")}</label>
                      <Select value={priceRangeFilter} onValueChange={setPriceRangeFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("adminBookings.allPrices")}</SelectItem>
                          <SelectItem value="0-50">{t("adminBookings.priceRange0to50")}</SelectItem>
                          <SelectItem value="50-100">{t("adminBookings.priceRange50to100")}</SelectItem>
                          <SelectItem value="100-200">{t("adminBookings.priceRange100to200")}</SelectItem>
                          <SelectItem value="200-500">{t("adminBookings.priceRange200to500")}</SelectItem>
                          <SelectItem value="500+">{t("adminBookings.priceRange500plus")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Address Type Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t("adminBookings.filterByAddress")}</label>
                      <Select value={addressFilter} onValueChange={setAddressFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("adminBookings.allAddresses")}</SelectItem>
                          <SelectItem value="with_parking">{t("adminBookings.withParking")}</SelectItem>
                          <SelectItem value="without_parking">{t("adminBookings.withoutParking")}</SelectItem>
                          <SelectItem value="apartment">{t("adminBookings.apartmentType")}</SelectItem>
                          <SelectItem value="house">{t("adminBookings.houseType")}</SelectItem>
                          <SelectItem value="office">{t("adminBookings.officeType")}</SelectItem>
                          <SelectItem value="hotel">{t("adminBookings.hotelType")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Active filters display */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2">
              {statusFilter !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {t("adminBookings.filterByStatus")}: {t(`adminBookings.status.${statusFilter}`)}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setStatusFilter("all")} />
                </Badge>
              )}
              {professionalFilter !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {t("adminBookings.filterByProfessional")}: {t(`adminBookings.${professionalFilter}`)}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setProfessionalFilter("all")} />
                </Badge>
              )}
              {dateRangeFilter !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {t("adminBookings.filterByDate")}: {t(`adminBookings.${dateRangeFilter}`)}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setDateRangeFilter("all")} />
                </Badge>
              )}
              {priceRangeFilter !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {t("adminBookings.filterByPrice")}: {t(`adminBookings.priceRange${priceRangeFilter.replace(/[+-]/g, '').replace('-', 'to')}`)}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setPriceRangeFilter("all")} />
                </Badge>
              )}
              {addressFilter !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {t("adminBookings.filterByAddress")}: {t(`adminBookings.${addressFilter}`)}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setAddressFilter("all")} />
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Summary */}
        {data && (
          <div className="mb-4 text-sm text-muted-foreground">
            {t("adminBookings.summary", { 
              total: data.totalBookings,
              showing: data.bookings.length 
            })}
          </div>
        )}
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* No results */}
        {(!data?.bookings || data.bookings.length === 0) && !isLoading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">{t("adminBookings.noBookings")}</p>
            {activeFiltersCount > 0 && (
              <Button variant="outline" onClick={clearAllFilters} className="mt-2">
                {t("adminBookings.clearFiltersToSeeAll")}
              </Button>
            )}
          </div>
        )}

        {/* Helpful instruction for clicking rows */}
        {data?.bookings && data.bookings.length > 0 && (
          <>
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex-shrink-0">
              <p className="text-sm text-blue-800 text-center">
                💡 {t("adminBookings.clickRowToEdit")}
              </p>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden rounded-lg border bg-white">
              <div className="h-full overflow-auto">
                <DataTable
                  columns={columns}
                  data={data?.bookings || []}
                  onRowClick={handleRowClick}
                  hideDefaultPagination={true}
                  hideColumnsSelector={true}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Pagination and Footer - Fixed at Bottom */}
      {data && data.totalPages > 1 && (
        <div className="flex-shrink-0 flex items-center justify-between border-t pt-4 bg-white">
          <div className="text-sm text-muted-foreground">
            {t("adminBookings.showingPage", { 
              current: currentPage, 
              total: data.totalPages,
              totalBookings: data.totalBookings
            })}
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