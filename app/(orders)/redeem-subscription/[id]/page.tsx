import { getUserSubscriptionById } from "@/actions/user-subscription-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import Link from "next/link"
import { useTranslation } from "@/lib/translations/i18n"

interface Params { id: string }

export default async function RedeemSubscriptionPage({ params }: { params: Params }) {
  const result = await getUserSubscriptionById(params.id)
  const subscription = result.success && result.subscription ? result.subscription : null
  return <RedeemSubscriptionContent subscription={subscription} id={params.id} />
}

interface RedeemSubscriptionContentProps {
  subscription: Awaited<ReturnType<typeof getUserSubscriptionById>>["subscription"] | null
  id: string
}

function RedeemSubscriptionContent({ subscription, id }: RedeemSubscriptionContentProps) {
  "use client"
  const { t, language, dir } = useTranslation()

  if (!subscription) {
    return (
      <div className="max-w-xl mx-auto py-10 text-center px-4" dir={dir} lang={language}>
        <p className="text-destructive">{t("subscriptions.redeem.notFound")}</p>
      </div>
    )
  }

  const treatmentName = subscription.treatmentId?.name
  const total = subscription.totalQuantity
  const remaining = subscription.remainingQuantity

  return (
    <div className="max-w-xl mx-auto space-y-6 py-10 px-4" dir={dir} lang={language}>
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>{t("subscriptions.detailsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm md:text-base">
          <div className="flex justify-between">
            <span>{t("subscriptions.treatment")}</span>
            <span>{treatmentName}</span>
          </div>
          <div className="flex justify-between">
            <span>{t("subscriptions.remaining")}</span>
            <span>
              {remaining} / {total}
            </span>
          </div>
        </CardContent>
      </Card>
      <div className="text-center">
        <Button asChild>
          <Link href={`/bookings/treatment?subscriptionId=${id}`}>{t("subscriptions.redeemSubscription")}</Link>
        </Button>
      </div>
    </div>
  )
}
