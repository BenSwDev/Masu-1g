import { getSubscriptionsForSelection } from "@/actions/subscription-actions"
import { getPaymentMethods } from "@/actions/payment-method-actions"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import GuestSubscriptionClient from "@/components/guest/guest-subscription-client"
import { getUserProfile } from "@/actions/profile-actions"

interface PageProps {
  searchParams: {
    guestUserId?: string
    shouldMerge?: string
    existingUserId?: string
  }
}

export default async function GuestPurchaseSubscriptionPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions)
  
  // If user is already logged in, redirect to member subscription purchase
  if (session?.user && !searchParams.guestUserId) {
    redirect("/dashboard/member/subscriptions/purchase")
  }

  // If guest user ID is provided, we're in guest mode
  if (!searchParams.guestUserId) {
    redirect("/") // No guest session, redirect to home
  }

  // Get guest user details
  const userResult = await getUserProfile(searchParams.guestUserId)
  if (!userResult.success || !userResult.user || !userResult.user.isGuest) {
    redirect("/") // Invalid guest user
  }

  // Get initial data for subscription purchase
  const [subscriptionsResult, paymentMethodsResult] = await Promise.all([
    getSubscriptionsForSelection(),
    getPaymentMethods()
  ])

  if (!subscriptionsResult.success) {
    console.error("Failed to load subscriptions:", subscriptionsResult.error)
  }

  if (!paymentMethodsResult.success) {
    console.error("Failed to load payment methods:", paymentMethodsResult.error)
  }

  return (
    <GuestSubscriptionClient
      guestUser={userResult.user}
      shouldMerge={searchParams.shouldMerge === 'true'}
      existingUserId={searchParams.existingUserId}
      subscriptions={subscriptionsResult.subscriptions || []}
      initialPaymentMethods={paymentMethodsResult.paymentMethods || []}
    />
  )
} 