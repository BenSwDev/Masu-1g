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
import { Trash2, Ban, Loader2, Eye, Calendar, CreditCard, User, Package } from "lucide-react"
import { cancelSubscription, deleteUserSubscription } from "@/actions/user-management-actions"
import type { IUserSubscription } from "@/lib/db/models/user-subscription"
import type { ISubscription } from "@/lib/db/models/subscription"
import type { ITreatment, ITreatmentDuration } from "@/lib/db/models/treatment"
import type { User as NextAuthUser } from "next-auth"

interface PopulatedUserSubscription extends IUserSubscription {
  userId: Pick<NextAuthUser, "name" | "email"> & { _id: string }
  subscriptionId: ISubscription
  treatmentId: ITreatment
  selectedDurationDetails?: ITreatmentDuration
  paymentMethodId: { _id: string; cardName?: string; cardNumber: string }
}

interface UserSubscriptionRowProps {
  userSubscription: PopulatedUserSubscription
  onSubscriptionUpdate: () => void
}

export default function UserSubscriptionRow({ userSubscription, onSubscriptionUpdate }: UserSubscriptionRowProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleCancel = async () => {
    setIsCancelling(true)
    try {
      const result = await cancelSubscription(userSubscription._id.toString())
      if (result.success) {
        toast.success("המנוי בוטל בהצלחה")
        onSubscriptionUpdate()
      } else {
        toast.error(result.error || "שגיאה בביטול המנוי")
      }
    } catch (error) {
      toast.error("שגיאה בביטול המנוי")
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
        toast.success("המנוי נמחק בהצלחה")
        onSubscriptionUpdate()
      } else {
        toast.error(result.error || "שגיאה במחיקת המנוי")
      }
    } catch (error) {
      toast.error("שגיאה במחיקת המנוי")
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: "פעיל", className: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" },
      expired: { label: "פג תוקף", className: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400" },
      depleted: {
        label: "מוצה",
        className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
      },
      cancelled: { label: "מבוטל", className: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400" },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.cancelled

    return <Badge className={`${config.className} font-medium`}>{config.label}</Badge>
  }

  const formatDate = (date: Date | string) => {
    return format(new Date(date), "dd/MM/yyyy", { locale: he })
  }

  const formatDateTime = (date: Date | string) => {
    return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: he })
  }

  const maskCardNumber = (cardNumber?: string) => {
    if (!cardNumber) return "לא ידוע"
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
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {userSubscription.userId?.name || "משתמש לא ידוע"}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{userSubscription.userId?.email}</span>
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
                ID: {userSubscription.subscriptionId?._id.toString().slice(-6)}
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
                {userSubscription.selectedDurationDetails.minutes} דקות
              </span>
            )}
            {userSubscription.pricePerSession && (
              <span className="text-xs text-green-600 dark:text-green-400">
                ₪{userSubscription.pricePerSession} למפגש
              </span>
            )}
          </div>
        </td>

        {/* Quantity and Usage */}
        <td className="py-4 px-4">
          <div className="flex flex-col items-center space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-gray-100">{userSubscription.remainingQuantity}</span>
              <span className="text-gray-500 dark:text-gray-400">/</span>
              <span className="text-gray-700 dark:text-gray-300">{userSubscription.totalQuantity}</span>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-full">
                  <Progress value={usagePercentage} className="h-2 w-20" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  נותרו {userSubscription.remainingQuantity} מתוך {userSubscription.totalQuantity} טיפולים
                </p>
              </TooltipContent>
            </Tooltip>
            <span className="text-xs text-gray-500 dark:text-gray-400">{usagePercentage.toFixed(0)}% נותר</span>
          </div>
        </td>

        {/* Dates */}
        <td className="py-4 px-4">
          <div className="flex flex-col text-xs space-y-1">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300">
                נרכש: {formatDate(userSubscription.purchaseDate)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-gray-400" />
              <span className="text-gray-500 dark:text-gray-400">פג: {formatDate(userSubscription.expiryDate)}</span>
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
                {userSubscription.paymentMethodId?.cardName || "כרטיס"}{" "}
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
                  onClick={() => setShowDetailsDialog(true)}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-500"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>צפה בפרטים</p>
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
                  <p>בטל מנוי</p>
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
                <p>מחק מנוי</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </td>
      </tr>

      {/* Cancel Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ביטול מנוי</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך לבטל את המנוי של {userSubscription.userId?.name || "המשתמש"}? פעולה זו תמנע מהמשתמש
              להשתמש בטיפולים הנותרים.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isCancelling}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  מבטל...
                </>
              ) : (
                "בטל מנוי"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת מנוי</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את המנוי של {userSubscription.userId?.name || "המשתמש"}? פעולה זו בלתי הפיכה
              ותמחק את כל הנתונים הקשורים למנוי.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  מוחק...
                </>
              ) : (
                "מחק מנוי"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  )
}
