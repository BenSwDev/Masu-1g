"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { GuestInfoStep } from "@/components/booking/steps/guest-info-step"
import { GuestTreatmentSelectionStep } from "@/components/booking/steps/guest-treatment-selection-step"
import { GuestPaymentStep } from "@/components/booking/steps/guest-payment-step"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Input } from "@/components/common/ui/input"
import { useToast } from "@/components/common/ui/use-toast"
import { Progress } from "@/components/common/ui/progress"
import { initiateGuestPurchaseGiftVoucher, confirmGuestGiftVoucherPurchase } from "@/actions/gift-voucher-actions"
import { createGuestUser } from "@/actions/booking-actions"
import type { ITreatment } from "@/lib/db/models/treatment"
import type { CalculatedPriceDetails } from "@/types/booking"

interface Props {
  treatments: ITreatment[]
}

export default function GuestGiftVoucherWizard({ treatments }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [guestInfo, setGuestInfo] = useState<any>({})
  const [guestUserId, setGuestUserId] = useState<string | null>(null)
  const [voucherType, setVoucherType] = useState<"monetary" | "treatment">("monetary")
  const [monetaryValue, setMonetaryValue] = useState(150)
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string>("")
  const [selectedDurationId, setSelectedDurationId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [purchaseComplete, setPurchaseComplete] = useState(false)

  const selectedTreatment = treatments.find(t => t._id.toString() === selectedTreatmentId)
  const selectedDuration = selectedTreatment?.pricingType === "duration_based"
    ? selectedTreatment.durations?.find(d => d._id.toString() === selectedDurationId)
    : undefined

  const price = voucherType === "monetary"
    ? Math.max(monetaryValue, 150)
    : selectedTreatment?.pricingType === "fixed"
      ? selectedTreatment.fixedPrice || 0
      : selectedDuration?.price || 0

  const calculatedPrice: CalculatedPriceDetails = {
    basePrice: price,
    surcharges: [],
    totalSurchargesAmount: 0,
    treatmentPriceAfterSubscriptionOrTreatmentVoucher: price,
    couponDiscount: 0,
    voucherAppliedAmount: 0,
    finalAmount: price,
    isBaseTreatmentCoveredBySubscription: false,
    isBaseTreatmentCoveredByTreatmentVoucher: false,
    isFullyCoveredByVoucherOrSubscription: false,
  }

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
    setIsLoading(true)
    const initRes = await initiateGuestPurchaseGiftVoucher({
      voucherType,
      treatmentId: voucherType === "treatment" ? selectedTreatmentId : undefined,
      selectedDurationId: voucherType === "treatment" ? selectedDurationId || undefined : undefined,
      monetaryValue: voucherType === "monetary" ? price : undefined,
      isGift: false,
      guestInfo: {
        name: guestInfo.firstName + " " + guestInfo.lastName,
        email: guestInfo.email,
        phone: guestInfo.phone,
      }
    })

    if (!initRes.success || !initRes.voucherId) {
      toast({ variant: "destructive", title: "שגיאה", description: initRes.error || "" })
      setIsLoading(false)
      return
    }

    const confirmRes = await confirmGuestGiftVoucherPurchase({
      voucherId: initRes.voucherId,
      paymentId: `guest_payment_${Date.now()}`,
      success: true,
      guestInfo: {
        name: guestInfo.firstName + " " + guestInfo.lastName,
        email: guestInfo.email,
        phone: guestInfo.phone,
      }
    })

    setIsLoading(false)
    if (confirmRes.success) {
      setPurchaseComplete(true)
    } else {
      toast({ variant: "destructive", title: "שגיאה", description: confirmRes.error || "" })
    }
  }

  const renderVoucherTypeStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">בחר סוג שובר</h2>
        <p className="text-gray-600 mt-2">בחר בין שובר כספי לשובר טיפול</p>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Card className={`cursor-pointer border-2 ${voucherType === "monetary" ? "border-blue-500" : "border-gray-200"}`}
          onClick={() => { setVoucherType("monetary"); setSelectedTreatmentId(""); setSelectedDurationId("") }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">שובר כספי</CardTitle>
          </CardHeader>
          <CardContent>
            <p>שובר בסכום כספי לבחירתך</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer border-2 ${voucherType === "treatment" ? "border-blue-500" : "border-gray-200"}`}
          onClick={() => { setVoucherType("treatment"); setMonetaryValue(150) }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">שובר טיפול</CardTitle>
          </CardHeader>
          <CardContent>
            <p>שובר לטיפול מסוים</p>
          </CardContent>
        </Card>
      </div>
      {voucherType === "monetary" && (
        <div className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>סכום השובר</CardTitle>
            </CardHeader>
            <CardContent>
              <Input type="number" min={150} value={monetaryValue} onChange={e => setMonetaryValue(Number(e.target.value))} placeholder="150" />
            </CardContent>
          </Card>
        </div>
      )}
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={prevStep}>חזור</Button>
        <Button onClick={() => {
          if (voucherType === "monetary") nextStep(); else nextStep();
        }} disabled={voucherType === "monetary" ? monetaryValue < 150 : false}>המשך</Button>
      </div>
    </div>
  )

  const renderTreatmentStep = () => (
    <GuestTreatmentSelectionStep
      initialData={{ activeTreatments: treatments }}
      bookingOptions={{ selectedTreatmentId, selectedDurationId }}
      setBookingOptions={(update: any) => {
        const prev = { selectedTreatmentId, selectedDurationId }
        const next = typeof update === "function" ? update(prev) : update
        if (next.selectedTreatmentId !== undefined) setSelectedTreatmentId(next.selectedTreatmentId || "")
        if (next.selectedDurationId !== undefined) setSelectedDurationId(next.selectedDurationId || "")
      }}
      onNext={nextStep}
      onPrev={prevStep}
      hideGenderPreference
      showPrice
    />
  )

  const renderSummaryStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold">סיכום השובר</h2>
        <p className="text-gray-600 mt-2">בדוק את הפרטים לפני התשלום</p>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <Card>
            <CardHeader>
              <CardTitle>פרטי שובר</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between"><span>סוג:</span><span>{voucherType === "monetary" ? "כספי" : "טיפול"}</span></div>
              {voucherType === "monetary" ? (
                <div className="flex justify-between"><span>ערך:</span><span>{price} ₪</span></div>
              ) : (
                <>
                  <div className="flex justify-between"><span>טיפול:</span><span>{selectedTreatment?.name}</span></div>
                  {selectedDuration && (
                    <div className="flex justify-between"><span>משך:</span><span>{selectedDuration.minutes} דקות</span></div>
                  )}
                  <div className="flex justify-between"><span>מחיר:</span><span>{price} ₪</span></div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle>פרטי מזמין</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between"><span>שם:</span><span>{guestInfo.firstName} {guestInfo.lastName}</span></div>
              <div className="flex justify-between"><span>אימייל:</span><span>{guestInfo.email}</span></div>
              <div className="flex justify-between"><span>טלפון:</span><span>{guestInfo.phone}</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={prevStep}>חזור</Button>
        <Button onClick={nextStep}>המשך לתשלום</Button>
      </div>
    </div>
  )

  if (purchaseComplete) {
    return (
      <div className="max-w-4xl mx-auto text-center">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600 text-2xl">השובר נרכש בהצלחה!</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/")}>חזרה לדף הבית</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderStep = () => {
    if (currentStep === 1) return <GuestInfoStep guestInfo={guestInfo} setGuestInfo={setGuestInfo} onNext={handleGuestInfoSubmit} />
    if (currentStep === 2) return renderVoucherTypeStep()
    if (currentStep === 3 && voucherType === "treatment") return renderTreatmentStep()
    if (currentStep === 3 && voucherType === "monetary") { nextStep(); return null }
    if (currentStep === 4) return renderSummaryStep()
    if (currentStep === 5) return (
      <GuestPaymentStep
        calculatedPrice={calculatedPrice}
        guestInfo={guestInfo}
        setGuestInfo={setGuestInfo}
        onConfirm={handlePurchase}
        onPrev={prevStep}
        isLoading={isLoading}
      />
    )
    return null
  }

  const progress = (currentStep / 5) * 100

  return (
    <div className="max-w-4xl mx-auto">
      <Progress value={progress} className="mb-8" />
      {renderStep()}
    </div>
  )
}
