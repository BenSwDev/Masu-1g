import { getActiveSubscriptionsForPurchase, getTreatments } from "./actions"
import type { SerializedSubscription, SerializedTreatment } from "./actions"
import GuestBookSubscriptionContent from "./guest-book-subscription-content"

// Force dynamic rendering for database access
export const dynamic = 'force-dynamic'

export default async function GuestBookSubscriptionPage() {
  const [subsData, treatmentsData] = await Promise.all([
    getActiveSubscriptionsForPurchase(),
    getTreatments({ isActive: true }),
  ])

  return (
    <GuestBookSubscriptionContent
      subsData={subsData}
      treatmentsData={treatmentsData}
    />
  )
}

