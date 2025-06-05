"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
// Remove next-intl import
// import { useTranslations } from "next-intl"
// Import your custom translation hook
import { useTranslation } from "@/lib/translations/i18n"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { getUserBookings, type PopulatedBooking } from "@/actions/booking-actions"
import BookingCard from "./booking-card"
import { MemberBookingsClientSkeleton } from "./booking-card-skeleton"
import { Button } from "@/components/common/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/common/ui/pagination"
import { AlertTriangle, ListX } from "lucide-react"
import { Loader2 } from "lucide-react"

interface MemberBookingsClientProps {
  userId: string
}

const BOOKINGS_PER_PAGE = 6

export default function MemberBookingsClient({ userId }: MemberBookingsClientProps) {
  // Use your custom translation hook
  const { t } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [filters, setFilters] = useState({
    status: searchParams.get("status") || "all",
    sortBy: searchParams.get("sortBy") || "newest",
    page: Number.parseInt(searchParams.get("page") || "1", 10),
  })

  const queryKey = useMemo(() => ["userBookings", userId, filters], [userId, filters])

  const { data, isLoading, error, isFetching } = useQuery<{
    bookings: PopulatedBooking[]
    totalPages: number
    totalBookings: number
  }>({
    queryKey,
    queryFn: () =>
      getUserBookings(userId, {
        status: filters.status === "all" ? undefined : filters.status,
        page: filters.page,
        limit: BOOKINGS_PER_PAGE,
        sortBy: filters.sortBy === "newest" ? "bookingDateTime" : "bookingDateTime",
        sortDirection: filters.sortBy === "newest" ? "desc" : "asc",
      }),
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
  })

  const handleFilterChange = (type: "status" | "sortBy", value: string) => {
    const newFilters = { ...filters, [type]: value, page: 1 }
    setFilters(newFilters)
    updateURL(newFilters)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || (data && newPage > data.totalPages)) return
    const newFilters = { ...filters, page: newPage }
    setFilters(newFilters)
    updateURL(newFilters)
  }

  const updateURL = (currentFilters: typeof filters) => {
    const params = new URLSearchParams()
    if (currentFilters.status !== "all") params.set("status", currentFilters.status)
    if (currentFilters.sortBy !== "newest") params.set("sortBy", currentFilters.sortBy)
    if (currentFilters.page > 1) params.set("page", currentFilters.page.toString())
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  if (isLoading && !data) {
    return <MemberBookingsClientSkeleton />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center text-destructive">
        <AlertTriangle className="mb-4 h-12 w-12" />
        {/* Use full keys for translations */}
        <h3 className="mb-2 text-xl font-semibold">{t("common.error")}</h3>
        <p>{t("memberBookings.fetchError")}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          {t("common.refresh")}
        </Button>
      </div>
    )
  }

  const bookings = data?.bookings || []
  const totalPages = data?.totalPages || 1
  const totalBookings = data?.totalBookings || 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
          <Select value={filters.status} onValueChange={(value) => handleFilterChange("status", value)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={t("memberBookings.filterByStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("memberBookings.statusAll")}</SelectItem>
              <SelectItem value="upcoming">{t("memberBookings.statusUpcoming")}</SelectItem>
              <SelectItem value="past">{t("memberBookings.statusPast")}</SelectItem>
              <SelectItem value="cancelled">{t("memberBookings.statusCancelled")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange("sortBy", value)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={t("memberBookings.sortByDate")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t("memberBookings.sortNewestFirst")}</SelectItem>
              <SelectItem value="oldest">{t("memberBookings.sortOldestFirst")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isFetching && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
      </div>

      {bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-card p-12 text-center">
          <ListX className="mb-4 h-16 w-16 text-muted-foreground" />
          <h3 className="mb-2 text-xl font-semibold text-card-foreground">
            {filters.status === "all" && filters.sortBy === "newest" && totalBookings === 0
              ? t("memberBookings.noBookingsFound")
              : t("memberBookings.noBookingsFoundFiltered")}
          </h3>
          <p className="text-muted-foreground">{t("memberBookings.tryAdjustingFilters")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
          {bookings.map((booking) => (
            <BookingCard key={booking._id.toString()} booking={booking} currentUserId={userId} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  handlePageChange(filters.page - 1)
                }}
                disabled={filters.page === 1}
                className={filters.page === 1 ? "cursor-not-allowed opacity-50" : ""}
              />
            </PaginationItem>
            {[...Array(totalPages)].map((_, i) => (
              <PaginationItem key={i}>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    handlePageChange(i + 1)
                  }}
                  isActive={filters.page === i + 1}
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  handlePageChange(filters.page + 1)
                }}
                disabled={filters.page === totalPages}
                className={filters.page === totalPages ? "cursor-not-allowed opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}

MemberBookingsClient.Skeleton = MemberBookingsClientSkeleton
