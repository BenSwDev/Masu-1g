"use client"

import { useTranslation } from "@/lib/translations/i18n"

export default function CouponsPage() {
  const { t } = useTranslation()

  return (
    <div>
      <h1>{t("coupons.title")}</h1>
      <p>{t("coupons.description")}</p>
    </div>
  )
}
