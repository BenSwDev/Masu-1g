"use client"

import { useTranslation } from "@/lib/translations/i18n"
import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/common/ui/card"
import { purchaseSubscription } from "@/actions/user-subscription-actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { redirect } from "next/navigation"
import type { ITreatment } from "@/lib/db/models/treatment"
import type { ISubscription } from "@/lib/db/models/subscription"
import { StepIndicator } from "@/components/common/purchase/step-indicator"
import { PurchaseCard } from "@/components/common/purchase/purchase-card"
import { PurchaseNavigation } from "@/components/common/purchase/purchase-navigation"
import { PurchaseSummary } from "@/components/common/purchase/purchase-summary"
import { AnimatedContainer } from "@/components/common/purchase/animated-container"
import { PurchaseSuccess } from "@/components/common/purchase/purchase-success"
import { GuestUserEditModal } from "@/components/guest/guest-user-edit-modal"
import { Button } from "@/components/common/ui/button"
import { PaymentMethodSelector } from "@/components/common/purchase/payment-method-selector"
import {
  Package,
  Stethoscope,
  Clock,
  CreditCard,
  CheckCircle,
  Calendar,
  Award,
  Timer,
  User,
  LogIn,
  Heart,
} from "lucide-react"

interface PaymentMethod {
  _id: string
  cardName?: string
  cardNumber: string
  expiryMonth: string
  expiryYear: string
  isDefault?: boolean
}

interface GuestSubscriptionClientProps {
  subscriptions: ISubscription[]
  treatments: ITreatment[]
  paymentMethods: PaymentMethod[]
  guestUser: any
}

const GuestSubscriptionClient = ({
  subscriptions = [],
  treatments = [],
  paymentMethods = [],
  guestUser,
}: GuestSubscriptionClientProps) => {
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
  const [isUserEditModalOpen, setIsUserEditModalOpen] = useState(false)

  // Validate guest user exists
  useEffect(() => {
    if (!guestUser) {
      redirect("/")
    }
  }, [guestUser])

  const selectedSubscriptionData = useMemo(() => {
    return subscriptions.find((sub) => sub._id.toString() === selectedSubscriptionId)
  }, [subscriptions, selectedSubscriptionId])

  const selectedTreatmentData = useMemo(() => {
    return treatments.find((treatment) => treatment._id.toString() === selectedTreatmentId)
  }, [treatments, selectedTreatmentId])

  const selectedDurationData = useMemo(() => {
    if (!selectedTreatmentData || selectedTreatmentData.pricingType !== "duration_based") return null
    return selectedTreatmentData.durations?.find((duration) => duration._id.toString() === selectedDurationId)
  }, [selectedTreatmentData, selectedDurationId])

  const activeDurations = useMemo(() => {
    if (!selectedTreatmentData || selectedTreatmentData.pricingType !== "duration_based") return []
    return selectedTreatmentData.durations?.filter((duration) => duration.isActive) || []
  }, [selectedTreatmentData])

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

  // Calculate prices
  const singleSessionPrice = useMemo(() => {
    if (!selectedTreatmentData) return 0
    if (selectedTreatmentData.pricingType === "duration_based" && selectedDurationData) {
      return selectedDurationData.price
    }
    return selectedTreatmentData.fixedPrice || 0
  }, [selectedTreatmentData, selectedDurationData])

  const totalSubscriptionPrice = useMemo(() => {
    if (!selectedSubscriptionData) return 0
    return singleSessionPrice * selectedSubscriptionData.quantity
  }, [singleSessionPrice, selectedSubscriptionData])

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
        setPurchaseComplete(true)
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

  const handleLoginRedirect = () => {
    router.push("/auth/login")
  }

  if (purchaseComplete) {
    return (
      <div className="w-full min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <PurchaseSuccess
            title={t("subscriptions.purchase.success")}
            message={t("subscriptions.purchase.successMessage")}
            actionLabel={t("guest.goToDashboard")}
            onAction={() => router.push("/dashboard")}
            secondaryActionLabel={t("guest.backToHome")}
            onSecondaryAction={() => router.push("/")}
          />
        </div>
      </div>
    )
  }

  if (subscriptions.length === 0) {
    return (
      <div className="w-full min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <Card>
            <CardContent className="p-6 md:p-12">
              <div className="text-center text-gray-500">{t("subscriptions.purchase.noSubscriptions")}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Guest Header */}
        <div className="mb-6 md:mb-8">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 md:p-6 border border-blue-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 rounded-full p-3">
                  <Heart className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-gray-900">
                    {t("guest.welcomeBack")}, {guestUser.firstName || guestUser.name?.split(' ')[0]}!
                  </h3>
                  <p className="text-gray-600 text-sm md:text-base">{guestUser.email}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsUserEditModalOpen(true)} className="w-full sm:w-auto">
                  <User className="w-4 h-4 mr-2" />
                  {t("guest.editDetails")}
                </Button>
                <Button variant="outline" size="sm" onClick={handleLoginRedirect} className="w-full sm:w-auto">
                  <LogIn className="w-4 h-4 mr-2" />
                  {t("guest.loginAsExisting")}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 md:mb-8 text-center">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            {t("subscriptions.purchase.title")}
          </h1>
          <p className="text-gray-600 text-sm md:text-base max-w-2xl mx-auto">
            {t("subscriptions.purchase.description")}
          </p>
        </div>

        <div className="mb-6 md:mb-8">
          <StepIndicator steps={steps} currentStep={currentStep} />
        </div>

        <div className="min-h-[500px] relative">
          <AnimatedContainer isActive={currentStep === "subscription"}>
            <div className="space-y-6">
              <div className="text-center mb-6 md:mb-8">
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">
                  {t("subscriptions.purchase.selectSubscription")}
                </h2>
                <p className="text-gray-600 text-sm md:text-base max-w-xl mx-auto">
                  {t("subscriptions.purchase.selectSubscriptionDesc")}
                </p>
              </div>
              <div className="grid gap-4 md:gap-6 lg:grid-cols-2 xl:grid-cols-3">
                {subscriptions
                  .filter((s) => s.isActive)
                  .map((subscription) => (
                    <PurchaseCard
                      key={subscription._id.toString()}
                      title={subscription.name}
                      description={subscription.description}
                      isSelected={selectedSubscriptionId === subscription._id.toString()}
                      onClick={() => setSelectedSubscriptionId(subscription._id.toString())}
                      badge={`${subscription.quantity + subscription.bonusQuantity} ${t("subscriptions.totalQuantity")}`}
                      icon={<Package className="w-5 h-5" />}
                      className="h-full"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3 text-sm mt-4">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">
                            <span className="font-medium">{t("subscriptions.paidQuantity")}:</span> {subscription.quantity}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <span className="truncate">
                            <span className="font-medium">{t("subscriptions.bonusQuantity")}:</span> {subscription.bonusQuantity}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-1 xl:col-span-2">
                          <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">
                            <span className="font-medium">{t("subscriptions.validity")}:</span> {subscription.validityMonths} {t("subscriptions.months")}
                          </span>
                        </div>
                      </div>
                    </PurchaseCard>
                  ))}
              </div>
            </div>
          </AnimatedContainer>

          <AnimatedContainer isActive={currentStep === "treatment"}>
            <div className="space-y-6">
              <div className="text-center mb-6 md:mb-8">
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">
                  {t("treatments.selectTreatment")}
                </h2>
                <p className="text-gray-600 text-sm md:text-base max-w-xl mx-auto">
                  {t("treatments.selectTreatmentDesc")}
                </p>
              </div>
              <div className="grid gap-4 md:gap-6">
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
                      <div className="text-sm flex items-center gap-2 mt-4">
                        <Timer className="w-4 h-4 text-muted-foreground flex-shrink-0" />
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
            <div className="space-y-6">
              <div className="text-center mb-6 md:mb-8">
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">
                  {t("treatments.selectDuration")}
                </h2>
                <p className="text-gray-600 text-sm md:text-base max-w-xl mx-auto">
                  {t("treatments.selectDurationDesc")}
                </p>
              </div>
              {activeDurations.length > 0 ? (
                <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {activeDurations.map((duration) => (
                    <PurchaseCard
                      key={duration._id.toString()}
                      title={`${duration.minutes} ${t("common.minutes")}`}
                      price={duration.price}
                      isSelected={selectedDurationId === duration._id.toString()}
                      onClick={() => setSelectedDurationId(duration._id.toString())}
                      icon={<Clock className="w-5 h-5" />}
                      className="h-full"
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-6 md:p-12 text-center text-gray-500">
                    {t("treatments.noActiveDurations")}
                  </CardContent>
                </Card>
              )}
            </div>
          </AnimatedContainer>

          <AnimatedContainer isActive={currentStep === "payment"}>
            <div className="space-y-6">
              <div className="text-center mb-6 md:mb-8">
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">
                  {t("paymentMethods.selectPaymentMethod")}
                </h2>
                <p className="text-gray-600 text-sm md:text-base max-w-xl mx-auto">
                  {t("paymentMethods.selectPaymentMethodDesc")}
                </p>
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
            <div className="space-y-6 md:space-y-8">
              <div className="text-center mb-6 md:mb-8">
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">
                  {t("subscriptions.purchase.summary")}
                </h2>
                <p className="text-gray-600 text-sm md:text-base max-w-xl mx-auto">
                  {t("subscriptions.purchase.reviewBeforePurchase")}
                </p>
              </div>

              <div className="grid gap-6 md:gap-8 lg:grid-cols-2">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">{t("subscriptions.details")}</h3>
                    <PurchaseCard
                      title={selectedSubscriptionData?.name || ""}
                      description={selectedSubscriptionData?.description}
                      badge={`${(selectedSubscriptionData?.quantity || 0) + (selectedSubscriptionData?.bonusQuantity || 0)} ${t(
                        "subscriptions.totalQuantity",
                      )}`}
                      icon={<Package className="w-5 h-5" />}
                      className="mb-4"
                    >
                      <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">
                            <span className="font-medium">{t("subscriptions.paid")}:</span> {selectedSubscriptionData?.quantity}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <span className="truncate">
                            <span className="font-medium">{t("subscriptions.bonus")}:</span> {selectedSubscriptionData?.bonusQuantity}
                          </span>
                        </div>
                      </div>
                    </PurchaseCard>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4">{t("treatments.treatmentDetails")}</h3>
                    <PurchaseCard
                      title={selectedTreatmentData?.name || ""}
                      description={selectedTreatmentData?.description}
                      price={singleSessionPrice}
                      badge={t(`treatments.categories.${selectedTreatmentData?.category}`)}
                      icon={<Stethoscope className="w-5 h-5" />}
                    >
                      {selectedDurationData && (
                        <div className="text-sm flex items-center gap-2 mt-4">
                          <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span>
                            <span className="font-medium">{t("treatments.duration")}:</span> {selectedDurationData.minutes} {t("common.minutes")}
                          </span>
                        </div>
                      )}
                    </PurchaseCard>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">{t("subscriptions.purchase.pricing")}</h3>
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

        <div className="mt-8">
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

        {/* Guest User Edit Modal */}
        <GuestUserEditModal
          isOpen={isUserEditModalOpen}
          onClose={() => setIsUserEditModalOpen(false)}
          guestUser={guestUser}
          onUpdate={() => {
            // Refresh the page to get updated user data
            window.location.reload()
          }}
        />
      </div>
    </div>
  )
}

export default GuestSubscriptionClient