"use client"

import { useTranslation } from "@/lib/translations/i18n"

const AdminUserSubscriptionsClient = () => {
  const { t } = useTranslation()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("subscriptions.users.title")}</h1>
      <p className="text-gray-600">{t("subscriptions.users.description")}</p>
      {/* Rest of the component implementation will go here */}
    </div>
  )
}

export default AdminUserSubscriptionsClient
