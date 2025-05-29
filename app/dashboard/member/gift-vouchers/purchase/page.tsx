import { Suspense } from "react"
import { getTreatmentsForSelection } from "@/actions/gift-voucher-actions"
import PurchaseGiftVoucherClient from "@/components/dashboard/member/gift-vouchers/purchase-gift-voucher-client"
import { Skeleton } from "@/components/common/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
// Removed useTranslation from here as it's a server component context

export const dynamic = "force-dynamic"

function PurchaseGiftVoucherLoadingSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="rounded-lg bg-background p-6 shadow-sm border">
        <Skeleton className="h-8 w-3/5" />
        <Skeleton className="h-4 w-full mt-3" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-1/3" />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-32 rounded-md" />
              <Skeleton className="h-32 rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-4 w-1/3" />
            </div>
            <Skeleton className="h-12 w-full rounded-md" />
            <div className="flex justify-between">
              <Skeleton className="h-10 w-24 rounded-md" />
              <Skeleton className="h-10 w-40 rounded-md" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// This is now the main data fetching logic for the page (Server Component)
export default async function PurchaseGiftVoucherPage() {
  const treatmentsResult = await getTreatmentsForSelection()

  return (
    <div className="container mx-auto py-6">
      <Suspense fallback={<PurchaseGiftVoucherLoadingSkeleton />}>
        <PurchaseGiftVoucherClient
          treatments={treatmentsResult.success ? treatmentsResult.treatments || [] : []}
          fetchError={!treatmentsResult.success ? treatmentsResult.error || "Failed to load treatments" : undefined}
        />
      </Suspense>
    </div>
  )
}
