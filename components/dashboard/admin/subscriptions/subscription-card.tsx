import type React from "react"
import { Edit, Trash, Package, Calendar, Tag } from "lucide-react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Button } from "@/components/common/ui/button"

interface Subscription {
  id: string
  name: string
  price: number
  interval: string
  features: string[]
  isActive: boolean
  description: string
  quantity: number
  bonusQuantity: number
  validityMonths: number
  treatments: any[]
}

interface SubscriptionCardProps {
  subscription: Subscription
  onEdit: () => void
  onDelete: () => void
}

export default function SubscriptionCard({ subscription, onEdit, onDelete }: SubscriptionCardProps) {
  const { t } = useTranslation()

  return (
    <Card className="overflow-hidden transition-all duration-200 hover:shadow-md">
      <CardHeader className={`pb-2 ${subscription.isActive ? "bg-green-50" : "bg-gray-100"}`}>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{subscription.name}</CardTitle>
          <Badge variant={subscription.isActive ? "default" : "secondary"}>
            {subscription.isActive ? t("common.active") : t("common.inactive")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <p className="text-sm text-gray-600 mb-4">{subscription.description}</p>

        <div className="space-y-2">
          <div className="flex items-center text-sm">
            <Package className="mr-2 h-4 w-4 text-gray-500" />
            <span className="font-medium">{t("subscriptions.quantity")}:</span>
            <span className="ml-1">
              {subscription.quantity} + {subscription.bonusQuantity} {t("subscriptions.bonus")}
            </span>
          </div>

          <div className="flex items-center text-sm">
            <Calendar className="mr-2 h-4 w-4 text-gray-500" />
            <span className="font-medium">{t("subscriptions.validity")}:</span>
            <span className="ml-1">
              {subscription.validityMonths} {t("subscriptions.months")}
            </span>
          </div>

          <div className="flex items-center text-sm">
            <Tag className="mr-2 h-4 w-4 text-gray-500" />
            <span className="font-medium">{t("subscriptions.price")}:</span>
            <span className="ml-1">₪{typeof subscription.price === "number" ? subscription.price.toLocaleString() : "0"}</span>
          </div>
        </div>

        {subscription.treatments && subscription.treatments.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">{t("subscriptions.includedTreatments")}:</p>
            <div className="flex flex-wrap gap-1">
              {subscription.treatments.map((treatment: any) => (
                <Badge key={treatment._id} variant="outline" className="text-xs">
                  {treatment.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Edit className="h-4 w-4 mr-1" />
          {t("common.edit")}
        </Button>
        <Button variant="ghost" size="sm" className="text-red-600" onClick={onDelete}>
          <Trash className="h-4 w-4 mr-1" />
          {t("common.delete")}
        </Button>
      </CardFooter>
    </Card>
  )
}
