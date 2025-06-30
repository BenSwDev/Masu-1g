import { getGiftVouchers, type GiftVoucherPlain } from "./actions"
import { GiftVouchersClient } from "@/components/dashboard/admin/gift-vouchers/gift-vouchers-client"
import { Suspense } from "react"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import GiftVoucherAdminCardSkeleton from "@/components/dashboard/admin/gift-vouchers/gift-voucher-admin-card-skeleton"
import { requireUserSession } from "@/lib/auth/require-session"

export const dynamic = "force-dynamic"
export const revalidate = 0

// Error component for data fetching failure
function DataFetchError({ error }: { error?: string }) {
  const defaultError = "An unexpected error occurred while loading gift voucher data."
  const errorTitle = "Error Loading Gift Vouchers"

  return (
    <div className="p-6">
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-40 p-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-6 h-6 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">{errorTitle}</h3>
            <p className="text-gray-500 dark:text-gray-400">{error || defaultError}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

async function GiftVouchersData() {
  try {
    // Initial load with default parameters
    const result = await getGiftVouchers(1, 10, "", {}) // page, limit, search, filters

    if (!result.success || !result.giftVouchers || !result.pagination) {
      console.error("Failed to load gift vouchers:", result.error)
      return <DataFetchError error={result.error || "Failed to load gift vouchers."} />
    }

    return (
      <div className="p-6">
        <GiftVouchersClient
          initialVouchers={result.giftVouchers}
          initialPagination={result.pagination}
        />
      </div>
    )
  } catch (error) {
    console.error("Error loading gift vouchers:", error)
    return <DataFetchError error="An unexpected error occurred while fetching gift vouchers." />
  }
}

function GiftVouchersLoadingSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-10 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-10 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>

      {/* Statistics Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array(4)
          .fill(0)
          .map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
                <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1" />
                <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Filters Skeleton */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array(5)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              ))}
          </div>
          <div className="flex justify-between">
            <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="flex gap-2">
              <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array(6)
          .fill(0)
          .map((_, i) => (
            <GiftVoucherAdminCardSkeleton key={i} />
          ))}
      </div>

      {/* Pagination Skeleton */}
      <div className="flex justify-center">
        <div className="h-10 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    </div>
  )
}

export default async function GiftVouchersPage() {
  const session = await requireUserSession()
  if (!session.user.roles?.includes("admin")) {
    redirect("/dashboard")
  }

  return (
    <Suspense fallback={<GiftVouchersLoadingSkeleton />}>
      <GiftVouchersData />
    </Suspense>
  )
}
