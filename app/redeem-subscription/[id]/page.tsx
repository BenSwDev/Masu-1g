import UnifiedRedemptionWizard from "@/components/redemption/unified-redemption-wizard"

interface Params { id: string }

export default async function RedeemSubscriptionPage({ params }: { params: Params }) {
  return (
    <UnifiedRedemptionWizard 
      initialId={params.id}
      type="subscription"
    />
  )
}
