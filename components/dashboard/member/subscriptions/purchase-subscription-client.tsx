"use client"

import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent } from "@/components/common/ui/card"

interface PurchaseSubscriptionClientProps {
  subscriptions?: any[]
  paymentMethods?: any[]
}

const PurchaseSubscriptionClient = ({ subscriptions = [], paymentMethods = [] }: PurchaseSubscriptionClientProps) => {
  const { t } = useTranslation()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("subscriptions.purchase.title")}</h1>
      <p className="text-gray-600">{t("subscriptions.purchase.description")}</p>
      <div className="grid gap-4 mt-6">
        {subscriptions.length === 0 ? (
          <div className="text-center text-gray-500">{t("subscriptions.purchase.noSubscriptions")}</div>
        ) : (
          subscriptions.map((sub) => (
            <Card key={sub._id}>
              <CardContent className="p-4">
                <div>{sub.name}</div>
                <div>{sub.price}</div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      <h2 className="text-xl font-bold text-gray-900 mt-8 mb-2">{t("paymentMethods.title")}</h2>
      <div className="grid gap-4 mt-2">
        {paymentMethods.length === 0 ? (
          <div className="text-center text-gray-500">{t("paymentMethods.noPaymentMethods")}</div>
        ) : (
          paymentMethods.map((pm) => (
            <Card key={pm._id}>
              <CardContent className="p-4">
                <div>{pm.cardName}</div>
                <div>{pm.cardNumber}</div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

export default PurchaseSubscriptionClient
