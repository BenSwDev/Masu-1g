"use client"

import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { Progress } from "@/components/common/ui/progress"
import { format } from "date-fns"
import { Package, Calendar, CreditCard, Ban } from "lucide-react"

interface UserSubscriptionCardProps {
  userSubscription: any
  onCancel: () => void
}

export default function UserSubscriptionCard({ userSubscription, onCancel }: UserSubscriptionCardProps) {
  const { t } = useTranslation()

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

  // חישוב אחוז הניצול
  const usagePercentage = Math.round(
    ((userSubscription.totalQuantity - userSubscription.remainingQuantity) / userSubscription.totalQuantity) * 100,
  )

  // פונקציה להצגת כרטיס אשראי מוסתר
  const maskCardNumber = (cardNumber: string) => {
    return `**** **** **** ${cardNumber.slice(-4)}`
  }

  return (
    <Card className="overflow-hidden transition-all duration-200 hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">
                {userSubscription.subscriptionId?.name || t("subscriptions.unknownSubscription")}
              </h3>
              <p className="text-sm text-gray-600">{userSubscription.subscriptionId?.description || ""}</p>
            </div>

            <div className="flex items-center gap-2">
              {getStatusBadge(userSubscription.status)}
              <span className="text-sm text-gray-500">
                {t("subscriptions.purchasedOn")}: {format(new Date(userSubscription.purchaseDate), "dd/MM/yyyy")}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <Package className="mr-2 h-4 w-4 text-gray-500" />
                <span className="font-medium">{t("subscriptions.remaining")}:</span>
                <span className="ml-1">
                  {userSubscription.remainingQuantity} / {userSubscription.totalQuantity}
                </span>
              </div>

              <div className="flex items-center text-sm">
                <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                <span className="font-medium">{t("subscriptions.expiry")}:</span>
                <span className="ml-1">{format(new Date(userSubscription.expiryDate), "dd/MM/yyyy")}</span>
              </div>

              <div className="flex items-center text-sm">
                <CreditCard className="mr-2 h-4 w-4 text-gray-500" />
                <span className="font-medium">{t("subscriptions.paymentMethod")}:</span>
                <span className="ml-1">
                  {userSubscription.paymentMethodId?.cardName ||
                    `${t("paymentMethods.card")} ${userSubscription.paymentMethodId?.cardNumber.slice(-4)}`}{" "}
                  -{maskCardNumber(userSubscription.paymentMethodId?.cardNumber || "****")}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between">
            <div className="space-y-2">
              <div className="text-sm font-medium">{t("subscriptions.usage")}</div>
              <Progress value={usagePercentage} className="h-2 w-full" />
              <div className="text-xs text-gray-500 text-center">
                {userSubscription.totalQuantity - userSubscription.remainingQuantity} {t("subscriptions.used")} /{" "}
                {userSubscription.totalQuantity} {t("subscriptions.total")}
              </div>
            </div>

            {userSubscription.status === "active" && (
              <Button variant="outline" size="sm" className="text-red-600 mt-4" onClick={onCancel}>
                <Ban className="h-4 w-4 mr-1" />
                {t("common.cancel")}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
