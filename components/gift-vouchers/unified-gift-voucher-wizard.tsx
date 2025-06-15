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
import { Calendar } from "@/components/common/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/common/ui/popover"
import { useToast } from "@/components/common/ui/use-toast"
import { Progress } from "@/components/common/ui/progress"
import { useTranslation } from "@/lib/translations/i18n"
import { useSession } from "next-auth/react"
import {
  initiatePurchaseGiftVoucher,
  confirmGiftVoucherPurchase,
  initiateGuestPurchaseGiftVoucher,
  confirmGuestGiftVoucherPurchase,
  setGiftDetails,
  saveAbandonedGiftVoucherPurchase,
  type PurchaseInitiationData,
  type GiftDetailsPayload,
  type GiftVoucherPlain,
} from "@/actions/gift-voucher-actions"
import { getPaymentMethods, type IPaymentMethod } from "@/actions/payment-method-actions"
import { createGuestUser } from "@/actions/booking-actions"
import {
  Gift,
  CreditCard,
  CalendarIcon,
  Check,
  Clock,
  Sparkles,
  LayoutGrid,
  Stethoscope,
  DollarSign,
  User,
  MapPin,
} from "lucide-react"
import { format, setHours, setMinutes, addHours, startOfHour } from "date-fns"
import { cn } from "@/lib/utils/utils"

// Import shared components
import { StepIndicator } from "@/components/common/purchase/step-indicator"
import { PurchaseCard } from "@/components/common/purchase/purchase-card"
import { PurchaseNavigation } from "@/components/common/purchase/purchase-navigation"
import { PurchaseSummary } from "@/components/common/purchase/purchase-summary"
import { AnimatedContainer } from "@/components/common/purchase/animated-container"
import { PurchaseSuccess } from "@/components/common/purchase/purchase-success"
import { PaymentMethodSelector } from "@/components/common/purchase/payment-method-selector"
import { PhoneInput } from "@/components/common/phone-input"
import { GuestInfoStep } from "@/components/booking/steps/guest-info-step"
import { GuestTreatmentSelectionStep } from "@/components/booking/steps/guest-treatment-selection-step"
import { GuestPaymentStep } from "@/components/booking/steps/guest-payment-step"
import GuestGiftVoucherConfirmation from "./guest-gift-voucher-confirmation"

import type { ITreatment } from "@/lib/db/models/treatment"
import type { CalculatedPriceDetails } from "@/types/booking"
import type { User } from "next-auth"

interface TreatmentDuration {
  _id: string
  name?: string
  price: number
  minutes?: number
}

interface Treatment {
  _id: string
  name: string
  category: string
  price?: number
  fixedPrice?: number
  durations: TreatmentDuration[]
}

interface UnifiedGiftVoucherWizardProps {
  treatments: ITreatment[]
  initialPaymentMethods?: IPaymentMethod[]
  currentUser?: User | null
}

type GiftDetailsFormData = z.infer<typeof giftDetailsSchema>

const formatMinutesToDurationString = (minutes: number, t: Function): string => {
  if (!minutes) return ""
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  let durationString = ""
  if (hours > 0) {
    durationString += `${hours} ${t(hours === 1 ? "common.hour" : "common.hours")}`
  }
  if (mins > 0) {
    if (hours > 0) durationString += ` ${t("common.and")} `
    durationString += `${mins} ${t(mins === 1 ? "common.minute" : "common.minutes")}`
  }
  return durationString.trim() || `${minutes} ${t("common.minutes")}`
}

const giftDetailsSchema = z.object({
  recipientName: z.string().min(2, { message: "Recipient name must be at least 2 characters." }),
  recipientPhone: z.string().optional(),
  greetingMessage: z.string().optional(),
  sendOption: z.enum(["immediate", "scheduled"]),
  sendDate: z.date().optional(),
  sendTime: z.string().optional(),
})

export default function UnifiedGiftVoucherWizard({
  treatments,
  initialPaymentMethods = [],
  currentUser,
}: UnifiedGiftVoucherWizardProps) {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()
  const isGuest = !currentUser

  // Guest-specific state
  const [guestInfo, setGuestInfo] = useState<any>({})
  const [guestUserId, setGuestUserId] = useState<string | null>(null)

  // Common state
  const [currentStep, setCurrentStep] = useState(isGuest ? 1 : 1)
  const [loading, setLoading] = useState(false)
  const [voucherId, setVoucherId] = useState<string>("")
  const [calculatedPrice, setCalculatedPrice] = useState(0)
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<TreatmentDuration | null>(null)
  const [savedGiftDetails, setSavedGiftDetails] = useState<GiftDetailsFormData | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<IPaymentMethod[]>(initialPaymentMethods)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [voucherType, setVoucherType] = useState<"treatment" | "monetary">("monetary")
  const [monetaryValue, setMonetaryValue] = useState<number>(150)
  const [treatmentId, setTreatmentId] = useState<string>("")
  const [selectedDurationId, setSelectedDurationId] = useState<string>("")
  const [isGift, setIsGift] = useState(false)
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>("")
  const [purchaseComplete, setPurchaseComplete] = useState(false)
  const [purchasedVoucher, setPurchasedVoucher] = useState<GiftVoucherPlain | null>(null)

  const giftForm = useForm<GiftDetailsFormData>({
    resolver: zodResolver(giftDetailsSchema),
    defaultValues: { sendOption: "immediate" },
  })

  const watchSendOption = giftForm.watch("sendOption")

  // Calculate price
  const selectedTreatmentObj = treatments.find(t => t._id.toString() === treatmentId)
  const selectedDurationObj = selectedTreatmentObj?.pricingType === "duration_based"
    ? selectedTreatmentObj.durations?.find(d => d._id.toString() === selectedDurationId)
    : undefined

  const price = voucherType === "monetary"
    ? Math.max(monetaryValue, 150)
    : selectedTreatmentObj?.pricingType === "fixed"
      ? selectedTreatmentObj.fixedPrice || 0
      : selectedDurationObj?.price || 0

  const calculatedPriceDetails: CalculatedPriceDetails = {
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

  // Define steps based on user type
  const TOTAL_STEPS = isGuest ? 6 : (isGift ? 4 : 3)
  
  const steps = useMemo(() => {
    const baseSteps = []
    
    if (isGuest) {
      baseSteps.push(
        { key: 1, label: "פרטים אישיים", icon: User },
        { key: 2, label: "בחירת שובר", icon: Gift }
      )
      
      if (voucherType === "treatment") {
        baseSteps.push({ key: 3, label: "בחירת טיפול", icon: Stethoscope })
      }
      
      baseSteps.push(
        { key: isGuest && voucherType === "treatment" ? 4 : 3, label: "סיכום", icon: LayoutGrid },
        { key: isGuest && voucherType === "treatment" ? 5 : 4, label: "תשלום", icon: CreditCard },
        { key: isGuest && voucherType === "treatment" ? 6 : 5, label: "אישור", icon: Check }
      )
    } else {
      baseSteps.push({ key: 1, label: t("purchaseGiftVoucher.stepSelect"), icon: Gift })
      
      if (isGift) {
        baseSteps.push({ key: 2, label: t("purchaseGiftVoucher.stepGiftDetails"), icon: Sparkles })
      }
      
      baseSteps.push(
        { key: isGift ? 3 : 2, label: t("purchaseGiftVoucher.stepPayment"), icon: CreditCard },
        { key: isGift ? 4 : 3, label: t("purchaseGiftVoucher.stepComplete"), icon: Check }
      )
    }
    
    return baseSteps
  }, [t, isGift, isGuest, voucherType])

  const nextStep = () => setCurrentStep(s => Math.min(s + 1, TOTAL_STEPS))
  const prevStep = () => setCurrentStep(s => Math.max(s - 1, 1))

  // Auto-save for abandoned purchases
  useEffect(() => {
    if (isGuest && guestUserId) {
      saveAbandonedGiftVoucherPurchase(guestUserId, {
        guestInfo,
        purchaseOptions: {
          voucherType,
          treatmentId,
          selectedDurationId,
          monetaryValue: voucherType === "monetary" ? monetaryValue : undefined,
          isGift: guestInfo.isGift,
        },
        currentStep,
      })
    } else if (!isGuest && currentUser?.id && currentStep !== TOTAL_STEPS) {
      saveAbandonedGiftVoucherPurchase(currentUser.id, {
        purchaseOptions: {
          voucherType,
          treatmentId,
          selectedDurationId,
          monetaryValue: voucherType === "monetary" ? monetaryValue : undefined,
          isGift,
        },
        currentStep,
      })
    }
  }, [isGuest, guestUserId, guestInfo, currentUser?.id, voucherType, treatmentId, selectedDurationId, monetaryValue, isGift, currentStep, TOTAL_STEPS])

  // Load payment methods for members
  useEffect(() => {
    if (!isGuest) {
      const loadPaymentMethods = async () => {
        const pmResult = await getPaymentMethods()
        if (pmResult.success && pmResult.paymentMethods) {
          setPaymentMethods(pmResult.paymentMethods)
          const defaultPm = pmResult.paymentMethods.find((pm) => pm.isDefault) || pmResult.paymentMethods[0]
          if (defaultPm) setSelectedPaymentMethodId(defaultPm._id)
        }
      }
      loadPaymentMethods()
    }
  }, [isGuest])

  const treatmentCategories = useMemo(() => {
    const categories = new Set(treatments.map((t) => t.category))
    return ["all", ...Array.from(categories)]
  }, [treatments])

  const filteredTreatments = useMemo(() => {
    if (selectedCategory === "all") {
      return treatments
    }
    return treatments.filter((t) => t.category === selectedCategory)
  }, [treatments, selectedCategory])

  // Guest info submission
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
    nextStep()
  }

  // Member initial submission
  const handleInitialSubmit = async () => {
    setLoading(true)
    try {
      const result = await initiatePurchaseGiftVoucher({
        voucherType,
        treatmentId: voucherType === "treatment" ? treatmentId : undefined,
        selectedDurationId: voucherType === "treatment" ? selectedDurationId || undefined : undefined,
        monetaryValue: voucherType === "monetary" ? monetaryValue : undefined,
        isGift,
      })

      if (result.success && result.voucherId) {
        setVoucherId(result.voucherId)
        setCalculatedPrice(result.amount || price)
        if (isGift) {
          nextStep() // Go to gift details
        } else {
          // Skip gift details, go to payment
          const pmResult = await getPaymentMethods()
          if (pmResult.success && pmResult.paymentMethods) {
            setPaymentMethods(pmResult.paymentMethods)
            const defaultPm = pmResult.paymentMethods.find((pm) => pm.isDefault) || pmResult.paymentMethods[0]
            if (defaultPm) setSelectedPaymentMethodId(defaultPm._id)
          }
          setCurrentStep(isGift ? 3 : 2) // Skip to payment step
        }
      } else {
        toast({
          variant: "destructive",
          title: t("common.error"),
          description: result.error || t("common.errorGeneric"),
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("common.errorGeneric"),
      })
    } finally {
      setLoading(false)
    }
  }

  // Gift details submission
  const handleGiftDetailsSubmit = async (data: GiftDetailsFormData) => {
    setSavedGiftDetails(data)
    setLoading(true)
    const pmResult = await getPaymentMethods()
    if (pmResult.success && pmResult.paymentMethods) {
      setPaymentMethods(pmResult.paymentMethods)
      const defaultPm = pmResult.paymentMethods.find((pm) => pm.isDefault) || pmResult.paymentMethods[0]
      if (defaultPm) setSelectedPaymentMethodId(defaultPm._id)
    }
    setLoading(false)
    nextStep()
  }

  // Payment submission
  const handlePaymentSubmit = async () => {
    setLoading(true)
    try {
      if (isGuest) {
        // Guest purchase flow
        let sendDateForPayload: string | undefined = "immediate"
        if (guestInfo.isGift && guestInfo.sendOption === "scheduled" && guestInfo.sendDate && guestInfo.sendTime) {
          const [h, m] = guestInfo.sendTime.split(":").map(Number)
          const combined = new Date(guestInfo.sendDate)
          combined.setHours(h, m, 0, 0)
          sendDateForPayload = combined.toISOString()
        }

        const initRes = await initiateGuestPurchaseGiftVoucher({
          voucherType,
          treatmentId: voucherType === "treatment" ? treatmentId : undefined,
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
          toast({ variant: "destructive", title: "שגיאה", description: initRes.error || "" })
          setLoading(false)
          return
        }

        const confirmRes = await confirmGuestGiftVoucherPurchase({
          voucherId: initRes.voucherId,
          paymentId: `guest_payment_${Date.now()}`,
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
          setCurrentStep(TOTAL_STEPS)
        } else {
          toast({ variant: "destructive", title: "שגיאה", description: confirmRes.error || "" })
        }
      } else {
        // Member purchase flow
        const paymentResult = await confirmGiftVoucherPurchase({
          voucherId: voucherId!,
          paymentId: `PAY-${Date.now()}`,
          success: true,
          amount: calculatedPrice,
        })

        if (paymentResult.success) {
          setPurchaseComplete(true)
          setCurrentStep(TOTAL_STEPS)
        } else {
          toast({
            variant: "destructive",
            title: t("common.error"),
            description: paymentResult.error || t("common.errorGeneric"),
          })
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("common.errorGeneric"),
      })
    } finally {
      setLoading(false)
    }
  }

  // Render voucher type selection step
  const renderVoucherTypeStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">בחר סוג שובר</h2>
        <p className="text-gray-600 mt-2">בחר בין שובר כספי לשובר טיפול</p>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Card className={`cursor-pointer border-2 ${voucherType === "monetary" ? "border-blue-500" : "border-gray-200"}`}
          onClick={() => { setVoucherType("monetary"); setTreatmentId(""); setSelectedDurationId("") }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              שובר כספי
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>שובר בסכום כספי לבחירתך</p>
            {voucherType === "monetary" && (
              <div className="mt-4">
                <Label htmlFor="monetary-value">סכום (₪)</Label>
                <Input
                  id="monetary-value"
                  type="number"
                  min={150}
                  value={monetaryValue}
                  onChange={e => setMonetaryValue(Number(e.target.value))}
                  placeholder="150"
                />
              </div>
            )}
          </CardContent>
        </Card>
        <Card className={`cursor-pointer border-2 ${voucherType === "treatment" ? "border-blue-500" : "border-gray-200"}`}
          onClick={() => { setVoucherType("treatment"); setMonetaryValue(150) }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              שובר טיפול
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>שובר לטיפול מסוים</p>
          </CardContent>
        </Card>
      </div>
      
      {!isGuest && (
        <div className="mt-6">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is-gift"
              checked={isGift}
              onChange={(e) => setIsGift(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="is-gift">זהו שובר מתנה</Label>
          </div>
        </div>
      )}
      
      <div className="flex justify-between mt-6">
        {!isGuest && <Button variant="outline" onClick={prevStep}>חזור</Button>}
        <Button onClick={isGuest ? nextStep : handleInitialSubmit} disabled={loading}>
          {loading ? "טוען..." : "המשך"}
        </Button>
      </div>
    </div>
  )

  // Render treatment selection step (for treatment vouchers)
  const renderTreatmentStep = () => (
    <GuestTreatmentSelectionStep
      treatments={treatments}
      selectedTreatmentId={treatmentId}
      selectedDurationId={selectedDurationId}
      onTreatmentSelect={setTreatmentId}
      onDurationSelect={setSelectedDurationId}
      onNext={nextStep}
      onPrev={prevStep}
    />
  )

  // Render summary step
  const renderSummaryStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">סיכום הזמנה</h2>
        <p className="text-gray-600 mt-2">בדוק את פרטי השובר לפני המשך לתשלום</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>פרטי השובר</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span>סוג שובר:</span>
            <span>{voucherType === "monetary" ? "שובר כספי" : "שובר טיפול"}</span>
          </div>
          
          {voucherType === "monetary" ? (
            <div className="flex justify-between">
              <span>סכום:</span>
              <span>{monetaryValue} ₪</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between">
                <span>טיפול:</span>
                <span>{selectedTreatmentObj?.name}</span>
              </div>
              {selectedDurationObj && (
                <div className="flex justify-between">
                  <span>משך:</span>
                  <span>{selectedDurationObj.name || `${selectedDurationObj.minutes} דקות`}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>מחיר:</span>
                <span>{price} ₪</span>
              </div>
            </>
          )}
          
          {isGuest && guestInfo.isGift && (
            <>
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">פרטי מתנה</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>שם המקבל:</span>
                    <span>{guestInfo.recipientFirstName} {guestInfo.recipientLastName}</span>
                  </div>
                  {guestInfo.recipientPhone && (
                    <div className="flex justify-between">
                      <span>טלפון:</span>
                      <span>{guestInfo.recipientPhone}</span>
                    </div>
                  )}
                  {guestInfo.greetingMessage && (
                    <div>
                      <span>הודעה:</span>
                      <p className="mt-1 text-gray-600">{guestInfo.greetingMessage}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
          
          <div className="border-t pt-4 flex justify-between font-bold text-lg">
            <span>סה"כ לתשלום:</span>
            <span>{price} ₪</span>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={prevStep}>חזור</Button>
        <Button onClick={nextStep}>המשך לתשלום</Button>
      </div>
    </div>
  )

  // Render member gift details step
  const renderGiftDetailsStep = () => (
    <AnimatedContainer>
      <PurchaseCard
        title={t("purchaseGiftVoucher.giftDetailsTitle")}
        description={t("purchaseGiftVoucher.giftDetailsDescription")}
        icon={Sparkles}
      >
        <form onSubmit={giftForm.handleSubmit(handleGiftDetailsSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="recipientName">{t("purchaseGiftVoucher.recipientName")}</Label>
              <Input
                id="recipientName"
                {...giftForm.register("recipientName")}
                placeholder={t("purchaseGiftVoucher.recipientNamePlaceholder")}
              />
              {giftForm.formState.errors.recipientName && (
                <p className="text-sm text-red-600 mt-1">
                  {giftForm.formState.errors.recipientName.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="recipientPhone">{t("purchaseGiftVoucher.recipientPhone")}</Label>
              <PhoneInput
                value={giftForm.watch("recipientPhone") || ""}
                onChange={(value) => giftForm.setValue("recipientPhone", value)}
                placeholder={t("purchaseGiftVoucher.recipientPhonePlaceholder")}
              />
            </div>

            <div>
              <Label htmlFor="greetingMessage">{t("purchaseGiftVoucher.greetingMessage")}</Label>
              <Textarea
                id="greetingMessage"
                {...giftForm.register("greetingMessage")}
                placeholder={t("purchaseGiftVoucher.greetingMessagePlaceholder")}
                rows={3}
              />
            </div>

            <div className="space-y-3">
              <Label>{t("purchaseGiftVoucher.sendOption")}</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="immediate"
                    value="immediate"
                    {...giftForm.register("sendOption")}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="immediate" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {t("purchaseGiftVoucher.sendImmediate")}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="scheduled"
                    value="scheduled"
                    {...giftForm.register("sendOption")}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="scheduled" className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {t("purchaseGiftVoucher.sendScheduled")}
                  </Label>
                </div>
              </div>
            </div>

            {watchSendOption === "scheduled" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("purchaseGiftVoucher.sendDate")}</Label>
                  <Controller
                    name="sendDate"
                    control={giftForm.control}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : t("purchaseGiftVoucher.pickDate")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                </div>
                <div>
                  <Label htmlFor="sendTime">{t("purchaseGiftVoucher.sendTime")}</Label>
                  <Input
                    id="sendTime"
                    type="time"
                    {...giftForm.register("sendTime")}
                  />
                </div>
              </div>
            )}
          </div>

          <PurchaseNavigation
            onPrev={prevStep}
            onNext={() => giftForm.handleSubmit(handleGiftDetailsSubmit)()}
            nextLabel={t("common.continue")}
            isLoading={loading}
          />
        </form>
      </PurchaseCard>
    </AnimatedContainer>
  )

  // Render payment step
  const renderPaymentStep = () => {
    if (isGuest) {
      return (
        <GuestPaymentStep
          calculatedPrice={calculatedPriceDetails}
          guestInfo={guestInfo}
          setGuestInfo={setGuestInfo}
          onConfirm={handlePaymentSubmit}
          onPrev={prevStep}
          isLoading={loading}
        />
      )
    }

    return (
      <AnimatedContainer>
        <PurchaseCard
          title={t("purchaseGiftVoucher.paymentTitle")}
          description={t("purchaseGiftVoucher.paymentDescription")}
          icon={CreditCard}
        >
          <div className="space-y-6">
            <PurchaseSummary
              items={[
                {
                  name: voucherType === "monetary" 
                    ? t("purchaseGiftVoucher.monetaryVoucher")
                    : selectedTreatment?.name || t("purchaseGiftVoucher.treatmentVoucher"),
                  price: calculatedPrice,
                  quantity: 1,
                },
              ]}
              total={calculatedPrice}
            />

            <PaymentMethodSelector
              paymentMethods={paymentMethods}
              selectedPaymentMethodId={selectedPaymentMethodId}
              onPaymentMethodSelect={setSelectedPaymentMethodId}
              onPaymentMethodAdded={async () => {
                const pmResult = await getPaymentMethods()
                if (pmResult.success && pmResult.paymentMethods) {
                  setPaymentMethods(pmResult.paymentMethods)
                }
              }}
            />

            <PurchaseNavigation
              onPrev={prevStep}
              onNext={handlePaymentSubmit}
              nextLabel={t("purchaseGiftVoucher.completePurchase")}
              isLoading={loading}
              disabled={!selectedPaymentMethodId}
            />
          </div>
        </PurchaseCard>
      </AnimatedContainer>
    )
  }

  // Render completion step
  const renderCompletionStep = () => {
    if (isGuest && purchasedVoucher) {
      return <GuestGiftVoucherConfirmation voucher={purchasedVoucher} />
    }

    return (
      <div className="max-w-4xl mx-auto">
        <PurchaseSuccess
          title={isGift ? t("purchaseGiftVoucher.giftSuccess") : t("purchaseGiftVoucher.purchaseSuccess")}
          message={
            isGift
              ? t("purchaseGiftVoucher.giftSuccessDescription")
              : t("purchaseGiftVoucher.purchaseSuccessDescription")
          }
          actionLabel={t("purchaseGiftVoucher.viewMyVouchers")}
          onAction={() => router.push("/dashboard/member/gift-vouchers")}
          secondaryActionLabel={t("purchaseGiftVoucher.backToDashboard")}
          onSecondaryAction={() => router.push("/dashboard")}
        />
      </div>
    )
  }

  // Main render logic
  const renderStep = () => {
    if (purchaseComplete) {
      return renderCompletionStep()
    }

    if (isGuest) {
      switch (currentStep) {
        case 1:
          return (
            <GuestInfoStep
              guestInfo={guestInfo}
              onSubmit={handleGuestInfoSubmit}
              showGiftOptions={true}
            />
          )
        case 2:
          return renderVoucherTypeStep()
        case 3:
          return voucherType === "treatment" ? renderTreatmentStep() : renderSummaryStep()
        case 4:
          return voucherType === "treatment" ? renderSummaryStep() : renderPaymentStep()
        case 5:
          return voucherType === "treatment" ? renderPaymentStep() : renderCompletionStep()
        case 6:
          return renderCompletionStep()
        default:
          return null
      }
    } else {
      // Member flow
      switch (currentStep) {
        case 1:
          return renderVoucherTypeStep()
        case 2:
          return isGift ? renderGiftDetailsStep() : renderPaymentStep()
        case 3:
          return isGift ? renderPaymentStep() : renderCompletionStep()
        case 4:
          return renderCompletionStep()
        default:
          return null
      }
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {!purchaseComplete && (
        <>
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900">
              {isGuest ? "רכישת שובר מתנה" : t("purchaseGiftVoucher.title")}
            </h1>
            <p className="text-gray-600 mt-2">
              {isGuest ? "בחר ורכוש שובר מתנה" : t("purchaseGiftVoucher.description")}
            </p>
          </div>

          <StepIndicator steps={steps} currentStep={currentStep} />
          
          {isGuest && (
            <div className="mb-6">
              <Progress value={(currentStep / TOTAL_STEPS) * 100} className="w-full" />
            </div>
          )}
        </>
      )}

      {renderStep()}
    </div>
  )
}