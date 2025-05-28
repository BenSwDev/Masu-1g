"use client"

import { useTranslation } from "@/lib/translations/i18n"

interface SubscriptionsClientProps {
  initialSubscriptions?: any[]
  treatments?: any[]
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

const SubscriptionsClient = ({ initialSubscriptions = [], treatments = [], pagination }: SubscriptionsClientProps) => {
  const { t } = useTranslation()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("subscriptions.title")}</h1>
      <p className="text-gray-600">{t("subscriptions.description")}</p>
    </div>
  )
}

export default SubscriptionsClient
