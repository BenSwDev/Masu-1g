import { Suspense } from "react"
import { getSubscriptions, getAllTreatments } from "@/actions/subscription-actions"
import SubscriptionsClient from "@/components/dashboard/admin/subscriptions/subscriptions-client"
import { Skeleton } from "@/components/common/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/common/ui/card"

// קומפוננטת טעינה
function SubscriptionsLoading() {
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
          <div className="space-y-4">
            <div className="flex justify-between">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-10 w-32" />
            </div>
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// קומפוננטת טעינת נתונים
async function SubscriptionsData() {
  const { getTranslations } = await import("@/lib/translations/i18n")
  const t = await getTranslations()

  const [subscriptionsResult, treatmentsResult] = await Promise.all([getSubscriptions(), getAllTreatments()])

  if (!subscriptionsResult.success || !treatmentsResult.success) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-md">
        {t("common.error")}: {subscriptionsResult.error || treatmentsResult.error || t("common.unknown")}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("subscriptions.title")}</h1>
        <p className="text-gray-600">{t("subscriptions.description")}</p>
      </div>

      <SubscriptionsClient
        initialSubscriptions={subscriptionsResult.subscriptions}
        treatments={treatmentsResult.treatments}
        pagination={subscriptionsResult.pagination}
      />
    </div>
  )
}

export default function SubscriptionsPage() {
  return (
    <Suspense fallback={<SubscriptionsLoading />}>
      <SubscriptionsData />
    </Suspense>
  )
}
