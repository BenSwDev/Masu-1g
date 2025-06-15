import { getTreatmentsForSelection } from "@/actions/gift-voucher-actions"
import UnifiedGiftVoucherWizard from "@/components/gift-vouchers/unified-gift-voucher-wizard"
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
      <UnifiedGiftVoucherWizard 
        treatments={treatmentsResult.treatments || []} 
        currentUser={null}
      />
    </GuestLayout>
  )
} 