"use client"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Checkbox } from "@/components/common/ui/checkbox"
import { useToast } from "@/components/common/ui/use-toast"
import { useTranslation } from "@/lib/translations/i18n"
import { Progress } from "@/components/common/ui/progress"

// Using basic components instead of complex purchase components

import { purchaseGuestSubscription } from "@/actions/user-subscription-actions"
import type { ISubscription } from "@/lib/db/models/subscription"
import type { ITreatment } from "@/lib/db/models/treatment"

import { Package, CreditCard, User, Mail, Phone, Bell } from "lucide-react"

// Guest information schema
const guestInfoSchema = z.object({
  name: z.string().min(2, "שם חייב להכיל לפחות 2 תווים"),
  email: z.string().email("כתובת אימייל לא תקינה"),
  phone: z.string().min(10, "מספר טלפון חייב להכיל לפחות 10 ספרות"),
  notificationPreferences: z.object({
    email: z.boolean().default(true),
    sms: z.boolean().default(false),
  }),
})

// Payment information schema for guests
const paymentInfoSchema = z.object({
  cardNumber: z.string().min(16, "מספר כרטיס אשראי חייב להכיל 16 ספרות"),
  expiryMonth: z.string().min(2, "חודש תפוגה נדרש"),
  expiryYear: z.string().min(4, "שנת תפוגה נדרשת"),
  cvv: z.string().min(3, "CVV חייב להכיל לפחות 3 ספרות"),
  cardHolderName: z.string().min(2, "שם בעל הכרטיס נדרש"),
})

type GuestInfo = z.infer<typeof guestInfoSchema>
type PaymentInfo = z.infer<typeof paymentInfoSchema>

interface GuestPurchaseSubscriptionClientProps {
  subscriptions: any[]
  treatments: any[]
}

export default function GuestPurchaseSubscriptionClient({
  subscriptions,
  treatments,
}: GuestPurchaseSubscriptionClientProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const { toast } = useToast()
  
  const [currentStep, setCurrentStep] = useState<"subscription" | "treatment" | "guest-info" | "payment" | "summary">("subscription")
  const [isLoading, setIsLoading] = useState(false)
  const [purchaseComplete, setPurchaseComplete] = useState(false)

  // Selection state
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState("")
  const [selectedTreatmentId, setSelectedTreatmentId] = useState("")
  const [selectedDurationId, setSelectedDurationId] = useState("")

  // Guest info form
  const guestForm = useForm<GuestInfo>({
    resolver: zodResolver(guestInfoSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      notificationPreferences: {
        email: true,
        sms: false,
      },
    },
  })

  // Payment form
  const paymentForm = useForm<PaymentInfo>({
    resolver: zodResolver(paymentInfoSchema),
    defaultValues: {
      cardNumber: "",
      expiryMonth: "",
      expiryYear: "",
      cvv: "",
      cardHolderName: "",
    },
  })

  const steps = [
    { key: "subscription", label: "בחירת מנוי" },
    { key: "treatment", label: "בחירת טיפול" },
    { key: "guest-info", label: "פרטים אישיים" },
    { key: "payment", label: "פרטי תשלום" },
    { key: "summary", label: "סיכום" },
  ]

  const selectedSubscriptionData = useMemo(() => {
    return subscriptions.find((sub) => sub._id.toString() === selectedSubscriptionId)
  }, [subscriptions, selectedSubscriptionId])

  const selectedTreatmentData = useMemo(() => {
    return treatments.find((treatment) => treatment._id.toString() === selectedTreatmentId)
  }, [treatments, selectedTreatmentId])

  const selectedDurationData = useMemo(() => {
    if (!selectedTreatmentData || selectedTreatmentData.pricingType !== "duration_based") {
      return null
    }
    return selectedTreatmentData.durations?.find((duration) => duration._id.toString() === selectedDurationId)
  }, [selectedTreatmentData, selectedDurationId])

  const singleSessionPrice = useMemo(() => {
    if (!selectedTreatmentData) return 0
    
    if (selectedTreatmentData.pricingType === "fixed") {
      return selectedTreatmentData.fixedPrice || 0
    } else if (selectedTreatmentData.pricingType === "duration_based" && selectedDurationData) {
      return selectedDurationData.price || 0
    }
    return 0
  }, [selectedTreatmentData, selectedDurationData])

  const totalSubscriptionPrice = useMemo(() => {
    if (!selectedSubscriptionData || !singleSessionPrice) return 0
    return selectedSubscriptionData.quantity * singleSessionPrice
  }, [selectedSubscriptionData, singleSessionPrice])

  const handleNextStep = () => {
    const stepOrder = ["subscription", "treatment", "guest-info", "payment", "summary"]
    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1] as any)
    }
  }

  const handlePrevStep = () => {
    const stepOrder = ["subscription", "treatment", "guest-info", "payment", "summary"]
    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1] as any)
    }
  }

  const canGoNext = useMemo(() => {
    switch (currentStep) {
      case "subscription":
        return !!selectedSubscriptionId
      case "treatment":
        return !!selectedTreatmentId && (selectedTreatmentData?.pricingType !== "duration_based" || !!selectedDurationId)
      case "guest-info":
        return guestForm.formState.isValid
      case "payment":
        return paymentForm.formState.isValid
      case "summary":
        return true
      default:
        return false
    }
  }, [currentStep, selectedSubscriptionId, selectedTreatmentId, selectedTreatmentData, selectedDurationId, guestForm.formState.isValid, paymentForm.formState.isValid])

  const handlePurchase = async () => {
    if (!selectedSubscriptionId || !selectedTreatmentId || !guestForm.formState.isValid || !paymentForm.formState.isValid) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "אנא מלא את כל הפרטים הנדרשים",
      })
      return
    }

    setIsLoading(true)
    try {
      const guestInfo = guestForm.getValues()
      const paymentInfo = paymentForm.getValues()

      const result = await purchaseGuestSubscription({
        subscriptionId: selectedSubscriptionId,
        treatmentId: selectedTreatmentId,
        paymentMethodId: undefined, // Guest payment
        selectedDurationId: selectedTreatmentData?.pricingType === "duration_based" ? selectedDurationId : undefined,
        guestInfo: {
          name: guestInfo.name,
          email: guestInfo.email,
          phone: guestInfo.phone,
        },
      })

      if (result.success) {
        setPurchaseComplete(true)
        toast({
          title: "המנוי נרכש בהצלחה!",
          description: "פרטי המנוי נשלחו אליך באימייל",
        })
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה ברכישת המנוי",
          description: result.error || "אירעה שגיאה לא צפויה",
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "אירעה שגיאה ברכישת המנוי",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const renderGuestInfoStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          פרטים אישיים
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="name">שם מלא *</Label>
          <Input
            id="name"
            {...guestForm.register("name")}
            placeholder="הכנס את שמך המלא"
          />
          {guestForm.formState.errors.name && (
            <p className="text-red-500 text-sm mt-1">{guestForm.formState.errors.name.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="email">כתובת אימייל *</Label>
          <Input
            id="email"
            type="email"
            {...guestForm.register("email")}
            placeholder="example@email.com"
          />
          {guestForm.formState.errors.email && (
            <p className="text-red-500 text-sm mt-1">{guestForm.formState.errors.email.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="phone">מספר טלפון *</Label>
          <Input
            id="phone"
            {...guestForm.register("phone")}
            placeholder="050-1234567"
          />
          {guestForm.formState.errors.phone && (
            <p className="text-red-500 text-sm mt-1">{guestForm.formState.errors.phone.message}</p>
          )}
        </div>

        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            העדפות התראות
          </Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="emailNotif"
                checked={guestForm.watch("notificationPreferences.email")}
                onCheckedChange={(checked) =>
                  guestForm.setValue("notificationPreferences.email", checked as boolean)
                }
              />
              <Label htmlFor="emailNotif" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                קבלת התראות באימייל
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="smsNotif"
                checked={guestForm.watch("notificationPreferences.sms")}
                onCheckedChange={(checked) =>
                  guestForm.setValue("notificationPreferences.sms", checked as boolean)
                }
              />
              <Label htmlFor="smsNotif" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                קבלת התראות ב-SMS
              </Label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderPaymentStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          פרטי תשלום
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="cardHolderName">שם בעל הכרטיס *</Label>
          <Input
            id="cardHolderName"
            {...paymentForm.register("cardHolderName")}
            placeholder="שם כפי שמופיע על הכרטיס"
          />
          {paymentForm.formState.errors.cardHolderName && (
            <p className="text-red-500 text-sm mt-1">{paymentForm.formState.errors.cardHolderName.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="cardNumber">מספר כרטיס אשראי *</Label>
          <Input
            id="cardNumber"
            {...paymentForm.register("cardNumber")}
            placeholder="1234 5678 9012 3456"
            maxLength={19}
          />
          {paymentForm.formState.errors.cardNumber && (
            <p className="text-red-500 text-sm mt-1">{paymentForm.formState.errors.cardNumber.message}</p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="expiryMonth">חודש תפוגה *</Label>
            <Select onValueChange={(value) => paymentForm.setValue("expiryMonth", value)}>
              <SelectTrigger>
                <SelectValue placeholder="חודש" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <SelectItem key={month} value={month.toString().padStart(2, "0")}>
                    {month.toString().padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {paymentForm.formState.errors.expiryMonth && (
              <p className="text-red-500 text-sm mt-1">{paymentForm.formState.errors.expiryMonth.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="expiryYear">שנת תפוגה *</Label>
            <Select onValueChange={(value) => paymentForm.setValue("expiryYear", value)}>
              <SelectTrigger>
                <SelectValue placeholder="שנה" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {paymentForm.formState.errors.expiryYear && (
              <p className="text-red-500 text-sm mt-1">{paymentForm.formState.errors.expiryYear.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="cvv">CVV *</Label>
            <Input
              id="cvv"
              {...paymentForm.register("cvv")}
              placeholder="123"
              maxLength={4}
            />
            {paymentForm.formState.errors.cvv && (
              <p className="text-red-500 text-sm mt-1">{paymentForm.formState.errors.cvv.message}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (purchaseComplete) {
    return (
      <div className="max-w-4xl mx-auto text-center">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600 text-2xl">המנוי נרכש בהצלחה!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">פרטי המנוי נשלחו אליך באימייל. תוכל להשתמש במנוי להזמנת טיפולים.</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => router.push("/")} variant="outline">
                חזרה לעמוד הבית
              </Button>
              <Button onClick={() => router.push("/book-treatment")}>
                הזמנת טיפול נוסף
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (subscriptions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">אין מנויים זמינים כרגע</div>
        </CardContent>
      </Card>
    )
  }

  const renderStep = () => {
    switch (currentStep) {
      case "subscription":
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">בחר מנוי</h2>
              <p className="text-gray-600 mt-2">בחר את המנוי המתאים לך</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subscriptions.map((subscription) => (
                <Card 
                  key={subscription._id.toString()}
                  className={`cursor-pointer border-2 transition-all ${selectedSubscriptionId === subscription._id.toString() ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                  onClick={() => setSelectedSubscriptionId(subscription._id.toString())}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      {subscription.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-2">{subscription.description}</p>
                    <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                      {subscription.quantity + subscription.bonusQuantity} טיפולים
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )

      case "treatment":
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">בחר טיפול</h2>
              <p className="text-gray-600 mt-2">בחר את סוג הטיפול למנוי</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {treatments.map((treatment) => (
                <Card 
                  key={treatment._id.toString()}
                  className={`cursor-pointer border-2 transition-all ${selectedTreatmentId === treatment._id.toString() ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                  onClick={() => setSelectedTreatmentId(treatment._id.toString())}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      {treatment.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">{treatment.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedTreatmentData?.pricingType === "duration_based" && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">בחר משך טיפול</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedTreatmentData.durations?.map((duration) => (
                    <Card 
                      key={duration._id.toString()}
                      className={`cursor-pointer border-2 transition-all ${selectedDurationId === duration._id.toString() ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                      onClick={() => setSelectedDurationId(duration._id.toString())}
                    >
                      <CardContent className="p-4 text-center">
                        <h3 className="font-medium">{duration.durationMinutes} דקות</h3>
                        <p className="text-lg font-semibold text-blue-600">{duration.price} ₪</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )

      case "guest-info":
        return renderGuestInfoStep()

      case "payment":
        return renderPaymentStep()

      case "summary":
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">סיכום הזמנה</h2>
              <p className="text-gray-600 mt-2">בדוק את פרטי ההזמנה לפני האישור הסופי</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-3">פרטי המנוי</h3>
                <Card className="mb-4">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      {selectedSubscriptionData?.name || ""}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-2">{selectedSubscriptionData?.description}</p>
                    <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                      {(selectedSubscriptionData?.quantity || 0) + (selectedSubscriptionData?.bonusQuantity || 0)} טיפולים
                    </span>
                  </CardContent>
                </Card>

                <h3 className="text-lg font-medium mb-3">פרטי הטיפול</h3>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      {selectedTreatmentData?.name || ""}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">
                      {selectedDurationData
                        ? `${selectedDurationData.durationMinutes} דקות - ${selectedDurationData.price} ₪`
                        : selectedTreatmentData?.pricingType === "fixed"
                        ? `${selectedTreatmentData.fixedPrice} ₪`
                        : ""
                      }
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>סיכום מחיר</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>מחיר לטיפול:</span>
                        <span>{singleSessionPrice.toFixed(2)} ₪</span>
                      </div>
                      <div className="flex justify-between">
                        <span>כמות טיפולים במנוי:</span>
                        <span>{selectedSubscriptionData?.quantity || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>טיפולים בונוס:</span>
                        <span>{selectedSubscriptionData?.bonusQuantity || 0}</span>
                      </div>
                      <hr />
                      <div className="flex justify-between font-bold text-lg">
                        <span>סך הכל:</span>
                        <span>{totalSubscriptionPrice.toFixed(2)} ₪</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            <div className="mt-8">
              <Button onClick={handlePurchase} disabled={isLoading} className="w-full" size="lg">
                {isLoading ? "מעבד..." : "אשר ורכוש"}
              </Button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">רכישת מנוי</h1>
        <p className="text-gray-600 mt-2">רכוש מנוי וחסוך בטיפולים</p>
      </div>

      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          {steps.map((step, index) => (
            <span key={step.key} className={`${steps.findIndex(s => s.key === currentStep) >= index ? 'text-blue-600 font-medium' : ''}`}>
              {step.label}
            </span>
          ))}
        </div>
        <div className="w-full bg-gray-200 h-2 rounded">
          <div 
            className="bg-blue-600 h-2 rounded transition-all duration-300" 
            style={{ width: `${((steps.findIndex(s => s.key === currentStep) + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="min-h-[400px] relative mb-8">
        {renderStep()}
      </div>

      {currentStep !== "summary" && (
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevStep}
            disabled={steps.findIndex((s) => s.key === currentStep) === 0}
          >
            חזור
          </Button>
          <Button
            onClick={handleNextStep}
            disabled={!canGoNext}
          >
            המשך
          </Button>
        </div>
      )}
    </div>
  )
} 