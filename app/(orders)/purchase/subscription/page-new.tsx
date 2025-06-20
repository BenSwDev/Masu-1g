import SimplifiedSubscriptionWizard from "./simplified-subscription-wizard"

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function PurchaseSubscriptionPageNew() {
  return (
    <div className="min-h-screen bg-background">
      <SimplifiedSubscriptionWizard />
    </div>
  )
} 