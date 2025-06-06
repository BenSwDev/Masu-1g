"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import type { SortingState, ColumnFiltersState, VisibilityState } from "@tanstack/react-table"

import { getUserBookings } from "@/actions/booking-actions"
import { useTranslation } from "@/lib/translations/i18n"
import { columns } from "./bookings-columns"
import { DataTable } from "@/components/common/ui/data-table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { BookingsTableSkeleton } from "./bookings-table-skeleton"
import { Heading } from "@/components/common/ui/heading"
import { Input } from "@/components/common/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/common/ui/dropdown-menu"
import { Button } from "@/components/common/ui/button"
import { ListFilter } from "lucide-react"

interface MemberBookingsClientProps {
  userId: string
}

const MemberBookingsClient = ({ userId }: MemberBookingsClientProps) => {
  const { t, dir } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const initialPage = Number(searchParams.get("page") || 1)
  const initialStatus = searchParams.get("status") || "all"
  const initialSearch = searchParams.get("search") || ""
  const initialSortBy = searchParams.get("sortBy") || "bookingDateTime"
  const initialSortDir = searchParams.get("sortDir") === "asc"

  const [pagination, setPagination] = useState({
    pageIndex: initialPage - 1,
    pageSize: 10,
  })
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [globalFilter, setGlobalFilter] = useState(initialSearch) // For text search
  const [sorting, setSorting] = useState<SortingState>([{ id: initialSortBy, desc: !initialSortDir }])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const debouncedSetGlobalFilter = useMemo(() => {
    let timeoutId: NodeJS.Timeout
    return (value: string) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        setGlobalFilter(value)
      }, 500)
    }
  }, [])

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["member-bookings", userId, pagination, statusFilter, sorting, globalFilter],
    queryFn: () => {
      const params = new URLSearchParams()
      params.set("page", (pagination.pageIndex + 1).toString())
      params.set("limit", pagination.pageSize.toString())
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (sorting[0]) {
        params.set("sortBy", sorting[0].id)
        params.set("sortDirection", sorting[0].desc ? "desc" : "asc")
      }
      if (globalFilter) params.set("search", globalFilter)

      // Update URL without re-fetching, TanStack Query handles fetching
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })

      return getUserBookings(userId, {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        status: statusFilter,
        sortBy: sorting[0]?.id,
        sortDirection: sorting[0]?.desc ? "desc" : "asc",
        search: globalFilter,
      })
    },
    enabled: !!userId,
    placeholderData: (previousData) => previousData, // Keep previous data while loading new
  })

  const bookingsData = data?.bookings || []
  const pageCount = data?.totalPages || 0

  if (isError) {
    return (
      <div className="text-destructive p-4 bg-destructive/10 rounded-md">{`${t("common.error")}: ${error.message}`}</div>
    )
  }

  return (
    <div dir={dir} className="space-y-6 bg-background p-4 sm:p-6 rounded-lg shadow-sm border">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <Heading title={t("memberBookings.pageTitle")} description={t("memberBookings.pageDescription")} />
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-2 mb-4">
        <Input
          placeholder={t("memberBookings.searchPlaceholder")}
          defaultValue={globalFilter}
          onChange={(event) => debouncedSetGlobalFilter(event.target.value)}
          className="max-w-xs h-9"
        />
        <Select onValueChange={setStatusFilter} defaultValue={statusFilter}>
          <SelectTrigger className="w-full sm:w-[180px] h-9">
            <SelectValue placeholder={t("memberBookings.filterByStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("memberBookings.status.all")}</SelectItem>
            <SelectItem value="pending_professional_assignment">
              {t("memberBookings.status.pending_professional_assignment")}
            </SelectItem>
            <SelectItem value="confirmed">{t("memberBookings.status.confirmed")}</SelectItem>
            <SelectItem value="professional_en_route">{t("memberBookings.status.professional_en_route")}</SelectItem>
            <SelectItem value="cancelled">{t("memberBookings.status.cancelled")}</SelectItem>
            <SelectItem value="completed">{t("memberBookings.status.completed")}</SelectItem>
            <SelectItem value="no_show">{t("memberBookings.status.no_show")}</SelectItem>
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-9">
              <ListFilter className="mr-2 h-4 w-4" /> {t("common.view")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("common.toggleColumns")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/* This requires DataTable to be aware of its columns to toggle visibility */}
            {/* For simplicity, this part is illustrative. Actual implementation in DataTable is needed. */}
            <DropdownMenuCheckboxItem
              checked={!columnVisibility["professionalId.name"]} // Example, assuming default is visible
              onCheckedChange={(value) => setColumnVisibility((prev) => ({ ...prev, "professionalId.name": !value }))}
              disabled={!isLoading && !bookingsData.length}
            >
              {t("bookings.table.header.professional")}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={!columnVisibility["bookingAddressSnapshot.city"]}
              onCheckedChange={(value) =>
                setColumnVisibility((prev) => ({ ...prev, "bookingAddressSnapshot.city": !value }))
              }
              disabled={!isLoading && !bookingsData.length}
            >
              {t("bookings.table.header.location")}
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isLoading && !data ? ( // Show skeleton only on initial load
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
          columnFilters={columnFilters}
          setColumnFilters={setColumnFilters}
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter} // Pass the state, not the debounced function
          columnVisibility={columnVisibility}
          setColumnVisibility={setColumnVisibility}
          isLoading={isLoading} // Pass loading state for DataTable to handle overlays or styles
          noResultsText={t("memberBookings.noBookingsFound")}
        />
      )}
    </div>
  )
}

export default MemberBookingsClient
