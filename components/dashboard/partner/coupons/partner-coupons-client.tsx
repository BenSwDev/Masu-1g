"use client"

import { useTranslation } from "@/lib/translations/i18n"

const PartnerCouponsClient = () => {
  const { t } = useTranslation()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("partnerCoupons.title")}</h1>
      <p className="text-gray-600">{t("partnerCoupons.description")}</p>
    </div>
  )
}

export default PartnerCouponsClient
