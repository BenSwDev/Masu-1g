"use client"

import { GuestLayout } from "@/components/layout/guest-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import GuestGiftVoucherWizard from "@/components/gift-vouchers/guest-gift-voucher-wizard"
import { useTranslation } from "@/lib/translations/i18n"
import type { ITreatment } from "@/lib/db/models/treatment"
import { IUser } from "@/lib/db/models/user"
  
interface GuestGiftVoucherPageContentProps {
  success: boolean
  treatments: ITreatment[]
  currentUser: IUser
}

export default function GuestGiftVoucherPageContent({ success, treatments, currentUser }: GuestGiftVoucherPageContentProps) {
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
      <GuestGiftVoucherWizard treatments={treatments as unknown as ITreatment[]} currentUser={currentUser} />
    </GuestLayout>
  )
}

