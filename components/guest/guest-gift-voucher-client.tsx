"use client"

import { useTranslation } from "@/lib/translations/i18n"
import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/common/ui/card"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { redirect } from "next/navigation"
import type { ITreatment } from "@/lib/db/models/treatment"
import { StepIndicator } from "@/components/common/purchase/step-indicator"
import { PurchaseCard } from "@/components/common/purchase/purchase-card"
import { PurchaseNavigation } from "@/components/common/purchase/purchase-navigation"
import { PurchaseSummary } from "@/components/common/purchase/purchase-summary"
import { AnimatedContainer } from "@/components/common/purchase/animated-container"
import { PurchaseSuccess } from "@/components/common/purchase/purchase-success"
import { GuestUserEditModal } from "@/components/guest/guest-user-edit-modal"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { Textarea } from "@/components/common/ui/textarea"
import { PaymentMethodSelector } from "@/components/common/purchase/payment-method-selector"
import {
  Gift,
  Stethoscope,
  Clock,
  CreditCard,
  CheckCircle,
  User,
  LogIn,
  Heart,
  Timer,
  Users,
} from "lucide-react"

interface PaymentMethod {
  _id: string
  cardName?: string
  cardNumber: string
  expiryMonth: string
  expiryYear: string
  isDefault?: boolean
}

interface GuestGiftVoucherClientProps {
  treatments: ITreatment[]
  paymentMethods: PaymentMethod[]
  guestUser: any
}

const GuestGiftVoucherClient = ({
  treatments = [],
  paymentMethods = [],
  guestUser,
}: GuestGiftVoucherClientProps) => {
  const { t } = useTranslation()
  const router = useRouter()
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string>("")
  const [selectedDurationId, setSelectedDurationId] = useState<string>("")
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>("")
  const [recipientName, setRecipientName] = useState("")
  const [recipientEmail, setRecipientEmail] = useState("")
  const [recipientPhone, setRecipientPhone] = useState("")
  const [personalMessage, setPersonalMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState("treatment")
  const [purchaseComplete, setPurchaseComplete] = useState(false)
  const [paymentMethodsState, setPaymentMethodsState] = useState(paymentMethods)
  const [isUserEditModalOpen, setIsUserEditModalOpen] = useState(false)

  // Validate guest user exists
  useEffect(() => {
    if (!guestUser) {
      redirect("/")
    }
  }, [guestUser])

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
        key: "treatment",
        label: t("treatments.selectTreatment"),
        icon: Stethoscope,
      },
    ]

    // Add duration step only if selected treatment is duration-based
    if (selectedTreatmentData?.pricingType === "duration_based") {
      baseSteps.push({
        key: "duration",
        label: t("treatments.selectDuration"),
        icon: Clock,
      })
    }

    baseSteps.push(
      {
        key: "recipient",
        label: t("giftVouchers.recipientDetails"),
        icon: Users,
      },
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
  }, [t, selectedTreatmentData])

  // Calculate price
  const voucherPrice = useMemo(() => {
    if (!selectedTreatmentData) return 0
    if (selectedTreatmentData.pricingType === "duration_based" && selectedDurationData) {
      return selectedDurationData.price
    }
    return selectedTreatmentData.fixedPrice || 0
  }, [selectedTreatmentData, selectedDurationData])

  const handleNextStep = () => {
    const currentIndex = steps.findIndex((s) => s.key === currentStep)
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1]

      // Skip duration step if treatment is not duration-based
      if (nextStep.key === "duration" && selectedTreatmentData?.pricingType !== "duration_based") {
        const afterDurationIndex = steps.findIndex((s) => s.key === "recipient")
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
      case "treatment":
        return !!selectedTreatmentId
      case "duration":
        return selectedTreatmentData?.pricingType !== "duration_based" || !!selectedDurationId
      case "recipient":
        return !!recipientName && !!recipientEmail
      case "payment":
        return !!selectedPaymentMethodId
      case "summary":
        return true
      default:
        return false
    }
  }, [
    currentStep,
    selectedTreatmentId,
    selectedDurationId,
    selectedPaymentMethodId,
    selectedTreatmentData,
    recipientName,
    recipientEmail,
  ])

  const handlePurchase = async () => {
    if (!selectedTreatmentId || !selectedPaymentMethodId || !recipientName || !recipientEmail) {
      toast.error(t("giftVouchers.purchase.selectAllFields"))
      return
    }
    if (selectedTreatmentData?.pricingType === "duration_based" && !selectedDurationId) {
      toast.error(t("treatments.selectDurationError"))
      return
    }

    setIsLoading(true)
    try {
      // TODO: Implement gift voucher purchase action
      // For now, simulate success
      await new Promise(resolve => setTimeout(resolve, 2000))
      setPurchaseComplete(true)
      toast.success(t("giftVouchers.purchase.success"))
    } catch (error) {
      toast.error(t("giftVouchers.purchase.error"))
    } finally {
      setIsLoading(false)
    }
  }

  const handlePaymentMethodAdded = () => {
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
            title={t("giftVouchers.purchase.success")}
            message={t("giftVouchers.purchase.successMessage")}
            actionLabel={t("guest.goToDashboard")}
            onAction={() => router.push("/dashboard")}
            secondaryActionLabel={t("guest.backToHome")}
            onSecondaryAction={() => router.push("/")}
          />
        </div>
      </div>
    )
  }

  if (treatments.length === 0) {
    return (
      <div className="w-full min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <Card>
            <CardContent className="p-6 md:p-12">
              <div className="text-center text-gray-500">{t("treatments.noTreatments")}</div>
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
            {t("giftVouchers.purchase.title")}
          </h1>
          <p className="text-gray-600 text-sm md:text-base max-w-2xl mx-auto">
            {t("giftVouchers.purchase.description")}
          </p>
        </div>

        <div className="mb-6 md:mb-8">
          <StepIndicator steps={steps} currentStep={currentStep} />
        </div>

        <div className="min-h-[500px] relative">
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

          <AnimatedContainer isActive={currentStep === "recipient"}>
            <div className="space-y-6">
              <div className="text-center mb-6 md:mb-8">
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">
                  {t("giftVouchers.recipientDetails")}
                </h2>
                <p className="text-gray-600 text-sm md:text-base max-w-xl mx-auto">
                  {t("giftVouchers.recipientDetailsDesc")}
                </p>
              </div>
              
              <Card>
                <CardContent className="p-6 md:p-8">
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="recipientName" className="text-sm font-medium">
                          {t("giftVouchers.recipientName")} *
                        </Label>
                        <Input
                          id="recipientName"
                          value={recipientName}
                          onChange={(e) => setRecipientName(e.target.value)}
                          placeholder={t("giftVouchers.recipientNamePlaceholder")}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="recipientEmail" className="text-sm font-medium">
                          {t("giftVouchers.recipientEmail")} *
                        </Label>
                        <Input
                          id="recipientEmail"
                          type="email"
                          value={recipientEmail}
                          onChange={(e) => setRecipientEmail(e.target.value)}
                          placeholder={t("giftVouchers.recipientEmailPlaceholder")}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="recipientPhone" className="text-sm font-medium">
                          {t("giftVouchers.recipientPhone")} ({t("common.optional")})
                        </Label>
                        <Input
                          id="recipientPhone"
                          value={recipientPhone}
                          onChange={(e) => setRecipientPhone(e.target.value)}
                          placeholder={t("giftVouchers.recipientPhonePlaceholder")}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="personalMessage" className="text-sm font-medium">
                        {t("giftVouchers.personalMessage")} ({t("common.optional")})
                      </Label>
                      <Textarea
                        id="personalMessage"
                        value={personalMessage}
                        onChange={(e) => setPersonalMessage(e.target.value)}
                        placeholder={t("giftVouchers.personalMessagePlaceholder")}
                        rows={6}
                        maxLength={500}
                        className="mt-1 resize-none"
                      />
                      <div className="text-sm text-gray-500 mt-2 text-right">
                        {personalMessage.length}/500 {t("common.characters")}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                  {t("giftVouchers.purchase.summary")}
                </h2>
                <p className="text-gray-600 text-sm md:text-base max-w-xl mx-auto">
                  {t("giftVouchers.purchase.reviewBeforePurchase")}
                </p>
              </div>

              <div className="grid gap-6 md:gap-8 lg:grid-cols-2">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">{t("treatments.treatmentDetails")}</h3>
                    <PurchaseCard
                      title={selectedTreatmentData?.name || ""}
                      description={selectedTreatmentData?.description}
                      price={voucherPrice}
                      badge={t(`treatments.categories.${selectedTreatmentData?.category}`)}
                      icon={<Stethoscope className="w-5 h-5" />}
                      className="mb-4"
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

                  <div>
                    <h3 className="text-lg font-medium mb-4">{t("giftVouchers.recipientDetails")}</h3>
                    <Card>
                      <CardContent className="p-4">
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-600">{t("giftVouchers.recipientName")}:</span>
                            <span className="text-gray-900">{recipientName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-600">{t("giftVouchers.recipientEmail")}:</span>
                            <span className="text-gray-900">{recipientEmail}</span>
                          </div>
                          {recipientPhone && (
                            <div className="flex justify-between">
                              <span className="font-medium text-gray-600">{t("giftVouchers.recipientPhone")}:</span>
                              <span className="text-gray-900">{recipientPhone}</span>
                            </div>
                          )}
                          {personalMessage && (
                            <div className="pt-2 border-t">
                              <span className="font-medium text-gray-600 block mb-2">{t("giftVouchers.personalMessage")}:</span>
                              <div className="text-gray-700 italic bg-gray-50 p-3 rounded-md">
                                "{personalMessage}"
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">{t("giftVouchers.purchase.pricing")}</h3>
                  <PurchaseSummary
                    items={[
                      {
                        label: t("giftVouchers.voucherValue"),
                        value: `${voucherPrice.toFixed(2)} ₪`,
                      },
                    ]}
                    totalPrice={voucherPrice}
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
            completeLabel={t("giftVouchers.purchase.confirmAndPay")}
          />
        </div>

        <GuestUserEditModal
          isOpen={isUserEditModalOpen}
          onClose={() => setIsUserEditModalOpen(false)}
          guestUser={guestUser}
          onUpdate={() => {
            window.location.reload()
          }}
        />
      </div>
    </div>
  )
}

export default GuestGiftVoucherClient 