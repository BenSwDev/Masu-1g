import { getGuestBookingInitialData, getBookingInitialData } from "@/actions/booking-actions"
import { getGiftVoucherByCode } from "@/actions/gift-voucher-actions"
import { getUserSubscriptionById } from "@/actions/user-subscription-actions"
import GuestBookingWizard from "@/components/booking/guest-booking-wizard"
import BookingWizard from "@/components/dashboard/member/book-treatment/booking-wizard"
import MemberRedemptionModal from "@/components/booking/member-redemption-modal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { GuestLayout } from "@/components/layout/guest-layout"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import type { UserSessionData } from "@/types/next-auth"

// Force dynamic rendering to handle searchParams
export const dynamic = 'force-dynamic'

export default async function GuestBookTreatmentPage({
  searchParams,
}: {
  searchParams?: { voucherCode?: string; subscriptionId?: string }
}) {
  try {
    const session = await getServerSession(authOptions)
    const voucherCode = searchParams?.voucherCode
    const subscriptionId = searchParams?.subscriptionId

    const [initialDataResult, voucherResult, subscriptionResult] = await Promise.all([
      session?.user?.id ? getBookingInitialData(session.user.id) : getGuestBookingInitialData(),
      voucherCode ? getGiftVoucherByCode(voucherCode) : Promise.resolve({ success: false }),
      subscriptionId ? getUserSubscriptionById(subscriptionId) : Promise.resolve({ success: false }),
    ])
    
    if (!initialDataResult?.success || !initialDataResult?.data) {
      console.error('Booking data fetch failed:', initialDataResult?.error)
      return (
        <GuestLayout>
          <Card>
            <CardHeader>
              <CardTitle>שגיאה בטעינת הנתונים</CardTitle>
            </CardHeader>
            <CardContent>
              <p>אירעה שגיאה בטעינת הנתונים. אנא נסה שוב מאוחר יותר.</p>
            </CardContent>
          </Card>
        </GuestLayout>
      )
    }

    const voucher = voucherResult.success && 'voucher' in voucherResult ? (voucherResult as any).voucher : undefined
    const subscription = subscriptionResult.success && 'subscription' in subscriptionResult ? (subscriptionResult as any).subscription : undefined

    if (session?.user?.id) {
      return (
        <GuestLayout>
          <MemberRedemptionModal
            subscriptions={initialDataResult.data.activeUserSubscriptions}
            vouchers={initialDataResult.data.usableGiftVouchers}
          />
          <BookingWizard
            initialData={initialDataResult.data}
            currentUser={session.user as UserSessionData}
          />
        </GuestLayout>
      )
    }

    return (
      <GuestLayout>
        <GuestBookingWizard
          initialData={initialDataResult.data}
          voucher={voucher}
          userSubscription={subscription}
        />
      </GuestLayout>
    )
  } catch (error) {
    console.error('Error in guest book treatment page:', error)
    return (
      <GuestLayout>
        <Card>
          <CardHeader>
            <CardTitle>שגיאה בטעינת הנתונים</CardTitle>
          </CardHeader>
          <CardContent>
            <p>אירעה שגיאה בטעינת הנתונים. אנא נסה שוב מאוחר יותר.</p>
          </CardContent>
        </Card>
      </GuestLayout>
    )
  }
} 