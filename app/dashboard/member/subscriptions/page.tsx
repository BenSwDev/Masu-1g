import { Suspense } from "react"
import { getUserSubscriptions } from "@/actions/user-subscription-actions"
import UserSubscriptionsClient from "@/components/dashboard/member/subscriptions/user-subscriptions-client"
import { Skeleton } from "@/components/common/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/common/ui/card"
import { useTranslation } from "@/lib/translations/i18n"

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
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// קומפוננטת טעינת נתונים
async function SubscriptionsData() {
  const { t } = await useTranslation()

  const result = await getUserSubscriptions()

  if (!result.success) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-md">
        {t("common.error")}: {result.error || t("common.unknown")}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("subscriptions.mySubscriptions.title")}</h1>
        <p className="text-gray-600">{t("subscriptions.mySubscriptions.description")}</p>
      </div>

      <UserSubscriptionsClient userSubscriptions={result.userSubscriptions} />
    </div>
  )
}

export default function UserSubscriptionsPage() {
  return (
    <Suspense fallback={<SubscriptionsLoading />}>
      <SubscriptionsData />
    </Suspense>
  )
}
