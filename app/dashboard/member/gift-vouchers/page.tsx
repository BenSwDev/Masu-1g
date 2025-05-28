import { Suspense } from "react"
import { getMemberGiftVouchers } from "@/actions/gift-voucher-actions"
import MemberGiftVouchersClient from "@/components/dashboard/member/gift-vouchers/member-gift-vouchers-client"
import { Skeleton } from "@/components/common/ui/skeleton"
import { Card, CardContent } from "@/components/common/ui/card"

// Define the page as dynamic
export const dynamic = "force-dynamic"

// Loading component
function MemberGiftVouchersLoading() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full mt-2" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full mt-2" />
              <Skeleton className="h-4 w-24 mt-4" />
              <Skeleton className="h-8 w-full mt-4" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Data fetching component
async function MemberGiftVouchersData() {
  const result = await getMemberGiftVouchers()

  if (!result.success) {
    return <div className="p-4 bg-red-50 text-red-600 rounded-md">Error: {result.error || "Unknown error"}</div>
  }

  return (
    <MemberGiftVouchersClient
      giftVouchers={result.giftVouchers || []}
      pagination={
        result.pagination || {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        }
      }
    />
  )
}

export default function MemberGiftVouchersPage() {
  return (
    <Suspense fallback={<MemberGiftVouchersLoading />}>
      <MemberGiftVouchersData />
    </Suspense>
  )
}
