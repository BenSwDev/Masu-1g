"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/common/ui/card"
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
  AlertDialogAction,
} from "@/components/common/ui/alert-dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/common/ui/tooltip"
import { Progress } from "@/components/common/ui/progress"
import { toast } from "sonner"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import {
  Trash2,
  Ban,
  Loader2,
  Eye,
  Edit,
  User,
  Package,
  Calendar,
  CreditCard,
  TrendingUp,
  AlertTriangle,
} from "lucide-react"
import { cancelSubscription, deleteUserSubscription } from "@/actions/user-subscription-actions"
import type { IUserSubscription } from "@/lib/db/models/user-subscription"
import type { ISubscription } from "@/lib/db/models/subscription"
import type { ITreatment, ITreatmentDuration } from "@/lib/db/models/treatment"
import type { User as NextAuthUser } from "next-auth"
import { useTranslation } from "@/lib/translations/i18n"
import UserSubscriptionDetailsModal from "./user-subscription-details-modal"

interface PopulatedUserSubscription extends IUserSubscription {
  userId?: Pick<NextAuthUser, "name" | "email"> & { _id: string } | null
  subscriptionId: ISubscription
  treatmentId: ITreatment
  selectedDurationDetails?: ITreatmentDuration
  paymentMethodId: { _id: string; cardName?: string; cardNumber: string }
  guestInfo?: {
    name: string
    email: string
    phone: string
  }
  cancellationDate?: Date | string | null
  paymentDate?: Date | string | null
  transactionId?: string | null
  usedQuantity?: number
}

interface UserSubscriptionAdminCardProps {
  userSubscription: PopulatedUserSubscription
  onSubscriptionUpdate: () => void
  onEdit: (subscription: PopulatedUserSubscription) => void
}

export default function UserSubscriptionAdminCard({
  userSubscription,
  onSubscriptionUpdate,
  onEdit,
}: UserSubscriptionAdminCardProps) {
  const { t } = useTranslation()
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleCancel = async () => {
    setIsCancelling(true)
    try {
      const result = await cancelSubscription(userSubscription._id.toString())
      if (result.success) {
        toast.success(t("userSubscriptions.notifications.cancelSuccess"))
        onSubscriptionUpdate()
      } else {
        toast.error(result.error || t("userSubscriptions.notifications.cancelError"))
      }
    } catch (error) {
      toast.error(t("userSubscriptions.notifications.cancelError"))
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
        toast.success(t("userSubscriptions.notifications.deleteSuccess"))
        onSubscriptionUpdate()
      } else {
        toast.error(result.error || t("userSubscriptions.notifications.deleteError"))
      }
    } catch (error) {
      toast.error(t("userSubscriptions.notifications.deleteError"))
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const handleEdit = () => {
    onEdit(userSubscription)
  }

  const getStatusInfo = (status: string) => {
    const statusConfig = {
      active: {
        label: t("subscriptions.status.active"),
        Icon: TrendingUp,
        className: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
        iconColor: "text-green-600 dark:text-green-400",
      },
      expired: {
        label: t("subscriptions.status.expired"),
        Icon: Calendar,
        className: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
        iconColor: "text-red-600 dark:text-red-400",
      },
      depleted: {
        label: t("subscriptions.status.depleted"),
        Icon: AlertTriangle,
        className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
        iconColor: "text-yellow-600 dark:text-yellow-400",
      },
      cancelled: {
        label: t("subscriptions.status.cancelled"),
        Icon: Ban,
        className: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400",
        iconColor: "text-gray-600 dark:text-gray-400",
      },
    }
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.cancelled
  }

  const statusInfo = getStatusInfo(userSubscription.status)
  const StatusIcon = statusInfo.Icon

  const formatDate = (date: Date | string) => format(new Date(date), "dd/MM/yy", { locale: he })
  const usagePercentage = (userSubscription.remainingQuantity / userSubscription.totalQuantity) * 100

  return (
    <TooltipProvider>
      <Card className="shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              {userSubscription.userId ? (
                <>
                  <CardTitle className="text-lg mb-1">{userSubscription.userId.name}</CardTitle>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{userSubscription.userId.email}</p>
                </>
              ) : userSubscription.guestInfo ? (
                <>
                  <CardTitle className="text-lg mb-1 flex items-center gap-2">
                    {userSubscription.guestInfo.name}
                    <Badge variant="outline" className="text-xs">
                      {t("userSubscriptions.guest")}
                    </Badge>
                  </CardTitle>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{userSubscription.guestInfo.email}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{userSubscription.guestInfo.phone}</p>
                </>
              ) : (
                <CardTitle className="text-lg mb-1">{t("common.unknownUser")}</CardTitle>
              )}
            </div>
            <Badge className={`${statusInfo.className} font-medium flex items-center gap-1`}>
              <StatusIcon className={`h-3.5 w-3.5 ${statusInfo.iconColor}`} />
              {statusInfo.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span>{userSubscription.subscriptionId?.name}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 mt-1">
              <User className="h-4 w-4 text-blue-600 dark:text-blue-400" /> {/* Assuming treatment icon */}
              <span>
                {userSubscription.treatmentId?.name} ({userSubscription.selectedDurationDetails?.minutes}{" "}
                {t("common.minutes")})
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="text-gray-600 dark:text-gray-400">{t("userSubscriptions.purchaseDate")}:</div>
            <div className="font-medium text-gray-800 dark:text-gray-200">
              {formatDate(userSubscription.purchaseDate)}
            </div>
            <div className="text-gray-600 dark:text-gray-400">{t("userSubscriptions.expiryDate")}:</div>
            <div className="font-medium text-gray-800 dark:text-gray-200">
              {formatDate(userSubscription.expiryDate)}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-gray-600 dark:text-gray-400">
                {t("userSubscriptions.usage")}: {userSubscription.remainingQuantity}/{userSubscription.totalQuantity}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {usagePercentage.toFixed(0)}% {t("userSubscriptions.remaining")}
              </span>
            </div>
            <Progress value={usagePercentage} className="h-2" />
          </div>

          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <CreditCard className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span>
              {t("userSubscriptions.paymentAmount")}: ₪{userSubscription.paymentAmount?.toFixed(2) || "0.00"}
            </span>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2 pt-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDetailsModal(true)}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-500"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("common.viewDetails")}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleEdit}
                className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-500"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("common.edit")}</p>
            </TooltipContent>
          </Tooltip>
          {userSubscription.status === "active" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowCancelDialog(true)}
                  className="text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-500"
                >
                  <Ban className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("userSubscriptions.actions.cancel")}</p>
              </TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("userSubscriptions.actions.delete")}</p>
            </TooltipContent>
          </Tooltip>
        </CardFooter>
      </Card>

      <UserSubscriptionDetailsModal
        isOpen={showDetailsModal}
        onOpenChange={setShowDetailsModal}
        userSubscription={userSubscription}
      />

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("userSubscriptions.cancelDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("userSubscriptions.cancelDialog.description", {
                userName: userSubscription.userId?.name || t("common.thisUser"),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isCancelling}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="rtl:ml-2 ltr:mr-2 h-4 w-4 animate-spin" />
                  {t("common.cancelling")}
                </>
              ) : (
                t("userSubscriptions.actions.cancelSubscription")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("userSubscriptions.deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("userSubscriptions.deleteDialog.description", {
                userName: userSubscription.userId?.name || t("common.thisUser"),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? (
                <>
                  <Loader2 className="rtl:ml-2 ltr:mr-2 h-4 w-4 animate-spin" />
                  {t("common.deleting")}
                </>
              ) : (
                t("userSubscriptions.actions.deleteSubscription")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  )
}
