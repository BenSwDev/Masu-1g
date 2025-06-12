import { getTreatmentsForSelection } from "@/actions/gift-voucher-actions"
import GuestPurchaseGiftVoucherClient from "@/components/guest/gift-vouchers/guest-purchase-gift-voucher-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"

export default async function GuestBookGiftVoucherPage() {
  const treatmentsResult = await getTreatmentsForSelection()

  if (!treatmentsResult.success) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>שגיאה בטעינת הנתונים</CardTitle>
          </CardHeader>
          <CardContent>
            <p>אירעה שגיאה בטעינת הנתונים. אנא נסה שוב מאוחר יותר.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <GuestPurchaseGiftVoucherClient
        treatments={treatmentsResult.treatments || []}
      />
    </div>
  )
} 