"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "@/lib/translations/i18n"
import { getUserBookings } from "@/actions/booking-actions"
import { getBookingColumns } from "./bookings-columns"
import { DataTable } from "@/components/common/ui/data-table"
import { BookingsTableSkeleton } from "./bookings-table-skeleton"
import type { PopulatedBooking } from "@/types/booking"
import { Button } from "@/components/common/ui/button"
import { cn } from "@/lib/utils/utils"

// A simple tab component for filtering
const StatusTabs = ({
  currentStatus,
  onStatusChange,
  t,
}: {
  currentStatus: string
  onStatusChange: (status: string) => void
  t: (key: string) => string
}) => {
  const statuses = ["all", "upcoming", "past", "cancelled"]
  return (
    <div className="border-b">
      <nav className="-mb-px flex space-x-4 sm:space-x-8 px-1 overflow-x-auto" aria-label="Tabs">
        {statuses.map((status) => (
          <Button
            key={status}
            variant="ghost"
            onClick={() => onStatusChange(status)}
            className={cn(
              "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm h-auto rounded-none",
              status === currentStatus
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300",
            )}
          >
            {t(`memberBookings.filters.${status}`)}
          </Button>
        ))}
      </nav>
    </div>
  )
}

export default function MemberBookingsClient({ userId }: { userId: string }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const [statusFilter, setStatusFilter] = useState("upcoming")
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })

  const { data, isLoading, isError, error } = useQuery<{
    bookings: PopulatedBooking[]
    totalPages: number
    totalBookings: number
  }>({
    queryKey: ["member-bookings", userId, statusFilter, pagination],
    queryFn: () =>
      getUserBookings(userId, {
        status: statusFilter,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        sortBy: "bookingDateTime",
        sortDirection: "desc",
      }),
    placeholderData: (previousData) => previousData,
  })

  // Pass the `t` function down to getBookingColumns
  const columns = getBookingColumns(t, locale)

  if (isError) {
    return <div className="text-red-500 p-4">Error loading bookings: {error.message}</div>
  }

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h1 className="text-2xl font-bold tracking-tight">{t("memberBookings.title")}</h1>
        <p className="text-muted-foreground">{t("memberBookings.description")}</p>
      </div>
      <StatusTabs currentStatus={statusFilter} onStatusChange={setStatusFilter} t={t} />
      {isLoading && !data ? (
        <BookingsTableSkeleton />
      ) : (
        <DataTable
          columns={columns}
          data={data?.bookings ?? []}
          pageCount={data?.totalPages ?? 0}
          pagination={pagination}
          onPaginationChange={setPagination}
        />
      )}
    </div>
  )
}
