"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Input } from "@/components/common/ui/input"
import { Badge } from "@/components/common/ui/badge"
import { Progress } from "@/components/common/ui/progress"
import { useToast } from "@/components/common/ui/use-toast"
import { Gift, DollarSign, Clock, User, CreditCard } from "lucide-react"
import type { ITreatment } from "@/lib/db/models/treatment"
import { getTreatmentsForSelection, type SerializedTreatment } from "./actions"
import { GuestInfoStep } from "@/components/booking/steps/guest-info-step"
import { GuestPaymentStep } from "@/components/booking/steps/guest-payment-step"
import { initiateGuestPurchaseGiftVoucher, confirmGuestGiftVoucherPurchase, saveAbandonedGiftVoucherPurchase, type GiftVoucherPlain } from "@/actions/gift-voucher-actions"
import { createGuestUser } from "@/actions/booking-actions"
import type { CalculatedPriceDetails } from "@/types/booking"
import GuestGiftVoucherConfirmation from "@/components/gift-vouchers/guest-gift-voucher-confirmation"

interface Props {
  treatments: ITreatment[]
}

// Convert ITreatment to SerializedTreatment for consistency
function treatmentToSerialized(treatment: ITreatment): SerializedTreatment {
  return {
    _id: treatment._id.toString(),
    name: treatment.name,
    description: treatment.description || "",
    category: treatment.category,
    pricingType: treatment.pricingType,
    fixedPrice: treatment.fixedPrice,
    durations: treatment.durations?.map(d => ({
      _id: d._id.toString(),
      minutes: d.minutes,
      price: d.price,
      professionalPrice: d.professionalPrice,
      isActive: d.isActive,
    })),
    isActive: treatment.isActive,
    createdAt: treatment.createdAt.toISOString(),
    updatedAt: treatment.updatedAt.toISOString(),
  }
}

export default function SimplifiedGiftVoucherWizard({ treatments: propTreatments }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const { t, language, dir } = useTranslation()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [dataLoading, setDataLoading] = useState(!propTreatments)
  const [treatments, setTreatments] = useState<SerializedTreatment[]>(
    propTreatments ? propTreatments.map(treatmentToSerialized) : []
  )
  
  // Selection state
  const [voucherType, setVoucherType] = useState<"monetary" | "treatment">("monetary")
  const [monetaryValue, setMonetaryValue] = useState(150)
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string>("")
  const [selectedDurationId, setSelectedDurationId] = useState<string>("")
  
  // User state
  const [guestInfo, setGuestInfo] = useState<any>({})
  const [guestUserId, setGuestUserId] = useState<string | null>(null)
  
  // Purchase state
  const [isLoading, setIsLoading] = useState(false)
  const [purchaseComplete, setPurchaseComplete] = useState(false)
  const [purchasedVoucher, setPurchasedVoucher] = useState<GiftVoucherPlain | null>(null)

  // Load data on mount if not provided via props
  useEffect(() => {
    const loadData = async () => {
      if (propTreatments) {
        setDataLoading(false)
        return
      }

      try {
        const treatmentsResult = await getTreatmentsForSelection()
        
        if (treatmentsResult.success) {
          setTreatments(treatmentsResult.treatments || [])
        } else {
          toast({ variant: "destructive", title: "שגיאה", description: "שגיאה בטעינת הטיפולים" })
        }
      } catch (error) {
        console.error("Error loading treatments:", error)
        toast({ variant: "destructive", title: "שגיאה", description: "שגיאה בטעינת הנתונים" })
      } finally {
        setDataLoading(false)
      }
    }

    loadData()
  }, [propTreatments])

  // Save abandoned purchase
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
  }, [guestUserId, guestInfo, voucherType, selectedTreatmentId, selectedDurationId, monetaryValue, currentStep])

  // Get selected data
  const selectedTreatment = treatments.find(t => t._id === selectedTreatmentId)
  const selectedDuration = selectedTreatment?.pricingType === "duration_based" ?
    selectedTreatment.durations?.find(d => d._id === selectedDurationId) : undefined

  // Calculate price
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

  // Group treatments by category
  const treatmentsByCategory = treatments.reduce((acc, treatment) => {
    if (!acc[treatment.category]) {
      acc[treatment.category] = []
    }
    acc[treatment.category].push(treatment)
    return acc
  }, {} as Record<string, SerializedTreatment[]>)

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
  }

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
          name: guestInfo.firstName + " " + guestInfo.lastName,
          email: guestInfo.email,
          phone: guestInfo.phone,
        }
      })

      if (!initRes.success || !initRes.voucherId) {
        toast({ variant: "destructive", title: "שגיאה", description: initRes.error || "שגיאה ביצירת השובר" })
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

  if (dataLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8" dir={dir} lang={language}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">טוען נתונים...</p>
        </div>
      </div>
    )
  }

  if (purchaseComplete) {
    return <GuestGiftVoucherConfirmation voucher={purchasedVoucher} />
  }

  const renderStep1 = () => (
    <div className="space-y-6" dir={dir} lang={language}>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">רכישת שובר מתנה</h2>
        <p className="text-gray-600 mt-2">בחר סוג שובר ופרטים</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>סוג שובר מתנה</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div 
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                voucherType === "monetary" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"
              }`}
              onClick={() => {
                setVoucherType("monetary")
                setSelectedTreatmentId("")
                setSelectedDurationId("")
              }}
            >
              <div className="flex items-center gap-3">
                <DollarSign className="w-6 h-6 text-blue-600" />
                <div>
                  <div className="font-medium">שובר כספי</div>
                  <div className="text-sm text-gray-600">סכום לבחירה</div>
                </div>
              </div>
            </div>
            
            <div 
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                voucherType === "treatment" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"
              }`}
              onClick={() => {
                setVoucherType("treatment")
                setMonetaryValue(150)
              }}
            >
              <div className="flex items-center gap-3">
                <Gift className="w-6 h-6 text-blue-600" />
                <div>
                  <div className="font-medium">שובר טיפול</div>
                  <div className="text-sm text-gray-600">טיפול ספציפי</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {voucherType === "monetary" && (
        <Card>
          <CardHeader>
            <CardTitle>סכום השובר</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">סכום (מינימום ₪150)</label>
              <Input
                type="number"
                min="150"
                step="10"
                value={monetaryValue}
                onChange={(e) => setMonetaryValue(Math.max(150, parseInt(e.target.value) || 150))}
                className="text-lg"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[200, 300, 500, 1000].map(amount => (
                <Button
                  key={amount}
                  variant={monetaryValue === amount ? "default" : "outline"}
                  onClick={() => setMonetaryValue(amount)}
                  className="text-sm"
                >
                  ₪{amount}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {voucherType === "treatment" && (
        <Card>
          <CardHeader>
            <CardTitle>בחירת טיפול</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(treatmentsByCategory).map(([category, categoryTreatments]) => (
              <div key={category}>
                <h4 className="font-medium mb-2">
                  {t(`treatments.categories.${category}`, category)}
                </h4>
                <Select 
                  value={selectedTreatmentId} 
                  onValueChange={(value) => {
                    setSelectedTreatmentId(value)
                    setSelectedDurationId("")
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר טיפול..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryTreatments.map((treatment) => (
                      <SelectItem key={treatment._id} value={treatment._id}>
                        <div>
                          <div className="font-medium">{treatment.name}</div>
                          {treatment.description && (
                            <div className="text-sm text-gray-500">{treatment.description}</div>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}

            {selectedTreatment?.pricingType === "duration_based" && selectedTreatment.durations && (
              <div>
                <h4 className="font-medium mb-2">בחירת משך זמן</h4>
                <Select value={selectedDurationId} onValueChange={setSelectedDurationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר משך זמן..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedTreatment.durations.filter(d => d.isActive).map((duration) => (
                      <SelectItem key={duration._id} value={duration._id}>
                        <div className="flex justify-between items-center w-full">
                          <span>{duration.minutes} דקות</span>
                          <span className="font-medium">₪{duration.price}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedTreatment && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium">{selectedTreatment.name}</div>
                {selectedTreatment.description && (
                  <div className="text-sm text-gray-600 mt-1">{selectedTreatment.description}</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {canProceedToStep2 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-800 mb-2">
                סה"כ לתשלום: ₪{price.toFixed(2)}
              </div>
              <div className="text-sm text-green-700">
                {voucherType === "monetary" ? "שובר כספי" : "שובר טיפול"} - 
                {voucherType === "monetary" ? ` ₪${price}` : ` ${selectedTreatment?.name}`}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center">
        <Button 
          onClick={() => setCurrentStep(2)} 
          disabled={!canProceedToStep2}
          size="lg"
          className="min-w-48"
        >
          המשך לפרטים אישיים
        </Button>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6" dir={dir} lang={language}>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">פרטים אישיים ותשלום</h2>
        <p className="text-gray-600 mt-2">מלא פרטים אישיים ובצע תשלום</p>
      </div>

      {/* Summary Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-lg">סיכום הזמנה</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium text-gray-700">סוג שובר:</div>
              <div>{voucherType === "monetary" ? "שובר כספי" : "שובר טיפול"}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">ערך:</div>
              <div>
                {voucherType === "monetary" ? `₪${price}` : selectedTreatment?.name}
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-700">מחיר:</div>
              <div className="font-bold text-lg">₪{price.toFixed(2)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

             <div className="grid md:grid-cols-2 gap-6">
         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <User className="w-5 h-5" />
               פרטים אישיים
             </CardTitle>
           </CardHeader>
           <CardContent>
             <GuestInfoStep
               guestInfo={guestInfo}
               setGuestInfo={setGuestInfo}
               onNext={(info) => {
                 setGuestInfo(info)
                 // Create guest user if needed but don't proceed to purchase yet
                 if (!guestUserId) {
                   createGuestUser({
                     firstName: info.firstName,
                     lastName: info.lastName,
                     email: info.email,
                     phone: info.phone,
                     birthDate: info.birthDate,
                     gender: info.gender,
                   }).then((result) => {
                     if (result.success && result.userId) {
                       setGuestUserId(result.userId)
                     }
                   })
                 }
               }}
               onPrev={() => setCurrentStep(1)}
               defaultBookingForSomeoneElse={true}
               hideRecipientBirthGender={true}
               showGiftOptions={true}
             />
           </CardContent>
         </Card>

         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <CreditCard className="w-5 h-5" />
               תשלום
             </CardTitle>
           </CardHeader>
           <CardContent>
             <GuestPaymentStep
               calculatedPrice={calculatedPrice}
               guestInfo={guestInfo}
               setGuestInfo={setGuestInfo}
               onConfirm={handlePurchase}
               onPrev={() => setCurrentStep(1)}
               isLoading={isLoading}
             />
           </CardContent>
         </Card>
       </div>
    </div>
  )

  const progress = (currentStep / 2) * 100

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" dir={dir} lang={language}>
      <Progress value={progress} className="mb-8" />
      {currentStep === 1 ? renderStep1() : renderStep2()}
    </div>
  )
} 