import { Suspense } from "react"
import { getMemberOwnedVouchers, getMemberPurchasedVouchers } from "@/actions/gift-voucher-actions"
import MemberGiftVouchersClient from "@/components/dashboard/member/gift-vouchers/member-gift-vouchers-client"
import { Skeleton } from "@/components/common/ui/skeleton"
import { Card, CardContent } from "@/components/common/ui/card"
import Link from "next/link"
import { Button } from "@/components/common/ui/button"
import { PlusCircle } from "lucide-react"
import { useTranslation } from "@/lib/translations/i18n"

// Define the page as dynamic
export const dynamic = "force-dynamic"

// Loading component
function MemberGiftVouchersLoading() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full mt-2 max-w-md" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      <div className="flex space-x-2 mb-6">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
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
  const [ownedResult, purchasedResult] = await Promise.all([getMemberOwnedVouchers(), getMemberPurchasedVouchers()])

  if (!ownedResult.success || !purchasedResult.success) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-md">
        Error: {ownedResult.error || purchasedResult.error || "Unknown error"}
      </div>
    )
  }

  return (
    <MemberGiftVouchersClient
      ownedVouchers={ownedResult.giftVouchers || []}
      purchasedVouchers={purchasedResult.giftVouchers || []}
    />
  )
}

export default function MemberGiftVouchersPage() {
  const { t } = useTranslation()

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t("giftVouchers.title")}</h1>
        <Link href="/dashboard/member/gift-vouchers/purchase">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            {t("giftVouchers.purchaseVoucher")}
          </Button>
        </Link>
      </div>

      <Suspense fallback={<MemberGiftVouchersLoading />}>
        <MemberGiftVouchersData />
      </Suspense>
    </div>
  )
}
