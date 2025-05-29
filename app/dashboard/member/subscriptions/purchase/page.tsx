import { getActiveSubscriptionsForPurchase } from "@/actions/subscription-actions"
import { getActiveTreatmentsForPurchase } from "@/actions/treatment-actions"
import { getActivePaymentMethods } from "@/actions/payment-method-actions"
import PurchaseSubscriptionClient from "@/components/dashboard/member/subscriptions/purchase-subscription-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { getTranslations } from "next-intl/server"

export default async function PurchaseSubscriptionPage() {
  const t = await getTranslations("subscriptions.purchase") // Assuming you have a namespace for this

  const [subscriptionsData, treatmentsData, paymentMethodsData] = await Promise.all([
    getActiveSubscriptionsForPurchase(),
    getActiveTreatmentsForPurchase(),
    getActivePaymentMethods(),
  ])

  if (!subscriptionsData.success || !treatmentsData.success || !paymentMethodsData.success) {
    // Handle error state more gracefully, maybe show a specific error message
    // For now, logging and showing a generic error
    console.error("Failed to load data for purchase page:", {
      subscriptionsError: subscriptionsData.error,
      treatmentsError: treatmentsData.error,
      paymentMethodsError: paymentMethodsData.error,
    })
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("errorLoadingTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{t("errorLoadingMessage")}</p>
        </CardContent>
      </Card>
    )
  }

  // console.log("Treatments fetched in page.tsx:", treatmentsData.treatments); // For debugging

  return (
    <PurchaseSubscriptionClient
      subscriptions={subscriptionsData.subscriptions}
      treatments={treatmentsData.treatments}
      paymentMethods={paymentMethodsData.paymentMethods}
    />
  )
}
