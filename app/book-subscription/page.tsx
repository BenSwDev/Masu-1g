import { getActiveSubscriptionsForPurchase } from "@/actions/subscription-actions"
import { getActiveTreatmentsForPurchase } from "@/actions/treatment-actions"
import UnifiedSubscriptionWizard from "@/components/subscriptions/unified-subscription-wizard"
import { GuestLayout } from "@/components/layout/guest-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"

export default async function GuestBookSubscriptionPage() {
  const [subsData, treatmentsData] = await Promise.all([
    getActiveSubscriptionsForPurchase(),
    getActiveTreatmentsForPurchase(),
  ])

  if (!subsData.success || !treatmentsData.success) {
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
      <UnifiedSubscriptionWizard
        subscriptions={subsData.subscriptions || []}
        treatments={treatmentsData.treatments || []}
        currentUser={null}
      />
    </GuestLayout>
  )
}
