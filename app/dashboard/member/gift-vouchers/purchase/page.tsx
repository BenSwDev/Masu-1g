import { Suspense } from "react"
import { getTreatmentsForSelection } from "@/actions/gift-voucher-actions"
import PurchaseGiftVoucherClient from "@/components/dashboard/member/gift-vouchers/purchase-gift-voucher-client"
import { Skeleton } from "@/components/common/ui/skeleton"
import { Card, CardContent } from "@/components/common/ui/card"
import { useTranslation } from "@/lib/translations/i18n"

export const dynamic = "force-dynamic"

function PurchaseGiftVoucherLoading() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full mt-2" />
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-32" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

async function PurchaseGiftVoucherData() {
  const { t } = useTranslation()
  const treatmentsResult = await getTreatmentsForSelection()

  if (!treatmentsResult.success) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-md">
        {t("common.error")}: {treatmentsResult.error || t("common.failedToLoadTreatments")}
      </div>
    )
  }

  return <PurchaseGiftVoucherClient treatments={treatmentsResult.treatments} />
}

export default function PurchaseGiftVoucherPage() {
  return (
    <Suspense fallback={<PurchaseGiftVoucherLoading />}>
      <PurchaseGiftVoucherData />
    </Suspense>
  )
}
