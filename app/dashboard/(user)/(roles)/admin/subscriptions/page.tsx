import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getSubscriptions, getAllTreatments } from "@/app/dashboard/(user)/(roles)/admin/subscriptions/actions"
import SubscriptionsClient from "@/components/dashboard/admin/subscriptions/subscriptions-client"
import { Skeleton } from "@/components/common/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/common/ui/card"
import { requireUserSession } from "@/lib/auth/require-session"

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
  const [subscriptionsResult, treatmentsResult] = await Promise.all([getSubscriptions(), getAllTreatments()])

  if (!subscriptionsResult.success || !treatmentsResult.success) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-md">
        Error: {subscriptionsResult.error || treatmentsResult.error || "Unknown error"}
      </div>
    )
  }

  return (
    <SubscriptionsClient
      initialSubscriptions={
        Array.isArray(subscriptionsResult.subscriptions)
          ? subscriptionsResult.subscriptions.map((obj: any) => ({
              _id: String(obj._id),
              name: obj.name ?? "",
              description: obj.description ?? "",
              quantity: obj.quantity ?? 0,
              bonusQuantity: obj.bonusQuantity ?? 0,
              validityMonths: obj.validityMonths ?? 0,
              isActive: obj.isActive ?? false,
              createdAt: obj.createdAt,
              updatedAt: obj.updatedAt,
            }))
          : []
      }
      treatments={treatmentsResult.treatments || []}
      pagination={
        subscriptionsResult.pagination || {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        }
      }
    />
  )
}

export default async function SubscriptionsPage() {
  const session = await requireUserSession()
  if (!session.user.roles?.includes("admin")) {
    redirect("/dashboard")
  }

  return (
    <Suspense fallback={<SubscriptionsLoading />}>
      <SubscriptionsData />
    </Suspense>
  )
}
