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
import { Gift, CreditCard, CalendarIcon, Check, PlusCircle } from "lucide-react"
import { format, setHours, setMinutes, addHours, startOfHour } from "date-fns"
import { cn } from "@/lib/utils/utils"

interface Treatment {
  _id: string
  name: string
  price?: number
  durations: {
    _id: string
    name: string
    price: number
  }[]
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
  sendTime: z.string().optional(), // HH:mm format
})

const paymentSchema = z.object({
  selectedPaymentMethodId: z.string().min(1, "Payment method is required"),
})

type PurchaseFormData = z.infer<typeof purchaseSchema>
type GiftDetailsFormData = z.infer<typeof giftDetailsSchema>
type PaymentFormData = z.infer<typeof paymentSchema>

export default function PurchaseGiftVoucherClient({
  treatments,
  initialPaymentMethods,
}: PurchaseGiftVoucherClientProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()

  const [step, setStep] = useState<"select" | "giftDetailsEntry" | "payment" | "complete">("select")
  const [loading, setLoading] = useState(false)
  const [voucherId, setVoucherId] = useState<string>("")
  const [calculatedPrice, setCalculatedPrice] = useState(0)
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<Treatment["durations"][0] | null>(null)
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
    const currentPurchaseValues = purchaseForm.getValues()
    if (currentPurchaseValues.voucherType === "monetary") {
      if (typeof currentPurchaseValues.monetaryValue === "number" && currentPurchaseValues.monetaryValue >= 150) {
        price = currentPurchaseValues.monetaryValue
      }
    } else if (currentPurchaseValues.voucherType === "treatment") {
      if (selectedDuration && typeof selectedDuration.price === "number") {
        price = selectedDuration.price
      } else if (
        selectedTreatment &&
        (!selectedTreatment.durations || selectedTreatment.durations.length === 0) &&
        typeof selectedTreatment.price === "number"
      ) {
        price = selectedTreatment.price
      }
    }
    setCalculatedPrice(price)
  }, [purchaseForm.watch(), selectedTreatment, selectedDuration])

  const handleTreatmentChange = (treatmentId: string | undefined) => {
    purchaseForm.setValue("treatmentId", treatmentId)
    if (treatmentId) {
      const treatment = treatments.find((t) => t._id === treatmentId)
      setSelectedTreatment(treatment || null)
      purchaseForm.setValue("selectedDurationId", undefined)
      setSelectedDuration(null)
    } else {
      setSelectedTreatment(null)
      setSelectedDuration(null)
      purchaseForm.setValue("selectedDurationId", undefined)
    }
  }

  const handleDurationChange = (durationId: string | undefined) => {
    purchaseForm.setValue("selectedDurationId", durationId)
    if (durationId && selectedTreatment) {
      const duration = selectedTreatment.durations.find((d) => d._id === durationId)
      setSelectedDuration(duration || null)
    } else {
      setSelectedDuration(null)
    }
  }

  const handleInitialSubmit = async (data: PurchaseFormData) => {
    setLoading(true)
    try {
      const purchaseData: PurchaseInitiationData = {
        voucherType: data.voucherType,
        isGift: data.isGift, // This will be used later
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
          // If not a gift, fetch payment methods and proceed to payment step
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
    // Fetch payment methods before moving to payment step
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
      // Simulate payment success
      const paymentResult = await confirmGiftVoucherPurchase({
        voucherId: voucherId!,
        paymentId: `PAY-${Date.now()}`, // Simulated payment ID
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
            // Potentially offer to retry setting gift details or complete without them
            setStep("complete") // Still complete purchase, but gift details failed
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
      // Optionally select the newly added card if identifiable, or stick to default
      const newDefaultPm = pmResult.paymentMethods.find((pm) => pm.isDefault) || pmResult.paymentMethods[0]
      if (newDefaultPm) paymentForm.setValue("selectedPaymentMethodId", newDefaultPm._id)
    }
    setShowPaymentMethodForm(false)
  }

  if (step === "select") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("purchaseGiftVoucher.title")}</CardTitle>
            <CardDescription>{t("purchaseGiftVoucher.description")}</CardDescription>
          </CardHeader>
          <form onSubmit={purchaseForm.handleSubmit(handleInitialSubmit)}>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>{t("purchaseGiftVoucher.selectType")}</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Card
                    className={cn(
                      "cursor-pointer border-2 transition-colors",
                      watchVoucherType === "monetary" ? "border-primary bg-primary/10" : "border-border",
                    )}
                    onClick={() => purchaseForm.setValue("voucherType", "monetary")}
                  >
                    <CardContent className="p-4 text-center">
                      <CreditCard className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <h3 className="font-medium">{t("purchaseGiftVoucher.monetaryVoucher")}</h3>
                      <p className="text-sm text-muted-foreground">{t("purchaseGiftVoucher.monetaryDescription")}</p>
                    </CardContent>
                  </Card>
                  <Card
                    className={cn(
                      "cursor-pointer border-2 transition-colors",
                      watchVoucherType === "treatment" ? "border-primary bg-primary/10" : "border-border",
                    )}
                    onClick={() => purchaseForm.setValue("voucherType", "treatment")}
                  >
                    <CardContent className="p-4 text-center">
                      <Gift className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <h3 className="font-medium">{t("purchaseGiftVoucher.treatmentVoucher")}</h3>
                      <p className="text-sm text-muted-foreground">{t("purchaseGiftVoucher.treatmentDescription")}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {watchVoucherType === "monetary" && (
                <div className="space-y-2">
                  <Label htmlFor="monetaryValue">
                    {t("purchaseGiftVoucher.amount")} ({t("common.currency")})
                  </Label>
                  <Input
                    id="monetaryValue"
                    type="number"
                    min="150"
                    placeholder={t("purchaseGiftVoucher.amount") || "150"}
                    {...purchaseForm.register("monetaryValue", { valueAsNumber: true })}
                  />
                  {purchaseForm.formState.errors.monetaryValue && (
                    <p className="text-sm text-destructive">{purchaseForm.formState.errors.monetaryValue.message}</p>
                  )}
                </div>
              )}

              {watchVoucherType === "treatment" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t("purchaseGiftVoucher.selectTreatment")}</Label>
                    <Select
                      onValueChange={(value) => handleTreatmentChange(value)}
                      value={purchaseForm.getValues("treatmentId")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("purchaseGiftVoucher.chooseTreatment")} />
                      </SelectTrigger>
                      <SelectContent>
                        {treatments.map((treatment) => (
                          <SelectItem key={treatment._id} value={treatment._id}>
                            {treatment.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedTreatment && selectedTreatment.durations.length > 0 && (
                    <div className="space-y-2">
                      <Label>{t("purchaseGiftVoucher.selectDuration")}</Label>
                      <Select
                        onValueChange={(value) => handleDurationChange(value)}
                        value={purchaseForm.getValues("selectedDurationId")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("purchaseGiftVoucher.chooseDuration")} />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedTreatment.durations.map((duration) => (
                            <SelectItem key={duration._id} value={duration._id}>
                              {duration.name} - {duration.price}
                              {t("common.currency")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
              <Separator />
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isGift"
                  {...purchaseForm.register("isGift")}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="isGift">{t("purchaseGiftVoucher.sendAsGift")}</Label>
              </div>
              {calculatedPrice > 0 && (
                <Alert>
                  <AlertDescription className="flex justify-between items-center">
                    <span>{t("purchaseGiftVoucher.total")}:</span>
                    <Badge variant="secondary" className="text-lg">
                      {calculatedPrice}
                      {t("common.currency")}
                    </Badge>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={loading || calculatedPrice <= 0}>
                {loading
                  ? t("common.processing")
                  : watchIsGift
                    ? t("purchaseGiftVoucher.proceedToGiftDetails")
                    : t("purchaseGiftVoucher.proceedToPayment")}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    )
  }

  if (step === "giftDetailsEntry") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("purchaseGiftVoucher.giftRecipientDetailsTitle")}</CardTitle>
            <CardDescription>{t("purchaseGiftVoucher.giftRecipientDetailsDescription")}</CardDescription>
          </CardHeader>
          <form onSubmit={giftForm.handleSubmit(handleGiftDetailsSubmit)}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipientName">{t("purchaseGiftVoucher.recipientName")}</Label>
                <Input
                  id="recipientName"
                  {...giftForm.register("recipientName")}
                  placeholder={t("purchaseGiftVoucher.recipientNamePlaceholder")}
                />
                {giftForm.formState.errors.recipientName && (
                  <p className="text-sm text-destructive">{giftForm.formState.errors.recipientName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipientPhone">{t("purchaseGiftVoucher.recipientPhone")}</Label>
                <Input
                  id="recipientPhone"
                  {...giftForm.register("recipientPhone")}
                  placeholder={t("purchaseGiftVoucher.phonePlaceholder")}
                />
                {giftForm.formState.errors.recipientPhone && (
                  <p className="text-sm text-destructive">{giftForm.formState.errors.recipientPhone.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="greetingMessage">{t("purchaseGiftVoucher.greetingMessage")}</Label>
                <Textarea
                  id="greetingMessage"
                  {...giftForm.register("greetingMessage")}
                  placeholder={t("purchaseGiftVoucher.greetingPlaceholder")}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("purchaseGiftVoucher.sendDate")}</Label>
                <Controller
                  control={giftForm.control}
                  name="sendOption"
                  render={({ field }) => (
                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant={field.value === "immediate" ? "default" : "outline"}
                        onClick={() => field.onChange("immediate")}
                      >
                        {t("purchaseGiftVoucher.sendNow")}
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === "scheduled" ? "default" : "outline"}
                        onClick={() => field.onChange("scheduled")}
                      >
                        {t("purchaseGiftVoucher.sendOnDate")}
                      </Button>
                    </div>
                  )}
                />
              </div>
              {watchSendOption === "scheduled" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Controller
                    control={giftForm.control}
                    name="sendDate"
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
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
                        <SelectTrigger>
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
            <CardFooter className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStep("select")}>
                {t("common.back")}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? t("common.processing") : t("purchaseGiftVoucher.proceedToPayment")}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    )
  }

  if (step === "payment") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("purchaseGiftVoucher.paymentDetailsTitle")}</CardTitle>
            <CardDescription>{t("purchaseGiftVoucher.paymentDetailsDescription")}</CardDescription>
          </CardHeader>
          <form onSubmit={paymentForm.handleSubmit(handlePaymentSubmit)}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("purchaseGiftVoucher.selectPaymentMethod")}</Label>
                {paymentMethods.length === 0 && !showPaymentMethodForm && (
                  <p className="text-sm text-muted-foreground">{t("paymentMethods.noPaymentMethods")}</p>
                )}
                <div className="space-y-2">
                  {paymentMethods.map((pm) => (
                    <Card
                      key={pm._id}
                      className={cn(
                        "cursor-pointer p-4 border-2 transition-colors",
                        paymentForm.watch("selectedPaymentMethodId") === pm._id
                          ? "border-primary bg-primary/10"
                          : "border-border",
                      )}
                      onClick={() => paymentForm.setValue("selectedPaymentMethodId", pm._id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {pm.cardName || `${t("paymentMethods.card")} **** ${pm.cardNumber.slice(-4)}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t("paymentMethods.fields.expiry")}: {pm.expiryMonth}/{pm.expiryYear}
                          </p>
                        </div>
                        {pm.isDefault && <Badge variant="outline">{t("purchaseGiftVoucher.defaultCard")}</Badge>}
                      </div>
                    </Card>
                  ))}
                </div>
                {paymentForm.formState.errors.selectedPaymentMethodId && (
                  <p className="text-sm text-destructive">
                    {paymentForm.formState.errors.selectedPaymentMethodId.message}
                  </p>
                )}
              </div>
              <Button type="button" variant="outline" onClick={() => setShowPaymentMethodForm(true)} className="w-full">
                <PlusCircle className="mr-2 h-4 w-4" /> {t("purchaseGiftVoucher.addNewCard")}
              </Button>
              {showPaymentMethodForm && (
                <PaymentMethodForm
                  open={showPaymentMethodForm}
                  onOpenChange={setShowPaymentMethodForm}
                  onSuccessCallback={handlePaymentMethodAdded} // Pass a callback to refresh payment methods
                />
              )}
              <Alert>
                <AlertDescription className="flex justify-between items-center">
                  <span>{t("purchaseGiftVoucher.total")}:</span>
                  <Badge variant="secondary" className="text-lg">
                    {calculatedPrice}
                    {t("common.currency")}
                  </Badge>
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(watchIsGift ? "giftDetailsEntry" : "select")}
              >
                {t("common.back")}
              </Button>
              <Button type="submit" disabled={loading || !paymentForm.watch("selectedPaymentMethodId")}>
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
      <div className="max-w-2xl mx-auto space-y-6 text-center">
        <Card className="p-8">
          <Check className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {watchIsGift ? t("purchaseGiftVoucher.giftSuccess") : t("purchaseGiftVoucher.purchaseSuccess")}
          </h1>
          <p className="text-muted-foreground">
            {watchIsGift
              ? t("purchaseGiftVoucher.giftSuccessDescription")
              : t("purchaseGiftVoucher.purchaseSuccessDescription")}
          </p>
          <div className="mt-6 flex gap-4 justify-center">
            <Button onClick={() => router.push("/dashboard/member/gift-vouchers")}>
              {t("purchaseGiftVoucher.viewMyVouchers")}
            </Button>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              {t("purchaseGiftVoucher.backToDashboard")}
            </Button>
          </div>
        </Card>
      </div>
    )
  }
  return null
}
