"use client"

import { GuestLayout } from "@/components/layout/guest-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import GuestGiftVoucherWizard from "@/components/gift-vouchers/guest-gift-voucher-wizard"
import { useTranslation } from "@/lib/translations/i18n"
import type { Treatment } from "@/types/core"

interface GuestGiftVoucherPageContentProps {
  success: boolean
  treatments: Treatment[]
}

export default function GuestGiftVoucherPageContent({
  success,
  treatments,
}: GuestGiftVoucherPageContentProps) {
  const { t, language, dir } = useTranslation()

  if (!success) {
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
      <GuestGiftVoucherWizard treatments={treatments} />
    </GuestLayout>
  )
}
