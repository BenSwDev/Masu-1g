import { getGuestBookingInitialData } from "@/actions/booking-actions"
import { getGiftVoucherByCode } from "@/actions/gift-voucher-actions"
import { getUserSubscriptionById } from "@/actions/user-subscription-actions"

import GuestBookTreatmentContent from "./guest-book-treatment-content"

// Force dynamic rendering to handle searchParams
export const dynamic = 'force-dynamic'

export default async function GuestBookTreatmentPage({
  searchParams,
}: {
  searchParams?: { voucherCode?: string; subscriptionId?: string }
}) {
  try {
    const voucherCode = searchParams?.voucherCode
    const subscriptionId = searchParams?.subscriptionId

    const [initialDataResult, voucherResult, subscriptionResult] = await Promise.all([
      getGuestBookingInitialData(),
      voucherCode ? getGiftVoucherByCode(voucherCode) : Promise.resolve({ success: false }),
      subscriptionId ? getUserSubscriptionById(subscriptionId) : Promise.resolve({ success: false }),
    ])

    const voucher = voucherResult.success && 'voucher' in voucherResult ? (voucherResult as any).voucher : undefined
    const subscription = subscriptionResult.success && 'subscription' in subscriptionResult ? (subscriptionResult as any).subscription : undefined

    return (
      <GuestBookTreatmentContent
        success={Boolean(initialDataResult?.success && initialDataResult?.data)}
        initialData={initialDataResult?.data}
        voucher={voucher}
        subscription={subscription}
      />
    )
  } catch (error) {
    console.error('Error in guest book treatment page:', error)
    return <GuestBookTreatmentContent success={false} />
  }
}

