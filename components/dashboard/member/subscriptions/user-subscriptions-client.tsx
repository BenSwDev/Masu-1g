"use client"

import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent } from "@/components/common/ui/card"

interface UserSubscriptionsClientProps {
  userSubscriptions?: any[]
  pagination?: any
}

const UserSubscriptionsClient = ({ userSubscriptions = [], pagination }: UserSubscriptionsClientProps) => {
  const { t } = useTranslation()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("subscriptions.my.title")}</h1>
      <p className="text-gray-600">{t("subscriptions.my.description")}</p>
      <div className="grid gap-4 mt-6">
        {userSubscriptions.length === 0 ? (
          <div className="text-center text-gray-500">{t("subscriptions.my.noSubscriptions")}</div>
        ) : (
          userSubscriptions.map((us) => (
            <Card key={us._id}>
              <CardContent className="p-4">
                <div>{us.subscriptionId?.name}</div>
                <div>{us.status}</div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

export default UserSubscriptionsClient
