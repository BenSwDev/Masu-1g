"use client"

import { Card, CardContent } from "@/components/common/ui/card"
import { useTranslation } from "@/lib/translations/i18n"

interface AdminUserSubscriptionsClientProps {
  userSubscriptions?: any[]
  pagination?: any
}

const AdminUserSubscriptionsClient = ({ userSubscriptions = [], pagination }: AdminUserSubscriptionsClientProps) => {
  const { t } = useTranslation()
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("userSubscriptions.title")}</h1>
      <div className="grid gap-4 mt-6">
        {userSubscriptions.length === 0 ? (
          <div className="text-center text-gray-500">{t("userSubscriptions.noUserSubscriptions")}</div>
        ) : (
          userSubscriptions.map((us) => (
            <Card key={us._id}>
              <CardContent className="p-4">
                <div>{us.user?.email}</div>
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

export default AdminUserSubscriptionsClient
