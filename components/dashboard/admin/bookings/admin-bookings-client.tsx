"use client"

import { useMemo, useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "@/lib/translations/i18n"
import { getAdminBookingColumns } from "./admin-bookings-columns"
import { DataTable } from "@/components/common/ui/data-table"
import { BookingsTableSkeleton } from "@/components/dashboard/member/bookings/bookings-table-skeleton"
import EnhancedBookingModal from "./enhanced-booking-modal"
import type { PopulatedBooking } from "@/types/booking"
import { Heading } from "@/components/common/ui/heading"
import { getAllBookings } from "@/actions/booking-actions"
import { Input } from "@/components/common/ui/input"
import { Button } from "@/components/common/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Search, RefreshCw, Filter, X, Plus, Users, MessageSquare, AlertTriangle, BarChart3 } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import { Badge } from "@/components/common/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/common/ui/popover"
import { Separator } from "@/components/common/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/common/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/ui/tabs"
import { ProfessionalResponsesDialog } from "./professional-responses-dialog"
import { 
  getBookingStatistics, 
  findSuitableProfessionals,
  notifyAllSuitableProfessionals,
  assignProfessionalToBooking,
  updateBookingStatus,
  sendReviewReminder,
  sendResponseReminder
} from "@/actions/booking-management-actions"

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
  const [showStatistics, setShowStatistics] = useState(false)
  const [showProfessionalResponses, setShowProfessionalResponses] = useState(false)
  const [statsTimeRange, setStatsTimeRange] = useState<"today" | "week" | "month">("today")
  
  // Advanced features state
  const [isProcessingAction, setIsProcessingAction] = useState(false)
  const [actionMessage, setActionMessage] = useState("")

  // Debounce search term for real-time searching
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm, statusFilter, professionalFilter, treatmentFilter, dateRangeFilter, priceRangeFilter, addressFilter])

  // Statistics query
  const {
    data: statisticsData,
    isLoading: isLoadingStats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["bookingStatistics", statsTimeRange],
    queryFn: async () => {
      const result = await getBookingStatistics(statsTimeRange)
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch statistics")
      }
      return result.data
    },
    enabled: showStatistics,
    refetchOnWindowFocus: false,
    staleTime: 60000, // 1 minute
  })

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

  const handleViewBooking = (booking: PopulatedBooking) => {
    // Navigate to the booking edit page
    window.location.href = `/dashboard/admin/bookings/${booking._id}`
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setSelectedBooking(null)
  }

  const handleCreateNewBooking = () => {
    window.location.href = "/dashboard/admin/bookings/new"
  }

  // Advanced booking management functions
  const handleFindProfessionals = async (booking: PopulatedBooking) => {
    setIsProcessingAction(true)
    try {
      const result = await findSuitableProfessionals(booking._id)
      if (result.success && result.data) {
        setActionMessage(`נמצאו ${result.data.length} מטפלים מתאימים`)
        // Show professional selection modal or update state
      } else {
        setActionMessage(`שגיאה: ${result.error}`)
      }
    } catch (error) {
      setActionMessage("שגיאה בחיפוש מטפלים")
    } finally {
      setIsProcessingAction(false)
    }
  }

  const handleNotifyAllProfessionals = async (booking: PopulatedBooking) => {
    setIsProcessingAction(true)
    try {
      const result = await notifyAllSuitableProfessionals(booking._id)
      if (result.success) {
        setActionMessage(result.message || "הודעות נשלחו בהצלחה")
        refetch() // Refresh bookings list
      } else {
        setActionMessage(`שגיאה: ${result.error}`)
      }
    } catch (error) {
      setActionMessage("שגיאה בשליחת הודעות")
    } finally {
      setIsProcessingAction(false)
    }
  }

  const handleAssignProfessional = async (bookingId: string, professionalId: string, force: boolean = false) => {
    setIsProcessingAction(true)
    try {
      const result = await assignProfessionalToBooking(bookingId, professionalId, force)
      if (result.success) {
        setActionMessage(result.message || "מטפל שויך בהצלחה")
        refetch()
      } else {
        setActionMessage(`שגיאה: ${result.error}`)
      }
    } catch (error) {
      setActionMessage("שגיאה בשיוך מטפל")
    } finally {
      setIsProcessingAction(false)
    }
  }

  const handleUpdateStatus = async (bookingId: string, status: string, notes?: string) => {
    setIsProcessingAction(true)
    try {
      const result = await updateBookingStatus(bookingId, status, notes)
      if (result.success) {
        setActionMessage(result.message || "סטטוס עודכן בהצלחה")
        refetch()
      } else {
        setActionMessage(`שגיאה: ${result.error}`)
      }
    } catch (error) {
      setActionMessage("שגיאה בעדכון סטטוס")
    } finally {
      setIsProcessingAction(false)
    }
  }

  const handleSendReviewReminder = async (bookingId: string) => {
    setIsProcessingAction(true)
    try {
      const result = await sendReviewReminder(bookingId)
      if (result.success) {
        setActionMessage(result.message || "תזכורת נשלחה בהצלחה")
      } else {
        setActionMessage(`שגיאה: ${result.error}`)
      }
    } catch (error) {
      setActionMessage("שגיאה בשליחת תזכורת")
    } finally {
      setIsProcessingAction(false)
    }
  }

  const handleSendResponseReminder = async (bookingId: string) => {
    setIsProcessingAction(true)
    try {
      const result = await sendResponseReminder(bookingId, "")
      if (result.success) {
        setActionMessage(result.message || "תזכורות נשלחו בהצלחה")
      } else {
        setActionMessage(`שגיאה: ${result.message}`)
      }
    } catch (error) {
      setActionMessage("שגיאה בשליחת תזכורות")
    } finally {
      setIsProcessingAction(false)
    }
  }

  const columns = useMemo(() => getAdminBookingColumns(t, language, handleViewBooking), [t, language, handleViewBooking])

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
      {/* Header with Action Buttons */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{t("adminBookings.title")}</h2>
          <p className="text-muted-foreground">
            ניהול כל ההזמנות במערכת - סה"כ {totalBookings} הזמנות
          </p>
          {actionMessage && (
            <div className="mt-2">
              <Badge variant="secondary" className="text-sm">
                {actionMessage}
              </Badge>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={() => setShowStatistics(!showStatistics)}
            className="flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            סטטיסטיקות
          </Button>
          <Button 
            variant="outline"
            onClick={() => setShowProfessionalResponses(!showProfessionalResponses)}
            className="flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            תגובות מטפלים
          </Button>
          <Button 
            onClick={handleCreateNewBooking}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            הזמנה חדשה
          </Button>
        </div>
      </div>

      {/* Statistics Panel */}
      {showStatistics && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  סטטיסטיקות הזמנות
                </CardTitle>
                <CardDescription>
                  נתונים עדכניים על ביצועי המערכת
                </CardDescription>
              </div>
              <Select value={statsTimeRange} onValueChange={(value) => setStatsTimeRange(value as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">היום</SelectItem>
                  <SelectItem value="week">השבוע</SelectItem>
                  <SelectItem value="month">החודש</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <div className="text-center py-4">
                <p>טוען נתונים...</p>
              </div>
            ) : statisticsData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{statisticsData.total}</p>
                  <p className="text-sm text-blue-800">סה"כ הזמנות</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {statisticsData.responseRates.professionalAcceptanceRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-green-800">שיעור קבלה</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">
                    {statisticsData.responseRates.completionRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-purple-800">שיעור השלמה</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">
                    ₪{statisticsData.revenue.completed.toLocaleString()}
                  </p>
                  <p className="text-sm text-orange-800">הכנסות</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">לא ניתן לטעון נתונים</p>
                <Button onClick={() => refetchStats()} variant="outline" size="sm" className="mt-2">
                  נסה שוב
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Professional Responses Dialog */}
      {showProfessionalResponses && selectedBooking && (
        <ProfessionalResponsesDialog
          bookingId={selectedBooking._id}
          open={showProfessionalResponses}
          onOpenChange={setShowProfessionalResponses}
          bookingStatus={selectedBooking.status}
        />
      )}

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
                <SelectItem value="pending_professional">ממתין לשיוך מטפל</SelectItem>
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