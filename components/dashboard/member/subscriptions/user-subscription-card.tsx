"use client"

import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { Progress } from "@/components/common/ui/progress"
import { formatDate } from "@/lib/utils/utils" // Assuming this utility exists or will be created
import {
  PackageIcon,
  Palette,
  CalendarDaysIcon,
  HashIcon,
  TagIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  BanIcon,
  PlayCircleIcon,
} from "lucide-react"
import type { UserSubscription } from "@/lib/db/models/user-subscription" // Import the type

interface UserSubscriptionCardProps {
  userSubscription: UserSubscription // Use the specific type
  onCancel: (id: string) => void // Add type for onCancel
  isCancelling: boolean // Add type for loading state
}

export default function UserSubscriptionCard({ userSubscription, onCancel, isCancelling }: UserSubscriptionCardProps) {
  const { t } = useTranslation()

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-300">
            <CheckCircleIcon className="h-3.5 w-3.5 mr-1.5" />
            {t("common.active")}
          </Badge>
        )
      case "expired":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 border-yellow-300">
            <ClockIcon className="h-3.5 w-3.5 mr-1.5" />
            {t("subscriptions.status.expired")}
          </Badge>
        )
      case "depleted":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
            <XCircleIcon className="h-3.5 w-3.5 mr-1.5" />
            {t("subscriptions.status.depleted")}
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-300">
            <BanIcon className="h-3.5 w-3.5 mr-1.5" />
            {t("subscriptions.status.cancelled")}
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const usagePercentage =
    userSubscription.totalQuantity > 0
      ? Math.round(
          ((userSubscription.totalQuantity - userSubscription.remainingQuantity) / userSubscription.totalQuantity) *
            100,
        )
      : 0

  // Safely access nested properties
  const subscriptionName = userSubscription.subscriptionId?.name || t("subscriptions.unknownSubscription")
  const treatmentName = userSubscription.treatmentId?.name || t("treatments.unknownTreatment")
  const treatmentDuration = userSubscription.treatmentId?.duration
  const treatmentCategory = userSubscription.treatmentId?.category

  return (
    <Card className="overflow-hidden transition-all duration-300 ease-in-out hover:shadow-xl flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-xl font-semibold text-gray-800 dark:text-gray-100">{subscriptionName}</CardTitle>
          {getStatusBadge(userSubscription.status)}
        </div>
        <CardDescription className="flex items-center text-sm text-gray-600 dark:text-gray-400 pt-1">
          <Palette className="h-4 w-4 mr-1.5 text-primary" />
          {treatmentName}
          {treatmentDuration && ` (${treatmentDuration} ${t("common.minutes")})`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm flex-grow">
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400 flex items-center">
              <HashIcon className="h-4 w-4 mr-1.5 text-sky-600" />
              {t("subscriptions.remainingTreatments")}:
            </span>
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {userSubscription.remainingQuantity} / {userSubscription.totalQuantity}
            </span>
          </div>
          <Progress
            value={usagePercentage}
            className="h-2 w-full [&>div]:bg-primary"
            aria-label={`${usagePercentage}% ${t("subscriptions.used")}`}
          />
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-2">
          <div className="text-gray-500 dark:text-gray-400 flex items-center">
            <CalendarDaysIcon className="h-4 w-4 mr-1.5 text-sky-600" />
            {t("subscriptions.purchaseDate")}:
          </div>
          <div className="text-gray-700 dark:text-gray-200 text-right">{formatDate(userSubscription.purchaseDate)}</div>

          <div className="text-gray-500 dark:text-gray-400 flex items-center">
            <CalendarDaysIcon className="h-4 w-4 mr-1.5 text-red-500" />
            {t("subscriptions.expiryDate")}:
          </div>
          <div className="text-gray-700 dark:text-gray-200 text-right">{formatDate(userSubscription.expiryDate)}</div>

          <div className="text-gray-500 dark:text-gray-400 flex items-center">
            <TagIcon className="h-4 w-4 mr-1.5 text-sky-600" />
            {t("common.pricePaid")}:
          </div>
          <div className="text-gray-700 dark:text-gray-200 font-semibold text-right">
            {userSubscription.paymentAmount}₪
          </div>

          {treatmentCategory && (
            <>
              <div className="text-gray-500 dark:text-gray-400 flex items-center">
                <PackageIcon className="h-4 w-4 mr-1.5 text-sky-600" />
                {t("treatments.fields.category")}:
              </div>
              <div className="text-gray-700 dark:text-gray-200 text-right">
                {t(`treatments.categories.${treatmentCategory.toLowerCase()}` as any, treatmentCategory)}
              </div>
            </>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-4 border-t dark:border-gray-700 mt-auto">
        <div className="flex gap-2 w-full">
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            disabled={true} // As per requirement: "currently not supposed to be active"
            aria-label={t("subscriptions.useTreatmentAria")}
          >
            <PlayCircleIcon className="h-4 w-4 mr-1.5" />
            {t("subscriptions.useTreatment")}
          </Button>
          {userSubscription.status === "active" && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600 dark:border-red-400 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
              onClick={() => onCancel(String(userSubscription._id))}
              disabled={isCancelling}
              aria-label={t("common.cancelSubscriptionAria")}
            >
              {isCancelling ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              ) : (
                <BanIcon className="h-4 w-4 mr-1.5" />
              )}
              {t("common.cancel")}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
