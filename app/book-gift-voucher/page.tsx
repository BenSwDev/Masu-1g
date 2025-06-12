import { getTreatmentsForSelection } from "@/actions/gift-voucher-actions"
import GuestPurchaseGiftVoucherClient from "@/components/gift-vouchers/guest-purchase-gift-voucher-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { GuestLayout } from "@/components/layout/guest-layout"

export default async function GuestBookGiftVoucherPage() {
  const treatmentsResult = await getTreatmentsForSelection()

  if (!treatmentsResult.success) {
    return (
      <GuestLayout>
        <Card>
          <CardHeader>
            <CardTitle>שגיאה בטעינת הנתונים</CardTitle>
          </CardHeader>
          <CardContent>
            <p>אירעה שגיאה בטעינת הנתונים. אנא נסה שוב מאוחר יותר.</p>
          </CardContent>
        </Card>
      </GuestLayout>
    )
  }

  return (
    <GuestLayout>
      <GuestPurchaseGiftVoucherClient
        treatments={treatmentsResult.treatments || []}
      />
    </GuestLayout>
  )
} 