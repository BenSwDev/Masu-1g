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
import { useTranslation } from "@/lib/translations/i18n"
import {
  initiatePurchaseGiftVoucher,
  confirmGiftVoucherPurchase,
  setGiftDetails,
  type PurchaseInitiationData,
  type GiftDetailsPayload,
} from "@/actions/gift-voucher-actions"
import { getPaymentMethods, type IPaymentMethod } from "@/actions/payment-method-actions"
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

interface PurchaseGiftVoucherClientProps {
  treatments: Treatment[]
  initialPaymentMethods?: IPaymentMethod[]
  currentUser?: any
  isGuestMode?: boolean
  onPurchaseComplete?: (purchase: any) => void
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

export default function PurchaseGiftVoucherClient({
  treatments,
  initialPaymentMethods = [],
  currentUser,
  isGuestMode = false,
  onPurchaseComplete,
}: PurchaseGiftVoucherClientProps) {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()

  const [currentStep, setCurrentStep] = useState("select")
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

  const giftForm = useForm<GiftDetailsFormData>({
    resolver: zodResolver(giftDetailsSchema),
    defaultValues: { sendOption: "immediate" },
  })

  const watchSendOption = giftForm.watch("sendOption")

  // Define steps with icons
  const steps = useMemo(() => {
    const baseSteps = [
      {
        key: "select",
        label: t("purchaseGiftVoucher.stepSelect"),
        icon: Gift,
      },
    ]

    if (isGift) {
      baseSteps.push({
        key: "giftDetails",
        label: t("purchaseGiftVoucher.stepGiftDetails"),
        icon: Sparkles,
      })
    }

    baseSteps.push(
      {
        key: "payment",
        label: t("purchaseGiftVoucher.stepPayment"),
        icon: CreditCard,
      },
      {
        key: "complete",
        label: t("purchaseGiftVoucher.stepComplete"),
        icon: Check,
      },
    )

    return baseSteps
  }, [t, isGift])

  useEffect(() => {
    const defaultPmId = paymentMethods.find((pm) => pm.isDefault)?._id || paymentMethods[0]?._id || ""
    if (defaultPmId) {
      setSelectedPaymentMethodId(defaultPmId)
    }
  }, [paymentMethods])

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

  const timeOptions = useMemo(() => {
    const options = []
    for (let i = 8; i <= 23; i++) {
      options.push(`${String(i).padStart(2, "0")}:00`)
    }
    options.push("00:00")
    return options
  }, [])

  useEffect(() => {
    let price = 0
    if (voucherType === "monetary") {
      if (typeof monetaryValue === "number" && monetaryValue >= 150) {
        price = monetaryValue
      }
    } else if (voucherType === "treatment") {
      if (selectedTreatment) {
        if (selectedDuration && typeof selectedDuration.price === "number") {
          price = selectedDuration.price
        } else if (
          (!selectedTreatment.durations || selectedTreatment.durations.length === 0) &&
          typeof selectedTreatment.fixedPrice === "number" &&
          selectedTreatment.fixedPrice > 0
        ) {
          price = selectedTreatment.fixedPrice
        }
      }
    }
    setCalculatedPrice(price)
  }, [voucherType, monetaryValue, selectedTreatment, selectedDuration])

  useEffect(() => {
    if (treatmentId) {
      const treatment = filteredTreatments.find((t) => t._id === treatmentId)
      setSelectedTreatment(treatment || null)
      setSelectedDurationId("")
      setSelectedDuration(null)
    } else {
      setSelectedTreatment(null)
      setSelectedDuration(null)
    }
  }, [treatmentId, filteredTreatments])

  useEffect(() => {
    if (selectedDurationId && selectedTreatment) {
      const duration = selectedTreatment.durations.find((d) => d._id === selectedDurationId)
      setSelectedDuration(duration || null)
    } else if (!selectedDurationId) {
      setSelectedDuration(null)
    }
  }, [selectedDurationId, selectedTreatment])

  useEffect(() => {
    setTreatmentId("")
    setSelectedDurationId("")
    setSelectedTreatment(null)
    setSelectedDuration(null)
  }, [selectedCategory])

  const handleInitialSubmit = async () => {
    setLoading(true)
    try {
      const purchaseData: PurchaseInitiationData = {
        voucherType,
        isGift,
      }
      if (voucherType === "treatment") {
        purchaseData.treatmentId = treatmentId
        purchaseData.selectedDurationId = selectedDurationId
      } else {
        purchaseData.monetaryValue = monetaryValue
      }

      const result = await initiatePurchaseGiftVoucher(purchaseData)
      if (result.success && result.voucherId) {
        setVoucherId(result.voucherId)
        if (isGift) {
          setCurrentStep("giftDetails")
        } else {
          const pmResult = await getPaymentMethods()
          if (pmResult.success && pmResult.paymentMethods) {
            setPaymentMethods(pmResult.paymentMethods)
            const defaultPm = pmResult.paymentMethods.find((pm) => pm.isDefault) || pmResult.paymentMethods[0]
            if (defaultPm) setSelectedPaymentMethodId(defaultPm._id)
          }
          setCurrentStep("payment")
        }
      } else {
        toast({
          title: t("common.error"),
          description: result.error || t("purchaseGiftVoucher.failedToLoadData"),
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({ title: t("common.error"), description: t("common.unknownError"), variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

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
    setCurrentStep("payment")
  }

  const handlePaymentSubmit = async () => {
    setLoading(true)
    try {
      const paymentResult = await confirmGiftVoucherPurchase({
        voucherId: voucherId!,
        paymentId: `PAY-${Date.now()}`,
        success: true,
        amount: calculatedPrice,
      })

      if (paymentResult.success) {
        if (isGift && savedGiftDetails) {
          let sendDateForPayload: string | undefined = "immediate"
          if (savedGiftDetails.sendOption === "scheduled" && savedGiftDetails.sendDate && savedGiftDetails.sendTime) {
            const [hours, minutes] = savedGiftDetails.sendTime.split(":").map(Number)
            const combinedDateTime = setMinutes(setHours(savedGiftDetails.sendDate, hours), minutes)
            sendDateForPayload = combinedDateTime.toISOString()
          }

          const giftDetailsPayload: GiftDetailsPayload = {
            recipientName: savedGiftDetails.recipientName,
            recipientPhone: savedGiftDetails.recipientPhone,
            greetingMessage: savedGiftDetails.greetingMessage,
            sendDate: sendDateForPayload,
          }
          const giftResult = await setGiftDetails(voucherId!, giftDetailsPayload)
          if (!giftResult.success) {
            toast({
              title: t("common.error"),
              description: giftResult.error || "Failed to set gift details",
              variant: "destructive",
            })
          }
        }
        if (isGuestMode && onPurchaseComplete) {
          onPurchaseComplete(paymentResult.data)
        } else {
          setPurchaseComplete(true)
          setCurrentStep("complete")
        }
      } else {
        toast({
          title: t("common.error"),
          description: paymentResult.error || "Payment confirmation failed",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({ title: t("common.error"), description: t("common.unknownError"), variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentMethodAdded = async () => {
    const pmResult = await getPaymentMethods()
    if (pmResult.success && pmResult.paymentMethods) {
      setPaymentMethods(pmResult.paymentMethods)
      const newDefaultPm = pmResult.paymentMethods.find((pm) => pm.isDefault) || pmResult.paymentMethods[0]
      if (newDefaultPm) setSelectedPaymentMethodId(newDefaultPm._id)
    }
  }

  const handleNextStep = () => {
    const currentIndex = steps.findIndex((s) => s.key === currentStep)
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1]
      setCurrentStep(nextStep.key)
    }
  }

  const handlePrevStep = () => {
    const currentIndex = steps.findIndex((s) => s.key === currentStep)
    if (currentIndex > 0) {
      const prevStep = steps[currentIndex - 1]
      setCurrentStep(prevStep.key)
    }
  }

  const canGoNext = useMemo(() => {
    switch (currentStep) {
      case "select":
        if (voucherType === "monetary") {
          return monetaryValue >= 150
        } else if (voucherType === "treatment") {
          if (!treatmentId) return false
          if (selectedTreatment?.durations?.length > 0 && !selectedDurationId) return false
          return true
        }
        return false
      case "giftDetails":
        return giftForm.formState.isValid
      case "payment":
        return !!selectedPaymentMethodId
      default:
        return false
    }
  }, [
    currentStep,
    voucherType,
    monetaryValue,
    treatmentId,
    selectedTreatment,
    selectedDurationId,
    selectedPaymentMethodId,
    giftForm.formState.isValid,
  ])

  if (purchaseComplete) {
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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">{t("purchaseGiftVoucher.title")}</h1>
        <p className="text-gray-600 mt-2">{t("purchaseGiftVoucher.description")}</p>
      </div>

      <StepIndicator steps={steps} currentStep={currentStep} />

      <div className="min-h-[500px] relative">
        <AnimatedContainer isActive={currentStep === "select"}>
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">{t("purchaseGiftVoucher.selectType")}</h2>
              <p className="text-gray-600 mt-2">{t("purchaseGiftVoucher.selectTypeDescription")}</p>
            </div>

            {/* Voucher Type Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <PurchaseCard
                title={t("purchaseGiftVoucher.monetaryVoucher")}
                description={t("purchaseGiftVoucher.monetaryDescription")}
                isSelected={voucherType === "monetary"}
                onClick={() => setVoucherType("monetary")}
                icon={<DollarSign className="w-6 h-6" />}
              />
              <PurchaseCard
                title={t("purchaseGiftVoucher.treatmentVoucher")}
                description={t("purchaseGiftVoucher.treatmentDescription")}
                isSelected={voucherType === "treatment"}
                onClick={() => setVoucherType("treatment")}
                icon={<Stethoscope className="w-6 h-6" />}
              />
            </div>

            {/* Monetary Value Input */}
            {voucherType === "monetary" && (
              <Card className="p-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    {t("purchaseGiftVoucher.amount")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="monetaryValue" className="text-base font-medium">
                      {t("purchaseGiftVoucher.amount")} ({t("common.currency")})
                    </Label>
                    <Input
                      id="monetaryValue"
                      type="number"
                      min="150"
                      step="10"
                      placeholder="150"
                      className="text-lg h-12"
                      value={monetaryValue}
                      onChange={(e) => setMonetaryValue(Number(e.target.value))}
                    />
                    <p className="text-sm text-muted-foreground">
                      {t("purchaseGiftVoucher.minimumAmount")}: 150 {t("common.currency")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Treatment Selection */}
            {voucherType === "treatment" && (
              <Card className="p-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Stethoscope className="w-5 h-5" />
                    {t("purchaseGiftVoucher.selectTreatment")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <Label className="text-base font-medium flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4" />
                      {t("purchaseGiftVoucher.selectCategory")}
                    </Label>
                    <Select onValueChange={(value) => setSelectedCategory(value)} value={selectedCategory}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder={t("purchaseGiftVoucher.chooseCategory")} />
                      </SelectTrigger>
                      <SelectContent>
                        {treatmentCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category === "all"
                              ? t("purchaseGiftVoucher.allCategories")
                              : t(`treatments.categories.${category}` as any) || category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base font-medium">{t("purchaseGiftVoucher.selectTreatment")}</Label>
                    <div className="grid gap-4">
                      {filteredTreatments.map((treatment) => (
                        <PurchaseCard
                          key={treatment._id}
                          title={treatment.name}
                          price={
                            treatment.fixedPrice && (!treatment.durations || treatment.durations.length === 0)
                              ? treatment.fixedPrice
                              : undefined
                          }
                          isSelected={treatmentId === treatment._id}
                          onClick={() => setTreatmentId(treatment._id)}
                          badge={
                            treatment.durations && treatment.durations.length > 0
                              ? `${treatment.durations.length} ${t("purchaseGiftVoucher.durationOptions")}`
                              : undefined
                          }
                          icon={<Stethoscope className="w-5 h-5" />}
                        />
                      ))}
                    </div>
                  </div>

                  {selectedTreatment && selectedTreatment.durations.length > 0 && (
                    <div className="space-y-4">
                      <Label className="text-base font-medium flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {t("purchaseGiftVoucher.selectDuration")}
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedTreatment.durations.map((duration) => (
                          <PurchaseCard
                            key={duration._id}
                            title={
                              duration.minutes
                                ? formatMinutesToDurationString(duration.minutes, t)
                                : duration.name || t("common.notAvailable")
                            }
                            price={duration.price}
                            isSelected={selectedDurationId === duration._id}
                            onClick={() => setSelectedDurationId(duration._id)}
                            icon={<Clock className="w-5 h-5" />}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Gift Option */}
            <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="isGift"
                  checked={isGift}
                  onChange={(e) => setIsGift(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="isGift" className="text-base font-medium cursor-pointer flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  {t("purchaseGiftVoucher.sendAsGift")}
                </Label>
              </div>
            </Card>

            {/* Price Summary */}
            {calculatedPrice > 0 && (
              <PurchaseSummary
                items={[
                  {
                    label: t("purchaseGiftVoucher.total"),
                    value: `${calculatedPrice} ${t("common.currency")}`,
                    highlight: true,
                  },
                ]}
              />
            )}
          </div>
        </AnimatedContainer>

        <AnimatedContainer isActive={currentStep === "giftDetails"}>
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">
                {t("purchaseGiftVoucher.giftRecipientDetailsTitle")}
              </h2>
              <p className="text-gray-600 mt-2">{t("purchaseGiftVoucher.giftRecipientDetailsDescription")}</p>
            </div>

            <Card className="p-6">
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="recipientName" className="text-base font-medium">
                      {t("purchaseGiftVoucher.recipientName")}
                    </Label>
                    <Input
                      id="recipientName"
                      {...giftForm.register("recipientName")}
                      placeholder={t("purchaseGiftVoucher.recipientNamePlaceholder")}
                      className="h-11"
                    />
                    {giftForm.formState.errors.recipientName && (
                      <p className="text-sm text-destructive">{giftForm.formState.errors.recipientName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recipientPhone" className="text-base font-medium">
                      {t("purchaseGiftVoucher.recipientPhone")}
                    </Label>
                    <Controller
                      name="recipientPhone"
                      control={giftForm.control}
                      render={({ field }) => (
                        <PhoneInput
                          id="recipientPhone"
                          name={field.name}
                          placeholder={t("purchaseGiftVoucher.phonePlaceholder")}
                          className="h-11" // PhoneInput itself doesn't take h-11 directly, it styles its internal input.
                          // The overall height might differ slightly. We can wrap or adjust if needed.
                          fullNumberValue={field.value || ""}
                          onPhoneChange={field.onChange}
                          defaultCountryCode="+972"
                          ref={field.ref}
                        />
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="greetingMessage" className="text-base font-medium">
                    {t("purchaseGiftVoucher.greetingMessage")}
                  </Label>
                  <Textarea
                    id="greetingMessage"
                    {...giftForm.register("greetingMessage")}
                    placeholder={t("purchaseGiftVoucher.greetingPlaceholder")}
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-medium">{t("purchaseGiftVoucher.sendDate")}</Label>
                  <Controller
                    control={giftForm.control}
                    name="sendOption"
                    render={({ field }) => (
                      <div className="flex gap-4">
                        <Button
                          type="button"
                          variant={field.value === "immediate" ? "default" : "outline"}
                          onClick={() => field.onChange("immediate")}
                          className="flex-1"
                        >
                          {t("purchaseGiftVoucher.sendNow")}
                        </Button>
                        <Button
                          type="button"
                          variant={field.value === "scheduled" ? "default" : "outline"}
                          onClick={() => field.onChange("scheduled")}
                          className="flex-1"
                        >
                          {t("purchaseGiftVoucher.sendOnDate")}
                        </Button>
                      </div>
                    )}
                  />
                </div>

                {watchSendOption === "scheduled" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                    <Controller
                      control={giftForm.control}
                      name="sendDate"
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-start font-normal h-11">
                              <CalendarIcon className={cn("h-4 w-4", dir === "rtl" ? "ml-2" : "mr-2")} />
                              {field.value ? format(field.value, "PPP") : <span>{t("common.pickDate")}</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />

                    <Controller
                      control={giftForm.control}
                      name="sendTime"
                      defaultValue={format(startOfHour(addHours(new Date(), 1)), "HH:mm")}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder={t("purchaseGiftVoucher.selectTime")} />
                          </SelectTrigger>
                          <SelectContent>
                            {timeOptions.map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </AnimatedContainer>

        <AnimatedContainer isActive={currentStep === "payment"}>
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">{t("purchaseGiftVoucher.paymentDetailsTitle")}</h2>
              <p className="text-gray-600 mt-2">{t("purchaseGiftVoucher.paymentDetailsDescription")}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-4">{t("purchaseGiftVoucher.selectPaymentMethod")}</h3>
                <PaymentMethodSelector
                  paymentMethods={paymentMethods}
                  selectedPaymentMethodId={selectedPaymentMethodId}
                  onPaymentMethodSelect={setSelectedPaymentMethodId}
                  onPaymentMethodAdded={handlePaymentMethodAdded}
                />
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">{t("common.orderSummary")}</h3>
                <PurchaseSummary
                  items={[
                    {
                      label:
                        voucherType === "monetary"
                          ? t("purchaseGiftVoucher.monetaryVoucher")
                          : t("purchaseGiftVoucher.treatmentVoucher"),
                      value:
                        voucherType === "monetary"
                          ? `${monetaryValue} ${t("common.currency")}`
                          : selectedTreatment?.name || "",
                    },
                    ...(voucherType === "treatment" && selectedDuration
                      ? [
                          {
                            label: t("treatments.duration"),
                            value: `${selectedDuration.minutes} ${t("common.minutes")}`,
                          },
                        ]
                      : []),
                    ...(isGift
                      ? [
                          {
                            label: t("purchaseGiftVoucher.giftWrapping"),
                            value: t("common.included"),
                          },
                        ]
                      : []),
                  ]}
                  totalPrice={calculatedPrice}
                />
              </div>
            </div>
          </div>
        </AnimatedContainer>
      </div>

      <PurchaseNavigation
        onNext={
          currentStep === "select"
            ? handleInitialSubmit
            : currentStep === "giftDetails"
              ? giftForm.handleSubmit(handleGiftDetailsSubmit)
              : handleNextStep
        }
        onPrevious={handlePrevStep}
        onComplete={handlePaymentSubmit}
        canGoNext={canGoNext}
        canGoPrevious={steps.findIndex((s) => s.key === currentStep) > 0}
        isLoading={loading}
        isLastStep={currentStep === "payment"}
        nextLabel={
          currentStep === "select"
            ? isGift
              ? t("purchaseGiftVoucher.proceedToGiftDetails")
              : t("purchaseGiftVoucher.proceedToPayment")
            : undefined
        }
        completeLabel={`${t("purchaseGiftVoucher.payAmount", { amount: calculatedPrice, currency: t("common.currency") })}`}
      />
    </div>
  )
}
