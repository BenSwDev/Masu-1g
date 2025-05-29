"use client"

import { Progress } from "@/components/ui/progress"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/common/ui/alert-dialog" // Corrected import path
import { toast } from "sonner"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import { Trash2, Ban, Loader2 } from "lucide-react"
import { cancelSubscription, deleteUserSubscription } from "@/actions/user-subscription-actions"
import type { IUserSubscription } from "@/lib/db/models/user-subscription"
import type { ISubscription } from "@/lib/db/models/subscription"
import type { ITreatment, ITreatmentDuration } from "@/lib/db/models/treatment"
import type { User } from "next-auth"

interface PopulatedUserSubscription extends IUserSubscription {
  userId: Pick<User, "name" | "email"> & { _id: string }
  subscriptionId: ISubscription
  treatmentId: ITreatment
  selectedDurationDetails?: ITreatmentDuration
  paymentMethodId: { _id: string; cardName?: string; cardNumber: string }
}

interface UserSubscriptionRowProps {
  userSubscription: PopulatedUserSubscription
  onSubscriptionUpdate: () => void // Callback to refresh data in parent
}

export default function UserSubscriptionRow({ userSubscription, onSubscriptionUpdate }: UserSubscriptionRowProps) {
  const { t, i18n } = useTranslation()
  const currentLocale = i18n.language === "he" ? he : undefined

  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleCancel = async () => {
    setIsCancelling(true)
    try {
      const result = await cancelSubscription(userSubscription._id.toString())
      if (result.success) {
        toast.success(t("subscriptions.cancelSuccess"))
        onSubscriptionUpdate() // Refresh data
      } else {
        toast.error(result.error || t("common.error"))
      }
    } catch (error) {
      toast.error(t("common.error"))
    } finally {
      setIsCancelling(false)
      setShowCancelDialog(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteUserSubscription(userSubscription._id.toString())
      if (result.success) {
        toast.success(t("userSubscriptions.deleteSuccess"))
        onSubscriptionUpdate() // Refresh data
      } else {
        toast.error(result.error || t("userSubscriptions.deleteError"))
      }
    } catch (error) {
      toast.error(t("userSubscriptions.deleteError"))
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100">
            {t("common.active")}
          </Badge>
        )
      case "expired":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100">
            {t("subscriptions.status.expired")}
          </Badge>
        )
      case "depleted":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-600 dark:text-yellow-100">
            {t("subscriptions.status.depleted")}
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="destructive" className="bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-100">
            {t("subscriptions.status.cancelled")}
          </Badge>
        )
      default:
        return <Badge>{status}</Badge>
    }
  }

  const formatDate = (date: Date | string) => {
    return format(new Date(date), "dd/MM/yyyy", { locale: currentLocale })
  }

  const maskCardNumber = (cardNumber?: string) => {
    if (!cardNumber) return t("paymentMethods.unknown")
    return `**** ${cardNumber.slice(-4)}`
  }

  return (
    <>
      <tr className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
        <td className="py-3 px-4">
          <div className="flex flex-col">
            <span className="font-medium text-gray-800 dark:text-gray-100">
              {userSubscription.userId?.name || t("common.unknownUser")}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{userSubscription.userId?.email}</span>
          </div>
        </td>
        <td className="py-3 px-4">
          <div className="flex flex-col">
            <span className="font-medium text-gray-800 dark:text-gray-100">
              {userSubscription.subscriptionId?.name}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ID: {userSubscription.subscriptionId?._id.toString().slice(-6)}
            </span>
          </div>
        </td>
        <td className="py-3 px-4">
          <div className="flex flex-col">
            <span className="font-medium text-gray-800 dark:text-gray-100">{userSubscription.treatmentId?.name}</span>
            {userSubscription.selectedDurationDetails && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {userSubscription.selectedDurationDetails.minutes} {t("common.minutes")}
              </span>
            )}
          </div>
        </td>
        <td className="py-3 px-4 text-center">
          <div className="flex flex-col items-center">
            <span className="font-medium text-gray-800 dark:text-gray-100">
              {userSubscription.remainingQuantity} / {userSubscription.totalQuantity}
            </span>
            <Progress
              value={(userSubscription.remainingQuantity / userSubscription.totalQuantity) * 100}
              className="h-1.5 w-20 mt-1"
            />
          </div>
        </td>
        <td className="py-3 px-4">
          <div className="flex flex-col text-xs">
            <span className="text-gray-700 dark:text-gray-300">
              {t("userSubscriptions.purchaseDateShort")}: {formatDate(userSubscription.purchaseDate)}
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              {t("userSubscriptions.expiryDateShort")}: {formatDate(userSubscription.expiryDate)}
            </span>
          </div>
        </td>
        <td className="py-3 px-4">
          <div className="flex flex-col text-xs">
            <span className="font-medium text-gray-800 dark:text-gray-100">
              {userSubscription.paymentAmount?.toFixed(2)} ₪
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              {userSubscription.paymentMethodId?.cardName || t("paymentMethods.card")}{" "}
              {maskCardNumber(userSubscription.paymentMethodId?.cardNumber)}
            </span>
          </div>
        </td>
        <td className="py-3 px-4 text-center">{getStatusBadge(userSubscription.status)}</td>
        <td className="py-3 px-4">
          <div className="flex items-center justify-end gap-1">
            {userSubscription.status === "active" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCancelDialog(true)}
                className="text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-500"
                title={t("common.cancel")}
              >
                <Ban className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDeleteDialog(true)}
              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-500"
              title={t("common.delete")}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </td>
      </tr>

      {/* Cancel Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("subscriptions.cancelConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("subscriptions.cancelConfirmDescriptionAdmin", {
                userName: userSubscription.userId?.name || t("common.thisUser"),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>{t("common.back")}</AlertDialogCancel>
            <Button variant="destructive" onClick={handleCancel} disabled={isCancelling}>
              {isCancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t("common.confirmCancel")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("userSubscriptions.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("userSubscriptions.deleteConfirmDescriptionAdmin", {
                userName: userSubscription.userId?.name || t("common.thisUser"),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("common.cancel")}</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t("common.delete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
