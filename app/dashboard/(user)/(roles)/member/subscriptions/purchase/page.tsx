import { getActiveSubscriptionsForPurchase } from "@/actions/subscription-actions"
import { getActiveTreatmentsForPurchase } from "@/actions/treatment-actions"
import GuestSubscriptionWizard from "@/components/subscriptions/guest-subscription-wizard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"

// Force this page to be dynamic since it requires user authentication
export const dynamic = 'force-dynamic'

export default async function PurchaseSubscriptionPage() {
  const [subscriptionsData, treatmentsData] = await Promise.all([
    getActiveSubscriptionsForPurchase(),
    getActiveTreatmentsForPurchase(),
  ])

  if (!subscriptionsData.success || !treatmentsData.success) {
    console.error("Failed to load data for purchase page:", {
      subscriptionsError: subscriptionsData.error,
      treatmentsError: treatmentsData.error,
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

  // Convert data to the format expected by GuestSubscriptionWizard
  const serializedSubscriptions = subscriptionsData.subscriptions?.map(sub => ({
    _id: sub._id.toString(),
    name: sub.name,
    description: sub.description,
    quantity: sub.quantity,
    bonusQuantity: sub.bonusQuantity,
    validityMonths: sub.validityMonths,
    isActive: sub.isActive,
    createdAt: sub.createdAt.toISOString(),
    updatedAt: sub.updatedAt.toISOString(),
  })) || []

  const serializedTreatments = treatmentsData.treatments?.map(treatment => ({
    _id: treatment._id.toString(),
    name: treatment.name,
    description: treatment.description,
    category: treatment.category,
    pricingType: treatment.pricingType,
    fixedPrice: treatment.fixedPrice,
    durations: treatment.durations?.map((d: any) => ({
      _id: d._id.toString(),
      minutes: d.minutes,
      price: d.price,
      professionalPrice: d.professionalPrice,
      isActive: d.isActive,
    })),
    isActive: treatment.isActive,
    createdAt: treatment.createdAt.toISOString(),
    updatedAt: treatment.updatedAt.toISOString(),
  })) || []

  return (
    <GuestSubscriptionWizard
      subscriptions={serializedSubscriptions}
      treatments={serializedTreatments}
    />
  )
}
