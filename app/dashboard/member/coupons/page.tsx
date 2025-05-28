"use client"

import { useTranslation } from "@/lib/translations/i18n"

export default function MemberCouponsPage() {
  const { t } = useTranslation()

  return (
    <div>
      <h1>{t("memberCoupons.title")}</h1>
      <p>{t("memberCoupons.description")}</p>
    </div>
  )
}
