import { getActiveSubscriptionsForPurchase, getTreatments } from "./actions"
import type { SerializedSubscription, SerializedTreatment } from "./actions"
import GuestSubscriptionWizard from "@/components/subscriptions/guest-subscription-wizard"
import { GuestLayout } from "@/components/layout/guest-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"

// Force dynamic rendering for database access
export const dynamic = 'force-dynamic'

export default async function GuestBookSubscriptionPage() {
  const [subsData, treatmentsData] = await Promise.all([
    getActiveSubscriptionsForPurchase(),
    getTreatments({ isActive: true }),
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
      <GuestSubscriptionWizard
        subscriptions={subsData.subscriptions || []}
        treatments={treatmentsData.treatments || []}
      />
    </GuestLayout>
  )
}
