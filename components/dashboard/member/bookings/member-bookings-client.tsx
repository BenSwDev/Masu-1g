"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useSearchParams } from "next/navigation"
import type { SortingState } from "@tanstack/react-table"

import { getUserBookings } from "@/actions/booking-actions"
import { useTranslation } from "@/lib/translations/i18n"
import { columns } from "./bookings-columns"
import { DataTable } from "@/components/common/ui/data-table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { BookingsTableSkeleton } from "./bookings-table-skeleton"
import { Heading } from "@/components/common/ui/heading"

interface MemberBookingsClientProps {
  userId: string
}

const MemberBookingsClient = ({ userId }: MemberBookingsClientProps) => {
  const { t, dir } = useTranslation()
  const searchParams = useSearchParams()

  const [pagination, setPagination] = useState({
    pageIndex: Number(searchParams.get("page") || 1) - 1,
    pageSize: 10,
  })
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all")
  const [sorting, setSorting] = useState<SortingState>([{ id: "bookingDateTime", desc: true }])

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["member-bookings", userId, pagination, statusFilter, sorting],
    queryFn: () =>
      getUserBookings(userId, {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        status: statusFilter,
        sortBy: sorting[0]?.id,
        sortDirection: sorting[0]?.desc ? "desc" : "asc",
      }),
    enabled: !!userId,
  })

  const bookingsData = data?.bookings || []
  const pageCount = data?.totalPages || 0

  if (isError) {
    return <div>{`${t("common.error")}: ${error.message}`}</div>
  }

  return (
    <div dir={dir} className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <Heading title={t("memberBookings.pageTitle")} description={t("memberBookings.pageDescription")} />
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Select onValueChange={setStatusFilter} defaultValue={statusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder={t("memberBookings.filterByStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("memberBookings.status.all")}</SelectItem>
              <SelectItem value="pending_professional_assignment">
                {t("memberBookings.status.pending_professional_assignment")}
              </SelectItem>
              <SelectItem value="confirmed">{t("memberBookings.status.confirmed")}</SelectItem>
              <SelectItem value="cancelled">{t("memberBookings.status.cancelled")}</SelectItem>
              <SelectItem value="completed">{t("memberBookings.status.completed")}</SelectItem>
              <SelectItem value="no_show">{t("memberBookings.status.no_show")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <BookingsTableSkeleton />
      ) : (
        <DataTable
          columns={columns}
          data={bookingsData}
          pageCount={pageCount}
          pagination={pagination}
          setPagination={setPagination}
          sorting={sorting}
          setSorting={setSorting}
        />
      )}
    </div>
  )
}

export default MemberBookingsClient
