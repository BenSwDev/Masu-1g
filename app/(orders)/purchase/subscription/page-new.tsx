import SimplifiedSubscriptionWizard from "./simplified-subscription-wizard"
import { GuestLayout } from "@/components/layout/guest-layout"

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function PurchaseSubscriptionPageNew() {
  return (
    <GuestLayout>
      <SimplifiedSubscriptionWizard />
    </GuestLayout>
  )
}
