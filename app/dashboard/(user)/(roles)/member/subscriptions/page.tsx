import { Suspense } from "react"
import { getUserSubscriptions } from "@/actions/user-subscription-actions"
import UserSubscriptionsClient from "@/components/dashboard/member/subscriptions/user-subscriptions-client"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

// הגדרת הדף כדינמי
export const dynamic = "force-dynamic"

// קומפוננטת טעינה
function SubscriptionsLoading() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full mt-2" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32 mt-2" />
              <Skeleton className="h-4 w-28 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// קומפוננטת טעינת נתונים
async function SubscriptionsData() {
  const result = await getUserSubscriptions()

  if (!result.success) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-md">
        Error: {result.error || "Unknown error"}
      </div>
    )
  }

  return (
    <UserSubscriptionsClient
      userSubscriptions={result.userSubscriptions}
      pagination={result.pagination}
    />
  )
}

export default function UserSubscriptionsPage() {
  return (
    <Suspense fallback={<SubscriptionsLoading />}>
      <SubscriptionsData />
    </Suspense>
  )
}
