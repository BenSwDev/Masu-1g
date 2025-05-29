import { Suspense } from "react"
import { Skeleton } from "@/components/common/ui/skeleton"
import PurchaseGiftVoucherClient from "@/components/dashboard/member/gift-vouchers/purchase-gift-voucher-client"

export default function PurchaseGiftVoucherPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">רכישת שובר מתנה</h1>
        <p className="text-muted-foreground mt-2">רכוש שובר מתנה לטיפול או סכום כספי</p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-6">
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[300px] w-full" />
            <Skeleton className="h-[100px] w-full" />
          </div>
        }
      >
        <PurchaseGiftVoucherClient />
      </Suspense>
    </div>
  )
}
