import { Suspense } from "react"
import { notFound } from "next/navigation"
import GuestSubscriptionConfirmation from "@/components/subscriptions/guest-subscription-confirmation"
import { GuestLayout } from "@/components/layout/guest-layout"
import dbConnect from "@/lib/db/mongoose"
import UserSubscription from "@/lib/db/models/user-subscription"

interface SearchParams {
  subscriptionId?: string
  status?: string
}

interface Props {
  searchParams: Promise<SearchParams>
}

// Get actual subscription data from database
async function getSubscriptionPurchaseData(subscriptionId: string) {
  try {
    await dbConnect()
    
    const userSubscription = await UserSubscription.findById(subscriptionId)
      .populate('subscriptionId')
      .populate('treatmentId')
      .lean()

    if (!userSubscription) {
      return null
    }

    const subscription = userSubscription.subscriptionId as any
    const treatment = userSubscription.treatmentId as any
    
    // Get duration details if available
    let duration = null
    if (userSubscription.selectedDurationId && treatment.durations) {
      duration = treatment.durations.find((d: any) => 
        d._id.toString() === userSubscription.selectedDurationId?.toString()
      )
    }

    return {
      subscription: {
        name: subscription.name,
        description: subscription.description,
        quantity: subscription.quantity,
        bonusQuantity: subscription.bonusQuantity,
        validityMonths: subscription.validityMonths,
      },
      treatment: {
        name: treatment.name,
        description: treatment.description,
        pricingType: treatment.pricingType,
        fixedPrice: treatment.fixedPrice,
      },
      duration: duration ? {
        minutes: duration.minutes,
        price: duration.price,
      } : null,
      totalAmount: userSubscription.paymentAmount || 0,
      purchaseDate: userSubscription.purchaseDate,
      expiryDate: userSubscription.expiryDate,
      subscriptionCode: userSubscription.code, // Add subscription code
    }
  } catch (error) {
    console.error("Error fetching subscription purchase data:", error)
    return null
  }
}

export default async function SubscriptionConfirmationPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams
  const { subscriptionId, status } = resolvedSearchParams

  if (!subscriptionId || status !== "success") {
    notFound()
  }

  const userSubscription = await getSubscriptionPurchaseData(subscriptionId)

  if (!userSubscription) {
    notFound()
  }

  return (
    <GuestLayout>
      <Suspense fallback={<div>טוען...</div>}>
        <GuestSubscriptionConfirmation userSubscription={userSubscription} />
      </Suspense>
    </GuestLayout>
  )
} 