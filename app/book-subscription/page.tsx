import { getActiveSubscriptionsForPurchase } from "@/actions/subscription-actions"
import { getActiveTreatmentsForPurchase } from "@/actions/treatment-actions"
import GuestPurchaseSubscriptionClient from "@/components/subscriptions/guest-purchase-subscription-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { GuestLayout } from "@/components/layout/guest-layout"

export default async function GuestBookSubscriptionPage() {
  const [subscriptionsData, treatmentsData] = await Promise.all([
    getActiveSubscriptionsForPurchase(),
    getActiveTreatmentsForPurchase(),
  ])

  if (!subscriptionsData.success || !treatmentsData.success) {
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
      <GuestPurchaseSubscriptionClient
        subscriptions={subscriptionsData.subscriptions || []}
        treatments={treatmentsData.treatments || []}
      />
    </GuestLayout>
  )
} 