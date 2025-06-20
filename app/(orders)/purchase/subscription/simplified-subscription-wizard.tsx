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

  const renderStep1 = () => (
    <div className="space-y-6" dir={dir} lang={language}>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">{t("subscriptions.purchase.selectSubscription")}</h2>
        <p className="text-gray-600 mt-2">בחר מנוי וטיפול במחיר מיוחד</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            בחירת מנוי
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedSubscriptionId} onValueChange={setSelectedSubscriptionId}>
            <SelectTrigger>
              <SelectValue placeholder="בחר מנוי..." />
            </SelectTrigger>
            <SelectContent>
              {subscriptions.map((sub) => (
                <SelectItem key={sub._id} value={sub._id}>
                  <div>
                    <div className="font-medium">{sub.name}</div>
                    <div className="text-sm text-gray-500">
                      {sub.quantity + sub.bonusQuantity} טיפולים • {sub.validityMonths} חודשים
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedSubscription && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="font-medium">{selectedSubscription.description}</div>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary">
                  {selectedSubscription.quantity} טיפולים
                </Badge>
                {selectedSubscription.bonusQuantity > 0 && (
                  <Badge variant="outline" className="bg-green-50">
                    +{selectedSubscription.bonusQuantity} בונוס
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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

      {canProceedToStep2 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-800 mb-2">
                סה"כ לתשלום: ₪{totalPrice.toFixed(2)}
              </div>
              <div className="text-sm text-green-700">
                {selectedSubscription?.quantity} טיפולים × ₪{pricePerSession} = ₪{totalPrice.toFixed(2)}
              </div>
              {selectedSubscription?.bonusQuantity > 0 && (
                <div className="text-sm text-green-700 mt-1">
                  + {selectedSubscription.bonusQuantity} טיפולים בונוס חינם!
                </div>
              )}
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
              <div className="font-medium text-gray-700">מנוי:</div>
              <div>{selectedSubscription?.name}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">טיפול:</div>
              <div>{selectedTreatment?.name}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">כמות:</div>
              <div>{selectedSubscription?.quantity} טיפולים</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">מחיר:</div>
              <div className="font-bold text-lg">₪{totalPrice.toFixed(2)}</div>
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
              hideBookingForSomeoneElse={true}
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