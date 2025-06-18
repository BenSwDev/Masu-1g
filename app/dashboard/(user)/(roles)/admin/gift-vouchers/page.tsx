import { getGiftVouchers, type GiftVoucherPlain } from "./actions"
import { GiftVouchersClient } from "@/components/dashboard/admin/gift-vouchers/gift-vouchers-client"
import { Suspense } from "react"
import { redirect } from "next/navigation"
import { Skeleton } from "@/components/common/ui/skeleton"
import { requireUserSession } from "@/lib/auth/require-session"

export const dynamic = "force-dynamic"
export const revalidate = 0

async function GiftVouchersData() {
  // Initial load with default parameters
  const result = await getGiftVouchers(1, 10, "", {}) // page, limit, search, filters

  if (!result.success || !result.giftVouchers || !result.pagination) {
    console.error("Failed to load gift vouchers:", result.error)
    return (
      <GiftVouchersClient initialVouchers={[]} initialPagination={{ total: 0, page: 1, limit: 10, totalPages: 0 }} />
    )
  }

  return (
    <GiftVouchersClient
      initialVouchers={result.giftVouchers}
      initialPagination={result.pagination}
    />
  )
}

function GiftVouchersLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-1/4" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="p-4 border rounded-lg space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Skeleton className="h-10 w-full lg:col-span-2" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      <div className="rounded-md border">
        <div className="hidden md:grid grid-cols-7 gap-4 p-4 border-b">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-7 gap-4 p-4 border-b">
            {[...Array(7)].map((_, j) => (
              <Skeleton key={j} className="h-5 w-full" />
            ))}
          </div>
        ))}
      </div>
      <div className="flex justify-center">
        <Skeleton className="h-10 w-64" />
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
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<GiftVouchersLoadingSkeleton />}>
        <GiftVouchersData />
      </Suspense>
    </div>
  )
}
