import { getUserSubscriptionById } from "@/actions/user-subscription-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import Link from "next/link"

interface Params { id: string }

export default async function RedeemSubscriptionPage({ params }: { params: Params }) {
  const result = await getUserSubscriptionById(params.id)
  if (!result.success || !result.subscription) {
    return (
      <div className="max-w-xl mx-auto py-10 text-center">
        <p className="text-destructive">מנוי לא נמצא או שאינו תקף</p>
      </div>
    )
  }
  const sub: any = result.subscription
  const treatmentName = sub.treatmentId?.name
  const total = sub.totalQuantity
  const remaining = sub.remainingQuantity
  return (
    <div className="max-w-xl mx-auto space-y-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>פרטי המנוי</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span>טיפול:</span>
            <span>{treatmentName}</span>
          </div>
          <div className="flex justify-between">
            <span>יתרה:</span>
            <span>
              {remaining} / {total}
            </span>
          </div>
        </CardContent>
      </Card>
      <div className="text-center">
        <Button asChild>
          <Link href={`/bookings/treatment?subscriptionId=${params.id}`}>ממש מנוי</Link>
        </Button>
      </div>
    </div>
  )
}
