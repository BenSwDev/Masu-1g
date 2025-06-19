import { getGuestBookingInitialData, getBookingInitialData } from "@/actions/booking-actions"
import { getGiftVoucherByCode } from "@/actions/gift-voucher-actions"
import { getUserSubscriptionById } from "@/actions/user-subscription-actions"
import UniversalBookingWizard from "@/components/booking/guest-booking-wizard"
import MemberRedemptionModal from "@/components/booking/member-redemption-modal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { GuestLayout } from "@/components/layout/guest-layout"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"

// Force dynamic rendering to handle searchParams
export const dynamic = 'force-dynamic'

export default async function UniversalBookTreatmentPage({
  searchParams,
}: {
  searchParams?: { voucherCode?: string; subscriptionId?: string }
}) {
  try {
    const session = await getServerSession(authOptions)
    const voucherCode = searchParams?.voucherCode
    const subscriptionId = searchParams?.subscriptionId

    // Always use getBookingInitialData to get full data regardless of user status
    const initialDataResult = session?.user?.id 
      ? await getBookingInitialData(session.user.id)
      : await getGuestBookingInitialData()

    const [voucherResult, subscriptionResult] = await Promise.all([
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

    return (
      <GuestLayout>
        {/* Show redemption modal only for logged-in users */}
        {session?.user?.id && (
          <MemberRedemptionModal
            subscriptions={initialDataResult.data.activeUserSubscriptions || []}
            vouchers={initialDataResult.data.usableGiftVouchers || []}
          />
        )}
        
        {/* Universal booking wizard for both logged-in users and guests */}
        <UniversalBookingWizard
          initialData={initialDataResult.data}
          currentUser={session?.user}
          voucher={voucher}
          userSubscription={subscription}
        />
      </GuestLayout>
    )
  } catch (error) {
    console.error('Error in universal book treatment page:', error)
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