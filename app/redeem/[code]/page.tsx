import UnifiedRedemptionWizard from "@/components/redemption/unified-redemption-wizard"

interface Params { code: string }

export default async function RedeemPage({ params }: { params: Params }) {
  return (
    <UnifiedRedemptionWizard 
      initialCode={params.code}
      type="voucher"
    />
  )
}
