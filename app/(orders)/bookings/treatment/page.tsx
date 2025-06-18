import { getGuestBookingInitialData } from "@/actions/booking-actions"
import { getGiftVoucherByCode } from "@/actions/gift-voucher-actions"
import { getUserSubscriptionById } from "@/actions/user-subscription-actions"
import GuestBookingWizard from "@/components/booking/guest-booking-wizard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { GuestLayout } from "@/components/layout/guest-layout"
import { useTranslation } from "@/lib/translations/i18n"

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

interface GuestBookTreatmentContentProps {
  success: boolean
  initialData?: Awaited<ReturnType<typeof getGuestBookingInitialData>>["data"]
  voucher?: any
  subscription?: any
}

function GuestBookTreatmentContent({ success, initialData, voucher, subscription }: GuestBookTreatmentContentProps) {
  "use client"
  const { t, language, dir } = useTranslation()

  if (!success || !initialData) {
    return (
      <GuestLayout>
        <Card className="max-w-xl mx-auto mt-10 p-4" dir={dir} lang={language}>
          <CardHeader>
            <CardTitle>{t("common.dataLoadError")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{t("common.tryAgain")}</p>
          </CardContent>
        </Card>
      </GuestLayout>
    )
  }

  return (
    <GuestLayout>
      <GuestBookingWizard
        initialData={initialData}
        voucher={voucher}
        userSubscription={subscription}
      />
    </GuestLayout>
  )
}
