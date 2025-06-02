export const dynamic = "force-dynamic"

import { getActiveSubscriptionsForPurchase } from "@/actions/subscription-actions"
import { getActiveTreatmentsForPurchase } from "@/actions/treatment-actions"
import { getActivePaymentMethods } from "@/actions/payment-method-actions"
import PurchaseSubscriptionClient from "@/components/dashboard/member/subscriptions/purchase-subscription-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"

export default async function PurchaseSubscriptionPage() {
  const [subscriptionsData, treatmentsData, paymentMethodsData] = await Promise.all([
    getActiveSubscriptionsForPurchase(),
    getActiveTreatmentsForPurchase(),
    getActivePaymentMethods(),
  ])

  if (!subscriptionsData.success || !treatmentsData.success || !paymentMethodsData.success) {
    // Handle error state more gracefully
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

  // Debug log to verify treatments are being fetched
  console.log("Treatments fetched:", treatmentsData.treatments?.length || 0)

  return (
    <PurchaseSubscriptionClient
      subscriptions={subscriptionsData.subscriptions || []}
      treatments={treatmentsData.treatments || []}
      paymentMethods={paymentMethodsData.paymentMethods || []}
    />
  )
}
