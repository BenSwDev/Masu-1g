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
      gradient: "from-gray-400 to-gray-600",
      activeGradient: "from-gray-500 to-gray-700",
      icon: "📋"
    },
    { 
      key: "upcoming", 
      label: t("memberBookings.filters.upcoming") || "קרובות", 
      gradient: "from-blue-400 to-blue-600",
      activeGradient: "from-blue-500 to-blue-700",
      icon: "⏰"
    },
    { 
      key: "past", 
      label: t("memberBookings.filters.past") || "עברו", 
      gradient: "from-green-400 to-green-600",
      activeGradient: "from-green-500 to-green-700",
      icon: "✅"
    },
    { 
      key: "cancelled", 
      label: t("memberBookings.filters.cancelled") || "בוטלו", 
      gradient: "from-red-400 to-red-600",
      activeGradient: "from-red-500 to-red-700",
      icon: "❌"
    },
  ]

  return (
    <div className="mb-8">
      <div className="flex gap-3 p-2 bg-gray-100 rounded-2xl">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onStatusChange(tab.key)}
            className={`relative flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300 transform hover:scale-105 ${
              currentStatus === tab.key
                ? `bg-gradient-to-r ${tab.activeGradient} text-white shadow-lg`
                : `text-gray-600 hover:text-gray-800 hover:bg-white/50`
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span className="font-semibold">{tab.label}</span>
            {currentStatus === tab.key && (
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-xl"></div>
            )}
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
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2">
            {t("memberBookings.title")}
          </h1>
          <p className="text-lg text-gray-600 font-medium">
            {t("memberBookings.description")}
          </p>
        </div>
      </div>
      <StatusTabs currentStatus={statusFilter} onStatusChange={setStatusFilter} t={t} />
      {isLoading && !data ? (
        <BookingsTableSkeleton />
      ) : (
        <div className="space-y-4">
          {/* Mobile Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:hidden mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-2xl border border-blue-200/50 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="text-sm font-medium text-blue-700">סה״כ הזמנות</div>
              </div>
              <div className="text-3xl font-bold text-blue-900">{data?.totalBookings || 0}</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-2xl border border-green-200/50 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="text-sm font-medium text-green-700">פעילות</div>
              </div>
              <div className="text-3xl font-bold text-green-900">
                {data?.bookings?.filter(b => 
                  ['pending_professional_assignment', 'confirmed', 'professional_en_route'].includes(b.status)
                ).length || 0}
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-2xl border border-purple-200/50 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <div className="text-sm font-medium text-purple-700">הושלמו</div>
              </div>
              <div className="text-3xl font-bold text-purple-900">
                {data?.bookings?.filter(b => b.status === 'completed').length || 0}
              </div>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-2xl border border-amber-200/50 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                <div className="text-sm font-medium text-amber-700">ממתינות</div>
              </div>
              <div className="text-3xl font-bold text-amber-900">
                {data?.bookings?.filter(b => 
                  ['pending_professional_assignment'].includes(b.status)
                ).length || 0}
              </div>
            </div>
          </div>

          {/* Responsive Table Container */}
          <div className="relative">
            <div className="overflow-hidden rounded-2xl bg-white shadow-lg border border-gray-200/50 backdrop-blur-sm">
              <div className="overflow-x-auto">
                <DataTable
                  columns={columns}
                  data={data?.bookings ?? []}
                  hideDefaultPagination={true}
                  hideColumnsSelector={true}
                />
              </div>
            </div>
            
            {/* Scroll indicator for mobile */}
            <div className="flex items-center justify-center mt-3 text-xs text-gray-500 lg:hidden">
              <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full">
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse"></div>
                גלול לצפייה בכל הפרטים
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Enhanced Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200/50 shadow-sm">
            <div className="flex-1 text-sm text-gray-600 text-center sm:text-right font-medium">
              עמוד <span className="font-bold text-gray-800">{pagination.pageIndex + 1}</span> מתוך <span className="font-bold text-gray-800">{data?.totalPages || 0}</span> 
              (<span className="font-bold text-primary">{data?.totalBookings || 0}</span> הזמנות סה״כ)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, pageIndex: Math.max(0, prev.pageIndex - 1) }))}
                disabled={pagination.pageIndex === 0}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-gray-300 bg-white
                         disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:bg-gray-50 enabled:hover:border-gray-400
                         enabled:hover:shadow-md transition-all duration-200 enabled:hover:scale-105"
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
                      className={`w-10 h-10 text-sm font-medium rounded-xl transition-all duration-200 hover:scale-105 ${
                        pageNum === pagination.pageIndex
                          ? 'bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 hover:shadow-md'
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
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-gray-300 bg-white
                         disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:bg-gray-50 enabled:hover:border-gray-400
                         enabled:hover:shadow-md transition-all duration-200 enabled:hover:scale-105"
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
