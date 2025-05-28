"use client"

import { useTranslation } from "@/lib/translations/i18n"

export default function GiftVouchersPage() {
  const { t } = useTranslation()

  return (
    <div>
      <h1>{t("giftVouchers.title")}</h1>
      <p>{t("giftVouchers.description")}</p>
    </div>
  )
}
