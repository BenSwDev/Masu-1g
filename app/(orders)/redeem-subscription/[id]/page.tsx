import { getUserSubscriptionById } from "@/actions/user-subscription-actions"
import RedeemSubscriptionContent from "./redeem-subscription-content"

interface Params { id: string }

export default async function RedeemSubscriptionPage({ params }: { params: Params }) {
  const result = await getUserSubscriptionById(params.id)
  const subscription = result.success && result.subscription ? result.subscription : null
  return <RedeemSubscriptionContent subscription={subscription} id={params.id} />
}

