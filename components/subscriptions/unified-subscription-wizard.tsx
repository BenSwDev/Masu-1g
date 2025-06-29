"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/use-toast"
import { Package, Clock, Star, CreditCard, CheckCircle, User, Mail, Phone } from "lucide-react"
import type { ISubscription } from "@/lib/db/models/subscription"
import type { ITreatment } from "@/lib/db/models/treatment"
import { getActiveSubscriptionsForPurchase, getTreatments, type SerializedSubscription, type SerializedTreatment } from "@/app/(orders)/purchase/subscription/actions"
import { GuestInfoStep } from "@/components/booking/steps/guest-info-step"
import { GuestPaymentStep } from "@/components/booking/steps/guest-payment-step"
import { purchaseGuestSubscription, saveAbandonedSubscriptionPurchase } from "@/actions/user-subscription-actions"
import { createGuestUser } from "@/actions/booking-actions"
import type { CalculatedPriceDetails } from "@/types/booking"

interface Props {
  subscriptions?: SerializedSubscription[]
  treatments?: SerializedTreatment[]
}

// Helper functions to convert serialized data
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

export default function UnifiedSubscriptionWizard({ subscriptions: propSubscriptions, treatments: propTreatments }: Props = {}) {
  const router = useRouter()
  const { t, language, dir } = useTranslation()
  const { toast } = useToast()

  // Data state
  const [dataLoading, setDataLoading] = useState(!propSubscriptions || !propTreatments)
  const [subscriptions, setSubscriptions] = useState<ISubscription[]>(propSubscriptions?.map(convertToSubscription) || [])
  const [treatments, setTreatments] = useState<ITreatment[]>(propTreatments?.map(convertToTreatment) || [])

  // Wizard state - 3 steps total
  const [currentStep, setCurrentStep] = useState(1)
  
  // Selection state
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState("")
  const [selectedTreatmentId, setSelectedTreatmentId] = useState("")
  const [selectedDurationId, setSelectedDurationId] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")

  // Form state
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
  const selectedSubscription = subscriptions.find(s => (s._id as any).toString() === selectedSubscriptionId)
  const selectedTreatment = treatments.find(t => (t._id as any).toString() === selectedTreatmentId)
  const selectedDuration = selectedTreatment?.pricingType === "duration_based" ?
    selectedTreatment.durations?.find(d => (d._id as any).toString() === selectedDurationId) : undefined

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
    totalOfficeCommission: 0,
    baseProfessionalPayment: 0,
    surchargesProfessionalPayment: 0,
  }

  // Group treatments by category
  const treatmentsByCategory = treatments.reduce((acc, treatment) => {
    if (!acc[treatment.category]) {
      acc[treatment.category] = []
    }
    acc[treatment.category].push(treatment)
    return acc
  }, {} as Record<string, ITreatment[]>)

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

  // Wizard navigation
  const nextStep = () => setCurrentStep(s => Math.min(s + 1, 3))
  const prevStep = () => setCurrentStep(s => Math.max(s - 1, 1))

  const handleGuestInfoSubmit = async (info: any) => {
    setGuestInfo(info)
    nextStep()
  }

  const handlePurchase = async () => {
    if (!selectedSubscriptionId || !selectedTreatmentId) return
    setIsLoading(true)
    
    try {
      // Step 1: Initiate purchase (creates subscription with pending_payment status)
      const { initiateGuestSubscriptionPurchase } = await import("@/actions/user-subscription-actions")
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

      // Store pending subscription ID and move to payment step
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
      const { confirmGuestSubscriptionPurchase } = await import("@/actions/user-subscription-actions")
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
      const { confirmGuestSubscriptionPurchase } = await import("@/actions/user-subscription-actions")
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

  // Validation for each step
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

  // Step 1: Selection (Subscription + Treatment)
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
                key={(sub._id as any).toString()}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedSubscriptionId === (sub._id as any).toString() ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"
                }`}
                onClick={() => setSelectedSubscriptionId((sub._id as any).toString())}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{sub.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{sub.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary">
                        <Package className="w-3 h-3 mr-1" />
                        {sub.quantity} טיפולים
                      </Badge>
                      {sub.bonusQuantity > 0 && (
                        <Badge variant="outline" className="text-green-600">
                          <Star className="w-3 h-3 mr-1" />
                          +{sub.bonusQuantity} בונוס
                        </Badge>
                      )}
                      <Badge variant="outline">
                        <Clock className="w-3 h-3 mr-1" />
                        {sub.validityMonths} חודשים
                      </Badge>
                    </div>
                  </div>
                  {selectedSubscriptionId === (sub._id as any).toString() && (
                    <CheckCircle className="w-6 h-6 text-blue-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* טיפול */}
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
                {treatmentCategories.map((category) => (
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
                {categoryTreatments.map((treatment) => (
                  <div
                    key={(treatment._id as any).toString()}
                    className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedTreatmentId === (treatment._id as any).toString() ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"
                    }`}
                    onClick={() => setSelectedTreatmentId((treatment._id as any).toString())}
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
                      {selectedTreatmentId === (treatment._id as any).toString() && (
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
                  .map((duration) => (
                    <div
                      key={duration._id.toString()}
                      className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedDurationId === duration._id.toString() ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"
                      }`}
                      onClick={() => setSelectedDurationId(duration._id.toString())}
                    >
                      <div className="flex justify-between items-center">
                        <span>{duration.minutes} דקות</span>
                        <div className="flex items-center gap-2">
                          <span className="text-blue-600 font-medium">₪{duration.price}</span>
                          {selectedDurationId === duration._id.toString() && (
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

      {/* סיכום מחיר */}
      {canProceedToStep2 && (
        <Card className="shadow-sm border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold">סה"כ למנוי</h3>
                <p className="text-sm text-gray-600">
                  {selectedSubscription?.quantity} טיפולים × ₪{pricePerSession}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">₪{totalPrice}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end mt-6">
        <Button 
          onClick={nextStep} 
          disabled={!canProceedToStep2}
          className="min-w-32"
        >
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
        <p className="text-gray-600">מלא את הפרטים שלך כדי להמשיך</p>
      </div>
      
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <GuestInfoStep
            guestInfo={guestInfo}
            setGuestInfo={setGuestInfo}
            onNext={handleGuestInfoSubmit}
            onPrev={prevStep}
            hideBookingForSomeoneElse={true}
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
            onConfirm={pendingSubscriptionId ? handlePaymentSuccess : handlePurchase}
            onPrev={prevStep}
            isLoading={isLoading}
            pendingBookingId={pendingSubscriptionId}
            customFailureHandler={pendingSubscriptionId ? handlePaymentFailure : undefined}
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
