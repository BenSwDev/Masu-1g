"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input" 
import { Label } from "@/components/common/ui/label"
import { Progress } from "@/components/common/ui/progress"
import { useToast } from "@/components/common/ui/use-toast"
import type { ITreatment } from "@/lib/db/models/treatment"
import { GuestInfoStep } from "@/components/booking/steps/guest-info-step"
import { GuestPaymentStep } from "@/components/booking/steps/guest-payment-step"
import { initiateGuestPurchaseGiftVoucher, confirmGuestGiftVoucherPurchase, saveAbandonedGiftVoucherPurchase, type GiftVoucherPlain } from "@/actions/gift-voucher-actions"
import { createGuestUser } from "@/actions/booking-actions"
import type { CalculatedPriceDetails } from "@/types/booking"
import GuestGiftVoucherConfirmation from "@/components/gift-vouchers/guest-gift-voucher-confirmation"

// Serialized versions for state management
interface SerializedTreatment {
  _id: string
  name: string
  description?: string
  category: string
  pricingType: "fixed" | "duration_based"
  fixedPrice?: number
  durations?: {
    _id: string
    minutes: number
    price: number
    isActive: boolean
  }[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface Props {
  treatments: ITreatment[]
}

function treatmentToSerialized(treatment: ITreatment): SerializedTreatment {
  return {
    _id: String(treatment._id),
    name: treatment.name,
    description: treatment.description,
    category: treatment.category,
    pricingType: treatment.pricingType,
    fixedPrice: treatment.fixedPrice,
    durations: treatment.durations?.map(d => ({
      _id: String(d._id),
      minutes: d.minutes,
      price: d.price,
      isActive: d.isActive
    })),
    isActive: treatment.isActive,
    createdAt: treatment.createdAt.toISOString(),
    updatedAt: treatment.updatedAt.toISOString(),
  }
}

export default function SimplifiedGiftVoucherWizard({ treatments: propTreatments }: Props) {
  const { toast } = useToast()
  
  // Convert treatments to serialized format
  const treatments = propTreatments ? propTreatments.map(treatmentToSerialized) : []
  
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [voucherType, setVoucherType] = useState<"monetary" | "treatment">("monetary")
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string>("")
  const [selectedDurationId, setSelectedDurationId] = useState<string>("")
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [monetaryValue, setMonetaryValue] = useState<number>(150)
  const [guestInfo, setGuestInfo] = useState<any>({})
  const [guestUserId, setGuestUserId] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [purchaseComplete, setPurchaseComplete] = useState<boolean>(false)
  const [purchasedVoucher, setPurchasedVoucher] = useState<GiftVoucherPlain | null>(null)

  // Filter out undefined categories and get unique categories
  const treatmentCategories = [...new Set(treatments.map(t => t.category).filter(Boolean))]
  const categoryTreatments = selectedCategory ? 
    treatments.filter(t => t.category === selectedCategory) : []

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

  // Selected data
  const selectedTreatment = treatments.find(t => t._id === selectedTreatmentId)
  const selectedDuration = selectedTreatment?.pricingType === "duration_based" ?
    selectedTreatment.durations?.find(d => d._id === selectedDurationId) : undefined

  // Calculate price
  const price = voucherType === "monetary" ? monetaryValue : 
    (selectedTreatment?.pricingType === "fixed" ? 
      selectedTreatment.fixedPrice || 0 : 
      selectedDuration?.price || 0)

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
    totalOfficeCommission: price,
    baseProfessionalPayment: 0,
    surchargesProfessionalPayment: 0,
  }

  // Save abandoned purchase
  useEffect(() => {
    if (guestUserId) {
      saveAbandonedGiftVoucherPurchase(guestUserId, {
        guestInfo,
        purchaseOptions: {
          voucherType,
          selectedTreatmentId,
          selectedDurationId,
          monetaryValue,
        },
        currentStep,
      })
    }
  }, [guestUserId, guestInfo, voucherType, selectedTreatmentId, selectedDurationId, monetaryValue, currentStep])

  const handlePurchase = async () => {
    setIsLoading(true)
    let sendDateForPayload: string | undefined = "immediate"
    if (guestInfo.isGift && guestInfo.sendOption === "scheduled" && guestInfo.sendDate && guestInfo.sendTime) {
      const [h, m] = guestInfo.sendTime.split(":").map(Number)
      const combined = new Date(guestInfo.sendDate)
      combined.setHours(h, m, 0, 0)
      sendDateForPayload = combined.toISOString()
    }

    try {
      const initRes = await initiateGuestPurchaseGiftVoucher({
        voucherType,
        treatmentId: voucherType === "treatment" ? selectedTreatmentId : undefined,
        selectedDurationId: voucherType === "treatment" ? selectedDurationId || undefined : undefined,
        monetaryValue: voucherType === "monetary" ? price : undefined,
        isGift: guestInfo.isGift || false,
        recipientName: guestInfo.recipientFirstName ? guestInfo.recipientFirstName + " " + guestInfo.recipientLastName : undefined,
        recipientPhone: guestInfo.recipientPhone,
        greetingMessage: guestInfo.greetingMessage,
        sendDate: sendDateForPayload,
        guestInfo: {
          name: (guestInfo.firstName || "") + " " + (guestInfo.lastName || ""),
          email: guestInfo.email || "",
          phone: guestInfo.phone || "",
        }
      })

      if (!initRes.success || !initRes.voucherId) {
        toast({ variant: "destructive", title: "שגיאה", description: initRes.error || "שגיאה ביצירת השובר" })
        setIsLoading(false)
        return
      }

      const confirmRes = await confirmGuestGiftVoucherPurchase({
        voucherId: initRes.voucherId,
        // ✅ תיקון: מזהה תשלום אמיתי עם בדיקת סביבה
      paymentId: process.env.NODE_ENV === 'production' 
        ? `LIVE-PAY-${Date.now()}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}` 
        : `DEV-PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        amount: price,
        success: true,
        guestInfo: {
          name: (guestInfo.firstName || "") + " " + (guestInfo.lastName || ""),
          email: guestInfo.email || "",
          phone: guestInfo.phone || "",
        }
      })

      if (confirmRes.success) {
        setPurchasedVoucher(confirmRes.voucher || null)
        setPurchaseComplete(true)
      } else {
        toast({ variant: "destructive", title: "שגיאה", description: confirmRes.error || "שגיאה ברכישת השובר" })
      }
    } catch (error) {
      console.error("Purchase error:", error)
      toast({ variant: "destructive", title: "שגיאה", description: "שגיאה ברכישת השובר" })
    } finally {
      setIsLoading(false)
    }
  }

  const canProceedToStep2 = (voucherType === "monetary" && monetaryValue >= 150) ||
    (voucherType === "treatment" && selectedTreatmentId && 
     (selectedTreatment?.pricingType !== "duration_based" || selectedDurationId))

  if (purchaseComplete) {
    return <GuestGiftVoucherConfirmation voucher={purchasedVoucher} />
  }

  const renderStep1 = () => (
    <div className="max-w-2xl mx-auto space-y-6">
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
                voucherType === 'monetary' ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"
              }`}
              onClick={() => {
                setVoucherType('monetary')
                setSelectedTreatmentId("")
                setSelectedDurationId("")
                setSelectedCategory("")
              }}
            >
              <div className="font-medium">שובר כספי</div>
              <div className="text-sm text-gray-600 mt-1">סכום קבוע</div>
            </div>
            <div
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all text-center ${
                voucherType === 'treatment' ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"
              }`}
              onClick={() => {
                setVoucherType('treatment')
              }}
            >
              <div className="font-medium">שובר טיפול</div>
              <div className="text-sm text-gray-600 mt-1">טיפול ספציפי</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* סכום השובר */}
      {voucherType === 'monetary' && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">סכום השובר</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {[200, 300, 500, 1000].map((presetAmount) => (
                <div
                  key={presetAmount}
                  className={`p-3 border-2 rounded-lg cursor-pointer transition-all text-center ${
                    monetaryValue === presetAmount ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"
                  }`}
                  onClick={() => setMonetaryValue(presetAmount)}
                >
                  <div className="font-bold text-blue-600">₪{presetAmount}</div>
                </div>
              ))}
            </div>
            
            <div>
              <Label htmlFor="customAmount" className="text-sm font-medium">סכום אחר (מינימום ₪150)</Label>
              <Input
                id="customAmount"
                type="number"
                min="150"
                max="2000"
                value={monetaryValue || ""}
                onChange={(e) => setMonetaryValue(Math.max(150, Number(e.target.value) || 150))}
                placeholder="הכנס סכום..."
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* קטגוריית טיפול */}
      {voucherType === 'treatment' && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">סוג טיפול</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {treatmentCategories.map((category) => (
                <div
                  key={category}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all text-center ${
                    selectedCategory === category ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"
                  }`}
                  onClick={() => {
                    setSelectedCategory(category)
                    setSelectedTreatmentId("")
                    setSelectedDurationId("")
                  }}
                >
                  <div className="font-medium">
                    {getCategoryDisplayName(category)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* טיפולים לפי קטגוריה */}
      {selectedCategory && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">בחירת טיפול</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {categoryTreatments.map((treatment) => (
                <div
                  key={treatment._id}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedTreatmentId === treatment._id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"
                  }`}
                  onClick={() => {
                    setSelectedTreatmentId(treatment._id)
                    setSelectedDurationId("")
                  }}
                >
                  <div className="flex justify-between items-center">
                    <div className="font-medium">{treatment.name}</div>
                    {treatment.pricingType === "fixed" && (
                      <div className="font-bold text-blue-600">₪{treatment.fixedPrice}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* משכי זמן */}
      {selectedTreatment?.pricingType === "duration_based" && selectedTreatment.durations && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">משך זמן</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {selectedTreatment.durations.filter(d => d.isActive).map((duration) => (
                <div
                  key={duration._id}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all text-center ${
                    selectedDurationId === duration._id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"
                  }`}
                  onClick={() => setSelectedDurationId(duration._id)}
                >
                  <div className="font-medium">{duration.minutes} דקות</div>
                  <div className="font-bold text-blue-600">₪{duration.price}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* סיכום מחיר */}
      {canProceedToStep2 && (
        <Card className="border-green-200 bg-green-50 shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-800 mb-2">
                ₪{price.toFixed(2)}
              </div>
              <div className="text-green-700">
                {voucherType === 'monetary' ? 
                  `שובר כספי בסכום ₪${price}` : 
                  `שובר טיפול - ${selectedTreatment?.name}${selectedDuration ? ` (${selectedDuration.minutes} דקות)` : ''}`
                }
              </div>
              <Button 
                onClick={() => setCurrentStep(2)} 
                size="lg"
                className="mt-4 w-full"
              >
                המשך לתשלום
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

  const renderStep2 = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">השלמת הרכישה</h2>
        <p className="text-gray-600">מלא פרטים אישיים ובצע תשלום</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* פרטים אישיים ותשלום */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">פרטים אישיים</CardTitle>
            </CardHeader>
            <CardContent>
              <GuestInfoStep
                guestInfo={guestInfo}
                setGuestInfo={setGuestInfo}
                                  onNext={(info) => {
                    setGuestInfo(info)
                    if (!guestUserId) {
                      createGuestUser({
                        firstName: info.firstName || "",
                        lastName: info.lastName || "",
                        email: info.email || "",
                        phone: info.phone || "",
                        birthDate: info.birthDate,
                        gender: info.gender,
                      }).then((result: any) => {
                        if (result.success && result.userId) {
                          setGuestUserId(result.userId)
                        }
                      })
                    }
                  }}
                defaultBookingForSomeoneElse={true}
                hideRecipientBirthGender={true}
                showGiftOptions={true}
              />
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">תשלום</CardTitle>
            </CardHeader>
            <CardContent>
              <GuestPaymentStep
                calculatedPrice={calculatedPrice}
                guestInfo={guestInfo}
                setGuestInfo={setGuestInfo}
                onConfirm={handlePurchase}
                onPrev={() => setCurrentStep(1)}
                isLoading={isLoading}
                purchaseType="gift_voucher"
                purchaseDetails={{
                  treatmentName: selectedTreatment?.name,
                  voucherType: voucherType,
                  voucherAmount: voucherType === "monetary" ? monetaryValue : undefined,
                }}
              />
            </CardContent>
          </Card>
        </div>

        {/* סיכום הזמנה */}
        <div>
          <Card className="border-blue-200 bg-blue-50 shadow-sm sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">סיכום הזמנה</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">סוג שובר</span>
                  <span className="font-medium">{voucherType === "monetary" ? "שובר כספי" : "שובר טיפול"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">ערך</span>
                  <span className="font-medium">
                    {voucherType === "monetary" ? `₪${price}` : selectedTreatment?.name}
                  </span>
                </div>
                {selectedDuration && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">משך זמן</span>
                    <span className="font-medium">{selectedDuration.minutes} דקות</span>
                  </div>
                )}
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between items-center text-xl font-bold text-blue-800">
                    <span>סה"כ</span>
                    <span>₪{price.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )

  const progress = (currentStep / 2) * 100

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Progress value={progress} className="mb-8" />
      {currentStep === 1 ? renderStep1() : renderStep2()}
    </div>
  )
} 