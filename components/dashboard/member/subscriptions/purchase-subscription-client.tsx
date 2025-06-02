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

// Add necessary imports
import { CreditCard, PlusCircle } from "lucide-react"
import { PaymentMethodForm } from "@/components/dashboard/member/payment-methods/payment-method-form"
import { getPaymentMethods, type IPaymentMethod } from "@/actions/payment-method-actions"
import { Alert, AlertDescription } from "@/components/common/ui/alert"
import { Badge } from "@/components/common/ui/badge"
import { Label } from "@/components/common/ui/label" // Ensure Label is imported
import { cn } from "@/lib/utils/utils" // Ensure cn is imported

// Update component props interface
interface PurchaseSubscriptionClientProps {
  subscriptions?: ISubscription[]
  treatments?: ITreatment[]
  initialPaymentMethods?: IPaymentMethod[] // Changed from paymentMethods: any[]
}

const PurchaseSubscriptionClient = ({
  subscriptions = [],
  treatments = [],
  initialPaymentMethods = [],
}: PurchaseSubscriptionClientProps) => {
  const { t, dir } = useTranslation()
  const router = useRouter()
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string>("")
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string>("")
  const [selectedDurationId, setSelectedDurationId] = useState<string>("")
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1) // 1: Sub, 2: Treatment, 3: Duration, 4: Payment, 5: Summary

  // Add new state variables
  const [paymentMethods, setPaymentMethods] = useState<IPaymentMethod[]>(initialPaymentMethods)
  const [showPaymentMethodForm, setShowPaymentMethodForm] = useState(false)

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

  // Add useEffect to update local paymentMethods state when prop changes
  useEffect(() => {
    setPaymentMethods(initialPaymentMethods)
  }, [initialPaymentMethods])

  // Add useEffect for default payment method selection
  useEffect(() => {
    if (paymentMethods.length > 0 && !selectedPaymentMethodId) {
      const defaultPm = paymentMethods.find((pm) => pm.isDefault) || paymentMethods[0]
      if (defaultPm) {
        setSelectedPaymentMethodId(defaultPm._id.toString())
      }
    }
  }, [paymentMethods, selectedPaymentMethodId])

  useEffect(() => {
    // Automatically skip step 3 (Duration selection) if the selected treatment is not duration-based
    if (currentStep === 3 && selectedTreatmentData && selectedTreatmentData.pricingType !== "duration_based") {
      setCurrentStep(4) // Advance to step 4 (Payment Method)
    }
  }, [currentStep, selectedTreatmentData, setCurrentStep]) // Added setCurrentStep to dependencies

  // Add function to refresh payment methods
  const handleRefreshPaymentMethods = async () => {
    setIsLoading(true) // Use existing isLoading state
    try {
      const pmResult = await getPaymentMethods()
      if (pmResult.success && pmResult.paymentMethods) {
        setPaymentMethods(pmResult.paymentMethods)
        // If no payment method is currently selected, or the selected one is no longer valid, try to select one.
        const currentSelectedIsValid = pmResult.paymentMethods.some(
          (pm) => pm._id.toString() === selectedPaymentMethodId,
        )
        if (!selectedPaymentMethodId || !currentSelectedIsValid) {
          const defaultPm = pmResult.paymentMethods.find((pm) => pm.isDefault) || pmResult.paymentMethods[0]
          if (defaultPm) {
            setSelectedPaymentMethodId(defaultPm._id.toString())
          } else {
            setSelectedPaymentMethodId("") // Clear selection if no methods available
          }
        } else {
          setSelectedPaymentMethodId(selectedPaymentMethodId)
        }
      } else {
        toast.error(pmResult.error || t("paymentMethods.error"))
      }
    } catch (error) {
      toast.error(t("paymentMethods.error"))
    } finally {
      setIsLoading(false)
    }
  }

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
        // The useEffect hook now handles advancing the step if this step is not applicable.
        // We render a loading/placeholder state if the treatment is not duration-based,
        // allowing the useEffect to transition the step.
        if (!selectedTreatmentData || selectedTreatmentData.pricingType !== "duration_based") {
          return (
            <Card>
              <CardHeader>
                <CardTitle>{t("treatments.selectDuration")}</CardTitle>
              </CardHeader>
              <CardContent className="p-6 text-center text-gray-500">
                <p>
                  {/* Intentionally empty or a subtle loading indicator if preferred, as useEffect handles transition */}
                </p>
                {/* Or you can use: <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /> */}
              </CardContent>
            </Card>
          )
        }
        // Original JSX for step 3 (duration selection) follows
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
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base font-medium">{t("purchaseGiftVoucher.selectPaymentMethod")}</Label>

                {paymentMethods.length === 0 && !showPaymentMethodForm && (
                  <Alert>
                    <AlertDescription>{t("paymentMethods.noPaymentMethods")}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  {paymentMethods.map((pm) => (
                    <Card
                      key={pm._id.toString()}
                      className={cn(
                        "cursor-pointer border-2 transition-all duration-200 hover:shadow-sm",
                        selectedPaymentMethodId === pm._id.toString()
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50",
                      )}
                      onClick={() => setSelectedPaymentMethodId(pm._id.toString())}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CreditCard className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">
                                {pm.cardName || `${t("paymentMethods.card")} **** ${pm.cardNumber.slice(-4)}`}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {t("paymentMethods.fields.expiry")}: {pm.expiryMonth}/{pm.expiryYear}
                              </p>
                            </div>
                          </div>
                          {pm.isDefault && <Badge variant="outline">{t("purchaseGiftVoucher.defaultCard")}</Badge>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPaymentMethodForm(true)}
                className="w-full h-12"
              >
                <PlusCircle className={cn("w-4 h-4", dir === "rtl" ? "ml-2" : "mr-2")} />
                {t("purchaseGiftVoucher.addNewCard")}
              </Button>

              {showPaymentMethodForm && (
                <PaymentMethodForm
                  open={showPaymentMethodForm}
                  onOpenChange={(isOpen) => {
                    setShowPaymentMethodForm(isOpen)
                    if (!isOpen) {
                      // Dialog has been closed
                      handleRefreshPaymentMethods() // Refresh list
                    }
                  }}
                />
              )}
            </CardContent>
            {/* The CardFooter with navigation buttons is handled by the main step rendering logic */}
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
