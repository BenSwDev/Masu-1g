"use client"

import { useTranslation } from "@/lib/translations/i18n"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { purchaseSubscription } from "@/actions/user-subscription-actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface PurchaseSubscriptionClientProps {
  subscriptions?: any[]
  treatments?: any[]
  paymentMethods?: any[]
}

const PurchaseSubscriptionClient = ({
  subscriptions = [],
  treatments = [],
  paymentMethods = [],
}: PurchaseSubscriptionClientProps) => {
  const { t } = useTranslation()
  const router = useRouter()
  const [selectedSubscription, setSelectedSubscription] = useState<string>("")
  const [selectedTreatment, setSelectedTreatment] = useState<string>("")
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  const selectedSubscriptionData = subscriptions.find((sub) => sub._id === selectedSubscription)
  const selectedTreatmentData = treatments.find((treatment) => treatment._id === selectedTreatment)

  const handlePurchase = async () => {
    if (!selectedSubscription || !selectedTreatment || !selectedPaymentMethod) {
      toast.error(t("subscriptions.purchase.selectAllFields"))
      return
    }

    setIsLoading(true)
    try {
      const result = await purchaseSubscription(selectedSubscription, selectedTreatment, selectedPaymentMethod)
      if (result.success) {
        toast.success(t("subscriptions.purchase.success"))
        router.push("/dashboard/member/subscriptions")
      } else {
        toast.error(result.error || t("subscriptions.purchase.error"))
      }
    } catch (error) {
      toast.error(t("subscriptions.purchase.error"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("subscriptions.purchase.title")}</h1>
      <p className="text-gray-600 mb-6">{t("subscriptions.purchase.description")}</p>

      {subscriptions.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">{t("subscriptions.purchase.noSubscriptions")}</div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("subscriptions.purchase.selectSubscription")}</CardTitle>
              <CardDescription>{t("subscriptions.purchase.selectSubscriptionDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedSubscription} onValueChange={setSelectedSubscription}>
                <SelectTrigger>
                  <SelectValue placeholder={t("subscriptions.purchase.selectSubscriptionPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {subscriptions.map((sub) => (
                    <SelectItem key={sub._id} value={sub._id}>
                      {sub.name} - {t("subscriptions.quantity")}: {sub.quantity + sub.bonusQuantity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedSubscriptionData && (
                <div className="mt-4 p-4 bg-gray-50 rounded-md">
                  <h3 className="font-medium">{selectedSubscriptionData.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{selectedSubscriptionData.description}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">{t("subscriptions.quantity")}:</span>{" "}
                      {selectedSubscriptionData.quantity}
                    </div>
                    <div>
                      <span className="font-medium">{t("subscriptions.bonusQuantity")}:</span>{" "}
                      {selectedSubscriptionData.bonusQuantity}
                    </div>
                    <div>
                      <span className="font-medium">{t("subscriptions.validityMonths")}:</span>{" "}
                      {selectedSubscriptionData.validityMonths}
                    </div>
                    <div>
                      <span className="font-medium">{t("subscriptions.totalQuantity")}:</span>{" "}
                      {selectedSubscriptionData.quantity + selectedSubscriptionData.bonusQuantity}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("treatments.selectTreatment")}</CardTitle>
              <CardDescription>{t("treatments.selectTreatmentDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedTreatment} onValueChange={setSelectedTreatment}>
                <SelectTrigger>
                  <SelectValue placeholder={t("treatments.selectTreatmentPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {treatments.map((treatment) => (
                    <SelectItem key={treatment._id} value={treatment._id}>
                      {treatment.name} - {treatment.price} ₪
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedTreatmentData && (
                <div className="mt-4 p-4 bg-gray-50 rounded-md">
                  <h3 className="font-medium">{selectedTreatmentData.name}</h3>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">{t("treatments.category")}:</span> {selectedTreatmentData.category}
                    </div>
                    <div>
                      <span className="font-medium">{t("treatments.price")}:</span> {selectedTreatmentData.price} ₪
                    </div>
                    {selectedTreatmentData.duration && (
                      <div>
                        <span className="font-medium">{t("treatments.duration")}:</span>{" "}
                        {selectedTreatmentData.duration} {t("common.minutes")}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("paymentMethods.selectPaymentMethod")}</CardTitle>
              <CardDescription>{t("paymentMethods.selectPaymentMethodDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {paymentMethods.length === 0 ? (
                <div className="text-center text-gray-500 mb-4">{t("paymentMethods.noPaymentMethods")}</div>
              ) : (
                <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("paymentMethods.selectPaymentMethodPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((pm) => (
                      <SelectItem key={pm._id} value={pm._id}>
                        {pm.cardName} - **** {pm.cardNumber.slice(-4)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => router.push("/dashboard/member/payment-methods")}>
                {t("paymentMethods.addNew")}
              </Button>
              <Button
                onClick={handlePurchase}
                disabled={!selectedSubscription || !selectedTreatment || !selectedPaymentMethod || isLoading}
              >
                {isLoading ? t("common.processing") : t("subscriptions.purchase.confirm")}
              </Button>
            </CardFooter>
          </Card>

          {selectedSubscriptionData && selectedTreatmentData && (
            <Card>
              <CardHeader>
                <CardTitle>{t("subscriptions.purchase.summary")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>{t("subscriptions.name")}:</span>
                    <span>{selectedSubscriptionData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("treatments.name")}:</span>
                    <span>{selectedTreatmentData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("subscriptions.totalQuantity")}:</span>
                    <span>{selectedSubscriptionData.quantity + selectedSubscriptionData.bonusQuantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("subscriptions.validityMonths")}:</span>
                    <span>
                      {selectedSubscriptionData.validityMonths} {t("common.months")}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>{t("common.totalPrice")}:</span>
                    <span>{selectedTreatmentData.price} ₪</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export default PurchaseSubscriptionClient
