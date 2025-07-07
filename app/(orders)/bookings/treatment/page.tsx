import { getGuestBookingInitialData, getBookingInitialData } from "@/actions/booking-actions"
import { getGiftVoucherByCode } from "@/actions/gift-voucher-actions"
import { getUserSubscriptionById } from "@/actions/user-subscription-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { GuestLayout } from "@/components/layout/guest-layout"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { Suspense } from "react"
import dynamic from "next/dynamic"

// Dynamic imports for large components
const UniversalBookingWizard = dynamic(() => import("@/components/booking/guest-booking-wizard"), {
  loading: () => <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>,
  ssr: false
})

const MemberRedemptionModal = dynamic(() => import("@/components/booking/member-redemption-modal"), {
  loading: () => null,
  ssr: false
})

// Force dynamic rendering to handle searchParams
export const dynamic = 'force-dynamic'

export default async function UniversalBookTreatmentPage({
  searchParams,
}: {
  searchParams?: Promise<{ voucherCode?: string; subscriptionId?: string; category?: string }>
}) {
  try {
    const session = await getServerSession(authOptions)
    
    // ✅ תיקון: טיפול בטוח ב-searchParams
    let resolvedSearchParams: { voucherCode?: string; subscriptionId?: string; category?: string } = {}
    try {
      resolvedSearchParams = searchParams ? await searchParams : {}
    } catch (error) {
      console.error("Error resolving searchParams:", error)
      resolvedSearchParams = {}
    }
    
    const voucherCode = resolvedSearchParams?.voucherCode
    const subscriptionId = resolvedSearchParams?.subscriptionId
    const category = resolvedSearchParams?.category

    // Always use getBookingInitialData to get full data regardless of user status
    const initialDataResult = session?.user?.id 
      ? await getBookingInitialData(session.user.id)
      : await getGuestBookingInitialData()

    // Only load voucher/subscription data if needed
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
        {/* Show redemption modal only for logged-in users - lazy loaded */}
        {session?.user?.id && (
          <Suspense fallback={null}>
            <MemberRedemptionModal
              subscriptions={initialDataResult.data.activeUserSubscriptions || []}
              vouchers={initialDataResult.data.usableGiftVouchers || []}
            />
          </Suspense>
        )}
        
        {/* Universal booking wizard - lazy loaded */}
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        }>
          <UniversalBookingWizard
            initialData={initialDataResult.data}
            currentUser={session?.user ? {
              id: session.user.id,
              name: session.user.name || undefined,
              email: session.user.email || undefined,
              phone: session.user.phone || undefined,
              gender: session.user.gender || undefined,
              dateOfBirth: session.user.dateOfBirth || undefined,
              roles: session.user.roles || undefined,
            } : null}
            voucher={voucher}
            userSubscription={subscription}
            initialCategory={category}
          />
        </Suspense>
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