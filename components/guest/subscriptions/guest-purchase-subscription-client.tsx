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

import { StepIndicator } from "@/components/common/purchase/step-indicator"
import { PurchaseCard } from "@/components/common/purchase/purchase-card"
import { PurchaseNavigation } from "@/components/common/purchase/purchase-navigation"
import { PurchaseSummary } from "@/components/common/purchase/purchase-summary"
import { AnimatedContainer } from "@/components/common/purchase/animated-container"
import { PurchaseSuccess } from "@/components/common/purchase/purchase-success"

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
  subscriptions: ISubscription[]
  treatments: ITreatment[]
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
    { key: "subscription", label: t("subscriptions.selectSubscription") },
    { key: "treatment", label: t("treatments.selectTreatment") },
    { key: "guest-info", label: "פרטים אישיים" },
    { key: "payment", label: "פרטי תשלום" },
    { key: "summary", label: t("subscriptions.purchase.summary") },
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
      <div className="max-w-4xl mx-auto">
        <PurchaseSuccess
          title="המנוי נרכש בהצלחה!"
          message="פרטי המנוי נשלחו אליך באימייל. תוכל להשתמש במנוי להזמנת טיפולים."
          actionLabel="חזרה לעמוד הבית"
          onAction={() => router.push("/")}
          secondaryActionLabel="הזמנת טיפול נוסף"
          onSecondaryAction={() => router.push("/book-treatment")}
        />
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
                <PurchaseCard
                  key={subscription._id.toString()}
                  title={subscription.name}
                  description={subscription.description}
                  badge={`${subscription.quantity + subscription.bonusQuantity} טיפולים`}
                  icon={<Package className="w-5 h-5" />}
                  isSelected={selectedSubscriptionId === subscription._id.toString()}
                  onClick={() => setSelectedSubscriptionId(subscription._id.toString())}
                />
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
                <PurchaseCard
                  key={treatment._id.toString()}
                  title={treatment.name}
                  description={treatment.description}
                  icon={<Package className="w-5 h-5" />}
                  isSelected={selectedTreatmentId === treatment._id.toString()}
                  onClick={() => setSelectedTreatmentId(treatment._id.toString())}
                />
              ))}
            </div>

            {selectedTreatmentData?.pricingType === "duration_based" && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">בחר משך טיפול</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedTreatmentData.durations?.map((duration) => (
                    <PurchaseCard
                      key={duration._id.toString()}
                      title={`${duration.durationMinutes} דקות`}
                      description={`${duration.price} ₪`}
                      isSelected={selectedDurationId === duration._id.toString()}
                      onClick={() => setSelectedDurationId(duration._id.toString())}
                    />
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
                <PurchaseCard
                  title={selectedSubscriptionData?.name || ""}
                  description={selectedSubscriptionData?.description}
                  badge={`${(selectedSubscriptionData?.quantity || 0) + (selectedSubscriptionData?.bonusQuantity || 0)} טיפולים`}
                  icon={<Package className="w-5 h-5" />}
                  className="mb-4"
                />

                <h3 className="text-lg font-medium mb-3">פרטי הטיפול</h3>
                <PurchaseCard
                  title={selectedTreatmentData?.name || ""}
                  description={
                    selectedDurationData
                      ? `${selectedDurationData.durationMinutes} דקות - ${selectedDurationData.price} ₪`
                      : selectedTreatmentData?.pricingType === "fixed"
                      ? `${selectedTreatmentData.fixedPrice} ₪`
                      : ""
                  }
                  icon={<Package className="w-5 h-5" />}
                />
              </div>

              <div>
                <PurchaseSummary
                  items={[
                    {
                      label: "מחיר לטיפול",
                      value: `${singleSessionPrice.toFixed(2)} ₪`,
                    },
                    {
                      label: "כמות טיפולים במנוי",
                      value: selectedSubscriptionData?.quantity || 0,
                    },
                    {
                      label: "טיפולים בונוס",
                      value: selectedSubscriptionData?.bonusQuantity || 0,
                    },
                  ]}
                  totalPrice={totalSubscriptionPrice}
                />
              </div>
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

      <StepIndicator steps={steps} currentStep={currentStep} />

      <div className="min-h-[400px] relative mb-8">
        <AnimatedContainer isActive={true}>
          {renderStep()}
        </AnimatedContainer>
      </div>

      <PurchaseNavigation
        onNext={handleNextStep}
        onPrevious={handlePrevStep}
        onComplete={handlePurchase}
        canGoNext={canGoNext}
        canGoPrevious={steps.findIndex((s) => s.key === currentStep) > 0}
        isLoading={isLoading}
        isLastStep={currentStep === "summary"}
        completeLabel="אשר ורכוש"
      />
    </div>
  )
} 