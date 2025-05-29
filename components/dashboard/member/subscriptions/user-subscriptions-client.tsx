"use client"

import { useTranslation } from "@/lib/translations/i18n"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { useRouter } from "next/navigation"
import { formatDate } from "@/lib/utils/utils"
import { useSubscription, cancelSubscription } from "@/actions/user-subscription-actions"
import { toast } from "sonner"
import { AlertModal } from "@/components/common/modals/alert-modal"

interface UserSubscriptionsClientProps {
  userSubscriptions?: any[]
  pagination?: any
}

const UserSubscriptionsClient = ({ userSubscriptions = [], pagination }: UserSubscriptionsClientProps) => {
  const { t } = useTranslation()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [subscriptionToCancel, setSubscriptionToCancel] = useState<string | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">{t("subscriptions.status.active")}</Badge>
      case "expired":
        return <Badge variant="secondary">{t("subscriptions.status.expired")}</Badge>
      case "depleted":
        return <Badge variant="outline">{t("subscriptions.status.depleted")}</Badge>
      case "cancelled":
        return <Badge variant="destructive">{t("subscriptions.status.cancelled")}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleUseSubscription = async (id: string) => {
    setIsLoading(true)
    try {
      const result = await useSubscription(id)
      if (result.success) {
        toast.success(t("subscriptions.useSuccess"))
        router.refresh()
      } else {
        toast.error(result.error || t("subscriptions.useError"))
      }
    } catch (error) {
      toast.error(t("subscriptions.useError"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelClick = (id: string) => {
    setSubscriptionToCancel(id)
    setShowCancelModal(true)
  }

  const handleCancelSubscription = async () => {
    if (!subscriptionToCancel) return

    setIsLoading(true)
    try {
      const result = await cancelSubscription(subscriptionToCancel)
      if (result.success) {
        toast.success(t("subscriptions.cancelSuccess"))
        router.refresh()
        setShowCancelModal(false)
      } else {
        toast.error(result.error || t("subscriptions.cancelError"))
      }
    } catch (error) {
      toast.error(t("subscriptions.cancelError"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("subscriptions.my.title")}</h1>
          <p className="text-gray-600">{t("subscriptions.my.description")}</p>
        </div>
        <Button onClick={() => router.push("/dashboard/member/subscriptions/purchase")}>
          {t("subscriptions.purchase.new")}
        </Button>
      </div>

      {userSubscriptions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-40 p-6">
            <p className="text-gray-500 mb-4">{t("subscriptions.my.noSubscriptions")}</p>
            <Button onClick={() => router.push("/dashboard/member/subscriptions/purchase")}>
              {t("subscriptions.purchase.new")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {userSubscriptions.map((subscription) => (
            <Card key={subscription._id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{subscription.subscriptionId?.name}</CardTitle>
                  {getStatusBadge(subscription.status)}
                </div>
                <CardDescription>
                  {t("treatments.name")}: {subscription.treatmentId?.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t("subscriptions.remaining")}:</span>
                    <span className="font-medium">
                      {subscription.remainingQuantity} / {subscription.totalQuantity}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t("subscriptions.purchaseDate")}:</span>
                    <span>{formatDate(subscription.purchaseDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t("subscriptions.expiryDate")}:</span>
                    <span>{formatDate(subscription.expiryDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t("common.price")}:</span>
                    <span>{subscription.paymentAmount} ₪</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <div className="flex gap-2 w-full">
                  <Button
                    variant="default"
                    className="flex-1"
                    disabled={subscription.status !== "active" || subscription.remainingQuantity <= 0 || isLoading}
                    onClick={() => handleUseSubscription(subscription._id)}
                  >
                    {t("subscriptions.use")}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={subscription.status !== "active" || isLoading}
                    onClick={() => handleCancelClick(subscription._id)}
                  >
                    {t("subscriptions.cancel")}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <AlertModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelSubscription}
        loading={isLoading}
        title={t("subscriptions.cancelConfirm")}
        description={t("subscriptions.cancelConfirmDescription")}
      />
    </div>
  )
}

export default UserSubscriptionsClient
