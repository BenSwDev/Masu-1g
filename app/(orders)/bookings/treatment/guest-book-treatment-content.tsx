"use client"

import { GuestLayout } from "@/components/layout/guest-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import GuestBookingWizard from "@/components/booking/guest-booking-wizard"
import { useTranslation } from "@/lib/translations/i18n"

interface GuestBookTreatmentContentProps {
  success: boolean
  initialData?: Awaited<
    ReturnType<typeof import("@/actions/booking-actions").getGuestBookingInitialData>
  >["data"]
  voucher?: any
  subscription?: any
}

export default function GuestBookTreatmentContent({
  success,
  initialData,
  voucher,
  subscription,
}: GuestBookTreatmentContentProps) {
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
