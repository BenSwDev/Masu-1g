"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/common/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Package, Calendar, Tag, CreditCard } from "lucide-react"
import { purchaseSubscription } from "@/actions/user-subscription-actions"

interface PurchaseSubscriptionClientProps {
  subscriptions: any[]
  paymentMethods: any[]
}

export default function PurchaseSubscriptionClient({ subscriptions, paymentMethods }: PurchaseSubscriptionClientProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [selectedSubscription, setSelectedSubscription] = useState<any | null>(null)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  const handlePurchase = (subscription: any) => {
    setSelectedSubscription(subscription)
    setShowPaymentDialog(true)
  }

  const handleConfirmPurchase = async () => {
    if (!selectedSubscription || !selectedPaymentMethod) {
      toast.error(t("subscriptions.purchase.selectPaymentMethod"))
      return
    }

    setIsLoading(true)
    try {
      const result = await purchaseSubscription(selectedSubscription._id, selectedPaymentMethod)
      if (result.success) {
        toast.success(t("subscriptions.purchase.success"))
        setShowPaymentDialog(false)
        // ניווט לדף המנויים
        router.push("/dashboard/member/subscriptions")
      } else {
        toast.error(result.error || t("common.error"))
      }
    } catch (error) {
      toast.error(t("common.error"))
    } finally {
      setIsLoading(false)
    }
  }

  // פונקציה להצגת כרטיס אשראי מוסתר
  const maskCardNumber = (cardNumber: string) => {
    return `**** **** **** ${cardNumber.slice(-4)}`
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("subscriptions.purchase.availableSubscriptions")}</CardTitle>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t("subscriptions.purchase.noSubscriptions")}</h3>
              <p className="text-gray-500 mb-6">{t("subscriptions.purchase.noSubscriptionsDescription")}</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {subscriptions.map((subscription) => (
                <Card key={subscription._id} className="overflow-hidden transition-all duration-200 hover:shadow-md">
                  <CardHeader className="pb-2 bg-green-50">
                    <CardTitle className="text-lg">{subscription.name}</CardTitle>
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
                        <span className="ml-1 font-bold">₪{subscription.price.toLocaleString()}</span>
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
                    <Button onClick={() => handlePurchase(subscription)}>{t("subscriptions.purchase.buyNow")}</Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t("subscriptions.purchase.confirmPurchase")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedSubscription && (
              <div className="rounded-lg bg-gray-50 p-4">
                <h3 className="font-medium text-lg mb-2">{selectedSubscription.name}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>{t("subscriptions.quantity")}:</span>
                    <span>
                      {selectedSubscription.quantity} + {selectedSubscription.bonusQuantity} {t("subscriptions.bonus")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("subscriptions.validity")}:</span>
                    <span>
                      {selectedSubscription.validityMonths} {t("subscriptions.months")}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>{t("subscriptions.price")}:</span>
                    <span>₪{selectedSubscription.price.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h3 className="font-medium mb-2">{t("subscriptions.purchase.selectPaymentMethod")}</h3>

              {paymentMethods.length === 0 ? (
                <div className="text-center py-4 bg-gray-50 rounded-lg">
                  <CreditCard className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-gray-500">{t("subscriptions.purchase.noPaymentMethods")}</p>
                  <Button
                    variant="link"
                    onClick={() => router.push("/dashboard/member/payment-methods")}
                    className="mt-2"
                  >
                    {t("subscriptions.purchase.addPaymentMethod")}
                  </Button>
                </div>
              ) : (
                <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("subscriptions.purchase.selectPaymentMethod")} />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method._id} value={method._id}>
                        {method.cardName || `${t("paymentMethods.card")} ${method.cardNumber.slice(-4)}`} -{" "}
                        {maskCardNumber(method.cardNumber)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)} disabled={isLoading}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleConfirmPurchase}
              disabled={isLoading || !selectedPaymentMethod || paymentMethods.length === 0}
            >
              {isLoading ? t("common.loading") : t("subscriptions.purchase.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
