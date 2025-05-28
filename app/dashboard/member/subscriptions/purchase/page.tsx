import { Suspense } from "react"
import { getSubscriptions } from "@/actions/subscription-actions"
import { getPaymentMethods } from "@/actions/payment-method-actions"
import PurchaseSubscriptionClient from "@/components/dashboard/member/subscriptions/purchase-subscription-client"
import { Skeleton } from "@/components/common/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/common/ui/card"
import { useTranslation } from "@/lib/translations/i18n"

// קומפוננטת טעינה
function PurchaseLoading() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full mt-2" />
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// קומפוננטת טעינת נתונים
async function PurchaseData() {
  const { t } = await useTranslation()

  const [subscriptionsResult, paymentMethodsResult] = await Promise.all([
    getSubscriptions({ isActive: true }),
    getPaymentMethods(),
  ])

  if (!subscriptionsResult.success) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-md">
        {t("common.error")}: {subscriptionsResult.error || t("common.unknown")}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("subscriptions.purchase.title")}</h1>
        <p className="text-gray-600">{t("subscriptions.purchase.description")}</p>
      </div>

      <PurchaseSubscriptionClient
        subscriptions={subscriptionsResult.subscriptions}
        paymentMethods={paymentMethodsResult.success ? paymentMethodsResult.paymentMethods : []}
      />
    </div>
  )
}

export default function PurchaseSubscriptionPage() {
  return (
    <Suspense fallback={<PurchaseLoading />}>
      <PurchaseData />
    </Suspense>
  )
}
