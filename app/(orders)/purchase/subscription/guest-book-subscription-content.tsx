"use client"

import { GuestLayout } from "@/components/layout/guest-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import GuestSubscriptionWizard from "@/components/subscriptions/guest-subscription-wizard"
import { useTranslation } from "@/lib/translations/i18n"
import type { getActiveSubscriptionsForPurchase, getTreatments } from "./actions"

interface GuestBookSubscriptionContentProps {
  subsData: Awaited<ReturnType<typeof getActiveSubscriptionsForPurchase>>
  treatmentsData: Awaited<ReturnType<typeof getTreatments>>
}

export default function GuestBookSubscriptionContent({ subsData, treatmentsData }: GuestBookSubscriptionContentProps) {
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

