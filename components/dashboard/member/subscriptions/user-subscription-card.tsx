"use client"

import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { Progress } from "@/components/common/ui/progress"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import { formatCurrency, formatDate as formatDateUtil } from "@/lib/utils/utils"
import { Package, Calendar, CreditCard, Ban, Info, Tag, Clock } from "lucide-react"
import type { IUserSubscription } from "@/lib/db/models/user-subscription" // Import the type
import type { ISubscription } from "@/lib/db/models/subscription"
import type { ITreatment, ITreatmentDuration } from "@/lib/db/models/treatment"

interface UserSubscriptionCardProps {
  userSubscription: IUserSubscription & {
    // Use the imported type
    subscriptionId: ISubscription // Assuming populated
    treatmentId: ITreatment // Assuming populated
    paymentMethodId: any // Define if available
    selectedDurationDetails?: ITreatmentDuration // Populated manually
  }
  onCancel: (subscriptionId: string) => void // Pass ID for cancellation
}

export default function UserSubscriptionCard({ userSubscription, onCancel }: UserSubscriptionCardProps) {
  const { t, language } = useTranslation()
  const currentLocale = language === "he" ? he : undefined

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            {t("common.active")}
          </Badge>
        )
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

  const usagePercentage =
    userSubscription.totalQuantity > 0
      ? Math.round(
          ((userSubscription.totalQuantity - userSubscription.remainingQuantity) / userSubscription.totalQuantity) *
            100,
        )
      : 0

  const maskCardNumber = (cardNumber?: string) => {
    if (!cardNumber) return t("paymentMethods.unknown")
    return `**** **** **** ${cardNumber.slice(-4)}`
  }

  const formatDate = (date: Date | string) => {
    return formatDateUtil(date, language)
  }

  return (
    <Card className="overflow-hidden transition-all duration-200 hover:shadow-lg border rounded-lg">
      <CardHeader className="bg-gray-50 dark:bg-gray-800 p-4 border-b">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-semibold">
            {userSubscription.subscriptionId?.name || t("subscriptions.unknownSubscription")}
          </CardTitle>
          {getStatusBadge(userSubscription.status)}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("subscriptions.purchasedOn")}: {formatDate(userSubscription.purchaseDate)}
        </p>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="space-y-1">
          <h4 className="text-md font-medium text-gray-700 dark:text-gray-300">{t("treatments.title")}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {userSubscription.treatmentId?.name || t("treatments.unknownTreatment")}
            {userSubscription.selectedDurationDetails && (
              <span className="ml-1">
                ({userSubscription.selectedDurationDetails.minutes} {t("common.minutes")})
              </span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center">
            <Package className="mr-2 h-5 w-5 text-blue-500" />
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">{t("subscriptions.remaining")}:</span>
              <span className="ml-1 text-gray-600 dark:text-gray-400">
                {userSubscription.remainingQuantity} / {userSubscription.totalQuantity}
              </span>
            </div>
          </div>

          <div className="flex items-center">
            <Calendar className="mr-2 h-5 w-5 text-red-500" />
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">{t("subscriptions.expiry")}:</span>
              <span className="ml-1 text-gray-600 dark:text-gray-400">{formatDate(userSubscription.expiryDate)}</span>
            </div>
          </div>

          <div className="flex items-center">
            <CreditCard className="mr-2 h-5 w-5 text-green-500" />
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">{t("subscriptions.paymentMethod")}:</span>
              <span className="ml-1 text-gray-600 dark:text-gray-400">
                {userSubscription.paymentMethodId?.cardName || t("paymentMethods.card")}{" "}
                {maskCardNumber(userSubscription.paymentMethodId?.cardNumber)}
              </span>
            </div>
          </div>

          <div className="flex items-center">
            <Tag className="mr-2 h-5 w-5 text-purple-500" />
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">{t("subscriptions.pricePaid")}:</span>
              <span className="ml-1 text-gray-600 dark:text-gray-400">
                {formatCurrency(userSubscription.paymentAmount || 0, "ILS", language)}
              </span>
            </div>
          </div>

          {userSubscription.pricePerSession !== undefined && (
            <div className="flex items-center">
              <Info className="mr-2 h-5 w-5 text-yellow-500" />
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {t("subscriptions.pricePerSession")}:
                </span>
                <span className="ml-1 text-gray-600 dark:text-gray-400">
                  {formatCurrency(userSubscription.pricePerSession || 0, "ILS", language)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>{t("subscriptions.usage")}</span>
            <span>
              {userSubscription.totalQuantity - userSubscription.remainingQuantity} {t("subscriptions.used")} /{" "}
              {userSubscription.totalQuantity} {t("subscriptions.total")}
            </span>
          </div>
          <Progress value={usagePercentage} className="h-2.5 w-full" />
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-2">
          <Button
            variant="default"
            size="sm"
            className="w-full sm:w-auto"
            disabled // As per requirement: "כפתור למימוש טיפול מתוך המנוי שכרגע לא אמור להיות פעיל"
          >
            <Clock className="mr-2 h-4 w-4" />
            {t("subscriptions.useTreatment")}
          </Button>
          {userSubscription.status === "active" && (
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-300 hover:border-red-500"
              onClick={() => onCancel(userSubscription._id.toString())}
            >
              <Ban className="mr-2 h-4 w-4" />
              {t("common.cancel")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
