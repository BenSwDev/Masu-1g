"use client"

import { useTranslation } from "@/lib/translations/i18n"

const UserSubscriptionsClient = () => {
  const { t } = useTranslation()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("subscriptions.my.title")}</h1>
      <p className="text-gray-600">{t("subscriptions.my.description")}</p>
    </div>
  )
}

export default UserSubscriptionsClient
