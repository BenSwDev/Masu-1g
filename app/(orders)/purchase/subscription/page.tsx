import GuestSubscriptionWizard from "@/components/subscriptions/guest-subscription-wizard"

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function PurchaseSubscriptionPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <GuestSubscriptionWizard />
      </div>
    </div>
  )
}
