import { Suspense } from "react"
import { getMemberOwnedVouchers, getMemberPurchasedVouchers } from "@/actions/gift-voucher-actions"
import MemberGiftVouchersClient from "@/components/dashboard/member/gift-vouchers/member-gift-vouchers-client"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export const dynamic = "force-dynamic"

function MemberGiftVouchersLoading() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full mt-2" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 text-center">
              <Skeleton className="h-8 w-16 mx-auto" />
              <Skeleton className="h-4 w-24 mx-auto mt-2" />
            </CardContent>
          </Card>
        ))}
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

async function MemberGiftVouchersData() {
  const [ownedResult, purchasedResult] = await Promise.all([getMemberOwnedVouchers(""), getMemberPurchasedVouchers("")])

  if (!ownedResult.success && !purchasedResult.success) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-md">
        Error: {ownedResult.error || purchasedResult.error || "Unknown error"}
      </div>
    )
  }

  return (
    <MemberGiftVouchersClient
      initialOwnedVouchers={ownedResult.success ? ownedResult.vouchers || [] : []}
      initialPurchasedVouchers={purchasedResult.success ? purchasedResult.vouchers || [] : []}
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
