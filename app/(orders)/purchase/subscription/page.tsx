import { getActiveSubscriptionsForPurchase, getTreatments } from "./actions"
import type { SerializedSubscription, SerializedTreatment } from "./actions"
import GuestSubscriptionWizard from "@/components/subscriptions/guest-subscription-wizard"
import { GuestLayout } from "@/components/layout/guest-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { useTranslation } from "@/lib/translations/i18n"

// Force dynamic rendering for database access
export const dynamic = 'force-dynamic'

export default async function GuestBookSubscriptionPage() {
  const [subsData, treatmentsData] = await Promise.all([
    getActiveSubscriptionsForPurchase(),
    getTreatments({ isActive: true }),
  ])

  return (
    <GuestBookSubscriptionContent
      subsData={subsData}
      treatmentsData={treatmentsData}
    />
  )
}

interface GuestBookSubscriptionContentProps {
  subsData: Awaited<ReturnType<typeof getActiveSubscriptionsForPurchase>>
  treatmentsData: Awaited<ReturnType<typeof getTreatments>>
}

function GuestBookSubscriptionContent({ subsData, treatmentsData }: GuestBookSubscriptionContentProps) {
  "use client"
  const { t, language, dir } = useTranslation()

  if (!subsData.success || !treatmentsData.success) {
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
      <GuestSubscriptionWizard
        subscriptions={subsData.subscriptions || []}
        treatments={treatmentsData.treatments || []}
      />
    </GuestLayout>
  )
}
