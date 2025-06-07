"use client"

import { useMemo, useState, useEffect, useCallback } from "react" // Added useEffect, useCallback
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import type { SortingState, ColumnFiltersState, VisibilityState } from "@tanstack/react-table"

import { getUserBookings, cancelBooking as cancelBookingAction } from "@/actions/booking-actions"
import { useTranslation } from "@/lib/translations/i18n" // Keep this import
import { getBookingColumns } from "./bookings-columns"
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
import { ListFilter, RefreshCwIcon as ReloadIcon, XCircle } from "lucide-react"
import { toast } from "sonner"

interface MemberBookingsClientProps {
  userId: string // Assuming userId is passed as a prop
}

// Helper function to get columns, now receives t and dir as arguments
const getColumns = (
  t: (key: string, options?: any) => string,
  dir: string,
  onCancelBooking: (bookingId: string) => void,
  onViewDetails: (bookingId: string) => void,
) => getBookingColumns({ t, dir, onCancelBooking, onViewDetails })

export default function MemberBookingsClient({ userId }: MemberBookingsClientProps) {
  // Changed to default export
  const { t, dir } = useTranslation() // Call useTranslation here
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  // State for DataTable
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const [globalFilter, setGlobalFilter] = useState("")

  const page = searchParams.get("page") ? Number(searchParams.get("page")) : 1
  const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 10
  const status = searchParams.get("status") || "all"
  const sortBy = searchParams.get("sortBy") || "bookingDateTime"
  const sortDir = searchParams.get("sortDir") || "desc"

  const createQueryString = useCallback(
    (paramsToUpdate: Record<string, string | number | undefined>) => {
      const currentParams = new URLSearchParams(searchParams.toString())
      Object.entries(paramsToUpdate).forEach(([name, value]) => {
        if (value !== undefined) {
          currentParams.set(name, String(value))
        } else {
          currentParams.delete(name)
        }
      })
      return currentParams.toString()
    },
    [searchParams],
  )

  useEffect(() => {
    const newSorting: SortingState = sortBy ? [{ id: sortBy, desc: sortDir === "desc" }] : []
    if (JSON.stringify(sorting) !== JSON.stringify(newSorting)) {
      setSorting(newSorting)
    }
  }, [sortBy, sortDir, sorting]) // Added sorting to dependency array

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["member-bookings", userId, page, limit, status, globalFilter, sorting],
    queryFn: () => {
      const queryParams = createQueryString({
        page,
        limit,
        status: status === "all" ? undefined : status,
        search: globalFilter || undefined,
        sortBy: sorting[0]?.id,
        sortDir: sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined,
      })
      router.replace(`${pathname}?${queryParams}`, { scroll: false })

      return getUserBookings(userId, {
        page,
        limit,
        status: status === "all" ? undefined : status,
        search: globalFilter || undefined,
        sortBy: sorting[0]?.id,
        sortDirection: sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined,
      })
    },
    enabled: !!userId,
    placeholderData: (previousData) => previousData,
  })

  const bookingsData = data?.bookings || []
  const pageCount = data?.totalPages || 0

  const { mutate: cancelBookingMutate, isPending: isCancelLoading } = useMutation({
    mutationFn: async (bookingId: string) => {
      if (!userId) throw new Error("User not authenticated") // Or handle appropriately
      const result = await cancelBookingAction(bookingId, userId, "user", t("memberBookings.userCancellationReason"))
      if (!result.success) {
        throw new Error(result.error ? t(`common.errors.${result.error}`) : t("common.errors.unknown"))
      }
      return result
    },
    onSuccess: () => {
      toast.success(t("memberBookings.cancelSuccess"))
      queryClient.invalidateQueries({ queryKey: ["member-bookings"] })
      setRowSelection({})
    },
    onError: (error: Error) => {
      toast.error(t("common.error") + ": " + error.message)
    },
  })

  const handleCancelSelectedBookings = () => {
    const selectedBookingIds = Object.keys(rowSelection).filter((id) => rowSelection[id])
    if (selectedBookingIds.length === 0) {
      toast.info(t("memberBookings.noBookingSelectedToCancel"))
      return
    }
    selectedBookingIds.forEach((bookingId) => {
      cancelBookingMutate(bookingId)
    })
  }

  const onViewDetails = useCallback((bookingId: string) => {
    console.log("View details for booking:", bookingId)
    // Example: router.push(`/dashboard/member/bookings/${bookingId}`);
  }, [])

  const onCancelBooking = useCallback(
    (bookingId: string) => {
      cancelBookingMutate(bookingId)
    },
    [cancelBookingMutate],
  )

  // Now call getColumns with t and dir
  const columns = useMemo(
    () => getColumns(t, dir, onCancelBooking, onViewDetails),
    [t, dir, onCancelBooking, onViewDetails],
  )

  const debouncedSetGlobalFilter = useMemo(() => {
    let timeoutId: NodeJS.Timeout
    return (value: string) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        router.replace(`${pathname}?${createQueryString({ search: value || undefined, page: 1 })}`, { scroll: false })
      }, 500)
    }
  }, [router, pathname, createQueryString])

  useEffect(() => {
    setGlobalFilter(searchParams.get("search") || "")
  }, [searchParams])

  if (isError && error) {
    return (
      <div className="text-destructive p-4 bg-destructive/10 rounded-md">{`${t("common.error")}: ${error.message}`}</div>
    )
  }

  return (
    <div dir={dir} className="space-y-6 bg-background p-4 sm:p-6 rounded-lg shadow-sm border">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <Heading title={t("memberBookings.pageTitle")} description={t("memberBookings.pageDescription")} />
        <Button onClick={() => refetch()} disabled={isLoading}>
          {isLoading ? <ReloadIcon className="mr-2 h-4 w-4 animate-spin" /> : <ReloadIcon className="mr-2 h-4 w-4" />}
          {t("common.refresh")}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-2 mb-4">
        <Input
          placeholder={t("memberBookings.searchPlaceholder")}
          value={globalFilter}
          onChange={(event) => {
            setGlobalFilter(event.target.value)
            debouncedSetGlobalFilter(event.target.value)
          }}
          className="max-w-xs h-9"
        />
        <Select
          value={status}
          onValueChange={(value) =>
            router.replace(`${pathname}?${createQueryString({ status: value, page: 1 })}`, { scroll: false })
          }
        >
          <SelectTrigger className="w-full sm:w-[200px] h-9">
            <SelectValue placeholder={t("memberBookings.filterByStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("memberBookings.status.all")}</SelectItem>
            <SelectItem value="pending_professional_assignment">
              {t("memberBookings.status.pending_professional_assignment")}
            </SelectItem>
            <SelectItem value="confirmed">{t("memberBookings.status.confirmed")}</SelectItem>
            <SelectItem value="professional_en_route">{t("memberBookings.status.professional_en_route")}</SelectItem>
            <SelectItem value="cancelled_by_user">{t("memberBookings.status.cancelled_by_user")}</SelectItem>
            <SelectItem value="cancelled_by_admin">{t("memberBookings.status.cancelled_by_admin")}</SelectItem>
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
            <DropdownMenuCheckboxItem
              checked={columnVisibility["professionalId.name"] !== false}
              onCheckedChange={(value) => setColumnVisibility((prev) => ({ ...prev, "professionalId.name": value }))}
            >
              {t("bookings.table.header.professional")}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility["bookingAddressSnapshot.city"] !== false}
              onCheckedChange={(value) =>
                setColumnVisibility((prev) => ({ ...prev, "bookingAddressSnapshot.city": value }))
              }
            >
              {t("bookings.table.header.location")}
            </DropdownMenuCheckboxItem>
            {/* Add more column toggles as needed */}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isLoading && !data?.bookings?.length ? (
        <BookingsTableSkeleton />
      ) : (
        <DataTable
          columns={columns}
          data={bookingsData}
          pageCount={pageCount}
          sorting={sorting}
          setSorting={(newSortingUpdater) => {
            const newSort = typeof newSortingUpdater === "function" ? newSortingUpdater(sorting) : newSortingUpdater
            const sortByField = newSort[0]?.id
            const sortDirField = newSort[0] ? (newSort[0].desc ? "desc" : "asc") : undefined
            router.replace(
              `${pathname}?${createQueryString({ sortBy: sortByField, sortDir: sortDirField, page: 1 })}`,
              { scroll: false },
            )
          }}
          columnFilters={columnFilters}
          setColumnFilters={setColumnFilters}
          // globalFilter={globalFilter} // DataTable doesn't need this if API handles search
          // setGlobalFilter: Handled by Input
          columnVisibility={columnVisibility}
          setColumnVisibility={setColumnVisibility}
          rowSelection={rowSelection}
          setRowSelection={setRowSelection}
          pagination={{ pageIndex: page - 1, pageSize: limit }}
          setPagination={(updater) => {
            const newPagination =
              typeof updater === "function" ? updater({ pageIndex: page - 1, pageSize: limit }) : updater
            router.replace(
              `${pathname}?${createQueryString({ page: newPagination.pageIndex + 1, limit: newPagination.pageSize })}`,
              { scroll: false },
            )
          }}
          isLoading={isLoading}
          noResultsText={t("memberBookings.noBookingsFound")}
          enableRowSelection
        />
      )}
      {Object.keys(rowSelection).filter((id) => rowSelection[id]).length > 0 && (
        <div className="flex items-center justify-end space-x-2 py-4 sticky bottom-0 bg-background/95 p-2 border-t">
          <span className="text-sm text-muted-foreground">
            {t("common.selectedCount", { count: Object.keys(rowSelection).filter((id) => rowSelection[id]).length })}
          </span>
          <Button variant="destructive" size="sm" onClick={handleCancelSelectedBookings} disabled={isCancelLoading}>
            {isCancelLoading ? (
              <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="mr-2 h-4 w-4" />
            )}
            {t("memberBookings.cancelSelectedBookings")}
          </Button>
        </div>
      )}
    </div>
  )
}
