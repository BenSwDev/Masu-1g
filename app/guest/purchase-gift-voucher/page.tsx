import { getTreatmentsForSelection } from "@/actions/gift-voucher-actions"
import { getPaymentMethods } from "@/actions/payment-method-actions"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import GuestGiftVoucherClient from "@/components/guest/guest-gift-voucher-client"
import { getUserProfile } from "@/actions/profile-actions"

interface PageProps {
  searchParams: {
    guestUserId?: string
    shouldMerge?: string
    existingUserId?: string
  }
}

export default async function GuestPurchaseGiftVoucherPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions)
  
  // If user is already logged in, redirect to member gift voucher purchase
  if (session?.user && !searchParams.guestUserId) {
    redirect("/dashboard/member/gift-vouchers/purchase")
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

  // Get initial data for gift voucher purchase
  const [treatmentsResult, paymentMethodsResult] = await Promise.all([
    getTreatmentsForSelection(),
    getPaymentMethods()
  ])

  if (!treatmentsResult.success) {
    console.error("Failed to load treatments:", treatmentsResult.error)
  }

  if (!paymentMethodsResult.success) {
    console.error("Failed to load payment methods:", paymentMethodsResult.error)
  }

  return (
    <GuestGiftVoucherClient
      guestUser={userResult.user}
      shouldMerge={searchParams.shouldMerge === 'true'}
      existingUserId={searchParams.existingUserId}
      treatments={treatmentsResult.treatments || []}
      initialPaymentMethods={paymentMethodsResult.paymentMethods || []}
    />
  )
} 