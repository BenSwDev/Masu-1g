"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Progress } from "@/components/common/ui/progress"
import { useToast } from "@/components/common/ui/use-toast"
import type { ISubscription } from "@/lib/db/models/subscription"
import type { ITreatment } from "@/lib/db/models/treatment"
import { getActiveSubscriptionsForPurchase, getTreatments, type SerializedSubscription, type SerializedTreatment } from "./actions"
import { GuestInfoStep } from "@/components/booking/steps/guest-info-step"
import { GuestPaymentStep } from "@/components/booking/steps/guest-payment-step"
import { saveAbandonedSubscriptionPurchase, initiateGuestSubscriptionPurchase, confirmGuestSubscriptionPurchase } from "@/actions/user-subscription-actions"
import { createGuestUser } from "@/actions/booking-actions"
import type { CalculatedPriceDetails } from "@/types/booking"

interface Props {
  subscriptions?: SerializedSubscription[]
  treatments?: SerializedTreatment[]
}

// Convert serialized data to model types
function convertToSubscription(sub: SerializedSubscription): ISubscription & { _id: string } {
  return {
    ...sub,
    _id: sub._id as string,
    createdAt: new Date(sub.createdAt),
    updatedAt: new Date(sub.updatedAt),
  } as ISubscription & { _id: string }
}

function convertToTreatment(treatment: SerializedTreatment): any {
  return {
    ...treatment,
    _id: treatment._id as string,
    durations: treatment.durations?.map(d => ({
      ...d,
      _id: d._id as string,
    })),
    createdAt: new Date(treatment.createdAt),
    updatedAt: new Date(treatment.updatedAt),
  }
}

export default function SimplifiedSubscriptionWizard({ subscriptions: propSubscriptions, treatments: propTreatments }: Props = {}) {
  const router = useRouter()
  const { toast } = useToast()
  const { language, dir } = useTranslation()

  // Data state
  const [dataLoading, setDataLoading] = useState(!propSubscriptions || !propTreatments)
  const [subscriptions, setSubscriptions] = useState<ISubscription[]>(propSubscriptions?.map(convertToSubscription) || [])
  const [treatments, setTreatments] = useState<ITreatment[]>(propTreatments?.map(convertToTreatment) || [])

  // Selection state
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState("")
  const [selectedTreatmentId, setSelectedTreatmentId] = useState("")
  const [selectedDurationId, setSelectedDurationId] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")

  // Form state - removing currentStep as we're making it one unified form
  const [guestInfo, setGuestInfo] = useState<any>({})
  const [guestUserId, setGuestUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [pendingSubscriptionId, setPendingSubscriptionId] = useState<string | null>(null)

  // Load data on mount if not provided via props
  useEffect(() => {
    const loadData = async () => {
      if (propSubscriptions && propTreatments) {
        setSubscriptions(propSubscriptions.map(convertToSubscription))
        setTreatments(propTreatments.map(convertToTreatment))
        setDataLoading(false)
        return
      }

      try {
        const [subscriptionsResult, treatmentsResult] = await Promise.all([
          getActiveSubscriptionsForPurchase(),
          getTreatments({ isActive: true })
        ])

        if (subscriptionsResult.success) {
          setSubscriptions(subscriptionsResult.subscriptions?.map(convertToSubscription) || [])
        }
        
        if (treatmentsResult.success) {
          setTreatments(treatmentsResult.treatments?.map(convertToTreatment) || [])
        }
      } catch (error) {
        console.error("Error loading data:", error)
        toast({ variant: "destructive", title: "שגיאה", description: "שגיאה בטעינת הנתונים" })
      } finally {
        setDataLoading(false)
      }
    }

    loadData()
  }, [propSubscriptions, propTreatments, toast])

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
        currentStep: 1,
      })
    }
  }, [guestUserId, guestInfo, selectedSubscriptionId, selectedTreatmentId, selectedDurationId])

  // Get selected data
  const selectedSubscription = subscriptions.find(s => s._id === selectedSubscriptionId)
  const selectedTreatment = treatments.find(t => t._id === selectedTreatmentId)
  const selectedDuration = selectedTreatment?.pricingType === "duration_based" ?
    selectedTreatment.durations?.find(d => d._id.toString() === selectedDurationId) : undefined

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
    totalProfessionalPayment: 0,
    totalOfficeCommission: totalPrice,
    baseProfessionalPayment: 0,
    surchargesProfessionalPayment: 0,
  }



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
      // Step 1: Initiate purchase (creates subscription with pending_payment status)
      const initiateResult = await initiateGuestSubscriptionPurchase({
        subscriptionId: selectedSubscriptionId,
        treatmentId: selectedTreatmentId,
        selectedDurationId: selectedDurationId || undefined,
        guestInfo: {
          name: guestInfo.firstName + " " + guestInfo.lastName,
          email: guestInfo.email,
          phone: guestInfo.phone,
        },
      })
      
      if (!initiateResult.success || !initiateResult.userSubscriptionId) {
        toast({ variant: "destructive", title: "שגיאה", description: initiateResult.error || "שגיאה ביצירת המנוי" })
        setIsLoading(false)
        return
      }

      // Store pending subscription ID for payment confirmation
      setPendingSubscriptionId(initiateResult.userSubscriptionId)
      setIsLoading(false)
      
    } catch (error) {
      console.error("Purchase error:", error)
      toast({ variant: "destructive", title: "שגיאה", description: "שגיאה ברכישת המנוי" })
      setIsLoading(false)
    }
  }

  const handlePaymentSuccess = async () => {
    if (!pendingSubscriptionId) return
    setIsLoading(true)
    
    try {
      const confirmResult = await confirmGuestSubscriptionPurchase({
        subscriptionId: pendingSubscriptionId,
        paymentId: `guest_subscription_payment_${Date.now()}`,
        success: true,
        guestInfo: {
          name: guestInfo.firstName + " " + guestInfo.lastName,
          email: guestInfo.email,
          phone: guestInfo.phone,
        }
      })
      
      if (confirmResult.success && confirmResult.subscription) {
        const subscriptionId = confirmResult.subscription._id || confirmResult.subscription.id
        if (subscriptionId) {
          router.push(`/purchase/subscription/confirmation?subscriptionId=${subscriptionId}&status=success`)
        } else {
          toast({ variant: "destructive", title: "שגיאה", description: "לא ניתן למצוא מזהה המנוי. אנא פנה לתמיכה." })
        }
      } else {
        toast({ variant: "destructive", title: "שגיאה", description: confirmResult.error || "שגיאה באישור התשלום" })
      }
    } catch (error) {
      console.error("Payment confirmation error:", error)
      toast({ variant: "destructive", title: "שגיאה", description: "שגיאה באישור התשלום" })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePaymentFailure = async () => {
    if (!pendingSubscriptionId) return
    setIsLoading(true)
    
    try {
      await confirmGuestSubscriptionPurchase({
        subscriptionId: pendingSubscriptionId,
        paymentId: `guest_subscription_payment_failed_${Date.now()}`,
        success: false,
        guestInfo: {
          name: guestInfo.firstName + " " + guestInfo.lastName,
          email: guestInfo.email,
          phone: guestInfo.phone,
        }
      })
      
      toast({ variant: "destructive", title: "התשלום נכשל", description: "התשלום לא עבר בהצלחה. המנוי לא הופעל." })
      setPendingSubscriptionId(null)
    } catch (error) {
      console.error("Payment failure handling error:", error)
      toast({ variant: "destructive", title: "שגיאה", description: "שגיאה בטיפול בכישלון התשלום" })
    } finally {
      setIsLoading(false)
    }
  }

  const canProceedToStep2 = selectedSubscriptionId && selectedTreatmentId && 
    (selectedTreatment?.pricingType !== "duration_based" || selectedDurationId)

  if (dataLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">טוען נתונים...</p>
        </div>
      </div>
    )
  }

  // No longer needed as we redirect to confirmation page

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

  const renderStep1 = () => (
    <div className="max-w-2xl mx-auto space-y-6">
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
                key={sub._id as string}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedSubscriptionId === (sub._id as string) ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"
                }`}
                onClick={() => setSelectedSubscriptionId(sub._id as string)}
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
                  key={treatment._id as string}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedTreatmentId === (treatment._id as string) ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"
                  }`}
                  onClick={() => {
                    setSelectedTreatmentId(treatment._id as string)
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
                  key={duration._id.toString()}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all text-center ${
                    selectedDurationId === duration._id.toString() ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"
                  }`}
                  onClick={() => setSelectedDurationId(duration._id.toString())}
                >
                  <div className="font-medium">{duration.minutes} דקות</div>
                  <div className="font-bold text-blue-600">₪{duration.price}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* פרטים אישיים ותשלום - מיד אחרי בחירת המנוי והטיפול */}
      {canProceedToStep2 && (
        <>
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">פרטים אישיים</CardTitle>
            </CardHeader>
            <CardContent>
              <GuestInfoStep
                guestInfo={guestInfo}
                setGuestInfo={setGuestInfo}
                onNext={handleGuestInfoSubmit}
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
                onConfirm={pendingSubscriptionId ? handlePaymentSuccess : handlePurchase}
                onPrev={() => {}} // No back needed in single form
                isLoading={isLoading}
                pendingBookingId={pendingSubscriptionId}
                customFailureHandler={pendingSubscriptionId ? handlePaymentFailure : undefined}
                purchaseType="subscription"
                purchaseDetails={{
                  treatmentName: selectedTreatment?.name,
                  subscriptionName: selectedSubscription?.name,
                  treatmentQuantity: selectedSubscription?.quantity || 1,
                }}
              />
            </CardContent>
          </Card>

          {/* סיכום מחיר */}
          <Card className="border-green-200 bg-green-50 shadow-sm">
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
                  <div className="flex justify-between items-center text-xl font-bold text-green-800">
                    <span>סה"כ לתשלום</span>
                    <span>₪{totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )

  const progress = (selectedSubscription ? 1 : 0) * 100

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" dir={dir} lang={language}>
      <Progress value={progress} className="mb-8" />
      {renderStep1()}
    </div>
  )
}