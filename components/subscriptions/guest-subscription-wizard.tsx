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
import type { CalculatedPriceDetails, SelectedBookingOptions } from "@/types/booking"
import type { ISubscription } from "@/lib/db/models/subscription"
import type { ITreatment } from "@/lib/db/models/treatment"
import type { BookingInitialData } from "@/types/booking"

// Define serialized types that match the data we receive from the server
interface SerializedSubscription {
  _id: string
  name: string
  description: string
  quantity: number
  bonusQuantity: number
  validityMonths: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface SerializedTreatmentDuration {
  _id: string
  minutes: number
  price: number
  professionalPrice: number
  isActive: boolean
}

interface SerializedTreatment {
  _id: string
  name: string
  description: string
  category: string
  pricingType: "fixed" | "duration_based"
  fixedPrice?: number
  durations?: SerializedTreatmentDuration[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface Props {
  subscriptions: SerializedSubscription[]
  treatments: SerializedTreatment[]
}

// Convert serialized data to model types
function convertToSubscription(sub: SerializedSubscription): ISubscription {
  return {
    ...sub,
    _id: sub._id as any,
    createdAt: new Date(sub.createdAt),
    updatedAt: new Date(sub.updatedAt),
  } as ISubscription
}

function convertToTreatment(treatment: SerializedTreatment): ITreatment {
  return {
    ...treatment,
    _id: treatment._id as any,
    durations: treatment.durations?.map(d => ({
      ...d,
      _id: d._id as any,
    })),
    createdAt: new Date(treatment.createdAt),
    updatedAt: new Date(treatment.updatedAt),
  } as ITreatment
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

  const selectedTreatment = treatments.find(t => t._id === selectedTreatmentId)
  const selectedDuration = selectedTreatment?.pricingType === "duration_based" ?
    selectedTreatment.durations?.find(d => d._id === selectedDurationId) : undefined

  const pricePerSession = selectedTreatment?.pricingType === "fixed" ? selectedTreatment.fixedPrice || 0 : selectedDuration?.price || 0

  const calculatedPrice: CalculatedPriceDetails = {
    basePrice: (subscriptions.find(s=>s._id===selectedSubscriptionId)?.quantity || 0) * pricePerSession,
    surcharges: [],
    totalSurchargesAmount: 0,
    treatmentPriceAfterSubscriptionOrTreatmentVoucher: (subscriptions.find(s=>s._id===selectedSubscriptionId)?.quantity || 0) * pricePerSession,
    couponDiscount: 0,
    voucherAppliedAmount: 0,
    finalAmount: (subscriptions.find(s=>s._id===selectedSubscriptionId)?.quantity || 0) * pricePerSession,
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
            subscriptions={subscriptions.map(convertToSubscription)}
            selectedId={selectedSubscriptionId}
            onSelect={setSelectedSubscriptionId}
            onNext={nextStep}
            onPrev={prevStep}
          />
        )
      case 3:
        const bookingOptions: SelectedBookingOptions = {
          selectedTreatmentId: (selectedTreatmentId ?? ""),
          selectedDurationId: (selectedDurationId ?? ""),
          therapistGenderPreference: "any",
          isFlexibleTime: false,
          source: "new_purchase",
        }
        return (
          <GuestTreatmentSelectionStep
            initialData={{
              activeTreatments: treatments.map(convertToTreatment),
              activeUserSubscriptions: [],
              usableGiftVouchers: [],
              userPreferences: {
                therapistGender: "any",
                notificationMethods: [],
                notificationLanguage: "he",
              },
              userAddresses: [],
              userPaymentMethods: [],
              workingHoursSettings: {},
              currentUser: {
                id: "",
                name: "",
                email: "",
              },
            }}
            bookingOptions={bookingOptions}
            setBookingOptions={(update: any) => {
              const prev = {
                selectedTreatmentId,
                selectedDurationId,
              }
              const nextState =
                typeof update === "function" ? update(prev) : update
              if (typeof nextState.selectedTreatmentId === 'string') {
                setSelectedTreatmentId(nextState.selectedTreatmentId)
              } else {
                setSelectedTreatmentId("")
              }
              if (typeof nextState.selectedDurationId === 'string') {
                setSelectedDurationId(nextState.selectedDurationId)
              } else {
                setSelectedDurationId("")
              }
            }}
            onNext={nextStep}
            onPrev={prevStep}
            hideGenderPreference
            showPrice={false}
          />
        )
      case 4:
        const selectedSub = subscriptions.find(s=>s._id===selectedSubscriptionId)
        return (
          <GuestSubscriptionSummaryStep
            guestInfo={guestInfo}
            subscription={selectedSub ? convertToSubscription(selectedSub) : undefined}
            treatment={selectedTreatment ? convertToTreatment(selectedTreatment) : undefined}
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
