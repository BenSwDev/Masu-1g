"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/common/ui/card"
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
  type PurchaseInitiationData,
} from "@/actions/gift-voucher-actions"
import { getPaymentMethods, type IPaymentMethod } from "@/actions/payment-method-actions"
import { PaymentMethodForm } from "@/components/dashboard/member/payment-methods/payment-method-form"
import { Gift, CreditCard, CalendarIcon, Check, PlusCircle, WalletCards } from "lucide-react"
import { format, setHours, setMinutes, setSeconds, setMilliseconds, addHours, startOfHour } from "date-fns"
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
  sendTimeOption: z.enum(["immediate", "select_date"]).default("immediate"),
  sendDate: z.date().optional(),
  sendHour: z.string().optional(), // Store as string e.g., "08", "14"
})

type PurchaseFormData = z.infer<typeof purchaseSchema>
type GiftDetailsFormData = z.infer<typeof giftDetailsSchema>

export default function PurchaseGiftVoucherClient({ treatments }: PurchaseGiftVoucherClientProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()

  const [step, setStep] = useState<"select" | "gift" | "payment" | "complete">("select")
  const [loading, setLoading] = useState(false)
  const [calculatedPrice, setCalculatedPrice] = useState(0)
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<Treatment["durations"][0] | null>(null)

  const [paymentMethods, setPaymentMethods] = useState<IPaymentMethod[]>([])
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | undefined>()
  const [showPaymentMethodForm, setShowPaymentMethodForm] = useState(false)
  const [voucherDataForPayment, setVoucherDataForPayment] = useState<PurchaseInitiationData | null>(null)

  const purchaseForm = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      voucherType: "monetary",
      isGift: false,
    },
  })

  const giftForm = useForm<GiftDetailsFormData>({
    resolver: zodResolver(giftDetailsSchema),
    defaultValues: {
      sendTimeOption: "immediate",
      sendDate: startOfHour(addHours(new Date(), 1)), // Default to next hour
      sendHour: format(startOfHour(addHours(new Date(), 1)), "HH"),
    },
  })

  const watchVoucherType = purchaseForm.watch("voucherType")
  const watchIsGift = purchaseForm.watch("isGift")
  const watchSendTimeOption = giftForm.watch("sendTimeOption")

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

  useEffect(() => {
    let price = 0
    const currentPurchaseFormValues = purchaseForm.getValues()

    if (currentPurchaseFormValues.voucherType === "monetary") {
      if (
        typeof currentPurchaseFormValues.monetaryValue === "number" &&
        currentPurchaseFormValues.monetaryValue >= 150
      ) {
        price = currentPurchaseFormValues.monetaryValue
      }
    } else if (currentPurchaseFormValues.voucherType === "treatment") {
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
  }, [purchaseForm, selectedTreatment, selectedDuration, purchaseForm.watch()])

  const fetchPaymentMethods = async () => {
    setLoading(true)
    const result = await getPaymentMethods()
    if (result.success && result.paymentMethods) {
      setPaymentMethods(result.paymentMethods)
      const defaultMethod = result.paymentMethods.find((pm) => pm.isDefault)
      setSelectedPaymentMethodId(defaultMethod?._id)
    } else {
      toast({ title: t("common.error"), description: result.error, variant: "destructive" })
    }
    setLoading(false)
  }

  const handleProceedToNextStep = async (data: PurchaseFormData) => {
    const purchaseDetails: PurchaseInitiationData = {
      voucherType: data.voucherType,
      isGift: data.isGift,
      treatmentId: data.treatmentId,
      selectedDurationId: data.selectedDurationId,
      monetaryValue: data.monetaryValue,
    }
    setVoucherDataForPayment(purchaseDetails)

    if (data.isGift) {
      setStep("gift")
    } else {
      await fetchPaymentMethods()
      setStep("payment")
    }
  }

  const handleGiftDetailsSubmit = async (data: GiftDetailsFormData) => {
    if (!voucherDataForPayment) return // Should not happen

    let finalSendDate: Date | "immediate" = "immediate"
    if (data.sendTimeOption === "select_date" && data.sendDate && data.sendHour) {
      const hour = Number.parseInt(data.sendHour, 10)
      finalSendDate = setMilliseconds(setSeconds(setMinutes(setHours(data.sendDate, hour), 0), 0), 0)
    }

    const updatedVoucherData: PurchaseInitiationData = {
      ...voucherDataForPayment,
      recipientName: data.recipientName,
      recipientPhone: data.recipientPhone,
      greetingMessage: data.greetingMessage,
      sendDate: finalSendDate,
    }
    setVoucherDataForPayment(updatedVoucherData)
    await fetchPaymentMethods()
    setStep("payment")
  }

  const handlePayment = async () => {
    if (!voucherDataForPayment || !selectedPaymentMethodId) {
      toast({
        title: t("common.error"),
        description: t("purchaseGiftVoucher.selectPaymentMethod"),
        variant: "destructive",
      })
      return
    }
    setLoading(true)
    try {
      const result = await initiatePurchaseGiftVoucher(voucherDataForPayment)

      if (result.success && result.voucherId && typeof result.amount === "number") {
        // Simulate payment success
        const paymentResult = await confirmGiftVoucherPurchase({
          voucherId: result.voucherId,
          paymentId: `SIM-${Date.now()}`, // Simulated payment ID
          success: true,
          amount: result.amount, // Use amount from initiation
          paymentMethodId: selectedPaymentMethodId, // Pass selected payment method
        })

        if (paymentResult.success) {
          setStep("complete")
        } else {
          toast({ title: t("common.paymentFailed"), description: paymentResult.error, variant: "destructive" })
        }
      } else {
        toast({ title: t("common.error"), description: result.error, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: t("common.error"), description: t("common.unexpectedError"), variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const hourOptions = useMemo(() => {
    return Array.from({ length: 17 }, (_, i) => (8 + i).toString().padStart(2, "0")) // 08:00 to 00:00 (next day)
  }, [])

  if (step === "select") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("purchaseGiftVoucher.title")}</h1>
          <p className="text-gray-600 mt-2">{t("purchaseGiftVoucher.description")}</p>
        </div>

        <form onSubmit={purchaseForm.handleSubmit(handleProceedToNextStep)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                {t("purchaseGiftVoucher.selectType")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card
                  className={cn(
                    "cursor-pointer border-2 transition-colors",
                    watchVoucherType === "monetary" ? "border-blue-500 bg-blue-50" : "border-gray-200",
                  )}
                  onClick={() => purchaseForm.setValue("voucherType", "monetary")}
                >
                  <CardContent className="p-4 text-center">
                    <CreditCard className="h-8 w-8 mx-auto mb-2" />
                    <h3 className="font-medium">{t("purchaseGiftVoucher.monetaryVoucher")}</h3>
                    <p className="text-sm text-gray-600">{t("purchaseGiftVoucher.monetaryDescription")}</p>
                  </CardContent>
                </Card>
                <Card
                  className={cn(
                    "cursor-pointer border-2 transition-colors",
                    watchVoucherType === "treatment" ? "border-blue-500 bg-blue-50" : "border-gray-200",
                  )}
                  onClick={() => purchaseForm.setValue("voucherType", "treatment")}
                >
                  <CardContent className="p-4 text-center">
                    <Gift className="h-8 w-8 mx-auto mb-2" />
                    <h3 className="font-medium">{t("purchaseGiftVoucher.treatmentVoucher")}</h3>
                    <p className="text-sm text-gray-600">{t("purchaseGiftVoucher.treatmentDescription")}</p>
                  </CardContent>
                </Card>
              </div>

              {watchVoucherType === "monetary" && (
                <div className="space-y-2">
                  <Label htmlFor="monetaryValue">{t("purchaseGiftVoucher.amount")} (₪)</Label>
                  <Input
                    id="monetaryValue"
                    type="number"
                    min="150"
                    placeholder={t("purchaseGiftVoucher.amount") || "150"}
                    {...purchaseForm.register("monetaryValue", { valueAsNumber: true })}
                  />
                  {purchaseForm.formState.errors.monetaryValue && (
                    <p className="text-sm text-red-600">{purchaseForm.formState.errors.monetaryValue.message}</p>
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
                              {duration.name} - ₪{duration.price}
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
                  <AlertDescription>
                    <div className="flex justify-between items-center">
                      <span>{t("purchaseGiftVoucher.total")}:</span>
                      <Badge variant="secondary" className="text-lg">
                        ₪{calculatedPrice}
                      </Badge>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={loading || calculatedPrice <= 0}>
              {loading
                ? t("common.processing")
                : watchIsGift
                  ? t("purchaseGiftVoucher.addRecipientDetails")
                  : t("purchaseGiftVoucher.proceedToPaymentDetails")}
            </Button>
          </div>
        </form>
      </div>
    )
  }

  if (step === "gift") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("purchaseGiftVoucher.giftDetails")}</h1>
          <p className="text-gray-600 mt-2">{t("purchaseGiftVoucher.giftDetailsDescription")}</p>
        </div>
        <form onSubmit={giftForm.handleSubmit(handleGiftDetailsSubmit)} className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipientName">{t("purchaseGiftVoucher.recipientName")}</Label>
                <Input
                  id="recipientName"
                  {...giftForm.register("recipientName")}
                  placeholder={t("purchaseGiftVoucher.recipientNamePlaceholder")}
                />
                {giftForm.formState.errors.recipientName && (
                  <p className="text-sm text-red-600">{giftForm.formState.errors.recipientName.message}</p>
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
                  <p className="text-sm text-red-600">{giftForm.formState.errors.recipientPhone.message}</p>
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
                <Label>{t("purchaseGiftVoucher.sendTime")}</Label>
                <Controller
                  name="sendTimeOption"
                  control={giftForm.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">{t("purchaseGiftVoucher.sendTimeImmediate")}</SelectItem>
                        <SelectItem value="select_date">{t("purchaseGiftVoucher.sendTimeSelect")}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              {watchSendTimeOption === "select_date" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <div className="space-y-2">
                    <Label>{t("purchaseGiftVoucher.pickDate")}</Label>
                    <Controller
                      name="sendDate"
                      control={giftForm.control}
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>{t("purchaseGiftVoucher.pickDate")}</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("purchaseGiftVoucher.selectHour")}</Label>
                    <Controller
                      name="sendHour"
                      control={giftForm.control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder={t("purchaseGiftVoucher.selectHour")} />
                          </SelectTrigger>
                          <SelectContent>
                            {hourOptions.map((hour) => (
                              <SelectItem key={hour} value={hour}>
                                {hour}:00
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => setStep("select")}>
              {t("common.back")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("common.processing") : t("purchaseGiftVoucher.proceedToPaymentDetails")}
            </Button>
          </div>
        </form>
      </div>
    )
  }

  if (step === "payment") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("purchaseGiftVoucher.paymentDetailsTitle")}</h1>
          <p className="text-gray-600 mt-2">{t("purchaseGiftVoucher.paymentDetailsDescription")}</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <WalletCards className="h-5 w-5" />
              {t("purchaseGiftVoucher.selectPaymentMethod")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && <p>{t("common.loading")}...</p>}
            {!loading && paymentMethods.length === 0 && <p>{t("paymentMethods.noPaymentMethods")}</p>}
            <div className="space-y-2">
              {paymentMethods.map((pm) => (
                <Card
                  key={pm._id}
                  className={cn(
                    "cursor-pointer p-4 border-2 transition-colors",
                    selectedPaymentMethodId === pm._id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300",
                  )}
                  onClick={() => setSelectedPaymentMethodId(pm._id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{pm.cardName || `**** **** **** ${pm.cardNumber.slice(-4)}`}</p>
                      <p className="text-sm text-gray-500">
                        {t("paymentMethods.expires")} {pm.expiryMonth}/{pm.expiryYear}
                      </p>
                    </div>
                    {pm.isDefault && <Badge variant="outline">{t("paymentMethods.defaultCard")}</Badge>}
                  </div>
                </Card>
              ))}
            </div>
            <Button variant="outline" onClick={() => setShowPaymentMethodForm(true)} className="w-full">
              <PlusCircle className="mr-2 h-4 w-4" />
              {t("purchaseGiftVoucher.addNewCard")}
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-4">
            {calculatedPrice > 0 && (
              <Alert>
                <AlertDescription>
                  <div className="flex justify-between items-center">
                    <span>{t("purchaseGiftVoucher.total")}:</span>
                    <Badge variant="secondary" className="text-lg">
                      ₪{calculatedPrice}
                    </Badge>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => (watchIsGift ? setStep("gift") : setStep("select"))}
              >
                {t("common.back")}
              </Button>
              <Button onClick={handlePayment} disabled={loading || !selectedPaymentMethodId || calculatedPrice <= 0}>
                {loading ? t("common.processing") : `${t("purchaseGiftVoucher.payNow")} (₪${calculatedPrice})`}
              </Button>
            </div>
          </CardFooter>
        </Card>
        <PaymentMethodForm
          open={showPaymentMethodForm}
          onOpenChange={setShowPaymentMethodForm}
          onSuccess={async (newMethod) => {
            await fetchPaymentMethods() // Refetch to include the new method
            setSelectedPaymentMethodId(newMethod._id) // Select the new method
            setShowPaymentMethodForm(false)
          }}
        />
      </div>
    )
  }

  if (step === "complete") {
    return (
      <div className="max-w-2xl mx-auto space-y-6 text-center">
        <div className="bg-green-50 p-8 rounded-lg">
          <Check className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-green-900 mb-2">
            {voucherDataForPayment?.isGift
              ? t("purchaseGiftVoucher.giftSuccess")
              : t("purchaseGiftVoucher.purchaseSuccess")}
          </h1>
          <p className="text-green-700">
            {voucherDataForPayment?.isGift
              ? t("purchaseGiftVoucher.giftSuccessDescription")
              : t("purchaseGiftVoucher.purchaseSuccessDescription")}
          </p>
        </div>
        <div className="flex gap-4 justify-center">
          <Button onClick={() => router.push("/dashboard/member/gift-vouchers")}>
            {t("purchaseGiftVoucher.viewMyVouchers")}
          </Button>
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            {t("purchaseGiftVoucher.backToDashboard")}
          </Button>
        </div>
      </div>
    )
  }
  return null
}
