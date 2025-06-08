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
      icon: "📋",
      color: "text-gray-600 border-gray-300 hover:text-gray-800 hover:border-gray-400"
    },
    { 
      key: "upcoming", 
      label: t("memberBookings.filters.upcoming") || "קרובות", 
      icon: "⏰",
      color: "text-blue-600 border-blue-300 hover:text-blue-800 hover:border-blue-400"
    },
    { 
      key: "past", 
      label: t("memberBookings.filters.past") || "עברו", 
      icon: "✅",
      color: "text-green-600 border-green-300 hover:text-green-800 hover:border-green-400"
    },
    { 
      key: "cancelled", 
      label: t("memberBookings.filters.cancelled") || "בוטלו", 
      icon: "❌",
      color: "text-red-600 border-red-300 hover:text-red-800 hover:border-red-400"
    },
  ]

  return (
    <div className="border-b border-border mb-6 bg-muted/30 rounded-t-lg">
      <nav className="flex space-x-1 p-1 bg-background/50 rounded-t-lg">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onStatusChange(tab.key)}
            className={`flex items-center gap-2 py-3 px-4 border-b-3 font-medium text-sm transition-all duration-200 rounded-t-lg flex-1 justify-center ${
              currentStatus === tab.key
                ? "border-primary text-primary bg-primary/10 shadow-sm"
                : `border-transparent ${tab.color} bg-transparent hover:bg-muted/30`
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span className="font-bold">{tab.label}</span>
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
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200">
              <div className="text-sm font-medium text-blue-600">סה״כ הזמנות</div>
              <div className="text-lg font-bold text-blue-900">{data?.totalBookings || 0}</div>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-green-100 p-3 rounded-lg border border-green-200">
              <div className="text-sm font-medium text-green-600">הזמנות פעילות</div>
              <div className="text-lg font-bold text-green-900">
                {data?.bookings?.filter(b => 
                  ['pending_professional_assignment', 'confirmed', 'professional_en_route'].includes(b.status)
                ).length || 0}
              </div>
            </div>
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-3 rounded-lg border border-purple-200">
              <div className="text-sm font-medium text-purple-600">הושלמו</div>
              <div className="text-lg font-bold text-purple-900">
                {data?.bookings?.filter(b => b.status === 'completed').length || 0}
              </div>
            </div>
            <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-3 rounded-lg border border-amber-200">
              <div className="text-sm font-medium text-amber-600">בטיפול</div>
              <div className="text-lg font-bold text-amber-900">
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
              👈 גלול לצפייה בכל הפרטים 👉
            </div>
          </div>

          {/* Enhanced Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4 bg-muted/20 rounded-lg border">
            <div className="flex-1 text-sm text-muted-foreground text-center sm:text-right">
              📊 <strong>עמוד {pagination.pageIndex + 1}</strong> מתוך <strong>{data?.totalPages || 0}</strong> 
              (<strong>{data?.totalBookings || 0}</strong> הזמנות סה״כ)
            </div>
            <div className="flex items-center space-x-2 gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, pageIndex: Math.max(0, prev.pageIndex - 1) }))}
                disabled={pagination.pageIndex === 0}
                className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed 
                         hover:bg-muted/50 transition-colors bg-background shadow-sm"
              >
                ⬅️ <span className="hidden sm:inline">הקודם</span>
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
                <span className="hidden sm:inline">הבא</span> ➡️
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
