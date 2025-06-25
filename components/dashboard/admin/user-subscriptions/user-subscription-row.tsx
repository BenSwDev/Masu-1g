"use client"

import { useState } from "react"
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
import { Trash2, Ban, Loader2, Eye, Calendar, CreditCard, User, Package, Edit } from "lucide-react" // Added Edit
import { cancelSubscription, deleteUserSubscription } from "@/actions/user-subscription-actions"
import type { IUserSubscription } from "@/lib/db/models/user-subscription"
import type { ISubscription } from "@/lib/db/models/subscription"
import type { ITreatment, ITreatmentDuration } from "@/lib/db/models/treatment"
import type { User as NextAuthUser } from "next-auth"
import { useTranslation } from "@/lib/translations/i18n"
import UserSubscriptionDetailsModal from "./user-subscription-details-modal"
import { useRouter } from "next/navigation"
import { formatPhoneForDisplay } from "@/lib/utils/phone-utils"

interface PopulatedUserSubscription extends Omit<IUserSubscription, 'userId'> {
  userId?: {
    _id: string
    name: string
    email?: string // Make email optional
  } | null
  subscriptionId?: {
    _id: string
    name: string
    description?: string
    price: number
    duration: number
    treatments: string[]
    isActive: boolean
  }
  guestInfo?: {
    name: string
    email?: string // Make email optional
    phone: string
  }
}

interface UserSubscriptionRowProps {
  userSubscription: PopulatedUserSubscription
  onSubscriptionUpdate: () => void
  onEdit: (subscription: PopulatedUserSubscription) => void
}

export default function UserSubscriptionRow({ userSubscription, onSubscriptionUpdate, onEdit }: UserSubscriptionRowProps) {
  const { t } = useTranslation()
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false) // Changed from showDetailsDialog
  const [isCancelling, setIsCancelling] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleCancel = async () => {
    if (!userSubscription._id) return
    
    const result = await cancelSubscription(String(userSubscription._id))
    
    if (result.success) {
      toast({ 
        title: t("common.success"), 
        description: t("userSubscriptions.cancelSuccessToast") 
      })
      router.refresh()
    } else {
      toast({ 
        title: t("common.error"), 
        description: result.error || t("common.unknownError"),
        variant: "destructive" 
      })
    }
    setShowCancelDialog(false)
  }

  const handleDelete = async () => {
    if (!userSubscription._id) return
    
    const result = await deleteUserSubscription(String(userSubscription._id))
    
    if (result.success) {
      toast({ 
        title: t("common.success"), 
        description: t("userSubscriptions.deleteSuccessToast") 
      })
      router.refresh()
    } else {
      toast({ 
        title: t("common.error"), 
        description: result.error || t("common.unknownError"),
        variant: "destructive" 
      })
    }
    setShowDeleteDialog(false)
  }

  const handleEdit = () => {
    onEdit(userSubscription)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: {
        label: t("subscriptions.status.active"),
        className: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
      },
      expired: {
        label: t("subscriptions.status.expired"),
        className: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
      },
      depleted: {
        label: t("subscriptions.status.depleted"),
        className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
      },
      cancelled: {
        label: t("subscriptions.status.cancelled"),
        className: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400",
      },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.cancelled

    return <Badge className={`${config.className} font-medium`}>{config.label}</Badge>
  }

  const formatDate = (dateInput?: Date | string | null): string => {
    if (!dateInput) {
      // Assuming purchaseDate and expiryDate are always present as per schema,
      // but this makes it robust.
      return t("common.notAvailable")
    }
    const date = new Date(dateInput)
    if (isNaN(date.getTime())) {
      return t("common.notAvailable")
    }
    return format(date, "dd/MM/yyyy", { locale: he })
  }

  const maskCardNumber = (cardNumber?: string) => {
    if (!cardNumber) return t("common.unknown")
    return `**** ${cardNumber.slice(-4)}`
  }

  const usagePercentage = (userSubscription.remainingQuantity / userSubscription.totalQuantity) * 100

  return (
    <TooltipProvider>
      <tr className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
        {/* User Info */}
        <td className="py-4 px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex flex-col">
              {userSubscription.userId ? (
                <>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {userSubscription.userId.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{userSubscription.userId.email}</span>
                </>
              ) : userSubscription.guestInfo ? (
                <>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {userSubscription.guestInfo.name}
                    <Badge variant="outline" className="ml-2 text-xs">
                      {t("userSubscriptions.guest")}
                    </Badge>
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{userSubscription.guestInfo.email}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{formatPhoneForDisplay(userSubscription.guestInfo.phone || "")}</span>
                </>
              ) : (
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {t("common.unknownUser")}
                </span>
              )}
            </div>
          </div>
        </td>

        {/* Subscription Details */}
        <td className="py-4 px-4">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <div className="flex flex-col">
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {userSubscription.subscriptionId?.name}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ID: {userSubscription.subscriptionId?._id ? String(userSubscription.subscriptionId._id).slice(-6) : "N/A"}
              </span>
            </div>
          </div>
        </td>

        {/* Treatment Details */}
        <td className="py-4 px-4">
          <div className="flex flex-col">
            <span className="font-medium text-gray-900 dark:text-gray-100">{userSubscription.treatmentId?.name}</span>
            {userSubscription.selectedDurationDetails && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {userSubscription.selectedDurationDetails.minutes} {t("common.minutes")}
              </span>
            )}
            {userSubscription.pricePerSession && (
              <span className="text-xs text-green-600 dark:text-green-400">
                ₪{userSubscription.pricePerSession.toFixed(2)} {t("userSubscriptions.perSession")}
              </span>
            )}
          </div>
        </td>

        {/* Quantity and Usage */}
        <td className="py-4 px-4">
          <div className="flex flex-col items-center space-y-1">
            <div className="flex items-center gap-1 text-sm">
              <span className="font-medium text-gray-900 dark:text-gray-100">{userSubscription.remainingQuantity}</span>
              <span className="text-gray-500 dark:text-gray-400">/</span>
              <span className="text-gray-700 dark:text-gray-300">{userSubscription.totalQuantity}</span>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-full">
                  <Progress value={usagePercentage} className="h-1.5 w-20" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {t("userSubscriptions.usageTooltip", {
                    remaining: userSubscription.remainingQuantity,
                    total: userSubscription.totalQuantity,
                  })}
                </p>
              </TooltipContent>
            </Tooltip>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {usagePercentage.toFixed(0)}% {t("userSubscriptions.remaining")}
            </span>
          </div>
        </td>

        {/* Dates */}
        <td className="py-4 px-4">
          <div className="flex flex-col text-xs space-y-1">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300">
                {t("userSubscriptions.purchased")}: {formatDate(userSubscription.purchaseDate)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-gray-400" />
              <span className="text-gray-500 dark:text-gray-400">
                {t("userSubscriptions.expires")}: {formatDate(userSubscription.expiryDate)}
              </span>
            </div>
          </div>
        </td>

        {/* Payment */}
        <td className="py-4 px-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-green-600 dark:text-green-400" />
            <div className="flex flex-col text-xs">
              <span className="font-medium text-gray-900 dark:text-gray-100">
                ₪{userSubscription.paymentAmount?.toFixed(2) || "0.00"}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                {userSubscription.paymentMethodId?.cardName || t("common.card")}{" "}
                {maskCardNumber(userSubscription.paymentMethodId?.cardNumber)}
              </span>
            </div>
          </div>
        </td>

        {/* Status */}
        <td className="py-4 px-4 text-center">{getStatusBadge(userSubscription.status)}</td>

        {/* Actions */}
        <td className="py-4 px-4">
          <div className="flex items-center justify-end gap-1">
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
          </div>
        </td>
      </tr>

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
