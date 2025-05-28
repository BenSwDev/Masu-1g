"use client"

import { useTranslation } from "@/lib/translations/i18n"

const MemberCouponsClient = () => {
  const { t } = useTranslation()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("memberCoupons.title")}</h1>
      <p className="text-gray-600">{t("memberCoupons.description")}</p>
    </div>
  )
}

export default MemberCouponsClient
