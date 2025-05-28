"use client"

import { useTranslation } from "@/lib/translations/i18n"
import SubscriptionCard from "./subscription-card"
import { useState } from "react"

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
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions)

  const handleEdit = (subscription: any) => {
    // TODO: open edit dialog/modal
  }
  const handleDelete = (subscriptionId: string) => {
    setSubscriptions(subscriptions.filter(s => s._id !== subscriptionId))
    // TODO: call delete action
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("subscriptions.title")}</h1>
      <p className="text-gray-600">{t("subscriptions.description")}</p>
      <div className="grid gap-4 mt-6">
        {initialSubscriptions.map((subscription) => (
          <SubscriptionCard
            key={subscription._id}
            subscription={subscription}
            onEdit={() => {}}
            onDelete={() => {}}
          />
        ))}
      </div>
    </div>
  )
}

export default SubscriptionsClient
