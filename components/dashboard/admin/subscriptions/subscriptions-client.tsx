"use client"

import { useTranslation } from "@/lib/translations/i18n"

const SubscriptionsClient = () => {
  const { t } = useTranslation()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("subscriptions.title")}</h1>
      <p className="text-gray-600">{t("subscriptions.description")}</p>
    </div>
  )
}

export default SubscriptionsClient
