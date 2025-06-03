import PurchaseSubscriptionClient from "@/components/dashboard/member/subscriptions/purchase-subscription-client"
import { getActiveSubscriptionsForPurchase } from "@/actions/subscription-actions"
import { getActiveTreatmentsForPurchase } from "@/actions/treatment-actions"
import { getActivePaymentMethods } from "@/actions/payment-method-actions"
import { unstable_noStore as noStore } from "next/cache"
import type { PageProps } from "@/types/types" // Assuming you have a common PageProps type

// This line is crucial to ensure the page is always dynamically rendered.
export const dynamic = "force-dynamic"

async function getData() {
  noStore() // Opt out of caching for all fetches in this function

  // Fetch all data in parallel.
  // Using getActiveSubscriptionsForPurchase to fetch only active subscriptions relevant for purchase.
  // Using getActiveTreatmentsForPurchase to fetch only active treatments.
  const [subscriptionsResult, treatmentsResult, paymentMethodsResult] = await Promise.all([
    getActiveSubscriptionsForPurchase(),
    getActiveTreatmentsForPurchase(),
    getActivePaymentMethods(),
  ])

  // Log errors if any for debugging during build/runtime
  if (!subscriptionsResult.success) {
    console.error("Error fetching active subscriptions for purchase page:", subscriptionsResult.error)
  }
  if (!treatmentsResult.success) {
    console.error("Error fetching active treatments for purchase page:", treatmentsResult.error)
  }
  if (!paymentMethodsResult.success && paymentMethodsResult.error !== "Unauthorized") {
    // Log only if it's not an authorization error, as that might be expected for non-logged-in users during build
    console.error("Error fetching active payment methods for purchase page:", paymentMethodsResult.error)
  }

  return {
    subscriptions: subscriptionsResult.success ? subscriptionsResult.subscriptions : [],
    treatments: treatmentsResult.success ? treatmentsResult.treatments : [],
    paymentMethods: paymentMethodsResult.success ? paymentMethodsResult.paymentMethods : [],
    // It's often better to handle errors gracefully or log them server-side
    // rather than passing error messages directly to the client component unless specifically designed for it.
    // For now, we'll pass them for consistency with potential previous patterns.
    error:
      subscriptionsResult.error ||
      treatmentsResult.error ||
      (paymentMethodsResult.error && paymentMethodsResult.error !== "Unauthorized"
        ? paymentMethodsResult.error
        : undefined),
  }
}

export default async function PurchaseSubscriptionPage({}: PageProps) {
  const { subscriptions, treatments, paymentMethods, error } = await getData()

  if (error) {
    // You might want to render a more specific error component or message here
    console.error("Failed to load critical data for subscription purchase page:", error)
    // Depending on the severity, you could return an error UI
    // For now, the client component will likely show empty states or its own error handling
  }

  return (
    <PurchaseSubscriptionClient subscriptions={subscriptions} treatments={treatments} paymentMethods={paymentMethods} />
  )
}
