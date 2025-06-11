"use client"

import { useTranslation } from "@/lib/translations/i18n"
import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/common/ui/card"
import { purchaseSubscription } from "@/actions/user-subscription-actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import type { ITreatment } from "@/lib/db/models/treatment"
import type { ISubscription } from "@/lib/db/models/subscription"
import { StepIndicator } from "@/components/common/purchase/step-indicator"
import { PurchaseCard } from "@/components/common/purchase/purchase-card"
import { PurchaseNavigation } from "@/components/common/purchase/purchase-navigation"
import { PurchaseSummary } from "@/components/common/purchase/purchase-summary"
import { AnimatedContainer } from "@/components/common/purchase/animated-container"
import { PurchaseSuccess } from "@/components/common/purchase/purchase-success"
import {
  Package,
  Stethoscope,
  Clock,
  CreditCard,
  CheckCircle,
  Calendar,
  Award,
  Timer,
  CreditCardIcon,
} from "lucide-react"
import { PaymentMethodSelector } from "@/components/common/purchase/payment-method-selector"

interface PaymentMethod {
  _id: string
  cardName?: string
  cardNumber: string
  expiryMonth: string
  expiryYear: string
  isDefault?: boolean
}

interface PurchaseSubscriptionClientProps {
  subscriptions?: ISubscription[]
  treatments?: ITreatment[]
  paymentMethods?: PaymentMethod[]
  currentUser?: any
  isGuestMode?: boolean
  onPurchaseComplete?: (purchase: any) => void
}

const PurchaseSubscriptionClient = ({
  subscriptions = [],
  treatments = [],
  paymentMethods = [],
  currentUser,
  isGuestMode = false,
  onPurchaseComplete,
}: PurchaseSubscriptionClientProps) => {
  const { t } = useTranslation()
  const router = useRouter()
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string>("")
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string>("")
  const [selectedDurationId, setSelectedDurationId] = useState<string>("")
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState("subscription")
  const [purchaseComplete, setPurchaseComplete] = useState(false)
  const [paymentMethodsState, setPaymentMethodsState] = useState(paymentMethods)

  // Define steps with icons
  const steps = useMemo(() => {
    const baseSteps = [
      {
        key: "subscription",
        label: t("subscriptions.purchase.selectSubscription"),
        icon: Package,
      },
      {
        key: "treatment",
        label: t("treatments.selectTreatment"),
        icon: Stethoscope,
      },
    ]

    // Add duration step only if selected treatment is duration-based
    const selectedTreatmentData = treatments.find((treatment) => treatment._id.toString() === selectedTreatmentId)
    if (selectedTreatmentData?.pricingType === "duration_based") {
      baseSteps.push({
        key: "duration",
        label: t("treatments.selectDuration"),
        icon: Clock,
      })
    }

    baseSteps.push(
      {
        key: "payment",
        label: t("paymentMethods.selectPaymentMethod"),
        icon: CreditCard,
      },
      {
        key: "summary",
        label: t("common.summary"),
        icon: CheckCircle,
      },
    )

    return baseSteps
  }, [t, treatments, selectedTreatmentId])

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
    setSelectedDurationId("")
  }, [selectedTreatmentId])

  const handleNextStep = () => {
    const currentIndex = steps.findIndex((s) => s.key === currentStep)
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1]

      // Skip duration step if treatment is not duration-based
      if (nextStep.key === "duration" && selectedTreatmentData?.pricingType !== "duration_based") {
        const afterDurationIndex = steps.findIndex((s) => s.key === "payment")
        if (afterDurationIndex !== -1) {
          setCurrentStep(steps[afterDurationIndex].key)
        }
      } else {
        setCurrentStep(nextStep.key)
      }
    }
  }

  const handlePrevStep = () => {
    const currentIndex = steps.findIndex((s) => s.key === currentStep)
    if (currentIndex > 0) {
      const prevStep = steps[currentIndex - 1]

      // Skip duration step if treatment is not duration-based
      if (prevStep.key === "duration" && selectedTreatmentData?.pricingType !== "duration_based") {
        const beforeDurationIndex = steps.findIndex((s) => s.key === "treatment")
        if (beforeDurationIndex !== -1) {
          setCurrentStep(steps[beforeDurationIndex].key)
        }
      } else {
        setCurrentStep(prevStep.key)
      }
    }
  }

  const canGoNext = useMemo(() => {
    switch (currentStep) {
      case "subscription":
        return !!selectedSubscriptionId
      case "treatment":
        return !!selectedTreatmentId
      case "duration":
        return selectedTreatmentData?.pricingType !== "duration_based" || !!selectedDurationId
      case "payment":
        return !!selectedPaymentMethodId
      case "summary":
        return true
      default:
        return false
    }
  }, [
    currentStep,
    selectedSubscriptionId,
    selectedTreatmentId,
    selectedDurationId,
    selectedPaymentMethodId,
    selectedTreatmentData,
  ])

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
        if (isGuestMode && onPurchaseComplete) {
          onPurchaseComplete(result.data)
        } else {
          setPurchaseComplete(true)
        }
      } else {
        toast.error(result.error || t("subscriptions.purchase.error"))
      }
    } catch (error) {
      toast.error(t("subscriptions.purchase.error"))
    } finally {
      setIsLoading(false)
    }
  }

  const handlePaymentMethodAdded = () => {
    // In a real implementation, you would refetch payment methods from the server
    // For now, we'll just trigger a re-render
    window.location.reload()
  }

  if (purchaseComplete) {
    return (
      <div className="max-w-4xl mx-auto">
        <PurchaseSuccess
          title={t("subscriptions.purchase.success")}
          message={t("subscriptions.purchase.successMessage")}
          actionLabel={t("subscriptions.viewSubscriptions")}
          onAction={() => router.push("/dashboard/member/subscriptions")}
          secondaryActionLabel={t("common.backToDashboard")}
          onSecondaryAction={() => router.push("/dashboard")}
        />
      </div>
    )
  }

  if (subscriptions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">{t("subscriptions.purchase.noSubscriptions")}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">{t("subscriptions.purchase.title")}</h1>
        <p className="text-gray-600 mt-2">{t("subscriptions.purchase.description")}</p>
      </div>

      <StepIndicator steps={steps} currentStep={currentStep} />

      <div className="min-h-[400px] relative">
        <AnimatedContainer isActive={currentStep === "subscription"}>
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">{t("subscriptions.purchase.selectSubscription")}</h2>
              <p className="text-gray-600 mt-2">{t("subscriptions.purchase.selectSubscriptionDesc")}</p>
            </div>
            <div className="grid gap-4">
              {subscriptions.map((sub) => (
                <PurchaseCard
                  key={sub._id.toString()}
                  title={sub.name}
                  description={sub.description}
                  isSelected={selectedSubscriptionId === sub._id.toString()}
                  onClick={() => setSelectedSubscriptionId(sub._id.toString())}
                  badge={`${sub.quantity + sub.bonusQuantity} ${t("subscriptions.totalQuantity")}`}
                  icon={<Package className="w-5 h-5" />}
                >
                  <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-muted-foreground" />
                      <span>
                        <span className="font-medium">{t("subscriptions.fields.quantity")}:</span> {sub.quantity}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-muted-foreground" />
                      <span>
                        <span className="font-medium">{t("subscriptions.fields.bonusQuantity")}:</span>{" "}
                        {sub.bonusQuantity}
                      </span>
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>
                        <span className="font-medium">{t("subscriptions.fields.validityMonths")}:</span>{" "}
                        {sub.validityMonths} {t("common.months")}
                      </span>
                    </div>
                  </div>
                </PurchaseCard>
              ))}
            </div>
          </div>
        </AnimatedContainer>

        <AnimatedContainer isActive={currentStep === "treatment"}>
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">{t("treatments.selectTreatment")}</h2>
              <p className="text-gray-600 mt-2">{t("treatments.selectTreatmentDesc")}</p>
            </div>
            <div className="grid gap-4">
              {treatments
                .filter((t) => t.isActive)
                .map((treatment) => (
                  <PurchaseCard
                    key={treatment._id.toString()}
                    title={treatment.name}
                    description={treatment.description}
                    price={treatment.pricingType === "fixed" ? treatment.fixedPrice : undefined}
                    isSelected={selectedTreatmentId === treatment._id.toString()}
                    onClick={() => setSelectedTreatmentId(treatment._id.toString())}
                    badge={t(`treatments.categories.${treatment.category}`)}
                    icon={<Stethoscope className="w-5 h-5" />}
                  >
                    <div className="text-sm flex items-center gap-2 mt-3">
                      <Timer className="w-4 h-4 text-muted-foreground" />
                      <span>
                        <span className="font-medium">{t("treatments.fields.pricingType")}:</span>{" "}
                        {t(
                          `treatments.pricingTypes.${treatment.pricingType === "duration_based" ? "durationBased" : "fixed"}`,
                        )}
                      </span>
                    </div>
                  </PurchaseCard>
                ))}
            </div>
          </div>
        </AnimatedContainer>

        <AnimatedContainer isActive={currentStep === "duration"}>
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">{t("treatments.selectDuration")}</h2>
              <p className="text-gray-600 mt-2">{t("treatments.selectDurationDesc")}</p>
            </div>
            {activeDurations.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {activeDurations.map((duration) => (
                  <PurchaseCard
                    key={duration._id.toString()}
                    title={`${duration.minutes} ${t("common.minutes")}`}
                    price={duration.price}
                    isSelected={selectedDurationId === duration._id.toString()}
                    onClick={() => setSelectedDurationId(duration._id.toString())}
                    icon={<Clock className="w-5 h-5" />}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">{t("treatments.noActiveDurations")}</CardContent>
              </Card>
            )}
          </div>
        </AnimatedContainer>

        <AnimatedContainer isActive={currentStep === "payment"}>
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">{t("paymentMethods.selectPaymentMethod")}</h2>
              <p className="text-gray-600 mt-2">{t("paymentMethods.selectPaymentMethodDesc")}</p>
            </div>
            <PaymentMethodSelector
              paymentMethods={paymentMethodsState}
              selectedPaymentMethodId={selectedPaymentMethodId}
              onPaymentMethodSelect={setSelectedPaymentMethodId}
              onPaymentMethodAdded={handlePaymentMethodAdded}
            />
          </div>
        </AnimatedContainer>

        <AnimatedContainer isActive={currentStep === "summary"}>
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">{t("subscriptions.purchase.summary")}</h2>
              <p className="text-gray-600 mt-2">{t("subscriptions.purchase.reviewBeforePurchase")}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-3">{t("subscriptions.details")}</h3>
                <PurchaseCard
                  title={selectedSubscriptionData?.name || ""}
                  description={selectedSubscriptionData?.description}
                  badge={`${(selectedSubscriptionData?.quantity || 0) + (selectedSubscriptionData?.bonusQuantity || 0)} ${t(
                    "subscriptions.totalQuantity",
                  )}`}
                  icon={<Package className="w-5 h-5" />}
                  className="mb-4"
                >
                  <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-muted-foreground" />
                      <span>
                        <span className="font-medium">{t("subscriptions.fields.quantity")}:</span>{" "}
                        {selectedSubscriptionData?.quantity}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-muted-foreground" />
                      <span>
                        <span className="font-medium">{t("subscriptions.fields.bonusQuantity")}:</span>{" "}
                        {selectedSubscriptionData?.bonusQuantity}
                      </span>
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>
                        <span className="font-medium">{t("subscriptions.fields.validityMonths")}:</span>{" "}
                        {selectedSubscriptionData?.validityMonths} {t("common.months")}
                      </span>
                    </div>
                  </div>
                </PurchaseCard>

                <h3 className="text-lg font-medium mb-3">{t("treatments.details")}</h3>
                <PurchaseCard
                  title={selectedTreatmentData?.name || ""}
                  description={selectedTreatmentData?.description}
                  price={
                    selectedTreatmentData?.pricingType === "fixed"
                      ? selectedTreatmentData?.fixedPrice
                      : selectedDurationData?.price
                  }
                  badge={
                    selectedTreatmentData?.pricingType === "duration_based" && selectedDurationData
                      ? `${selectedDurationData.minutes} ${t("common.minutes")}`
                      : undefined
                  }
                  icon={<Stethoscope className="w-5 h-5" />}
                />
              </div>

              <div>
                <h3 className="text-lg font-medium mb-3">{t("paymentMethods.details")}</h3>
                <PurchaseCard
                  title={
                    paymentMethodsState.find((pm) => pm._id === selectedPaymentMethodId)?.cardName ||
                    t("paymentMethods.card")
                  }
                  description={`**** ${
                    paymentMethodsState.find((pm) => pm._id === selectedPaymentMethodId)?.cardNumber.slice(-4) || ""
                  }`}
                  icon={<CreditCardIcon className="w-5 h-5" />}
                  className="mb-6"
                />

                <h3 className="text-lg font-medium mb-3">{t("common.priceSummary")}</h3>
                <PurchaseSummary
                  items={[
                    {
                      label: t("subscriptions.pricePerSession"),
                      value: `${singleSessionPrice.toFixed(2)} ₪`,
                    },
                    {
                      label: t("subscriptions.paidQuantity"),
                      value: selectedSubscriptionData?.quantity || 0,
                    },
                    {
                      label: t("subscriptions.bonusQuantity"),
                      value: selectedSubscriptionData?.bonusQuantity || 0,
                    },
                  ]}
                  totalPrice={totalSubscriptionPrice}
                />
              </div>
            </div>
          </div>
        </AnimatedContainer>
      </div>

      <PurchaseNavigation
        onNext={handleNextStep}
        onPrevious={handlePrevStep}
        onComplete={handlePurchase}
        canGoNext={canGoNext}
        canGoPrevious={steps.findIndex((s) => s.key === currentStep) > 0}
        isLoading={isLoading}
        isLastStep={currentStep === "summary"}
        completeLabel={t("subscriptions.purchase.confirmAndPay")}
      />
    </div>
  )
}

export default PurchaseSubscriptionClient
