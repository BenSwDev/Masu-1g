import { Suspense } from "react"
import { getPartnerCoupons } from "@/actions/coupon-actions"
import PartnerCouponsClient from "@/components/dashboard/partner/coupons/partner-coupons-client"
import { Skeleton } from "@/components/common/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/common/ui/card"

// Define the page as dynamic
export const dynamic = "force-dynamic"

// Loading component
function PartnerCouponsLoading() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full mt-2" />
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-10 w-32" />
            </div>
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Data fetching component
async function PartnerCouponsData() {
  const result = await getPartnerCoupons()

  if (!result.success) {
    return <div className="p-4 bg-red-50 text-red-600 rounded-md">Error: {result.error || "Unknown error"}</div>
  }

  return (
    <PartnerCouponsClient
      coupons={result.coupons || []}
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

export default function PartnerCouponsPage() {
  return (
    <Suspense fallback={<PartnerCouponsLoading />}>
      <PartnerCouponsData />
    </Suspense>
  )
}
