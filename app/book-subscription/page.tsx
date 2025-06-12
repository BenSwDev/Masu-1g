import { getActiveSubscriptionsForPurchase } from "@/actions/subscription-actions"
import { getActiveTreatmentsForPurchase } from "@/actions/treatment-actions"
import GuestPurchaseSubscriptionClient from "@/components/guest/subscriptions/guest-purchase-subscription-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"

export default async function GuestBookSubscriptionPage() {
  const [subscriptionsData, treatmentsData] = await Promise.all([
    getActiveSubscriptionsForPurchase(),
    getActiveTreatmentsForPurchase(),
  ])

  if (!subscriptionsData.success || !treatmentsData.success) {
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
      <GuestPurchaseSubscriptionClient
        subscriptions={subscriptionsData.subscriptions || []}
        treatments={treatmentsData.treatments || []}
      />
    </div>
  )
} 