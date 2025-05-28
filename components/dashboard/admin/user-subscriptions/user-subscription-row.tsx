"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { AlertModal } from "@/components/common/modals/alert-modal"
import { toast } from "sonner"
import { format } from "date-fns"
import { Eye, Ban } from "lucide-react"
import { cancelSubscription } from "@/actions/user-subscription-actions"

interface UserSubscriptionRowProps {
  userSubscription: any
}

export default function UserSubscriptionRow({ userSubscription }: UserSubscriptionRowProps) {
  const { t } = useTranslation()
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleCancel = async () => {
    setIsLoading(true)
    try {
      const result = await cancelSubscription(userSubscription._id)
      if (result.success) {
        toast.success(t("subscriptions.cancelSuccess"))
        // עדכון הסטטוס בממשק
        userSubscription.status = "cancelled"
      } else {
        toast.error(result.error || t("common.error"))
      }
    } catch (error) {
      toast.error(t("common.error"))
    } finally {
      setIsLoading(false)
      setShowCancelDialog(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="success">{t("common.active")}</Badge>
      case "expired":
        return <Badge variant="secondary">{t("subscriptions.status.expired")}</Badge>
      case "depleted":
        return <Badge variant="warning">{t("subscriptions.status.depleted")}</Badge>
      case "cancelled":
        return <Badge variant="destructive">{t("subscriptions.status.cancelled")}</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <>
      <tr className="border-b hover:bg-gray-50">
        <td className="py-3 px-4 text-right">
          {userSubscription.userId?.name || "N/A"}
          <div className="text-xs text-gray-500">{userSubscription.userId?.email}</div>
        </td>
        <td className="py-3 px-4 text-right">{userSubscription.subscriptionId?.name || "N/A"}</td>
        <td className="py-3 px-4 text-right">
          {userSubscription.remainingQuantity} / {userSubscription.totalQuantity}
        </td>
        <td className="py-3 px-4 text-right">{format(new Date(userSubscription.expiryDate), "dd/MM/yyyy")}</td>
        <td className="py-3 px-4 text-right">{getStatusBadge(userSubscription.status)}</td>
        <td className="py-3 px-4 text-right">
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4 mr-1" />
              {t("common.view")}
            </Button>
            {userSubscription.status === "active" && (
              <Button variant="ghost" size="sm" className="text-red-600" onClick={() => setShowCancelDialog(true)}>
                <Ban className="h-4 w-4 mr-1" />
                {t("common.cancel")}
              </Button>
            )}
          </div>
        </td>
      </tr>

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
