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
      label: t("memberBookings.filters.all") || "הכל", 
      color: "text-gray-600 hover:text-gray-800"
    },
    { 
      key: "upcoming", 
      label: t("memberBookings.filters.upcoming") || "קרובות", 
      color: "text-blue-600 hover:text-blue-800"
    },
    { 
      key: "past", 
      label: t("memberBookings.filters.past") || "עברו", 
      color: "text-green-600 hover:text-green-800"
    },
    { 
      key: "cancelled", 
      label: t("memberBookings.filters.cancelled") || "בוטלו", 
      color: "text-red-600 hover:text-red-800"
    },
  ]

  return (
    <div className="border-b border-border mb-6">
      <nav className="flex space-x-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onStatusChange(tab.key)}
            className={`py-3 px-6 border-b-2 font-medium text-sm transition-all duration-200 ${
              currentStatus === tab.key
                ? "border-primary text-primary bg-primary/5"
                : `border-transparent ${tab.color}`
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
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
      <div className="px-1">
        <h1 className="text-2xl font-bold tracking-tight text-right">{t("memberBookings.title")}</h1>
        <p className="text-muted-foreground text-right">{t("memberBookings.description")}</p>
      </div>
      <StatusTabs currentStatus={statusFilter} onStatusChange={setStatusFilter} t={t} />
      {isLoading && !data ? (
        <BookingsTableSkeleton />
      ) : (
        <div className="space-y-4">
          {/* Mobile Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:hidden">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="text-sm font-medium text-blue-700">סה״כ הזמנות</div>
              <div className="text-2xl font-bold text-blue-900">{data?.totalBookings || 0}</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <div className="text-sm font-medium text-green-700">פעילות</div>
              <div className="text-2xl font-bold text-green-900">
                {data?.bookings?.filter(b => 
                  ['pending_professional_assignment', 'confirmed', 'professional_en_route'].includes(b.status)
                ).length || 0}
              </div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
              <div className="text-sm font-medium text-purple-700">הושלמו</div>
              <div className="text-2xl font-bold text-purple-900">
                {data?.bookings?.filter(b => b.status === 'completed').length || 0}
              </div>
            </div>
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
              <div className="text-sm font-medium text-amber-700">ממתינות</div>
              <div className="text-2xl font-bold text-amber-900">
                {data?.bookings?.filter(b => 
                  ['pending_professional_assignment'].includes(b.status)
                ).length || 0}
              </div>
            </div>
          </div>

          {/* Responsive Table Container */}
          <div className="relative">
            <div className="overflow-x-auto border rounded-lg bg-card shadow-sm">
              <div className="min-w-full inline-block align-middle">
                <DataTable
                  columns={columns}
                  data={data?.bookings ?? []}
                />
              </div>
            </div>
            
            {/* Scroll indicator for mobile */}
            <div className="flex items-center justify-center mt-2 text-xs text-muted-foreground lg:hidden">
              גלול לצפייה בכל הפרטים
            </div>
          </div>

          {/* Enhanced Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4 bg-muted/20 rounded-lg border">
            <div className="flex-1 text-sm text-muted-foreground text-center sm:text-right">
              עמוד <strong>{pagination.pageIndex + 1}</strong> מתוך <strong>{data?.totalPages || 0}</strong> 
              (<strong>{data?.totalBookings || 0}</strong> הזמנות סה״כ)
            </div>
            <div className="flex items-center space-x-2 gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, pageIndex: Math.max(0, prev.pageIndex - 1) }))}
                disabled={pagination.pageIndex === 0}
                className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed 
                         hover:bg-muted/50 transition-colors bg-background shadow-sm"
              >
                הקודם
              </button>
              
              {/* Page numbers */}
              <div className="hidden sm:flex items-center gap-1">
                {Array.from({ length: Math.min(5, data?.totalPages || 0) }, (_, i) => {
                  const pageNum = Math.max(0, Math.min((data?.totalPages || 0) - 5, pagination.pageIndex - 2)) + i
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPagination(prev => ({ ...prev, pageIndex: pageNum }))}
                      className={`w-8 h-8 text-sm rounded ${
                        pageNum === pagination.pageIndex
                          ? 'bg-primary text-primary-foreground font-bold'
                          : 'hover:bg-muted/50 border'
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
                className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed 
                         hover:bg-muted/50 transition-colors bg-background shadow-sm"
              >
                הבא
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
