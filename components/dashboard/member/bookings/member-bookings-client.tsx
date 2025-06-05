"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useTranslation } from "@/lib/translations/i18n"
import type { PopulatedBooking, BookingStatus } from "@/types/booking"
import BookingCard from "./booking-card"
import BookingDetailsModal from "./booking-details-modal"
import { Button } from "@/components/common/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/common/ui/alert"
import { AlertTriangle, Info } from "lucide-react"
import { Pagination } from "@/components/common/ui/pagination" // Assuming this is a custom or shadcn component
import BookingsLoadingSkeleton from "./bookings-loading-skeleton"

interface MemberBookingsClientProps {
  initialBookings: PopulatedBooking[]
  totalBookings: number
  totalPages: number
  initialError?: string
  searchParams: {
    // Pass current searchParams to initialize filters
    page?: string
    limit?: string
    status?: string | string[]
    sortBy?: string
    sortDirection?: "asc" | "desc"
  }
}

const ALL_STATUSES_KEY = "all"

export default function MemberBookingsClient({
  initialBookings,
  totalBookings,
  totalPages,
  initialError,
  searchParams: currentSearchParams,
}: MemberBookingsClientProps) {
  const { t, dir } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const queryParams = useSearchParams() // For reading existing params not explicitly passed

  const [bookings, setBookings] = useState<PopulatedBooking[]>(initialBookings)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(initialError)

  const [selectedStatus, setSelectedStatus] = useState<string>(() => {
    const statusParam = currentSearchParams.status
    if (Array.isArray(statusParam)) return statusParam[0] || ALL_STATUSES_KEY // Default to first if array, or all
    return statusParam || ALL_STATUSES_KEY
  })

  const [currentPage, setCurrentPage] = useState(
    currentSearchParams.page ? Number.parseInt(currentSearchParams.page) : 1,
  )

  const [selectedBooking, setSelectedBooking] = useState<PopulatedBooking | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    setBookings(initialBookings)
    setError(initialError)
    setCurrentPage(currentSearchParams.page ? Number.parseInt(currentSearchParams.page) : 1)
    const statusParam = currentSearchParams.status
    setSelectedStatus(Array.isArray(statusParam) ? statusParam[0] || ALL_STATUSES_KEY : statusParam || ALL_STATUSES_KEY)
  }, [initialBookings, initialError, currentSearchParams])

  const handleFilterChange = (newStatus: string) => {
    setSelectedStatus(newStatus)
    setCurrentPage(1) // Reset to first page on filter change
    updateQueryParams({ status: newStatus === ALL_STATUSES_KEY ? undefined : newStatus, page: "1" })
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    updateQueryParams({ page: newPage.toString() })
  }

  const updateQueryParams = (paramsToUpdate: Record<string, string | undefined>) => {
    setIsLoading(true)
    const newParams = new URLSearchParams(queryParams.toString())
    Object.entries(paramsToUpdate).forEach(([key, value]) => {
      if (value === undefined) {
        newParams.delete(key)
      } else {
        newParams.set(key, value)
      }
    })
    router.push(`${pathname}?${newParams.toString()}`, { scroll: false })
    // setIsLoading(false) will be handled by useEffect on initialBookings change or if error occurs
  }

  const bookingStatuses: { value: BookingStatus | "all"; labelKey: string }[] = [
    { value: "all", labelKey: "memberBookings.statusFilter.all" },
    { value: "pending_professional_assignment", labelKey: "memberBookings.status.pending_professional_assignment" },
    { value: "confirmed", labelKey: "memberBookings.status.confirmed" },
    { value: "completed", labelKey: "memberBookings.status.completed" },
    { value: "cancelled_by_user", labelKey: "memberBookings.status.cancelled_by_user" },
    { value: "cancelled_by_admin", labelKey: "memberBookings.status.cancelled_by_admin" },
    { value: "no_show", labelKey: "memberBookings.status.no_show" },
  ]

  const handleViewDetails = (booking: PopulatedBooking) => {
    setSelectedBooking(booking)
    setIsModalOpen(true)
  }

  // This effect will help in managing loading state based on router events if needed,
  // but for now, we rely on Suspense and initial loading state.
  useEffect(() => {
    const handleStart = () => setIsLoading(true)
    const handleComplete = () => setIsLoading(false)

    // For Next.js 13 App Router, direct router events for loading state are less common.
    // Instead, Suspense handles server component loading.
    // This is more for client-side navigation patterns if they were used for fetching.
    // For now, we set isLoading(false) after initial data is processed or if an error occurs.
    if (!initialError && initialBookings) setIsLoading(false)

    // router.events?.on('routeChangeStart', handleStart);
    // router.events?.on('routeChangeComplete', handleComplete);
    // router.events?.on('routeChangeError', handleComplete);

    return () => {
      // router.events?.off('routeChangeStart', handleStart);
      // router.events?.off('routeChangeComplete', handleComplete);
      // router.events?.off('routeChangeError', handleComplete);
    }
  }, [router])

  if (isLoading && bookings.length === 0) {
    // Show skeleton only on initial load or full filter change
    return <BookingsLoadingSkeleton />
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t("common.error")}</AlertTitle>
        <AlertDescription>{t(error, { ns: "bookings.errors" }) || t("common.unexpectedError")}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg shadow">
        <Select value={selectedStatus} onValueChange={handleFilterChange} dir={dir}>
          <SelectTrigger className="w-full sm:w-auto min-w-[180px] bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
            <SelectValue placeholder={t("memberBookings.filterByStatus")} />
          </SelectTrigger>
          <SelectContent>
            {bookingStatuses.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {t(status.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Add more filters here if needed, e.g., date range picker */}
      </div>

      {isLoading && <div className="text-center py-4">{t("common.loading")}</div>}

      {!isLoading && bookings.length === 0 ? (
        <div className="text-center py-10">
          <Info className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">
            {t("memberBookings.noBookingsFoundTitle")}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {selectedStatus !== ALL_STATUSES_KEY
              ? t("memberBookings.noBookingsFoundFiltered")
              : t("memberBookings.noBookings")}
          </p>
          {selectedStatus !== ALL_STATUSES_KEY && (
            <Button variant="link" onClick={() => handleFilterChange(ALL_STATUSES_KEY)} className="mt-2">
              {t("memberBookings.showAllBookings")}
            </Button>
          )}
          <Button
            onClick={() => router.push("/dashboard/member/book-treatment")}
            className="mt-4 bg-turquoise-600 hover:bg-turquoise-700 text-white"
          >
            {t("dashboard.sidebar.bookTreatment")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {bookings.map((booking) => (
            <BookingCard key={booking._id} booking={booking} onViewDetails={handleViewDetails} />
          ))}
        </div>
      )}

      {totalPages > 1 && !isLoading && bookings.length > 0 && (
        <div className="mt-8 flex justify-center">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
        </div>
      )}

      {selectedBooking && (
        <BookingDetailsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} booking={selectedBooking} />
      )}
    </div>
  )
}
