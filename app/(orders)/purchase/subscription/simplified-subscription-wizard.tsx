"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Badge } from "@/components/common/ui/badge"
import { Separator } from "@/components/common/ui/separator"
import { Progress } from "@/components/common/ui/progress"
import { useToast } from "@/components/common/ui/use-toast"
import { Package, Clock, Star, CreditCard, CheckCircle, User, Mail, Phone } from "lucide-react"
import type { ISubscription } from "@/lib/db/models/subscription"
import type { ITreatment } from "@/lib/db/models/treatment"
import { getActiveSubscriptionsForPurchase, getTreatments, type SerializedSubscription, type SerializedTreatment } from "./actions"
import { GuestInfoStep } from "@/components/booking/steps/guest-info-step"
import { GuestPaymentStep } from "@/components/booking/steps/guest-payment-step"
import { purchaseGuestSubscription, saveAbandonedSubscriptionPurchase } from "@/actions/user-subscription-actions"
import { createGuestUser } from "@/actions/booking-actions"
import type { CalculatedPriceDetails } from "@/types/booking"
import GuestSubscriptionConfirmation from "@/components/subscriptions/guest-subscription-confirmation"

interface Props {
  subscriptions?: SerializedSubscription[]
  treatments?: SerializedTreatment[]
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

export default function SimplifiedSubscriptionWizard({ subscriptions: propSubscriptions, treatments: propTreatments }: Props = {}) {
  const router = useRouter()
  const { toast } = useToast()
  const { t, language, dir } = useTranslation()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [dataLoading, setDataLoading] = useState(true)
  const [subscriptions, setSubscriptions] = useState<SerializedSubscription[]>([])
  const [treatments, setTreatments] = useState<SerializedTreatment[]>([])
  
  // Selection state
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string>("")
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string>("")
  const [selectedDurationId, setSelectedDurationId] = useState<string>("")
  
  // User state
  const [guestInfo, setGuestInfo] = useState<any>({})
  const [guestUserId, setGuestUserId] = useState<string | null>(null)
  
  // Purchase state
  const [isLoading, setIsLoading] = useState(false)
  const [purchaseComplete, setPurchaseComplete] = useState(false)
  const [purchasedSubscription, setPurchasedSubscription] = useState<any>(null)

  // Load data on mount if not provided via props
  useEffect(() => {
    const loadData = async () => {
      if (propSubscriptions && propTreatments) {
        setSubscriptions(propSubscriptions)
        setTreatments(propTreatments)
        setDataLoading(false)
        return
      }

      try {
        const [subscriptionsResult, treatmentsResult] = await Promise.all([
          getActiveSubscriptionsForPurchase(),
          getTreatments({ isActive: true })
        ])

        if (subscriptionsResult.success) {
          setSubscriptions(subscriptionsResult.subscriptions || [])
        }
        
        if (treatmentsResult.success) {
          setTreatments(treatmentsResult.treatments || [])
        }
      } catch (error) {
        console.error("Error loading data:", error)
        toast({ variant: "destructive", title: "שגיאה", description: "שגיאה בטעינת הנתונים" })
      } finally {
        setDataLoading(false)
      }
    }

    loadData()
  }, [propSubscriptions, propTreatments])

  // Save abandoned purchase
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

  // Get selected data
  const selectedSubscription = subscriptions.find(s => s._id === selectedSubscriptionId)
  const selectedTreatment = treatments.find(t => t._id === selectedTreatmentId)
  const selectedDuration = selectedTreatment?.pricingType === "duration_based" ?
    selectedTreatment.durations?.find(d => d._id === selectedDurationId) : undefined

  // Calculate price
  const pricePerSession = selectedTreatment?.pricingType === "fixed" ? 
    selectedTreatment.fixedPrice || 0 : selectedDuration?.price || 0
  const totalPrice = (selectedSubscription?.quantity || 0) * pricePerSession

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
    if (!selectedSubscriptionId || !selectedTreatmentId) return
    setIsLoading(true)
    
    try {
      const result = await purchaseGuestSubscription({
        subscriptionId: selectedSubscriptionId,
        treatmentId: selectedTreatmentId,
        selectedDurationId: selectedDurationId || undefined,
        paymentMethodId: "guest",
        guestInfo: {
          name: guestInfo.firstName + " " + guestInfo.lastName,
          email: guestInfo.email,
          phone: guestInfo.phone,
        },
      })
      
      if (result.success) {
        setPurchasedSubscription(result.userSubscription)
        setPurchaseComplete(true)
      } else {
        toast({ variant: "destructive", title: "שגיאה", description: result.error || "שגיאה ברכישת המנוי" })
      }
    } catch (error) {
      console.error("Purchase error:", error)
      toast({ variant: "destructive", title: "שגיאה", description: "שגיאה ברכישת המנוי" })
    } finally {
      setIsLoading(false)
    }
  }

  const canProceedToStep2 = selectedSubscriptionId && selectedTreatmentId && 
    (selectedTreatment?.pricingType !== "duration_based" || selectedDurationId)

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
    return <GuestSubscriptionConfirmation userSubscription={purchasedSubscription} />
  }

  const [selectedCategory, setSelectedCategory] = useState<string>("")

  const treatmentCategories = [...new Set(treatments.map(t => t.category))]
  const categoryTreatments = selectedCategory ? 
    treatments.filter(t => t.category === selectedCategory) : []

  const renderStep1 = () => (
    <div className="max-w-2xl mx-auto space-y-6" dir={dir} lang={language}>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">רכישת מנוי</h2>
        <p className="text-gray-600">בחר מנוי וטיפול במחיר מיוחד</p>
      </div>

      {/* מנוי */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">בחירת מנוי</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {subscriptions.map((sub) => (
              <div
                key={sub._id}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedSubscriptionId === sub._id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"
                }`}
                onClick={() => setSelectedSubscriptionId(sub._id)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{sub.name}</div>
                    <div className="text-sm text-gray-600">
                      {sub.quantity + sub.bonusQuantity} טיפולים • {sub.validityMonths} חודשים
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{sub.quantity}</Badge>
                    {sub.bonusQuantity > 0 && (
                      <Badge variant="outline" className="bg-green-50">+{sub.bonusQuantity}</Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* קטגוריית טיפול */}
      {selectedSubscriptionId && (
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
                    {t(`treatments.categories.${category}`, category)}
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
                ₪{totalPrice.toFixed(2)}
              </div>
              <div className="text-green-700">
                {selectedSubscription?.quantity} טיפולים × ₪{pricePerSession}
              </div>
              {selectedSubscription?.bonusQuantity > 0 && (
                <div className="text-green-700 mt-1 font-medium">
                  + {selectedSubscription.bonusQuantity} טיפולים בונוס!
                </div>
              )}
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
    <div className="max-w-4xl mx-auto space-y-6" dir={dir} lang={language}>
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
                hideBookingForSomeoneElse={true}
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
                isLoading={isLoading}
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
                  <span className="text-gray-600">מנוי</span>
                  <span className="font-medium">{selectedSubscription?.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">טיפול</span>
                  <span className="font-medium">{selectedTreatment?.name}</span>
                </div>
                {selectedDuration && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">משך זמן</span>
                    <span className="font-medium">{selectedDuration.minutes} דקות</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>כמות טיפולים</span>
                  <span>{selectedSubscription?.quantity}</span>
                </div>
                {selectedSubscription?.bonusQuantity > 0 && (
                  <div className="flex justify-between items-center text-sm text-green-600">
                    <span>בונוס</span>
                    <span>+{selectedSubscription.bonusQuantity}</span>
                  </div>
                )}
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between items-center text-xl font-bold text-blue-800">
                    <span>סה"כ</span>
                    <span>₪{totalPrice.toFixed(2)}</span>
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
    <div className="max-w-4xl mx-auto px-4 py-8" dir={dir} lang={language}>
      <Progress value={progress} className="mb-8" />
      {currentStep === 1 ? renderStep1() : renderStep2()}
    </div>
  )
}