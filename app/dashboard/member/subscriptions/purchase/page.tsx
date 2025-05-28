import { Suspense } from "react"
import { getActiveSubscriptions } from "@/actions/subscription-actions"
import { getPaymentMethods } from "@/actions/payment-method-actions"
import PurchaseSubscriptionClient from "@/components/dashboard/member/subscriptions/purchase-subscription-client"
import { Skeleton } from "@/components/common/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/common/ui/card"

// קומפוננטת טעינה
function PurchaseLoading() {
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
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-full mt-4" />
              <Skeleton className="h-10 w-full mt-4" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// קומפוננטת טעינת נתונים
async function PurchaseData() {
  const [subscriptionsResult, paymentMethodsResult] = await Promise.all([getActiveSubscriptions(), getPaymentMethods()])

  if (!subscriptionsResult.success || !paymentMethodsResult.success) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-md">
        Error: {subscriptionsResult.error || paymentMethodsResult.error || "Unknown error"}
      </div>
    )
  }

  return (
    <PurchaseSubscriptionClient
      subscriptions={subscriptionsResult.subscriptions}
      paymentMethods={paymentMethodsResult.paymentMethods}
    />
  )
}

export default function PurchaseSubscriptionPage() {
  return (
    <Suspense fallback={<PurchaseLoading />}>
      <PurchaseData />
    </Suspense>
  )
}
