import { Suspense } from "react"
import { getMemberOwnedVouchers, getMemberPurchasedVouchers } from "@/actions/gift-voucher-actions"
import MemberGiftVouchersClient from "@/components/dashboard/member/gift-vouchers/member-gift-vouchers-client"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { requireUserSession } from "@/lib/auth"

// Simple error component for data fetch errors
function DataFetchError() {
  return (
    <div className="text-center p-8">
      <p className="text-red-500">Error loading gift vouchers. Please try again later.</p>
    </div>
  )
}

export const dynamic = "force-dynamic"

// Simple error component for data fetch errors
function DataFetchError() {
  return (
    <div className="text-center p-8">
      <p className="text-red-500">Error loading gift vouchers. Please try again later.</p>
    </div>
  )
}

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
  try {
    const session = await requireUserSession()
    if (!session.user.id) {
      throw new Error("User not found")
    }

    // Load initial data
    const [ownedResult, purchasedResult] = await Promise.all([
      getMemberOwnedVouchers(session.user.id),
      getMemberPurchasedVouchers(session.user.id),
    ])

    return (
      <MemberGiftVouchersClient
        initialOwnedVouchers={ownedResult.success ? ownedResult.vouchers || [] : []}
        initialPurchasedVouchers={purchasedResult.success ? purchasedResult.vouchers || [] : []}
        userId={session.user.id}
      />
    )
  } catch (error) {
    console.error("Error loading member gift vouchers:", error)
    return <DataFetchError />
  }
}

export default function MemberGiftVouchersPage() {
  return (
    <Suspense fallback={<MemberGiftVouchersLoading />}>
      <MemberGiftVouchersData />
    </Suspense>
  )
}
