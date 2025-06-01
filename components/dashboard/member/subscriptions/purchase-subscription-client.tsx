"use client"

import { useTranslation } from "@/lib/translations/i18n"
import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { purchaseSubscription } from "@/actions/user-subscription-actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import type { ITreatment } from "@/lib/db/models/treatment" // Assuming ISubscription is also needed
import type { ISubscription } from "@/lib/db/models/subscription"
import { Loader2 } from "lucide-react"

interface PurchaseSubscriptionClientProps {
  subscriptions?: ISubscription[] // Use defined type
  treatments?: ITreatment[] // Use defined type
  paymentMethods?: any[] // Define type if available
}

const PurchaseSubscriptionClient = ({
  subscriptions = [],
  treatments = [],
  paymentMethods = [],
}: PurchaseSubscriptionClientProps) => {
  const { t } = useTranslation()
  const router = useRouter()
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string>("")
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string>("")
  const [selectedDurationId, setSelectedDurationId] = useState<string>("")
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1) // 1: Sub, 2: Treatment, 3: Duration, 4: Payment, 5: Summary

  const selectedSubscriptionData = useMemo(
    () => subscriptions.find((sub) => sub._id.toString() === selectedSubscriptionId),
    [subscriptions, selectedSubscriptionId],
  )

  const selectedTreatmentData = useMemo(
    () => treatments.find((treatment) => treatment._id.toString() === selectedTreatmentId),
    [treatments, selectedTreatmentId],
  )

  const activeDurations = useMemo(() => {
    if (selectedTreatmentData?.pricingType === "duration_based" && selectedTreatmentData.durations) {
      return selectedTreatmentData.durations.filter((d) => d.isActive)
    }
    return []
  }, [selectedTreatmentData])

  const selectedDurationData = useMemo(() => {
    if (selectedTreatmentData?.pricingType === "duration_based" && selectedTreatmentData.durations) {
      return activeDurations.find((d) => d._id.toString() === selectedDurationId)
    }
    return undefined
  }, [activeDurations, selectedDurationId, selectedTreatmentData])

  const singleSessionPrice = useMemo(() => {
    if (!selectedTreatmentData) return 0
    if (selectedTreatmentData.pricingType === "fixed") {
      return selectedTreatmentData.fixedPrice || 0
    }
    if (selectedTreatmentData.pricingType === "duration_based" && selectedDurationData) {
      return selectedDurationData.price || 0
    }
    return 0
  }, [selectedTreatmentData, selectedDurationData])

  const totalSubscriptionPrice = useMemo(() => {
    if (!selectedSubscriptionData || singleSessionPrice <= 0) return 0
    return selectedSubscriptionData.quantity * singleSessionPrice
  }, [selectedSubscriptionData, singleSessionPrice])

  useEffect(() => {
    // Reset duration if treatment changes or pricing type is not duration_based
    setSelectedDurationId("")
  }, [selectedTreatmentId])

  const handleNextStep = () => {
    if (currentStep === 1 && !selectedSubscriptionId) {
      toast.error(t("subscriptions.purchase.selectSubscriptionError"))
      return
    }
    if (currentStep === 2 && !selectedTreatmentId) {
      toast.error(t("treatments.selectTreatmentError"))
      return
    }
    if (currentStep === 3 && selectedTreatmentData?.pricingType === "duration_based" && !selectedDurationId) {
      toast.error(t("treatments.selectDurationError"))
      return
    }
    if (currentStep === 4 && !selectedPaymentMethodId) {
      toast.error(t("paymentMethods.selectPaymentMethodError"))
      return
    }
    setCurrentStep((prev) => prev + 1)
  }
  const handlePrevStep = () => setCurrentStep((prev) => prev - 1)

  const handlePurchase = async () => {
    if (!selectedSubscriptionId || !selectedTreatmentId || !selectedPaymentMethodId) {
      toast.error(t("subscriptions.purchase.selectAllFields"))
      return
    }
    if (selectedTreatmentData?.pricingType === "duration_based" && !selectedDurationId) {
      toast.error(t("treatments.selectDurationError"))
      return
    }

    setIsLoading(true)
    try {
      const result = await purchaseSubscription({
        subscriptionId: selectedSubscriptionId,
        treatmentId: selectedTreatmentId,
        paymentMethodId: selectedPaymentMethodId,
        selectedDurationId: selectedTreatmentData?.pricingType === "duration_based" ? selectedDurationId : undefined,
      })
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: // Select Subscription
        return (
          <Card>
            <CardHeader>
              <CardTitle>{t("subscriptions.purchase.selectSubscription")}</CardTitle>
              <CardDescription>{t("subscriptions.purchase.selectSubscriptionDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedSubscriptionId} onValueChange={setSelectedSubscriptionId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("subscriptions.purchase.selectSubscriptionPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {subscriptions.map((sub) => (
                    <SelectItem key={sub._id.toString()} value={sub._id.toString()}>
                      {sub.name} - {t("subscriptions.quantity")}: {sub.quantity} + {sub.bonusQuantity}{" "}
                      {t("subscriptions.bonus")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedSubscriptionData && (
                <div className="mt-4 p-4 bg-gray-50 rounded-md border">
                  <h3 className="font-semibold text-lg">{selectedSubscriptionData.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{selectedSubscriptionData.description}</p>
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <span className="font-medium">{t("subscriptions.fields.quantity")}:</span>{" "}
                      {selectedSubscriptionData.quantity}
                    </div>
                    <div>
                      <span className="font-medium">{t("subscriptions.fields.bonusQuantity")}:</span>{" "}
                      {selectedSubscriptionData.bonusQuantity}
                    </div>
                    <div>
                      <span className="font-medium">{t("subscriptions.fields.validityMonths")}:</span>{" "}
                      {selectedSubscriptionData.validityMonths} {t("common.months")}
                    </div>
                    <div className="font-semibold">
                      <span className="font-medium">{t("subscriptions.totalQuantity")}:</span>{" "}
                      {selectedSubscriptionData.quantity + selectedSubscriptionData.bonusQuantity}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      case 2: // Select Treatment
        return (
          <Card>
            <CardHeader>
              <CardTitle>{t("treatments.selectTreatment")}</CardTitle>
              <CardDescription>{t("treatments.selectTreatmentDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedTreatmentId} onValueChange={setSelectedTreatmentId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("treatments.selectTreatmentPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {treatments
                    .filter((t) => t.isActive)
                    .map((treatment) => (
                      <SelectItem key={treatment._id.toString()} value={treatment._id.toString()}>
                        {treatment.name}
                        {treatment.pricingType === "fixed" && ` - ${treatment.fixedPrice} ₪`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {selectedTreatmentData && (
                <div className="mt-4 p-4 bg-gray-50 rounded-md border">
                  <h3 className="font-semibold text-lg">{selectedTreatmentData.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{selectedTreatmentData.description}</p>
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <span className="font-medium">{t("treatments.fields.category")}:</span>{" "}
                      {t(`treatments.categories.${selectedTreatmentData.category}`)}
                    </div>
                    <div>
                      <span className="font-medium">{t("treatments.fields.pricingType")}:</span>{" "}
                      {t(
                        `treatments.pricingTypes.${selectedTreatmentData.pricingType === "duration_based" ? "durationBased" : "fixed"}`,
                      )}
                    </div>
                    {selectedTreatmentData.pricingType === "fixed" && (
                      <div>
                        <span className="font-medium">{t("treatments.fields.price")}:</span>{" "}
                        {selectedTreatmentData.fixedPrice} ₪
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      case 3: // Select Duration (if applicable)
        if (selectedTreatmentData?.pricingType !== "duration_based") {
          setCurrentStep(4) // Skip to next step
          return null
        }
        return (
          <Card>
            <CardHeader>
              <CardTitle>{t("treatments.selectDuration")}</CardTitle>
              <CardDescription>{t("treatments.selectDurationDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {activeDurations.length > 0 ? (
                <Select value={selectedDurationId} onValueChange={setSelectedDurationId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("treatments.selectDurationPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeDurations.map((duration) => (
                      <SelectItem key={duration._id.toString()} value={duration._id.toString()}>
                        {duration.minutes} {t("common.minutes")} - {duration.price} ₪
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-gray-500">{t("treatments.noActiveDurations")}</p>
              )}
              {selectedDurationData && (
                <div className="mt-4 p-4 bg-gray-50 rounded-md border">
                  <h3 className="font-semibold text-lg">
                    {selectedDurationData.minutes} {t("common.minutes")}
                  </h3>
                  <div className="mt-3 text-sm">
                    <span className="font-medium">{t("treatments.fields.price")}:</span> {selectedDurationData.price} ₪
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      case 4: // Select Payment Method
        return (
          <Card>
            <CardHeader>
              <CardTitle>{t("paymentMethods.selectPaymentMethod")}</CardTitle>
              <CardDescription>{t("paymentMethods.selectPaymentMethodDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {paymentMethods.length === 0 ? (
                <div className="text-center text-gray-500 mb-4">
                  {t("paymentMethods.noPaymentMethods")}{" "}
                  <Button variant="link" onClick={() => router.push("/dashboard/member/payment-methods")}>
                    {t("paymentMethods.addNewLink")}
                  </Button>
                </div>
              ) : (
                <Select value={selectedPaymentMethodId} onValueChange={setSelectedPaymentMethodId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("paymentMethods.selectPaymentMethodPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((pm) => (
                      <SelectItem key={pm._id.toString()} value={pm._id.toString()}>
                        {pm.cardName || t("paymentMethods.card")} - **** {pm.cardNumber.slice(-4)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
            {paymentMethods.length > 0 && (
              <CardFooter className="flex justify-end">
                <Button variant="outline" onClick={() => router.push("/dashboard/member/payment-methods")}>
                  {t("paymentMethods.managePaymentMethods")}
                </Button>
              </CardFooter>
            )}
          </Card>
        )
      case 5: // Summary and Purchase
        return (
          <Card>
            <CardHeader>
              <CardTitle>{t("subscriptions.purchase.summary")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">{t("subscriptions.fields.name")}:</span>
                <span className="font-medium">{selectedSubscriptionData?.name}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">{t("treatments.fields.name")}:</span>
                <span className="font-medium">{selectedTreatmentData?.name}</span>
              </div>
              {selectedTreatmentData?.pricingType === "duration_based" && selectedDurationData && (
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">{t("treatments.fields.duration")}:</span>
                  <span className="font-medium">
                    {selectedDurationData.minutes} {t("common.minutes")}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">{t("subscriptions.paidQuantity")}:</span>
                <span className="font-medium">{selectedSubscriptionData?.quantity}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">{t("subscriptions.bonusQuantity")}:</span>
                <span className="font-medium">{selectedSubscriptionData?.bonusQuantity}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">{t("subscriptions.totalQuantity")}:</span>
                <span className="font-medium">
                  {(selectedSubscriptionData?.quantity || 0) + (selectedSubscriptionData?.bonusQuantity || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">{t("subscriptions.fields.validityMonths")}:</span>
                <span className="font-medium">
                  {selectedSubscriptionData?.validityMonths} {t("common.months")}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">{t("subscriptions.pricePerSession")}:</span>
                <span className="font-medium">{singleSessionPrice.toFixed(2)} ₪</span>
              </div>
              <div className="flex justify-between items-center pt-3 text-lg">
                <span className="font-semibold">{t("common.totalPrice")}:</span>
                <span className="font-bold text-xl">{totalSubscriptionPrice.toFixed(2)} ₪</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handlePurchase} disabled={isLoading} className="w-full">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t("subscriptions.purchase.confirm")}
              </Button>
            </CardFooter>
          </Card>
        )
      default:
        return null
    }
  }

  if (subscriptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("subscriptions.purchase.title")}</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">{t("subscriptions.purchase.noSubscriptions")}</div>
        </CardContent>
      </Card>
    )
  }

  const maxSteps = selectedTreatmentData?.pricingType === "duration_based" ? 5 : 4

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">{t("subscriptions.purchase.title")}</h1>
        <p className="text-gray-600 mt-1">{t("subscriptions.purchase.description")}</p>
      </div>

      {/* Progress Bar (Optional) */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-500 mb-1">
          <span>
            {t("common.step")} {currentStep} {t("common.of")} {maxSteps}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${(currentStep / maxSteps) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="space-y-6">{renderStepContent()}</div>

      <div className="mt-8 flex justify-between">
        <Button variant="outline" onClick={handlePrevStep} disabled={currentStep === 1 || isLoading}>
          {t("common.back")}
        </Button>
        {currentStep < maxSteps ? (
          <Button onClick={handleNextStep} disabled={isLoading}>
            {t("common.next")}
          </Button>
        ) : (
          <Button onClick={handlePurchase} disabled={isLoading || totalSubscriptionPrice <= 0}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t("subscriptions.purchase.confirmAndPay")}
          </Button>
        )}
      </div>
    </div>
  )
}

export default PurchaseSubscriptionClient
