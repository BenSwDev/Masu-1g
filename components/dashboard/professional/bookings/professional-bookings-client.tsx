"use client"

import { useMemo, useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "@/lib/translations/i18n"
import { DataTable } from "@/components/common/ui/data-table"
import { BookingsTableSkeleton } from "@/components/dashboard/member/bookings/bookings-table-skeleton"
import type { PopulatedBooking } from "@/types/booking"
import { Heading } from "@/components/common/ui/heading"
import { Input } from "@/components/common/ui/input"
import { Button } from "@/components/common/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Search, RefreshCw, Filter, X, Calendar, DollarSign } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import { Badge } from "@/components/common/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/common/ui/popover"
import { Separator } from "@/components/common/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { he } from "date-fns/locale"

interface ProfessionalBookingsClientProps {
  professionalId: string
}

// Professional-specific booking columns (no customer payment info)
const getProfessionalBookingColumns = (t: any, language: string): ColumnDef<PopulatedBooking>[] => [
  // Booking Number
  {
    accessorKey: "bookingNumber",
    header: "מספר הזמנה",
    cell: ({ row }) => {
      const bookingNumber = row.getValue("bookingNumber") as string
      return (
        <div className="font-medium">
          #{bookingNumber || "N/A"}
        </div>
      )
    },
  },
  // Status
  {
    accessorKey: "status",
    header: "סטטוס",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { label: string; color: string }> = {
          pending_payment: { label: "ממתין לתשלום", color: "bg-yellow-100 text-yellow-800" },
          pending_professional: { label: "ממתינה למטפל", color: "bg-orange-100 text-orange-800" },
          confirmed: { label: "מאושר", color: "bg-green-100 text-green-800" },
          on_way: { label: "בדרך", color: "bg-blue-100 text-blue-800" },
          in_treatment: { label: "בטיפול", color: "bg-purple-100 text-purple-800" },
          completed: { label: "הושלם", color: "bg-gray-100 text-gray-800" },
          cancelled: { label: "בוטל", color: "bg-red-100 text-red-800" },
          refunded: { label: "הוחזר", color: "bg-red-100 text-red-800" },
        }
        const config = statusConfig[status] || statusConfig.confirmed
        return (
          <Badge className={config.color}>
            {config.label}
          </Badge>
        )
      }
      return getStatusBadge(status)
    },
  },
  // Treatment
  {
    accessorKey: "treatmentId",
    header: "טיפול",
    cell: ({ row }) => {
      const booking = row.original
      const treatment = booking.treatmentId as any
      const treatmentName = treatment?.name || "טיפול לא זמין"
      
      return (
        <div>
          <div className="font-medium">{treatmentName}</div>
          {treatment?.selectedDuration && (
            <div className="text-sm text-muted-foreground">
              {treatment.selectedDuration.minutes} דקות
            </div>
          )}
        </div>
      )
    },
  },
  // Date & Time
  {
    accessorKey: "bookingDateTime",
    header: "תאריך ושעה",
    cell: ({ row }) => {
      const booking = row.original
      const dateTime = booking.bookingDateTime
      
      if (!dateTime) return <span className="text-muted-foreground">-</span>
      
      return (
        <div>
          <div className="font-medium">
            {format(new Date(dateTime), "dd/MM/yyyy", { locale: he })}
          </div>
          <div className="text-sm text-muted-foreground">
            {format(new Date(dateTime), "HH:mm", { locale: he })}
          </div>
        </div>
      )
    },
  },
  // Client Info (name and phone only)
  {
    accessorKey: "userId",
    header: "לקוח",
    cell: ({ row }) => {
      const booking = row.original
      const clientName = booking.bookedByUserName || (booking.userId as any)?.name || "לקוח אורח"
      const clientPhone = booking.bookedByUserPhone || (booking.userId as any)?.phone || ""
      
      return (
        <div>
          <div className="font-medium">{clientName}</div>
          {clientPhone && (
            <div className="text-sm text-muted-foreground">{clientPhone}</div>
          )}
        </div>
      )
    },
  },
  // Address
  {
    accessorKey: "address",
    header: "כתובת",
    cell: ({ row }) => {
      const booking = row.original
      const address = booking.bookingAddressSnapshot || booking.customAddressDetails
      
      if (!address) return <span className="text-muted-foreground">-</span>
      
      return (
        <div className="max-w-[200px]">
          <div className="font-medium">{address.city}</div>
          <div className="text-sm text-muted-foreground truncate">
            {address.street} {address.streetNumber}
            {address.apartment && `, דירה ${address.apartment}`}
          </div>
        </div>
      )
    },
  },
  // Professional Payment (ONLY what the professional receives)
  {
    accessorKey: "professionalPayment",
    header: "התשלום שלי",
    cell: ({ row }) => {
      const booking = row.original
      const professionalPayment = booking.priceDetails?.totalProfessionalPayment || 0
      
      return (
        <div className="text-center">
          <div className="font-medium text-green-600">
            ₪{professionalPayment.toFixed(0)}
          </div>
        </div>
      )
    },
  },
]

export default function ProfessionalBookingsClient({ professionalId }: ProfessionalBookingsClientProps) {
  const { t, language, dir } = useTranslation()
  
  // Search and filters state
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("all")
  
  // UI state
  const [currentPage, setCurrentPage] = useState(1)
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // Debounce search term for real-time searching
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm, statusFilter, dateRangeFilter])

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<
    { bookings: PopulatedBooking[]; totalPages: number; totalBookings: number; summary: any },
    Error
  >({
    queryKey: ["professionalBookings", professionalId, language, debouncedSearchTerm, statusFilter, dateRangeFilter, currentPage],
    queryFn: async () => {
      try {
        // Call a new API endpoint for professional bookings
        const params = new URLSearchParams({
          professionalId,
          search: debouncedSearchTerm || "",
          status: statusFilter === "all" ? "" : statusFilter,
          dateRange: dateRangeFilter === "all" ? "" : dateRangeFilter,
          page: currentPage.toString(),
          limit: "20",
        })

        const response = await fetch(`/api/professional/bookings?${params}`)
        const result = await response.json()
        
        if (!result.success) {
          throw new Error(result.error || "Failed to fetch bookings")
        }
        
        return result
      } catch (error) {
        console.error("Error in getProfessionalBookings query:", error)
        throw error
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 30000, // 30 seconds
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  })

  const columns = useMemo(() => getProfessionalBookingColumns(t, language), [t, language])

  const handleRefresh = () => {
    refetch()
  }

  const clearAllFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setDateRangeFilter("all")
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (statusFilter !== "all") count++
    if (dateRangeFilter !== "all") count++
    return count
  }

  const activeFiltersCount = getActiveFiltersCount()

  if (isLoading) {
    return (
      <div className="w-full max-w-full overflow-hidden">
        <div className="mb-6 text-center md:text-right">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">ההזמנות שלי</h2>
        </div>
        <BookingsTableSkeleton />
        <p className="mt-4 text-center text-muted-foreground">טוען הזמנות...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8" dir={dir}>
        <h3 className="text-lg font-semibold mb-2">שגיאה בטעינת ההזמנות</h3>
        <p className="text-muted-foreground mb-4">אירעה שגיאה בעת טעינת ההזמנות שלך</p>
        <Button onClick={handleRefresh}>נסה שוב</Button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-full overflow-hidden" dir={dir}>
      {/* Header */}
      <div className="mb-6 text-center md:text-right">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">ההזמנות שלי</h2>
        <p className="text-muted-foreground">נהל את ההזמנות שהוקצו לך</p>
      </div>

      {/* Summary Cards */}
      {data?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                סה"כ הזמנות
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.totalBookings || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                הזמנות פעילות
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{data.summary.activeBookings || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                רווחים החודש
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">₪{data.summary.monthlyEarnings || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                רווחים ממתינים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">₪{data.summary.pendingEarnings || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="חפש לפי מספר הזמנה או שם לקוח"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                <SelectItem value="confirmed">מאושר</SelectItem>
                <SelectItem value="on_way">בדרך</SelectItem>
                <SelectItem value="in_treatment">בטיפול</SelectItem>
                <SelectItem value="completed">הושלם</SelectItem>
              </SelectContent>
            </Select>

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

      {/* No bookings message */}
      {(!data?.bookings || data.bookings.length === 0) && (
        <div className="flex flex-col items-center justify-center py-12">
          <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">אין הזמנות</h3>
          <p className="text-muted-foreground text-center">
            {activeFiltersCount > 0 
              ? "לא נמצאו הזמנות התואמות את הפילטרים שנבחרו"
              : "עדיין לא הוקצו לך הזמנות"
            }
          </p>
          {activeFiltersCount > 0 && (
            <Button variant="outline" onClick={clearAllFilters} className="mt-4">
              נקה פילטרים
            </Button>
          )}
        </div>
      )}
    </div>
  )
} 