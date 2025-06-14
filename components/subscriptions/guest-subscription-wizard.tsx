"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { GuestInfoStep } from "@/components/booking/steps/guest-info-step"
import GuestSubscriptionSelectionStep from "./guest-subscription-selection-step"
import { GuestTreatmentSelectionStep } from "@/components/booking/steps/guest-treatment-selection-step"
import GuestSubscriptionSummaryStep from "./guest-subscription-summary-step"
import { GuestPaymentStep } from "@/components/booking/steps/guest-payment-step"
import { createGuestUser } from "@/actions/booking-actions"
import { purchaseGuestSubscription, saveAbandonedSubscriptionPurchase } from "@/actions/user-subscription-actions"
import type { ISubscription } from "@/lib/db/models/subscription"
import type { ITreatment } from "@/lib/db/models/treatment"
import type { CalculatedPriceDetails } from "@/types/booking"

interface Props {
  subscriptions: ISubscription[]
  treatments: ITreatment[]
}

export default function GuestSubscriptionWizard({ subscriptions, treatments }: Props) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [guestInfo, setGuestInfo] = useState<any>({})
  const [guestUserId, setGuestUserId] = useState<string | null>(null)
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string>("")
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string>("")
  const [selectedDurationId, setSelectedDurationId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  const selectedTreatment = treatments.find(t => t._id.toString() === selectedTreatmentId)
  const selectedDuration = selectedTreatment?.pricingType === "duration_based" ?
    selectedTreatment.durations?.find(d => d._id.toString() === selectedDurationId) : undefined

  const pricePerSession = selectedTreatment?.pricingType === "fixed" ? selectedTreatment.fixedPrice || 0 : selectedDuration?.price || 0

  const calculatedPrice: CalculatedPriceDetails = {
    basePrice: (subscriptions.find(s=>s._id.toString()===selectedSubscriptionId)?.quantity || 0) * pricePerSession,
    surcharges: [],
    totalSurchargesAmount: 0,
    treatmentPriceAfterSubscriptionOrTreatmentVoucher: (subscriptions.find(s=>s._id.toString()===selectedSubscriptionId)?.quantity || 0) * pricePerSession,
    couponDiscount: 0,
    voucherAppliedAmount: 0,
    finalAmount: (subscriptions.find(s=>s._id.toString()===selectedSubscriptionId)?.quantity || 0) * pricePerSession,
    isBaseTreatmentCoveredBySubscription: false,
    isBaseTreatmentCoveredByTreatmentVoucher: false,
    isFullyCoveredByVoucherOrSubscription: false,
  }

  useEffect(() => {
    if (guestUserId) {
      saveAbandonedSubscriptionPurchase(guestUserId, {
        guestInfo,
        purchaseOptions: {
          selectedSubscriptionId,
          selectedTreatmentId,
          selectedDurationId,
        },
        currentStep,
      })
    }
  }, [guestUserId, guestInfo, selectedSubscriptionId, selectedTreatmentId, selectedDurationId, currentStep])

  const nextStep = () => setCurrentStep(s => Math.min(s + 1, 5))
  const prevStep = () => setCurrentStep(s => Math.max(s - 1, 1))

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

  const handlePurchase = async () => {
    if (!selectedSubscriptionId || !selectedTreatmentId) return
    setIsLoading(true)
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
    setIsLoading(false)
    if (result.success) {
      router.push("/")
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <GuestInfoStep guestInfo={guestInfo} setGuestInfo={setGuestInfo} onNext={handleGuestInfoSubmit} />
        )
      case 2:
        return (
          <GuestSubscriptionSelectionStep
            subscriptions={subscriptions}
            selectedId={selectedSubscriptionId}
            onSelect={setSelectedSubscriptionId}
            onNext={nextStep}
            onPrev={prevStep}
          />
        )
      case 3:
        return (
          <GuestTreatmentSelectionStep
            initialData={{ activeTreatments: treatments }}
            bookingOptions={{
              selectedTreatmentId,
              selectedDurationId,
            }}
            setBookingOptions={(opts: any) => {
              setSelectedTreatmentId(opts.selectedTreatmentId || "")
              if (opts.selectedDurationId !== undefined) {
                setSelectedDurationId(opts.selectedDurationId)
              }
            }}
            onNext={nextStep}
            onPrev={prevStep}
            hideGenderPreference
          />
        )
      case 4:
        return (
          <GuestSubscriptionSummaryStep
            guestInfo={guestInfo}
            subscription={subscriptions.find(s=>s._id.toString()===selectedSubscriptionId)}
            treatment={selectedTreatment}
            durationPrice={pricePerSession}
            onNext={nextStep}
            onPrev={prevStep}
          />
        )
      case 5:
        return (
          <GuestPaymentStep
            calculatedPrice={calculatedPrice}
            guestInfo={guestInfo}
            setGuestInfo={setGuestInfo}
            onConfirm={handlePurchase}
            onPrev={prevStep}
            isLoading={isLoading}
          />
        )
      default:
        return null
    }
  }

  return <div className="max-w-4xl mx-auto">{renderStep()}</div>
}
