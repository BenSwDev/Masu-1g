"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { GuestInfoStep } from "@/components/booking/steps/guest-info-step"
import { GuestPaymentStep } from "@/components/booking/steps/guest-payment-step"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Progress } from "@/components/ui/progress"
import { useTranslation } from "@/lib/translations/i18n"
import { DollarSign, Gift, CheckCircle } from "lucide-react"
import {
  initiateGuestPurchaseGiftVoucher,
  confirmGuestGiftVoucherPurchase,
  saveAbandonedGiftVoucherPurchase,
  type GiftVoucherPlain,
} from "@/actions/gift-voucher-actions"
import { createGuestUser } from "@/actions/booking-actions"
import type { ITreatment } from "@/lib/db/models/treatment"
import type { CalculatedPriceDetails } from "@/types/core/booking"

interface Props {
  treatments: ITreatment[]
}

export default function UnifiedGiftVoucherWizard({ treatments }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const { t, language, dir } = useTranslation()

  // Wizard state - 3 steps total
  const [currentStep, setCurrentStep] = useState(1)

  // Selection state
  const [voucherType, setVoucherType] = useState<"monetary" | "treatment">("monetary")
  const [monetaryValue, setMonetaryValue] = useState(150)
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string>("")
  const [selectedDurationId, setSelectedDurationId] = useState<string>("")
  const [selectedCategory, setSelectedCategory] = useState<string>("")

  // Form state
  const [guestInfo, setGuestInfo] = useState<any>({})
  const [guestUserId, setGuestUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Add user detection (you might need to import useAuth or similar)
  const currentUser = null // TODO: Add actual user detection

  // Pre-fill guest info for logged-in users
  const prefilledGuestInfo = useMemo(() => {
    // currentUser is null for now - will be implemented later
    return {}
  }, [currentUser])

  useEffect(() => {
    setGuestInfo(prefilledGuestInfo)
  }, [prefilledGuestInfo])

  const selectedTreatment = treatments.find(
    t => (typeof t._id === "string" ? t._id : t._id?.toString?.() || '') === selectedTreatmentId
  )
  const selectedDuration =
    selectedTreatment?.pricingType === "duration_based"
      ? selectedTreatment.durations?.find(
          d => (typeof d._id === "string" ? d._id : d._id?.toString?.() || '') === selectedDurationId
        )
      : undefined

  const price =
    voucherType === "monetary"
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
    totalProfessionalPayment: 0,
    totalOfficeCommission: 0,
    baseProfessionalPayment: 0,
    surchargesProfessionalPayment: 0,
  }

  // Filter out undefined categories and get unique categories
  const treatmentCategories = [...new Set(treatments.map(t => t.category).filter(Boolean))]

  // Function to translate category names
  const getCategoryDisplayName = (category: string) => {
    switch (category) {
      case "massages":
        return "עיסויים"
      case "facial_treatments":
        return "טיפולי פנים"
      default:
        return category
    }
  }
  const categoryTreatments = selectedCategory
    ? treatments.filter(t => t.category === selectedCategory)
    : []

  // Wizard navigation
  const nextStep = () => setCurrentStep(s => Math.min(s + 1, 3))
  const prevStep = () => setCurrentStep(s => Math.max(s - 1, 1))

  useEffect(() => {
    if (guestUserId) {
      saveAbandonedGiftVoucherPurchase(guestUserId, {
        guestInfo,
        purchaseOptions: {
          voucherType,
          treatmentId: selectedTreatmentId,
          selectedDurationId,
          monetaryValue: voucherType === "monetary" ? monetaryValue : undefined,
          isGift: guestInfo.isGift,
        },
        currentStep,
      })
    }
  }, [
    guestUserId,
    guestInfo,
    voucherType,
    selectedTreatmentId,
    selectedDurationId,
    monetaryValue,
    currentStep,
  ])

  const handleGuestInfoSubmit = async (info: any) => {
    setGuestInfo(info)
    if (!guestUserId) {
      const result = await createGuestUser({
        name: info.firstName + ' ' + (info.lastName || ''),
        
        email: info.email,
        phone: info.phone,
        
        
      })
      if (result.success && result.userId) {
        setGuestUserId(result.userId)
      }
    }
    nextStep()
  }

  const handlePurchase = async () => {
    setIsLoading(true)
    let sendDateForPayload: string | undefined = "immediate"
    if (
      guestInfo.isGift &&
      guestInfo.sendOption === "scheduled" &&
      guestInfo.sendDate &&
      guestInfo.sendTime
    ) {
      const [h, m] = guestInfo.sendTime.split(":").map(Number)
      const combined = new Date(guestInfo.sendDate)
      combined.setHours(h, m, 0, 0)
      sendDateForPayload = combined.toISOString()
    }

    try {
      const initRes = await initiateGuestPurchaseGiftVoucher({
        voucherType,
        treatmentId: voucherType === "treatment" ? selectedTreatmentId : undefined,
        selectedDurationId:
          voucherType === "treatment" ? selectedDurationId || undefined : undefined,
        monetaryValue: voucherType === "monetary" ? price : undefined,
        isGift: guestInfo.isGift || false,
        recipientName: guestInfo.recipientFirstName
          ? guestInfo.recipientFirstName + " " + guestInfo.recipientLastName
          : undefined,
        recipientPhone: guestInfo.recipientPhone,
        greetingMessage: guestInfo.greetingMessage,
        sendDate: sendDateForPayload,
        guestInfo: {
          name: guestInfo.firstName + " " + guestInfo.lastName,
          email: guestInfo.email,
          phone: guestInfo.phone,
        },
      })

      if (!initRes.success || !initRes.voucherId) {
        toast({ variant: "destructive", title: "שגיאה", description: initRes.error || "" })
        setIsLoading(false)
        return
      }

      const confirmRes = await confirmGuestGiftVoucherPurchase({
        voucherId: initRes.voucherId,
        paymentId: `guest_payment_${Date.now()}`,
        amount: price,
        success: true,
        guestInfo: {
          name: guestInfo.firstName + " " + guestInfo.lastName,
          email: guestInfo.email,
          phone: guestInfo.phone,
        },
      })

      setIsLoading(false)
      if (confirmRes.success && confirmRes.voucher) {
        // Immediately redirect to confirmation page
        const voucherId = confirmRes.voucher._id
        if (voucherId) {
          router.push(`/purchase/gift-voucher/confirmation?voucherId=${voucherId}&status=success`)
        } else {
          toast({
            variant: "destructive",
            title: "שגיאה",
            description: "לא ניתן למצוא מזהה השובר. אנא פנה לתמיכה.",
          })
        }
      } else {
        toast({ variant: "destructive", title: "שגיאה", description: confirmRes.error || "" })
      }
    } catch (error) {
      console.error("Purchase error:", error)
      toast({ variant: "destructive", title: "שגיאה", description: "שגיאה ברכישת השובר" })
    } finally {
      setIsLoading(false)
    }
  }

  // Validation for each step
  const canProceedToStep2 =
    (voucherType === "monetary" && monetaryValue >= 150) ||
    (voucherType === "treatment" &&
      selectedTreatmentId &&
      (selectedTreatment?.pricingType !== "duration_based" || selectedDurationId))

  // Step 1: Selection (Voucher Type + Details)
  const renderStep1 = () => (
    <div className="max-w-2xl mx-auto space-y-6" dir={dir} lang={language}>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">שובר מתנה</h2>
        <p className="text-gray-600">בחר סוג שובר ופרטים</p>
      </div>

      {/* סוג השובר */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">סוג השובר</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all text-center ${
                voucherType === "monetary"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-blue-300"
              }`}
              onClick={() => {
                setVoucherType("monetary")
                setSelectedTreatmentId("")
                setSelectedDurationId("")
                setSelectedCategory("")
              }}
            >
              <div className="flex items-center justify-center mb-2">
                <DollarSign className="w-6 h-6 text-blue-600" />
                {voucherType === "monetary" && (
                  <CheckCircle className="w-5 h-5 text-blue-500 ml-2" />
                )}
              </div>
              <div className="font-medium">שובר כספי</div>
              <div className="text-sm text-gray-600 mt-1">סכום קבוע</div>
            </div>
            <div
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all text-center ${
                voucherType === "treatment"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-blue-300"
              }`}
              onClick={() => {
                setVoucherType("treatment")
              }}
            >
              <div className="flex items-center justify-center mb-2">
                <Gift className="w-6 h-6 text-blue-600" />
                {voucherType === "treatment" && (
                  <CheckCircle className="w-5 h-5 text-blue-500 ml-2" />
                )}
              </div>
              <div className="font-medium">שובר טיפול</div>
              <div className="text-sm text-gray-600 mt-1">טיפול ספציפי</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* סכום השובר */}
      {voucherType === "monetary" && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">סכום השובר</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {[200, 300, 500, 1000].map(presetAmount => (
                <div
                  key={presetAmount}
                  className={`p-3 border-2 rounded-lg cursor-pointer transition-all text-center ${
                    monetaryValue === presetAmount
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                  onClick={() => setMonetaryValue(presetAmount)}
                >
                  <div className="font-bold text-blue-600">₪{presetAmount}</div>
                  {monetaryValue === presetAmount && (
                    <CheckCircle className="w-4 h-4 text-blue-500 mx-auto mt-1" />
                  )}
                </div>
              ))}
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                או הכנס סכום מותאם אישית (מינימום ₪150)
              </label>
              <Input
                type="number"
                min={150}
                value={monetaryValue}
                onChange={e => setMonetaryValue(Math.max(150, parseInt(e.target.value) || 150))}
                placeholder="150"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* בחירת טיפול */}
      {voucherType === "treatment" && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">בחירת טיפול</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* קטגוריה */}
            <div>
              <label className="text-sm font-medium mb-2 block">קטגוריית טיפול</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר קטגוריה" />
                </SelectTrigger>
                <SelectContent>
                  {treatmentCategories.map(category => (
                    <SelectItem key={category} value={category}>
                      {getCategoryDisplayName(category)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* טיפולים */}
            {selectedCategory && categoryTreatments.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">טיפול</label>
                <div className="grid gap-2">
                  {categoryTreatments.map(treatment => (
                    <div
                      key={
                        typeof treatment._id === "string"
                          ? treatment._id
                          : treatment._id?.toString?.() || ''
                      }
                      className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedTreatmentId ===
                        (typeof treatment._id === "string"
                          ? treatment._id
                          : treatment._id?.toString?.() || '')
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-blue-300"
                      }`}
                      onClick={() =>
                        setSelectedTreatmentId(
                          typeof treatment._id === "string"
                            ? treatment._id
                            : treatment._id?.toString?.() || '' || ""
                        )
                      }
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{treatment.name}</h4>
                          {treatment.description && (
                            <p className="text-sm text-gray-600 mt-1">{treatment.description}</p>
                          )}
                          {treatment.pricingType === "fixed" && (
                            <p className="text-sm text-blue-600 mt-1">₪{treatment.fixedPrice}</p>
                          )}
                        </div>
                        {selectedTreatmentId ===
                          (typeof treatment._id === "string"
                            ? treatment._id
                            : treatment._id?.toString?.() || '') && (
                          <CheckCircle className="w-5 h-5 text-blue-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* משך הטיפול (אם נדרש) */}
            {selectedTreatment?.pricingType === "duration_based" && selectedTreatment.durations && (
              <div>
                <label className="text-sm font-medium mb-2 block">משך הטיפול</label>
                <div className="grid gap-2">
                  {selectedTreatment.durations
                    .filter(d => d.isActive)
                    .map(duration => (
                      <div
                        key={
                          typeof duration._id === "string" ? duration._id : duration._id?.toString?.() || ''
                        }
                        className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedDurationId ===
                          (typeof duration._id === "string"
                            ? duration._id
                            : duration._id?.toString?.() || '')
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-blue-300"
                        }`}
                        onClick={() =>
                          setSelectedDurationId(
                            typeof duration._id === "string"
                              ? duration._id
                              : duration._id?.toString?.() || '' || ""
                          )
                        }
                      >
                        <div className="flex justify-between items-center">
                          <span>{duration.minutes} דקות</span>
                          <div className="flex items-center gap-2">
                            <span className="text-blue-600 font-medium">₪{duration.price}</span>
                            {selectedDurationId ===
                              (typeof duration._id === "string"
                                ? duration._id
                                : duration._id?.toString?.() || '') && (
                              <CheckCircle className="w-5 h-5 text-blue-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* סיכום מחיר */}
      {canProceedToStep2 && (
        <Card className="shadow-sm border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold">סה"כ לשובר</h3>
                <p className="text-sm text-gray-600">
                  {voucherType === "monetary"
                    ? `סכום: ₪${monetaryValue}`
                    : `טיפול: ${selectedTreatment?.name}${selectedDuration ? ` (${selectedDuration.minutes} דקות)` : ""}`}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">₪{price}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end mt-6">
        <Button onClick={nextStep} disabled={!canProceedToStep2} className="min-w-32">
          המשך לפרטים אישיים
        </Button>
      </div>
    </div>
  )

  // Step 2: Guest Info
  const renderStep2 = () => (
    <div className="max-w-2xl mx-auto" dir={dir} lang={language}>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">פרטים אישיים</h2>
        <p className="text-gray-600">מלא את הפרטים שלך ופרטי המתנה</p>
      </div>

      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <GuestInfoStep
            guestInfo={guestInfo}
            setGuestInfo={setGuestInfo}
            onNext={handleGuestInfoSubmit}
            onPrev={prevStep}
            defaultBookingForSomeoneElse={true}
            hideRecipientBirthGender={true}
            showGiftOptions={true}
            hideBookingForSomeoneElse={false}
          />
        </CardContent>
      </Card>
    </div>
  )

  // Step 3: Payment
  const renderStep3 = () => (
    <div className="max-w-2xl mx-auto" dir={dir} lang={language}>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">תשלום</h2>
        <p className="text-gray-600">סיים את הרכישה</p>
      </div>

      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <GuestPaymentStep
            calculatedPrice={calculatedPrice}
            guestInfo={guestInfo}
            setGuestInfo={setGuestInfo}
            onConfirm={handlePurchase}
            onPrev={prevStep}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  )

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1()
      case 2:
        return renderStep2()
      case 3:
        return renderStep3()
      default:
        return renderStep1()
    }
  }

  const progress = (currentStep / 3) * 100

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" dir={dir} lang={language}>
      <Progress value={progress} className="mb-8" />
      {renderCurrentStep()}
    </div>
  )
}

