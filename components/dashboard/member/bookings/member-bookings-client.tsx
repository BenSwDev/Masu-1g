"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useSearchParams } from "next/navigation"

import { getUserBookings } from "@/actions/booking-actions"
import { useSession } from "next-auth/react"
import { Skeleton } from "@/components/ui/skeleton"
import BookingCard from "./booking-card"
import { Pagination } from "@/components/ui/pagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface MemberBookingsClientProps {
  defaultPage?: number
  defaultStatus?: string
  defaultSortBy?: string
  defaultSortDirection?: "asc" | "desc"
}

const MemberBookingsClient = ({
  defaultPage = 1,
  defaultStatus = "all",
  defaultSortBy = "createdAt",
  defaultSortDirection = "desc",
}: MemberBookingsClientProps) => {
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const currentUserId = session?.user?.id as string

  const [currentPage, setCurrentPage] = useState(Number(searchParams.get("page")) || defaultPage)
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || defaultStatus)
  const [sortBy, setSortBy] = useState(searchParams.get("sort_by") || defaultSortBy)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(
    (searchParams.get("sort_direction") as "asc" | "desc") || defaultSortDirection,
  )

  const { data, isLoading, isError } = useQuery({
    queryKey: ["member-bookings", currentUserId, currentPage, statusFilter, sortBy, sortDirection],
    queryFn: () => getUserBookings(currentUserId, { page: currentPage, status: statusFilter, sortBy, sortDirection }),
    enabled: !!currentUserId,
  })

  if (!currentUserId) {
    return <div>Loading...</div>
  }

  if (isError) {
    return <div>Error fetching bookings</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Bookings</h2>
        <div className="flex items-center gap-2">
          <Select onValueChange={setStatusFilter} defaultValue={statusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select
            onValueChange={(value) => {
              const [newSortBy, newSortDirection] = value.split(".") as [string, "asc" | "desc"]
              setSortBy(newSortBy)
              setSortDirection(newSortDirection)
            }}
            defaultValue={`${sortBy}.${sortDirection}`}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={`createdAt.asc`}>Date (Oldest first)</SelectItem>
              <SelectItem value={`createdAt.desc`}>Date (Newest first)</SelectItem>
              <SelectItem value={`totalPrice.asc`}>Price (Lowest first)</SelectItem>
              <SelectItem value={`totalPrice.desc`}>Price (Highest first)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : data?.bookings.length === 0 ? (
        <p>No bookings found.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {data?.bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}

      <Pagination
        currentPage={currentPage}
        totalCount={data?.totalCount || 0}
        pageSize={data?.pageSize || 8}
        onPageChange={setCurrentPage}
        className={cn(isLoading && "opacity-50 pointer-events-none")}
      />
    </div>
  )
}

export default MemberBookingsClient
