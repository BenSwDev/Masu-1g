"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { AlertModal } from "@/components/common/modals/alert-modal"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Package, Plus } from "lucide-react"
import { cancelSubscription } from "@/actions/user-subscription-actions"
import UserSubscriptionCard from "./user-subscription-card"

interface UserSubscriptionsClientProps {
  userSubscriptions: any[]
}

export default function UserSubscriptionsClient({ userSubscriptions }: UserSubscriptionsClientProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [subscriptions, setSubscriptions] = useState(userSubscriptions)

  const handleCancelClick = (id: string) => {
    setCancellingId(id)
    setShowCancelDialog(true)
  }

  const handleCancel = async () => {
    if (!cancellingId) return

    setIsLoading(true)
    try {
      const result = await cancelSubscription(cancellingId)
      if (result.success) {
        toast.success(t("subscriptions.cancelSuccess"))
        // עדכון הסטטוס בממשק
        setSubscriptions(subscriptions.map((sub) => (sub._id === cancellingId ? { ...sub, status: "cancelled" } : sub)))
      } else {
        toast.error(result.error || t("common.error"))
      }
    } catch (error) {
      toast.error(t("common.error"))
    } finally {
      setIsLoading(false)
      setShowCancelDialog(false)
      setCancellingId(null)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <CardTitle>{t("subscriptions.mySubscriptions.title")}</CardTitle>
          <Button onClick={() => router.push("/dashboard/member/subscriptions/purchase")}>
            <Plus className="mr-2 h-4 w-4" />
            {t("subscriptions.purchase.buyNew")}
          </Button>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {t("subscriptions.mySubscriptions.noSubscriptions")}
              </h3>
              <p className="text-gray-500 mb-6">{t("subscriptions.mySubscriptions.noSubscriptionsDescription")}</p>
              <Button onClick={() => router.push("/dashboard/member/subscriptions/purchase")}>
                <Plus className="mr-2 h-4 w-4" />
                {t("subscriptions.purchase.buyNew")}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {subscriptions.map((userSubscription) => (
                <UserSubscriptionCard
                  key={userSubscription._id}
                  userSubscription={userSubscription}
                  onCancel={() => handleCancelClick(userSubscription._id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertModal
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={handleCancel}
        loading={isLoading}
        title={t("subscriptions.cancelConfirm")}
        description={t("subscriptions.cancelConfirmDescription")}
      />
    </>
  )
}
