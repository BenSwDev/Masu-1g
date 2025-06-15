"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { useToast } from "@/components/common/ui/use-toast"
import { Progress } from "@/components/common/ui/progress"
import { useTranslation } from "@/lib/translations/i18n"
import { useSession } from "next-auth/react"
import {
  purchaseSubscription,
  purchaseGuestSubscription,
  saveAbandonedSubscriptionPurchase,
} from "@/actions/user-subscription-actions"
import { getPaymentMethods, type IPaymentMethod } from "@/actions/payment-method-actions"
import { createGuestUser } from "@/actions/booking-actions"
import {
  Gift,
  CreditCard,
  Check,
  LayoutGrid,
  Stethoscope,
  User,
  Calendar,
  Package,
} from "lucide-react"
import { cn } from "@/lib/utils/utils"

// Import shared components
import { StepIndicator } from "@/components/common/purchase/step-indicator"
import { PurchaseCard } from "@/components/common/purchase/purchase-card"
import { PurchaseNavigation } from "@/components/common/purchase/purchase-navigation"
import { PurchaseSummary } from "@/components/common/purchase/purchase-summary"
import { AnimatedContainer } from "@/components/common/purchase/animated-container"
import { PurchaseSuccess } from "@/components/common/purchase/purchase-success"
import { PaymentMethodSelector } from "@/components/common/purchase/payment-method-selector"
import { GuestInfoStep } from "@/components/booking/steps/guest-info-step"
import { GuestTreatmentSelectionStep } from "@/components/booking/steps/guest-treatment-selection-step"
import { GuestPaymentStep } from "@/components/booking/steps/guest-payment-step"
import GuestSubscriptionSelectionStep from "./guest-subscription-selection-step"
import GuestSubscriptionSummaryStep from "./guest-subscription-summary-step"

import type { ISubscription } from "@/lib/db/models/subscription"
import type { ITreatment } from "@/lib/db/models/treatment"
import type { CalculatedPriceDetails } from "@/types/booking"
import type { User } from "next-auth"

interface UnifiedSubscriptionWizardProps {
  subscriptions: ISubscription[]
  treatments: ITreatment[]
  initialPaymentMethods?: IPaymentMethod[]
  currentUser?: User | null
}

export default function UnifiedSubscriptionWizard({
  subscriptions,
  treatments,
  initialPaymentMethods = [],
  currentUser,
}: UnifiedSubscriptionWizardProps) {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()
  const isGuest = !currentUser

  // Guest-specific state
  const [guestInfo, setGuestInfo] = useState<any>({})
  const [guestUserId, setGuestUserId] = useState<string | null>(null)

  // Common state
  const [currentStep, setCurrentStep] = useState(isGuest ? 1 : 1)
  const [loading, setLoading] = useState(false)
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string>("")
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string>("")
  const [selectedDurationId, setSelectedDurationId] = useState<string>("")
  const [paymentMethods, setPaymentMethods] = useState<IPaymentMethod[]>(initialPaymentMethods)
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>("")
  const [purchaseComplete, setPurchaseComplete] = useState(false)

  // Calculate price
  const selectedSubscription = subscriptions.find(s => s._id.toString() === selectedSubscriptionId)
  const selectedTreatment = treatments.find(t => t._id.toString() === selectedTreatmentId)
  const selectedDuration = selectedTreatment?.pricingType === "duration_based"
    ? selectedTreatment.durations?.find(d => d._id.toString() === selectedDurationId)
    : undefined

  const singleSessionPrice = selectedTreatment?.pricingType === "fixed"
    ? selectedTreatment.fixedPrice || 0
    : selectedDuration?.price || 0

  const totalPrice = selectedSubscription ? (selectedSubscription.quantity * singleSessionPrice) : 0

  const calculatedPrice: CalculatedPriceDetails = {
    basePrice: totalPrice,
    surcharges: [],
    totalSurchargesAmount: 0,
    treatmentPriceAfterSubscriptionOrTreatmentVoucher: totalPrice,
    couponDiscount: 0,
    voucherAppliedAmount: 0,
    finalAmount: totalPrice,
    isBaseTreatmentCoveredBySubscription: false,
    isBaseTreatmentCoveredByTreatmentVoucher: false,
    isFullyCoveredByVoucherOrSubscription: false,
  }

  // Define steps based on user type
  const TOTAL_STEPS = isGuest ? 5 : 4
  
  const steps = useMemo(() => {
    const baseSteps = []
    
    if (isGuest) {
      baseSteps.push(
        { key: 1, label: "פרטים אישיים", icon: User },
        { key: 2, label: "בחירת מנוי", icon: Package },
        { key: 3, label: "בחירת טיפול", icon: Stethoscope },
        { key: 4, label: "תשלום", icon: CreditCard },
        { key: 5, label: "אישור", icon: Check }
      )
    } else {
      baseSteps.push(
        { key: 1, label: t("purchaseSubscription.stepSelect") || "בחירת מנוי", icon: Package },
        { key: 2, label: t("purchaseSubscription.stepTreatment") || "בחירת טיפול", icon: Stethoscope },
        { key: 3, label: t("purchaseSubscription.stepPayment") || "תשלום", icon: CreditCard },
        { key: 4, label: t("purchaseSubscription.stepComplete") || "אישור", icon: Check }
      )
    }
    
    return baseSteps
  }, [t, isGuest])

  const nextStep = () => setCurrentStep(s => Math.min(s + 1, TOTAL_STEPS))
  const prevStep = () => setCurrentStep(s => Math.max(s - 1, 1))

  // Auto-save for abandoned purchases
  useEffect(() => {
    if (isGuest && guestUserId) {
      saveAbandonedSubscriptionPurchase(guestUserId, {
        guestInfo,
        purchaseOptions: {
          selectedSubscriptionId,
          selectedTreatmentId,
          selectedDurationId,
        },
        currentStep,
      })
    } else if (!isGuest && currentUser?.id && currentStep !== TOTAL_STEPS) {
      saveAbandonedSubscriptionPurchase(currentUser.id, {
        purchaseOptions: {
          selectedSubscriptionId,
          selectedTreatmentId,
          selectedDurationId,
        },
        currentStep,
      })
    }
  }, [isGuest, guestUserId, guestInfo, currentUser?.id, selectedSubscriptionId, selectedTreatmentId, selectedDurationId, currentStep, TOTAL_STEPS])

  // Load payment methods for members
  useEffect(() => {
    if (!isGuest) {
      const loadPaymentMethods = async () => {
        const pmResult = await getPaymentMethods()
        if (pmResult.success && pmResult.paymentMethods) {
          setPaymentMethods(pmResult.paymentMethods)
          const defaultPm = pmResult.paymentMethods.find((pm) => pm.isDefault) || pmResult.paymentMethods[0]
          if (defaultPm) setSelectedPaymentMethodId(defaultPm._id)
        }
      }
      loadPaymentMethods()
    }
  }, [isGuest])

  // Guest info submission
  const handleGuestInfoSubmit = async (info: any) => {
    setGuestInfo(info)
    if (!guestUserId) {
      const result = await createGuestUser({
        firstName: info.firstName,
        lastName: info.lastName,
        email: info.email,
        phone: info.phone,
        birthDate: info.birthDate,
        gender: info.gender,
      })
      if (result.success && result.userId) {
        setGuestUserId(result.userId)
      }
    }
    nextStep()
  }

  // Purchase submission
  const handlePurchase = async () => {
    if (!selectedSubscriptionId || !selectedTreatmentId) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "יש לבחור מנוי וטיפול",
      })
      return
    }

    setLoading(true)
    try {
      if (isGuest) {
        const result = await purchaseGuestSubscription({
          subscriptionId: selectedSubscriptionId,
          treatmentId: selectedTreatmentId,
          selectedDurationId: selectedDurationId || undefined,
          paymentMethodId: undefined,
          guestInfo: {
            name: guestInfo.firstName + " " + guestInfo.lastName,
            email: guestInfo.email,
            phone: guestInfo.phone,
          },
        })

        if (result.success) {
          setPurchaseComplete(true)
          setCurrentStep(TOTAL_STEPS)
        } else {
          toast({
            variant: "destructive",
            title: "שגיאה",
            description: "שגיאה ברכישת המנוי",
          })
        }
      } else {
        const result = await purchaseSubscription({
          subscriptionId: selectedSubscriptionId,
          treatmentId: selectedTreatmentId,
          selectedDurationId: selectedDurationId || undefined,
          paymentMethodId: selectedPaymentMethodId,
        })

        if (result.success) {
          setPurchaseComplete(true)
          setCurrentStep(TOTAL_STEPS)
        } else {
          toast({
            variant: "destructive",
            title: t("common.error"),
            description: result.error || t("common.errorGeneric"),
          })
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("common.errorGeneric"),
      })
    } finally {
      setLoading(false)
    }
  }

  // Render subscription selection step
  const renderSubscriptionSelectionStep = () => {
    if (isGuest) {
      return (
        <GuestSubscriptionSelectionStep
          subscriptions={subscriptions}
          selectedSubscriptionId={selectedSubscriptionId}
          onSubscriptionSelect={setSelectedSubscriptionId}
          onNext={nextStep}
          onPrev={prevStep}
        />
      )
    }

    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">בחר מנוי</h2>
          <p className="text-gray-600 mt-2">בחר את המנוי המתאים לך</p>
        </div>
        
        <div className="grid gap-6">
          {subscriptions.map((subscription) => (
            <Card
              key={subscription._id.toString()}
              className={`cursor-pointer border-2 ${
                selectedSubscriptionId === subscription._id.toString()
                  ? "border-blue-500"
                  : "border-gray-200"
              }`}
              onClick={() => setSelectedSubscriptionId(subscription._id.toString())}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{subscription.name}</span>
                  <span className="text-lg font-bold">
                    {subscription.quantity} טיפולים
                    {subscription.bonusQuantity > 0 && (
                      <span className="text-green-600 text-sm">
                        {" "}+ {subscription.bonusQuantity} בונוס
                      </span>
                    )}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{subscription.description}</p>
                <div className="mt-2 text-sm text-gray-500">
                  תוקף: {subscription.validityMonths} חודשים
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="flex justify-between">
          <Button variant="outline" onClick={prevStep} disabled={currentStep === 1}>
            חזור
          </Button>
          <Button onClick={nextStep} disabled={!selectedSubscriptionId}>
            המשך
          </Button>
        </div>
      </div>
    )
  }

  // Render treatment selection step
  const renderTreatmentSelectionStep = () => (
    <GuestTreatmentSelectionStep
      treatments={treatments}
      selectedTreatmentId={selectedTreatmentId}
      selectedDurationId={selectedDurationId}
      onTreatmentSelect={setSelectedTreatmentId}
      onDurationSelect={setSelectedDurationId}
      onNext={nextStep}
      onPrev={prevStep}
    />
  )

  // Render summary step (for guests)
  const renderSummaryStep = () => {
    if (isGuest) {
      return (
        <GuestSubscriptionSummaryStep
          selectedSubscription={selectedSubscription}
          selectedTreatment={selectedTreatment}
          selectedDuration={selectedDuration}
          calculatedPrice={calculatedPrice}
          onNext={nextStep}
          onPrev={prevStep}
        />
      )
    }
    return null
  }

  // Render payment step
  const renderPaymentStep = () => {
    if (isGuest) {
      return (
        <GuestPaymentStep
          calculatedPrice={calculatedPrice}
          guestInfo={guestInfo}
          setGuestInfo={setGuestInfo}
          onConfirm={handlePurchase}
          onPrev={prevStep}
          isLoading={loading}
        />
      )
    }

    return (
      <AnimatedContainer>
        <PurchaseCard
          title={t("purchaseSubscription.paymentTitle") || "תשלום"}
          description={t("purchaseSubscription.paymentDescription") || "השלם את רכישת המנוי"}
          icon={CreditCard}
        >
          <div className="space-y-6">
            <PurchaseSummary
              items={[
                {
                  name: `${selectedSubscription?.name} - ${selectedTreatment?.name}`,
                  price: totalPrice,
                  quantity: 1,
                },
              ]}
              total={totalPrice}
            />

            <PaymentMethodSelector
              paymentMethods={paymentMethods}
              selectedPaymentMethodId={selectedPaymentMethodId}
              onPaymentMethodSelect={setSelectedPaymentMethodId}
              onPaymentMethodAdded={async () => {
                const pmResult = await getPaymentMethods()
                if (pmResult.success && pmResult.paymentMethods) {
                  setPaymentMethods(pmResult.paymentMethods)
                }
              }}
            />

            <PurchaseNavigation
              onPrev={prevStep}
              onNext={handlePurchase}
              nextLabel={t("purchaseSubscription.completePurchase") || "השלם רכישה"}
              isLoading={loading}
              disabled={!selectedPaymentMethodId}
            />
          </div>
        </PurchaseCard>
      </AnimatedContainer>
    )
  }

  // Render completion step
  const renderCompletionStep = () => {
    if (isGuest) {
      return (
        <div className="text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">רכישה הושלמה בהצלחה!</h2>
            <p className="text-gray-600 mt-2">המנוי שלך נרכש בהצלחה</p>
          </div>
          <Button onClick={() => router.push("/")}>
            חזור לעמוד הבית
          </Button>
        </div>
      )
    }

    return (
      <div className="max-w-4xl mx-auto">
        <PurchaseSuccess
          title={t("purchaseSubscription.success") || "רכישה הושלמה!"}
          message={t("purchaseSubscription.successDescription") || "המנוי שלך נרכש בהצלחה"}
          actionLabel={t("purchaseSubscription.viewMySubscriptions") || "צפה במנויים שלי"}
          onAction={() => router.push("/dashboard/member/subscriptions")}
          secondaryActionLabel={t("purchaseSubscription.backToDashboard") || "חזור לדשבורד"}
          onSecondaryAction={() => router.push("/dashboard")}
        />
      </div>
    )
  }

  // Main render logic
  const renderStep = () => {
    if (purchaseComplete) {
      return renderCompletionStep()
    }

    if (isGuest) {
      switch (currentStep) {
        case 1:
          return (
            <GuestInfoStep
              guestInfo={guestInfo}
              onSubmit={handleGuestInfoSubmit}
              showGiftOptions={false}
            />
          )
        case 2:
          return renderSubscriptionSelectionStep()
        case 3:
          return renderTreatmentSelectionStep()
        case 4:
          return renderPaymentStep()
        case 5:
          return renderCompletionStep()
        default:
          return null
      }
    } else {
      // Member flow
      switch (currentStep) {
        case 1:
          return renderSubscriptionSelectionStep()
        case 2:
          return renderTreatmentSelectionStep()
        case 3:
          return renderPaymentStep()
        case 4:
          return renderCompletionStep()
        default:
          return null
      }
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {!purchaseComplete && (
        <>
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900">
              {isGuest ? "רכישת מנוי" : t("purchaseSubscription.title") || "רכישת מנוי"}
            </h1>
            <p className="text-gray-600 mt-2">
              {isGuest ? "בחר ורכוש מנוי טיפולים" : t("purchaseSubscription.description") || "בחר ורכוש מנוי טיפולים"}
            </p>
          </div>

          <StepIndicator steps={steps} currentStep={currentStep} />
          
          {isGuest && (
            <div className="mb-6">
              <Progress value={(currentStep / TOTAL_STEPS) * 100} className="w-full" />
            </div>
          )}
        </>
      )}

      {renderStep()}
    </div>
  )
} 