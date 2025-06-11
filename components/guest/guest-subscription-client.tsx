"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { ShoppingCart, CreditCard } from "lucide-react"

interface GuestSubscriptionClientProps {
  subscriptions: any[]
  treatments: any[]
  paymentMethods: any[]
  guestUser: any
}

export default function GuestSubscriptionClient({
  subscriptions,
  treatments,
  paymentMethods,
  guestUser
}: GuestSubscriptionClientProps) {
  const { t } = useTranslation()
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {t("landing.bookSubscription")}
        </h2>
        <p className="text-gray-600">
          {t("guest.subscription.description")}
        </p>
      </div>

      {subscriptions.length === 0 ? (
        <Card className="text-center py-8">
          <CardContent>
            <p className="text-gray-500 mb-4">
              {t("guest.subscription.noSubscriptions")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {subscriptions.map((subscription: any) => (
            <Card 
              key={subscription._id} 
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedSubscription?._id === subscription._id 
                  ? 'border-turquoise-500 bg-turquoise-50' 
                  : 'border-gray-200'
              }`}
              onClick={() => setSelectedSubscription(subscription)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span>{subscription.name}</span>
                  <span className="text-lg font-bold text-turquoise-600">
                    ₪{subscription.price}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-600 mb-2">
                  {subscription.description}
                </p>
                <div className="text-sm text-gray-500">
                  {t("subscription.sessionsIncluded")}: {subscription.sessionsIncluded}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedSubscription && (
        <Card className="border-turquoise-200 bg-turquoise-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              {t("guest.subscription.selectedSubscription")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-medium">{selectedSubscription.name}</span>
              <span className="text-lg font-bold">₪{selectedSubscription.price}</span>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                {t("guest.subscription.paymentNote")}
              </p>
            </div>

            <Button
              onClick={() => {
                // TODO: Implement subscription purchase flow for guests
                console.log("Subscription purchase for guest:", {
                  subscription: selectedSubscription,
                  guestUser
                })
              }}
              disabled={isLoading}
              className="w-full h-12 text-lg"
              size="lg"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              {isLoading ? t("common.loading") : t("guest.subscription.proceedToPayment")}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 