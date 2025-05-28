"use client"

import { useTranslation } from "@/lib/translations/i18n"

export default function MemberGiftVouchersPage() {
  const { t } = useTranslation()

  return (
    <div>
      <h1>{t("memberGiftVouchers.title")}</h1>
      <p>{t("memberGiftVouchers.description")}</p>
    </div>
  )
}
