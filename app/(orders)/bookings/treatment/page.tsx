import { getGuestBookingInitialData } from "@/actions/booking-actions"
import { getGiftVoucherByCode } from "@/actions/gift-voucher-actions"
import { getUserSubscriptionById } from "@/actions/user-subscription-actions"
import GuestBookingWizard from "@/components/booking/guest-booking-wizard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { GuestLayout } from "@/components/layout/guest-layout"

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
    
    if (!initialDataResult?.success || !initialDataResult?.data) {
      console.error('Guest booking data fetch failed:', initialDataResult?.error)
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

    const voucher = voucherResult.success ? voucherResult.voucher : undefined
    const subscription = subscriptionResult.success ? subscriptionResult.subscription : undefined

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