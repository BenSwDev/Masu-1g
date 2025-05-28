import { Suspense } from "react"
import { getAllUserSubscriptions } from "@/actions/user-subscription-actions"
import AdminUserSubscriptionsClient from "@/components/dashboard/admin/user-subscriptions/admin-user-subscriptions-client"
import { Skeleton } from "@/components/common/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/common/ui/card"

// קומפוננטת טעינה
function UserSubscriptionsLoading() {
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
            <Skeleton className="h-96 w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// קומפוננטת טעינת נתונים
async function UserSubscriptionsData() {
  const result = await getAllUserSubscriptions()

  if (!result.success) {
    return <div className="p-4 bg-red-50 text-red-600 rounded-md">Error: {result.error || "Unknown error"}</div>
  }

  return <AdminUserSubscriptionsClient userSubscriptions={result.userSubscriptions} pagination={result.pagination} />
}

export default function AdminUserSubscriptionsPage() {
  return (
    <Suspense fallback={<UserSubscriptionsLoading />}>
      <UserSubscriptionsData />
    </Suspense>
  )
}
