"use client"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Textarea } from "@/components/common/ui/textarea"
import { Checkbox } from "@/components/common/ui/checkbox"
import { useToast } from "@/components/common/ui/use-toast"
import { useTranslation } from "@/lib/translations/i18n"
import { Progress } from "@/components/common/ui/progress"

import {
  initiateGuestPurchaseGiftVoucher,
  confirmGuestGiftVoucherPurchase,
  type PurchaseInitiationData,
} from "@/actions/gift-voucher-actions"
import type { ITreatment } from "@/lib/db/models/treatment"

import {
  Gift,
  CreditCard,
  User,
  Mail,
  Phone,
  Bell,
  Sparkles,
  Stethoscope,
  DollarSign,
} from "lucide-react"

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

// Gift details schema
const giftDetailsSchema = z.object({
  recipientName: z.string().min(2, "שם הנמען נדרש"),
  recipientPhone: z.string().min(10, "מספר טלפון הנמען נדרש"),
  greetingMessage: z.string().optional(),
})

type GuestInfo = z.infer<typeof guestInfoSchema>
type PaymentInfo = z.infer<typeof paymentInfoSchema>
type GiftDetails = z.infer<typeof giftDetailsSchema>

interface GuestPurchaseGiftVoucherClientProps {
  treatments: ITreatment[]
}

const TOTAL_STEPS = 5

export default function GuestPurchaseGiftVoucherClient({
  treatments,
}: GuestPurchaseGiftVoucherClientProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const { toast } = useToast()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [purchaseComplete, setPurchaseComplete] = useState(false)

  // Voucher configuration
  const [voucherType, setVoucherType] = useState<"treatment" | "monetary">("monetary")
  const [treatmentId, setTreatmentId] = useState("")
  const [selectedDurationId, setSelectedDurationId] = useState("")
  const [monetaryValue, setMonetaryValue] = useState(150)
  const [isGift, setIsGift] = useState(false)

  const [voucherId, setVoucherId] = useState<string | null>(null)

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

  // Gift details form (only if isGift is true)
  const giftForm = useForm<GiftDetails>({
    resolver: zodResolver(giftDetailsSchema),
    defaultValues: {
      recipientName: "",
      recipientPhone: "",
      greetingMessage: "",
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

  const selectedTreatmentData = useMemo(() => {
    return treatments.find((treatment) => treatment._id.toString() === treatmentId)
  }, [treatments, treatmentId])

  const selectedDurationData = useMemo(() => {
    if (!selectedTreatmentData || selectedTreatmentData.pricingType !== "duration_based") {
      return null
    }
    return selectedTreatmentData.durations?.find((duration) => duration._id.toString() === selectedDurationId)
  }, [selectedTreatmentData, selectedDurationId])

  const voucherValue = useMemo(() => {
    if (voucherType === "monetary") {
      return monetaryValue
    } else if (voucherType === "treatment" && selectedTreatmentData) {
      if (selectedTreatmentData.pricingType === "fixed") {
        return selectedTreatmentData.fixedPrice || 0
      } else if (selectedTreatmentData.pricingType === "duration_based" && selectedDurationData) {
        return selectedDurationData.price || 0
      }
    }
    return 0
  }, [voucherType, monetaryValue, selectedTreatmentData, selectedDurationData])

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS))
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1))

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        if (voucherType === "monetary") {
          return monetaryValue >= 150
        } else {
          return !!treatmentId && (selectedTreatmentData?.pricingType !== "duration_based" || !!selectedDurationId)
        }
      case 2:
        return guestForm.formState.isValid
      case 3:
        return !isGift || giftForm.formState.isValid
      case 4:
        return paymentForm.formState.isValid
      default:
        return true
    }
  }

  const handlePurchase = async () => {
    if (!guestForm.formState.isValid || !paymentForm.formState.isValid || (isGift && !giftForm.formState.isValid)) {
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

      // First, initiate the voucher purchase
      const initiateData: PurchaseInitiationData & {
        guestInfo: {
          name: string
          email: string
          phone: string
        }
      } = {
        voucherType,
        treatmentId: voucherType === "treatment" ? treatmentId : undefined,
        selectedDurationId: voucherType === "treatment" && selectedTreatmentData?.pricingType === "duration_based" ? selectedDurationId : undefined,
        monetaryValue: voucherType === "monetary" ? monetaryValue : undefined,
        isGift,
        guestInfo: {
          name: guestInfo.name,
          email: guestInfo.email,
          phone: guestInfo.phone,
        },
      }

      const initiateResult = await initiateGuestPurchaseGiftVoucher(initiateData)

      if (!initiateResult.success || !initiateResult.voucherId) {
        toast({
          variant: "destructive",
          title: "שגיאה ביצירת השובר",
          description: initiateResult.error || "אירעה שגיאה לא צפויה",
        })
        return
      }

      // Simulate payment processing
      const paymentSuccess = true // In real implementation, this would be actual payment processing
      const paymentId = `guest_payment_${Date.now()}`

      // Confirm the purchase
      const confirmResult = await confirmGuestGiftVoucherPurchase({
        voucherId: initiateResult.voucherId,
        paymentId,
        success: paymentSuccess,
        guestInfo: {
          name: guestInfo.name,
          email: guestInfo.email,
          phone: guestInfo.phone,
        },
      })

      if (confirmResult.success) {
        setVoucherId(initiateResult.voucherId)
        setPurchaseComplete(true)
        toast({
          title: "השובר נרכש בהצלחה!",
          description: "פרטי השובר נשלחו אליך באימייל",
        })
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה באישור התשלום",
          description: confirmResult.error || "אירעה שגיאה לא צפויה",
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "אירעה שגיאה ברכישת השובר",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const renderVoucherTypeStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">בחר סוג שובר</h2>
        <p className="text-gray-600 mt-2">בחר בין שובר כספי לשובר טיפול</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className={`cursor-pointer border-2 ${voucherType === "monetary" ? "border-blue-500" : "border-gray-200"}`} onClick={() => setVoucherType("monetary")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              שובר כספי
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>שובר בסכום כספי לבחירתך</p>
          </CardContent>
        </Card>

        <Card className={`cursor-pointer border-2 ${voucherType === "treatment" ? "border-blue-500" : "border-gray-200"}`} onClick={() => setVoucherType("treatment")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5" />
              שובר טיפול
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>שובר לטיפול ספציפי</p>
          </CardContent>
        </Card>
      </div>

      {voucherType === "monetary" && (
        <Card>
          <CardHeader>
            <CardTitle>סכום השובר</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="monetaryValue">סכום (₪) - מינימום 150 ₪</Label>
              <Input
                id="monetaryValue"
                type="number"
                min={150}
                value={monetaryValue}
                onChange={(e) => setMonetaryValue(Number(e.target.value))}
                placeholder="150"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {voucherType === "treatment" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>בחר טיפול</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {treatments.map((treatment) => (
                  <Card 
                    key={treatment._id.toString()}
                    className={`cursor-pointer border-2 ${treatmentId === treatment._id.toString() ? "border-blue-500" : "border-gray-200"}`}
                    onClick={() => setTreatmentId(treatment._id.toString())}
                  >
                    <CardContent className="p-4">
                      <h3 className="font-medium">{treatment.name}</h3>
                      <p className="text-sm text-gray-600">{treatment.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {selectedTreatmentData?.pricingType === "duration_based" && (
            <Card>
              <CardHeader>
                <CardTitle>בחר משך טיפול</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedTreatmentData.durations?.map((duration) => (
                    <Card 
                      key={duration._id.toString()}
                      className={`cursor-pointer border-2 ${selectedDurationId === duration._id.toString() ? "border-blue-500" : "border-gray-200"}`}
                      onClick={() => setSelectedDurationId(duration._id.toString())}
                    >
                      <CardContent className="p-4 text-center">
                        <h3 className="font-medium">{duration.durationMinutes} דקות</h3>
                        <p className="text-lg font-semibold">{duration.price} ₪</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isGift"
              checked={isGift}
              onCheckedChange={(checked) => setIsGift(checked as boolean)}
            />
            <Label htmlFor="isGift" className="flex items-center gap-2">
              <Gift className="w-4 h-4" />
              זה שובר מתנה למישהו אחר
            </Label>
          </div>
        </CardContent>
      </Card>
    </div>
  )

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

  const renderGiftDetailsStep = () => {
    if (!isGift) {
      nextStep()
      return null
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            פרטי המתנה
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="recipientName">שם הנמען *</Label>
            <Input
              id="recipientName"
              {...giftForm.register("recipientName")}
              placeholder="שם של מקבל המתנה"
            />
            {giftForm.formState.errors.recipientName && (
              <p className="text-red-500 text-sm mt-1">{giftForm.formState.errors.recipientName.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="recipientPhone">מספר טלפון הנמען *</Label>
            <Input
              id="recipientPhone"
              {...giftForm.register("recipientPhone")}
              placeholder="050-1234567"
            />
            {giftForm.formState.errors.recipientPhone && (
              <p className="text-red-500 text-sm mt-1">{giftForm.formState.errors.recipientPhone.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="greetingMessage">הודעת ברכה (אופציונלי)</Label>
            <Textarea
              id="greetingMessage"
              {...giftForm.register("greetingMessage")}
              placeholder="כתוב הודעת ברכה אישית..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    )
  }

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
          </div>

          <div>
            <Label htmlFor="cvv">CVV *</Label>
            <Input
              id="cvv"
              {...paymentForm.register("cvv")}
              placeholder="123"
              maxLength={4}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderSummaryStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">סיכום השובר</h2>
        <p className="text-gray-600 mt-2">בדוק את פרטי השובר לפני האישור הסופי</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium mb-3">פרטי השובר</h3>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {voucherType === "monetary" ? <DollarSign className="w-5 h-5" /> : <Stethoscope className="w-5 h-5" />}
                <div>
                  <h4 className="font-medium">{voucherType === "monetary" ? "שובר כספי" : "שובר טיפול"}</h4>
                  <p className="text-sm text-gray-600">
                    {voucherType === "monetary"
                      ? `${monetaryValue} ₪`
                      : selectedTreatmentData?.name + (selectedDurationData ? ` - ${selectedDurationData.durationMinutes} דקות` : "")
                    }
                  </p>
                  {isGift && <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs">מתנה</span>}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-3">סיכום מחיר</h3>
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>סוג השובר:</span>
                  <span>{voucherType === "monetary" ? "כספי" : "טיפול"}</span>
                </div>
                <div className="flex justify-between">
                  <span>ערך השובר:</span>
                  <span>{voucherValue} ₪</span>
                </div>
                {isGift && (
                  <div className="flex justify-between">
                    <span>סוג:</span>
                    <span>שובר מתנה</span>
                  </div>
                )}
                <hr />
                <div className="flex justify-between font-bold text-lg">
                  <span>סך הכל:</span>
                  <span>{voucherValue} ₪</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Button onClick={handlePurchase} disabled={isLoading} className="w-full">
        {isLoading ? "מעבד..." : "אשר ורכוש"}
      </Button>
    </div>
  )

  if (purchaseComplete) {
    return (
      <div className="max-w-4xl mx-auto text-center">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600 text-2xl">
              {isGift ? "שובר המתנה נרכש בהצלחה!" : "השובר נרכש בהצלחה!"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              {isGift
                ? "פרטי שובר המתנה נשלחו אליך באימייל."
                : "פרטי השובר נשלחו אליך באימייל. תוכל להשתמש בו להזמנת טיפולים."
              }
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => router.push("/")} variant="outline">
                חזרה לעמוד הבית
              </Button>
              <Button onClick={() => router.push("/book-treatment")}>
                הזמנת טיפול
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return renderVoucherTypeStep()
      case 2:
        return renderGuestInfoStep()
      case 3:
        return renderGiftDetailsStep()
      case 4:
        return renderPaymentStep()
      case 5:
        return renderSummaryStep()
      default:
        return null
    }
  }

  const progress = (currentStep / TOTAL_STEPS) * 100

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">רכישת שובר מתנה</h1>
        <p className="text-gray-600 mt-2">רכוש שובר לטיפולים או כמתנה למישהו אחר</p>
      </div>

      <Progress value={progress} className="mb-8" />

      <div className="mb-8">
        {renderStep()}
      </div>

      {currentStep < TOTAL_STEPS && (
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            חזור
          </Button>
          <Button
            onClick={nextStep}
            disabled={!canProceedToNextStep() || currentStep === TOTAL_STEPS}
          >
            {currentStep === TOTAL_STEPS ? "סיום" : "המשך"}
          </Button>
        </div>
      )}
    </div>
  )
}
