import GuestSubscriptionWizard from "@/components/subscriptions/guest-subscription-wizard"
import { GuestLayout } from "@/components/layout/guest-layout"

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function PurchaseSubscriptionPage() {
  return (
    <GuestLayout>
      <GuestSubscriptionWizard />
    </GuestLayout>
  )
}
