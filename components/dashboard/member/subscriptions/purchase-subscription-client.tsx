"use client"

import { useTranslation } from "@/lib/translations/i18n"

const PurchaseSubscriptionClient = () => {
  const { t } = useTranslation()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("subscriptions.purchase.title")}</h1>
      <p className="text-gray-600">{t("subscriptions.purchase.description")}</p>
      {/* rest of the component */}
    </div>
  )
}

export default PurchaseSubscriptionClient
