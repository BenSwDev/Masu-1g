"use client"

import { useTranslation } from "@/lib/translations/i18n"
import { useState } from "react"
import { Button } from "@/components/common/ui/button"
import { useRouter } from "next/navigation"
import { cancelSubscription } from "@/actions/user-subscription-actions" // Removed useSubscription as it's not implemented yet
import { toast } from "sonner"
import { AlertModal } from "@/components/common/modals/alert-modal"
import UserSubscriptionCard from "./user-subscription-card" // Import the card
import type { UserSubscription } from "@/lib/db/models/user-subscription" // Import the type
import { PlusCircleIcon, InfoIcon } from "lucide-react"
import { Card, CardContent } from "@/components/common/ui/card"

interface UserSubscriptionsClientProps {
  userSubscriptions?: UserSubscription[] // Use the specific type
}

export default function UserSubscriptionsClient({ userSubscriptions = [] }: UserSubscriptionsClientProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false) // General loading for actions
  const [cancellingSubscriptionId, setCancellingSubscriptionId] = useState<string | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)

  const handleCancelClick = (id: string) => {
    setCancellingSubscriptionId(id)
    setShowCancelModal(true)
  }

  const handleConfirmCancelSubscription = async () => {
    if (!cancellingSubscriptionId) return

    setIsLoading(true)
    try {
      const result = await cancelSubscription(cancellingSubscriptionId)
      if (result.success) {
        toast.success(t("subscriptions.cancelSuccess"))
        router.refresh() // Refresh data after cancellation
      } else {
        toast.error(result.error || t("subscriptions.cancelError"))
      }
    } catch (error) {
      toast.error(t("subscriptions.cancelError"))
    } finally {
      setIsLoading(false)
      setShowCancelModal(false)
      setCancellingSubscriptionId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            {t("subscriptions.my.title")}
          </h1>
          <p className="mt-1 text-lg text-gray-600 dark:text-gray-400">{t("subscriptions.my.description")}</p>
        </div>
        <Button onClick={() => router.push("/dashboard/member/subscriptions/purchase")} className="w-full sm:w-auto">
          <PlusCircleIcon className="mr-2 h-5 w-5" />
          {t("subscriptions.purchase.new")}
        </Button>
      </div>

      {userSubscriptions.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center h-60 p-6 text-center">
            <InfoIcon className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("subscriptions.my.noSubscriptionsFoundTitle")}
            </p>
            <p className="text-gray-500 dark:text-gray-400 mb-6">{t("subscriptions.my.noSubscriptionsFoundDesc")}</p>
            <Button onClick={() => router.push("/dashboard/member/subscriptions/purchase")} size="lg">
              <PlusCircleIcon className="mr-2 h-5 w-5" />
              {t("subscriptions.purchase.new")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {userSubscriptions.map((subscription) => (
            <UserSubscriptionCard
              key={String(subscription._id)}
              userSubscription={subscription}
              onCancel={handleCancelClick}
              isCancelling={isLoading && cancellingSubscriptionId === String(subscription._id)}
            />
          ))}
        </div>
      )}

      <AlertModal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false)
          setCancellingSubscriptionId(null)
        }}
        onConfirm={handleConfirmCancelSubscription}
        loading={isLoading && !!cancellingSubscriptionId}
        title={t("subscriptions.cancelConfirmTitle")}
        description={t("subscriptions.cancelConfirmDescription")}
        confirmText={t("common.confirmCancel")}
        cancelText={t("common.goBack")}
      />
    </div>
  )
}
