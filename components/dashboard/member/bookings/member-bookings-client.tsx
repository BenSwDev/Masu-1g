"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "@/lib/translations/i18n"
import { getUserBookings } from "@/actions/booking-actions"
import { getBookingColumns } from "./bookings-columns"
import { DataTable } from "@/components/common/ui/data-table"
import { BookingsTableSkeleton } from "./bookings-table-skeleton"
import type { PopulatedBooking } from "@/types/booking"
import { Button } from "@/components/common/ui/button"

// Status Tabs Component
const StatusTabs = ({ 
  currentStatus, 
  onStatusChange, 
  t 
}: { 
  currentStatus: string
  onStatusChange: (status: string) => void
  t: (key: string) => string 
}) => {
  const tabs = [
    { 
      key: "all", 
      label: t("memberBookings.filters.all") || "הכל"
    },
    { 
      key: "upcoming", 
      label: t("memberBookings.filters.upcoming") || "קרובות"
    },
    { 
      key: "past", 
      label: t("memberBookings.filters.past") || "עברו"
    },
    { 
      key: "cancelled", 
      label: t("memberBookings.filters.cancelled") || "בוטלו"
    },
  ]

  return (
    <div className="mb-8">
      <div className="inline-flex bg-gray-50 p-1 rounded-lg border border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onStatusChange(tab.key)}
            className={`px-6 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${
              currentStatus === tab.key
                ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function MemberBookingsClient({ userId }: { userId: string }) {
  const { t, language } = useTranslation()
  const locale = language
  const [statusFilter, setStatusFilter] = useState("upcoming")
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })

  // Create columns with useMemo to avoid recreation and ensure client-side only
  const columns = useMemo(() => getBookingColumns(t, locale), [t, locale])

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
    staleTime: 30000, // 30 seconds
  })

  if (isError) {
    return <div className="text-red-500 p-4">Error loading bookings: {error?.message}</div>
  }

  return (
    <div className="space-y-4">
      <div className="mb-8">
        <div className="text-right mb-6">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            {t("memberBookings.title")}
          </h1>
          <p className="text-gray-600">
            {t("memberBookings.description")}
          </p>
        </div>
      </div>
      <StatusTabs currentStatus={statusFilter} onStatusChange={setStatusFilter} t={t} />
      {isLoading && !data ? (
        <BookingsTableSkeleton />
      ) : (
        <div className="space-y-6">
          {/* Mobile Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:hidden">
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">סה״כ הזמנות</div>
              <div className="text-2xl font-semibold text-gray-900 mt-1">{data?.totalBookings || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">פעילות</div>
              <div className="text-2xl font-semibold text-gray-900 mt-1">
                {data?.bookings?.filter(b => 
                  ['pending_professional_assignment', 'confirmed', 'professional_en_route'].includes(b.status)
                ).length || 0}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">הושלמו</div>
              <div className="text-2xl font-semibold text-gray-900 mt-1">
                {data?.bookings?.filter(b => b.status === 'completed').length || 0}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">ממתינות</div>
              <div className="text-2xl font-semibold text-gray-900 mt-1">
                {data?.bookings?.filter(b => 
                  ['pending_professional_assignment'].includes(b.status)
                ).length || 0}
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <DataTable
              columns={columns}
              data={data?.bookings ?? []}
              hideDefaultPagination={true}
              hideColumnsSelector={true}
            />
            
            {/* Scroll indicator for mobile */}
            <div className="flex items-center justify-center py-3 text-xs text-gray-500 lg:hidden border-t border-gray-100">
              גלול לצפייה בכל הפרטים
            </div>
          </div>

          {/* Enhanced Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex-1 text-sm text-gray-600 text-center sm:text-right">
              עמוד <span className="font-medium text-gray-900">{pagination.pageIndex + 1}</span> מתוך <span className="font-medium text-gray-900">{data?.totalPages || 0}</span> 
              (<span className="font-medium text-gray-900">{data?.totalBookings || 0}</span> הזמנות סה״כ)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, pageIndex: Math.max(0, prev.pageIndex - 1) }))}
                disabled={pagination.pageIndex === 0}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white
                         disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:bg-gray-50 enabled:hover:border-gray-400
                         transition-colors duration-200"
              >
                ← הקודם
              </button>
              
              {/* Page numbers */}
              <div className="hidden sm:flex items-center gap-1">
                {Array.from({ length: Math.min(5, data?.totalPages || 0) }, (_, i) => {
                  const pageNum = Math.max(0, Math.min((data?.totalPages || 0) - 5, pagination.pageIndex - 2)) + i
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPagination(prev => ({ ...prev, pageIndex: pageNum }))}
                      className={`w-10 h-10 text-sm font-medium rounded-md transition-colors duration-200 ${
                        pageNum === pagination.pageIndex
                          ? 'bg-gray-900 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                      }`}
                    >
                      {pageNum + 1}
                    </button>
                  )
                })}
              </div>
              
              <button
                onClick={() => setPagination(prev => ({ ...prev, pageIndex: prev.pageIndex + 1 }))}
                disabled={pagination.pageIndex >= (data?.totalPages ?? 0) - 1}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white
                         disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:bg-gray-50 enabled:hover:border-gray-400
                         transition-colors duration-200"
              >
                הבא →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
