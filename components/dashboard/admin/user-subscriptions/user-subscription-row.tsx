"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
import { cancelSubscription, deleteUserSubscription } from "@/actions/user-subscription-actions"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"

interface UserSubscriptionRowProps {
  userSubscription: any
}

export default function UserSubscriptionRow({ userSubscription }: UserSubscriptionRowProps) {
  const { t } = useTranslation()
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

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

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      await deleteUserSubscription(userSubscription._id)
      toast.success(t("userSubscriptions.deleteSuccess"))
    } catch (error) {
      toast.error(t("userSubscriptions.deleteError"))
    } finally {
      setIsDeleting(false)
      setIsOpen(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">{t("common.active")}</Badge>
      case "expired":
        return <Badge variant="secondary">{t("subscriptions.status.expired")}</Badge>
      case "depleted":
        return <Badge variant="outline">{t("subscriptions.status.depleted")}</Badge>
      case "cancelled":
        return <Badge variant="destructive">{t("subscriptions.status.cancelled")}</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "expired":
        return "bg-red-100 text-red-800"
      case "depleted":
        return "bg-yellow-100 text-yellow-800"
      case "cancelled":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("he-IL", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <>
      <tr className="border-b hover:bg-gray-50">
        <td className="py-4 px-4">
          <div className="flex flex-col">
            <span className="font-medium">{userSubscription.user?.name}</span>
            <span className="text-sm text-gray-500">{userSubscription.user?.email}</span>
          </div>
        </td>
        <td className="py-4 px-4">
          <div className="flex flex-col">
            <span className="font-medium">{userSubscription.subscriptionId?.name}</span>
            <span className="text-sm text-gray-500">
              {t("userSubscriptions.totalQuantity")}: {userSubscription.totalQuantity}
            </span>
          </div>
        </td>
        <td className="py-4 px-4">
          <div className="flex flex-col">
            <span className="font-medium">
              {userSubscription.treatmentId?.name || t("treatments.unknownTreatment")}
            </span>
            {userSubscription.treatmentId?.duration && (
              <span className="text-sm text-gray-500">
                {userSubscription.treatmentId.duration} {t("common.minutes")}
              </span>
            )}
          </div>
        </td>
        <td className="py-4 px-4">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {userSubscription.remainingQuantity} / {userSubscription.totalQuantity}
            </span>
          </div>
        </td>
        <td className="py-4 px-4">
          <div className="flex flex-col">
            <span>{formatDate(userSubscription.expiryDate)}</span>
            <span className="text-sm text-gray-500">
              {t("userSubscriptions.purchaseDate")}: {formatDate(userSubscription.purchaseDate)}
            </span>
          </div>
        </td>
        <td className="py-4 px-4">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
              userSubscription.status,
            )}`}
          >
            {t(`userSubscriptions.status.${userSubscription.status}`)}
          </span>
        </td>
        <td className="py-4 px-4">
          <span className="font-medium">{userSubscription.paymentAmount}₪</span>
        </td>
        <td className="py-4 px-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(true)}
              className="text-gray-500 hover:text-gray-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </td>
      </tr>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("userSubscriptions.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("userSubscriptions.deleteConfirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {t("common.deleting")}
                </div>
              ) : (
                t("common.delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
