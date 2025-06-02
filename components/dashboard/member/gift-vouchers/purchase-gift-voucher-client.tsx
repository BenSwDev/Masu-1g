"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Textarea } from "@/components/common/ui/textarea"
import { Calendar } from "@/components/common/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/common/ui/popover"
import { Badge } from "@/components/common/ui/badge"
import { Separator } from "@/components/common/ui/separator"
import { Alert, AlertDescription } from "@/components/common/ui/alert"
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
import { PaymentMethodForm } from "@/components/dashboard/member/payment-methods/payment-method-form"
import { Gift, CreditCard, CalendarIcon, Check, PlusCircle, Clock, ArrowRight, ArrowLeft, Sparkles } from "lucide-react"
import { format, setHours, setMinutes, addHours, startOfHour } from "date-fns"
import { cn } from "@/lib/utils/utils"

interface TreatmentDuration {
  _id: string
  name: string // This could be "60 minutes", "Standard", etc.
  price: number
  minutes?: number // Ensure this is part of the interface
}
interface Treatment {
  _id: string
  name: string
  price?: number
  durations: TreatmentDuration[]
}

interface PurchaseGiftVoucherClientProps {
  treatments: Treatment[]
  initialPaymentMethods: IPaymentMethod[]
}

const purchaseSchema = z.object({
  voucherType: z.enum(["treatment", "monetary"]),
  treatmentId: z.string().optional(),
  selectedDurationId: z.string().optional(),
  monetaryValue: z.number().min(150, "Minimum value is 150 ILS").optional(),
  isGift: z.boolean().default(false),
})

const giftDetailsSchema = z.object({
  recipientName: z.string().min(1, "Recipient name is required"),
  recipientPhone: z.string().min(10, "Valid phone number is required"),
  greetingMessage: z.string().optional(),
  sendOption: z.enum(["immediate", "scheduled"]).default("immediate"),
  sendDate: z.date().optional(),
  sendTime: z.string().optional(),
})

const paymentSchema = z.object({
  selectedPaymentMethodId: z.string().min(1, "Payment method is required"),
})

type PurchaseFormData = z.infer<typeof purchaseSchema>
type GiftDetailsFormData = z.infer<typeof giftDetailsSchema>
type PaymentFormData = z.infer<typeof paymentSchema>

// Helper function to format minutes into a readable string
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
  return durationString.trim() || `${minutes} ${t("common.minutes")}` // Fallback if hours and mins are 0 but minutes had a value
}

export default function PurchaseGiftVoucherClient({
  treatments,
  initialPaymentMethods,
}: PurchaseGiftVoucherClientProps) {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()

  const [step, setStep] = useState<"select" | "giftDetailsEntry" | "payment" | "complete">("select")
  const [loading, setLoading] = useState(false)
  const [voucherId, setVoucherId] = useState<string>("")
  const [calculatedPrice, setCalculatedPrice] = useState(0)
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<TreatmentDuration | null>(null)
  const [savedGiftDetails, setSavedGiftDetails] = useState<GiftDetailsFormData | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<IPaymentMethod[]>(initialPaymentMethods)
  const [showPaymentMethodForm, setShowPaymentMethodForm] = useState(false)

  const purchaseForm = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: { voucherType: "monetary", isGift: false },
  })

  const giftForm = useForm<GiftDetailsFormData>({
    resolver: zodResolver(giftDetailsSchema),
    defaultValues: { sendOption: "immediate" },
  })

  const paymentForm = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      selectedPaymentMethodId: paymentMethods.find((pm) => pm.isDefault)?._id || paymentMethods[0]?._id || "",
    },
  })

  useEffect(() => {
    const defaultPmId = paymentMethods.find((pm) => pm.isDefault)?._id || paymentMethods[0]?._id || ""
    if (defaultPmId) {
      paymentForm.setValue("selectedPaymentMethodId", defaultPmId)
    }
  }, [paymentMethods, paymentForm])

  const watchVoucherType = purchaseForm.watch("voucherType")
  const watchTreatmentId = purchaseForm.watch("treatmentId")
  const watchSelectedDurationId = purchaseForm.watch("selectedDurationId")
  const watchMonetaryValue = purchaseForm.watch("monetaryValue")
  const watchIsGift = purchaseForm.watch("isGift")
  const watchSendOption = giftForm.watch("sendOption")

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
    if (watchVoucherType === "monetary") {
      if (typeof watchMonetaryValue === "number" && watchMonetaryValue >= 150) {
        price = watchMonetaryValue
      }
    } else if (watchVoucherType === "treatment") {
      if (selectedTreatment) {
        if (selectedDuration && typeof selectedDuration.price === "number") {
          price = selectedDuration.price
        } else if (
          (!selectedTreatment.durations || selectedTreatment.durations.length === 0) &&
          typeof selectedTreatment.price === "number"
        ) {
          price = selectedTreatment.price
        }
      }
    }
    setCalculatedPrice(price)
  }, [watchVoucherType, watchMonetaryValue, selectedTreatment, selectedDuration])

  useEffect(() => {
    if (watchTreatmentId) {
      const treatment = treatments.find((t) => t._id === watchTreatmentId)
      setSelectedTreatment(treatment || null)
      // Reset duration if treatment changes
      purchaseForm.setValue("selectedDurationId", undefined)
      setSelectedDuration(null)
    } else {
      setSelectedTreatment(null)
      setSelectedDuration(null)
    }
  }, [watchTreatmentId, treatments, purchaseForm])

  useEffect(() => {
    if (watchSelectedDurationId && selectedTreatment) {
      const duration = selectedTreatment.durations.find((d) => d._id === watchSelectedDurationId)
      setSelectedDuration(duration || null)
    } else if (!watchSelectedDurationId) {
      setSelectedDuration(null)
    }
  }, [watchSelectedDurationId, selectedTreatment])

  const handleInitialSubmit = async (data: PurchaseFormData) => {
    setLoading(true)
    try {
      const purchaseData: PurchaseInitiationData = {
        voucherType: data.voucherType,
        isGift: data.isGift,
      }
      if (data.voucherType === "treatment") {
        purchaseData.treatmentId = data.treatmentId
        purchaseData.selectedDurationId = data.selectedDurationId
      } else {
        purchaseData.monetaryValue = data.monetaryValue
      }

      const result = await initiatePurchaseGiftVoucher(purchaseData)
      if (result.success && result.voucherId) {
        setVoucherId(result.voucherId)
        if (data.isGift) {
          setStep("giftDetailsEntry")
        } else {
          const pmResult = await getPaymentMethods()
          if (pmResult.success && pmResult.paymentMethods) {
            setPaymentMethods(pmResult.paymentMethods)
            const defaultPm = pmResult.paymentMethods.find((pm) => pm.isDefault) || pmResult.paymentMethods[0]
            if (defaultPm) paymentForm.setValue("selectedPaymentMethodId", defaultPm._id)
          }
          setStep("payment")
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
      if (defaultPm) paymentForm.setValue("selectedPaymentMethodId", defaultPm._id)
    }
    setLoading(false)
    setStep("payment")
  }

  const handlePaymentSubmit = async (_data: PaymentFormData) => {
    setLoading(true)
    try {
      const paymentResult = await confirmGiftVoucherPurchase({
        voucherId: voucherId!,
        paymentId: `PAY-${Date.now()}`,
        success: true,
        amount: calculatedPrice,
      })

      if (paymentResult.success) {
        if (watchIsGift && savedGiftDetails) {
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
            setStep("complete")
            return
          }
        }
        setStep("complete")
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
      if (newDefaultPm) paymentForm.setValue("selectedPaymentMethodId", newDefaultPm._id)
    }
    setShowPaymentMethodForm(false)
  }

  const StepIndicator = ({ currentStep }: { currentStep: string }) => {
    const steps = [
      { key: "select", label: t("purchaseGiftVoucher.stepSelect"), icon: Gift },
      { key: "giftDetailsEntry", label: t("purchaseGiftVoucher.stepGiftDetails"), icon: Sparkles },
      { key: "payment", label: t("purchaseGiftVoucher.stepPayment"), icon: CreditCard },
      { key: "complete", label: t("purchaseGiftVoucher.stepComplete"), icon: Check },
    ]

    const filteredSteps = watchIsGift ? steps : steps.filter((s) => s.key !== "giftDetailsEntry")
    const currentIndex = filteredSteps.findIndex((s) => s.key === currentStep)

    return (
      <div className="w-full mb-8">
        <div className="flex items-center justify-between">
          {filteredSteps.map((stepItem, index) => {
            const Icon = stepItem.icon
            const isActive = index <= currentIndex
            const isCurrent = stepItem.key === currentStep

            return (
              <div key={stepItem.key} className="flex items-center">
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200",
                    isActive
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-muted-foreground/30 text-muted-foreground",
                    isCurrent && "ring-2 ring-primary/20",
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div
                  className={cn(
                    "hidden sm:block ml-3 text-sm font-medium transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {stepItem.label}
                </div>
                {index < filteredSteps.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 mx-4 transition-colors",
                      index < currentIndex ? "bg-primary" : "bg-muted-foreground/30",
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (step === "select") {
    return (
      <div className="max-w-4xl mx-auto space-y-6 p-4">
        <StepIndicator currentStep={step} />

        <Card className="shadow-lg">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
              <Gift className="w-6 h-6 text-primary" />
              {t("purchaseGiftVoucher.title")}
            </CardTitle>
            <CardDescription className="text-lg">{t("purchaseGiftVoucher.description")}</CardDescription>
          </CardHeader>

          <form onSubmit={purchaseForm.handleSubmit(handleInitialSubmit)}>
            <CardContent className="space-y-8">
              {/* Voucher Type Selection */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold">{t("purchaseGiftVoucher.selectType")}</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card
                    className={cn(
                      "cursor-pointer border-2 transition-all duration-200 hover:shadow-md",
                      watchVoucherType === "monetary"
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border hover:border-primary/50",
                    )}
                    onClick={() => purchaseForm.setValue("voucherType", "monetary")}
                  >
                    <CardContent className="p-6 text-center">
                      <CreditCard className="h-12 w-12 mx-auto mb-4 text-primary" />
                      <h3 className="font-semibold text-lg mb-2">{t("purchaseGiftVoucher.monetaryVoucher")}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {t("purchaseGiftVoucher.monetaryDescription")}
                      </p>
                    </CardContent>
                  </Card>

                  <Card
                    className={cn(
                      "cursor-pointer border-2 transition-all duration-200 hover:shadow-md",
                      watchVoucherType === "treatment"
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border hover:border-primary/50",
                    )}
                    onClick={() => purchaseForm.setValue("voucherType", "treatment")}
                  >
                    <CardContent className="p-6 text-center">
                      <Gift className="h-12 w-12 mx-auto mb-4 text-primary" />
                      <h3 className="font-semibold text-lg mb-2">{t("purchaseGiftVoucher.treatmentVoucher")}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {t("purchaseGiftVoucher.treatmentDescription")}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Monetary Value Input */}
              {watchVoucherType === "monetary" && (
                <div className="space-y-4 p-6 bg-muted/30 rounded-lg">
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
                    {...purchaseForm.register("monetaryValue", { valueAsNumber: true })}
                  />
                  <p className="text-sm text-muted-foreground">
                    {t("purchaseGiftVoucher.minimumAmount")}: 150 {t("common.currency")}
                  </p>
                  {purchaseForm.formState.errors.monetaryValue && (
                    <p className="text-sm text-destructive">{purchaseForm.formState.errors.monetaryValue.message}</p>
                  )}
                </div>
              )}

              {/* Treatment Selection */}
              {watchVoucherType === "treatment" && (
                <div className="space-y-6 p-6 bg-muted/30 rounded-lg">
                  <div className="space-y-4">
                    <Label className="text-base font-medium">{t("purchaseGiftVoucher.selectTreatment")}</Label>
                    <Select
                      onValueChange={(value) => purchaseForm.setValue("treatmentId", value)}
                      value={watchTreatmentId}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder={t("purchaseGiftVoucher.chooseTreatment")} />
                      </SelectTrigger>
                      <SelectContent>
                        {treatments.map((treatment) => (
                          <SelectItem key={treatment._id} value={treatment._id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{treatment.name}</span>
                              {treatment.price && (!treatment.durations || treatment.durations.length === 0) && (
                                <Badge variant="secondary" className={cn("ml-2", dir === "rtl" && "mr-2 ml-0")}>
                                  {treatment.price} {t("common.currency")}
                                </Badge>
                              )}
                              {treatment.durations && treatment.durations.length > 0 && (
                                <Badge variant="outline" className={cn("ml-2", dir === "rtl" && "mr-2 ml-0")}>
                                  {treatment.durations.length} {t("purchaseGiftVoucher.durationOptions")}
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedTreatment && selectedTreatment.durations.length > 0 && (
                    <div className="space-y-4">
                      <Label className="text-base font-medium flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {t("purchaseGiftVoucher.selectDuration")}
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedTreatment.durations.map((duration) => (
                          <Card
                            key={duration._id}
                            className={cn(
                              "cursor-pointer border-2 transition-all duration-200 hover:shadow-sm",
                              watchSelectedDurationId === duration._id
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50",
                            )}
                            onClick={() => purchaseForm.setValue("selectedDurationId", duration._id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-muted-foreground" />
                                  <span className="font-medium">
                                    {duration.minutes
                                      ? formatMinutesToDurationString(duration.minutes, t)
                                      : duration.name}
                                  </span>
                                </div>
                                <Badge variant="secondary">
                                  {duration.price} {t("common.currency")}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Display fixed price for treatment without durations */}
              {watchVoucherType === "treatment" &&
                selectedTreatment &&
                (!selectedTreatment.durations || selectedTreatment.durations.length === 0) &&
                selectedTreatment.price && (
                  <Alert className="border-primary/20 bg-primary/5">
                    <AlertDescription className="flex justify-between items-center">
                      <span className="font-medium">{t("purchaseGiftVoucher.treatmentPrice")}:</span>
                      <Badge variant="secondary" className="text-base px-3 py-1">
                        {selectedTreatment.price} {t("common.currency")}
                      </Badge>
                    </AlertDescription>
                  </Alert>
                )}

              <Separator />

              {/* Gift Option */}
              <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg">
                <input
                  type="checkbox"
                  id="isGift"
                  {...purchaseForm.register("isGift")}
                  className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="isGift" className="text-base font-medium cursor-pointer">
                  {t("purchaseGiftVoucher.sendAsGift")}
                </Label>
              </div>

              {/* Price Summary */}
              {calculatedPrice > 0 && (
                <Alert className="border-primary/20 bg-primary/5">
                  <AlertDescription className="flex justify-between items-center text-lg">
                    <span className="font-medium">{t("purchaseGiftVoucher.total")}:</span>
                    <Badge variant="default" className="text-lg px-4 py-2">
                      {calculatedPrice} {t("common.currency")}
                    </Badge>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>

            <CardFooter className="flex justify-between pt-6">
              <Button type="button" variant="outline" onClick={() => router.back()} className="px-8">
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={loading || calculatedPrice <= 0} className="px-8">
                {loading ? (
                  t("common.processing")
                ) : (
                  <div className="flex items-center gap-2">
                    {watchIsGift
                      ? t("purchaseGiftVoucher.proceedToGiftDetails")
                      : t("purchaseGiftVoucher.proceedToPayment")}
                    {dir === "rtl" ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                  </div>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    )
  }

  // ... (rest of the steps: giftDetailsEntry, payment, complete - remain the same)
  if (step === "giftDetailsEntry") {
    return (
      <div className="max-w-3xl mx-auto space-y-6 p-4">
        <StepIndicator currentStep={step} />

        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {t("purchaseGiftVoucher.giftRecipientDetailsTitle")}
            </CardTitle>
            <CardDescription>{t("purchaseGiftVoucher.giftRecipientDetailsDescription")}</CardDescription>
          </CardHeader>

          <form onSubmit={giftForm.handleSubmit(handleGiftDetailsSubmit)}>
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
                  <Input
                    id="recipientPhone"
                    {...giftForm.register("recipientPhone")}
                    placeholder={t("purchaseGiftVoucher.phonePlaceholder")}
                    className="h-11"
                  />
                  {giftForm.formState.errors.recipientPhone && (
                    <p className="text-sm text-destructive">{giftForm.formState.errors.recipientPhone.message}</p>
                  )}
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
                          <Button variant="outline" className="w-full justify-start text-left font-normal h-11">
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

            <CardFooter className="flex justify-between pt-6">
              <Button type="button" variant="outline" onClick={() => setStep("select")} className="px-8">
                {dir === "rtl" ? <ArrowRight className="w-4 h-4 mr-2" /> : <ArrowLeft className="w-4 h-4 mr-2" />}
                {t("common.back")}
              </Button>
              <Button type="submit" disabled={loading} className="px-8">
                {loading ? (
                  t("common.processing")
                ) : (
                  <div className="flex items-center gap-2">
                    {t("purchaseGiftVoucher.proceedToPayment")}
                    {dir === "rtl" ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                  </div>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    )
  }

  if (step === "payment") {
    return (
      <div className="max-w-3xl mx-auto space-y-6 p-4">
        <StepIndicator currentStep={step} />

        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              {t("purchaseGiftVoucher.paymentDetailsTitle")}
            </CardTitle>
            <CardDescription>{t("purchaseGiftVoucher.paymentDetailsDescription")}</CardDescription>
          </CardHeader>

          <form onSubmit={paymentForm.handleSubmit(handlePaymentSubmit)}>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base font-medium">{t("purchaseGiftVoucher.selectPaymentMethod")}</Label>

                {paymentMethods.length === 0 && !showPaymentMethodForm && (
                  <Alert>
                    <AlertDescription>{t("paymentMethods.noPaymentMethods")}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  {paymentMethods.map((pm) => (
                    <Card
                      key={pm._id}
                      className={cn(
                        "cursor-pointer border-2 transition-all duration-200 hover:shadow-sm",
                        paymentForm.watch("selectedPaymentMethodId") === pm._id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50",
                      )}
                      onClick={() => paymentForm.setValue("selectedPaymentMethodId", pm._id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CreditCard className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">
                                {pm.cardName || `${t("paymentMethods.card")} **** ${pm.cardNumber.slice(-4)}`}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {t("paymentMethods.fields.expiry")}: {pm.expiryMonth}/{pm.expiryYear}
                              </p>
                            </div>
                          </div>
                          {pm.isDefault && <Badge variant="outline">{t("purchaseGiftVoucher.defaultCard")}</Badge>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {paymentForm.formState.errors.selectedPaymentMethodId && (
                  <p className="text-sm text-destructive">
                    {paymentForm.formState.errors.selectedPaymentMethodId.message}
                  </p>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPaymentMethodForm(true)}
                className="w-full h-12"
              >
                <PlusCircle className={cn("w-4 h-4", dir === "rtl" ? "ml-2" : "mr-2")} />
                {t("purchaseGiftVoucher.addNewCard")}
              </Button>

              {showPaymentMethodForm && (
                <PaymentMethodForm
                  open={showPaymentMethodForm}
                  onOpenChange={setShowPaymentMethodForm}
                  onSuccessCallback={handlePaymentMethodAdded}
                />
              )}

              <Alert className="border-primary/20 bg-primary/5">
                <AlertDescription className="flex justify-between items-center text-lg">
                  <span className="font-medium">{t("purchaseGiftVoucher.total")}:</span>
                  <Badge variant="default" className="text-lg px-4 py-2">
                    {calculatedPrice} {t("common.currency")}
                  </Badge>
                </AlertDescription>
              </Alert>
            </CardContent>

            <CardFooter className="flex justify-between pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(watchIsGift ? "giftDetailsEntry" : "select")}
                className="px-8"
              >
                {dir === "rtl" ? <ArrowRight className="w-4 h-4 mr-2" /> : <ArrowLeft className="w-4 h-4 mr-2" />}
                {t("common.back")}
              </Button>
              <Button
                type="submit"
                disabled={loading || !paymentForm.watch("selectedPaymentMethodId")}
                className="px-8"
              >
                {loading
                  ? t("common.processing")
                  : `${t("purchaseGiftVoucher.payAmount", { amount: calculatedPrice, currency: t("common.currency") })}`}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    )
  }

  if (step === "complete") {
    return (
      <div className="max-w-2xl mx-auto space-y-6 text-center p-4">
        <Card className="shadow-lg p-8">
          <div className="space-y-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="h-10 w-10 text-green-600" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                {watchIsGift ? t("purchaseGiftVoucher.giftSuccess") : t("purchaseGiftVoucher.purchaseSuccess")}
              </h1>
              <p className="text-muted-foreground text-lg">
                {watchIsGift
                  ? t("purchaseGiftVoucher.giftSuccessDescription")
                  : t("purchaseGiftVoucher.purchaseSuccessDescription")}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button onClick={() => router.push("/dashboard/member/gift-vouchers")} className="px-8">
                {t("purchaseGiftVoucher.viewMyVouchers")}
              </Button>
              <Button variant="outline" onClick={() => router.push("/dashboard")} className="px-8">
                {t("purchaseGiftVoucher.backToDashboard")}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return null
}
