"use client"

import { useTranslation } from "@/lib/translations/i18n"

export default function PartnerCouponsPage() {
  const { t } = useTranslation()

  return (
    <div>
      <h1>{t("partnerCoupons.title")}</h1>
      <p>{t("partnerCoupons.description")}</p>
    </div>
  )
}
