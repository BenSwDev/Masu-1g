import { getActiveSubscriptionsForPurchase } from "@/actions/subscription-actions"
import { getActiveTreatmentsForPurchase } from "@/actions/treatment-actions"
import { getActivePaymentMethods } from "@/actions/payment-method-actions"
import UnifiedSubscriptionWizard from "@/components/subscriptions/unified-subscription-wizard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"

// Force this page to be dynamic since it requires user authentication
export const dynamic = 'force-dynamic'

export default async function PurchaseSubscriptionPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect("/auth/login")
  }

  const [subscriptionsData, treatmentsData, paymentMethodsData] = await Promise.all([
    getActiveSubscriptionsForPurchase(),
    getActiveTreatmentsForPurchase(),
    getActivePaymentMethods(),
  ])

  if (!subscriptionsData.success || !treatmentsData.success || !paymentMethodsData.success) {
    console.error("Failed to load data for purchase page:", {
      subscriptionsError: subscriptionsData.error,
      treatmentsError: treatmentsData.error,
      paymentMethodsError: paymentMethodsData.error,
    })

    return (
      <Card>
        <CardHeader>
          <CardTitle>שגיאה בטעינת הנתונים</CardTitle>
        </CardHeader>
        <CardContent>
          <p>אירעה שגיאה בטעינת הנתונים. אנא נסה שוב מאוחר יותר.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <UnifiedSubscriptionWizard
      subscriptions={subscriptionsData.subscriptions || []}
      treatments={treatmentsData.treatments || []}
      initialPaymentMethods={paymentMethodsData.paymentMethods || []}
      currentUser={session.user}
    />
  )
}
