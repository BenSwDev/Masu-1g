"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
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
import { Gift, CreditCard, CalendarIcon, Check, ArrowLeft, ArrowRight } from "lucide-react"
import { format } from "date-fns"
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
  sendDate: z.string().optional(),
})

type PurchaseFormData = z.infer<typeof purchaseSchema>
type GiftDetailsFormData = z.infer<typeof giftDetailsSchema>

export default function PurchaseGiftVoucherClient({ treatments }: PurchaseGiftVoucherClientProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()

  const [step, setStep] = useState<"select" | "payment" | "gift" | "complete">("select")
  const [loading, setLoading] = useState(false)
  const [voucherId, setVoucherId] = useState<string>("")
  const [calculatedPrice, setCalculatedPrice] = useState(0)
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<Treatment["durations"][0] | null>(null)

  const purchaseForm = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      voucherType: "monetary",
      isGift: false,
    },
  })

  const giftForm = useForm<GiftDetailsFormData>({
    resolver: zodResolver(giftDetailsSchema),
  })

  const watchVoucherType = purchaseForm.watch("voucherType")
  const watchTreatmentId = purchaseForm.watch("treatmentId")
  const watchSelectedDurationId = purchaseForm.watch("selectedDurationId")
  const watchMonetaryValue = purchaseForm.watch("monetaryValue")
  const watchIsGift = purchaseForm.watch("isGift")

  // Calculate price when form values change
  useState(() => {
    let price = 0
    if (watchVoucherType === "monetary" && watchMonetaryValue) {
      price = watchMonetaryValue
    } else if (watchVoucherType === "treatment" && watchTreatmentId) {
      const treatment = treatments.find((t) => t._id === watchTreatmentId)
      if (treatment) {
        setSelectedTreatment(treatment)
        if (watchSelectedDurationId && treatment.durations.length > 0) {
          const duration = treatment.durations.find((d) => d._id === watchSelectedDurationId)
          if (duration) {
            setSelectedDuration(duration)
            price = duration.price
          }
        } else if (treatment.price) {
          price = treatment.price
        }
      }
    }
    setCalculatedPrice(price)
  })

  const handleProceedToPayment = async (data: PurchaseFormData) => {
    if (data.isGift) {
      setStep("gift")
    } else {
      await handlePurchase(data)
    }
  }

  const handlePurchase = async (data: PurchaseFormData) => {
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

      if (result.success) {
        setVoucherId(result.voucherId!)
        // Simulate payment success for demo
        const paymentResult = await confirmGiftVoucherPurchase({
          voucherId: result.voucherId!,
          paymentId: `PAY-${Date.now()}`,
          success: true,
          amount: result.amount!,
        })

        if (paymentResult.success) {
          setStep("complete")
        } else {
          toast({
            title: "Payment Failed",
            description: paymentResult.error,
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "Purchase Failed",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGiftDetails = async (data: GiftDetailsFormData) => {
    setLoading(true)
    try {
      // First complete the purchase
      const purchaseData = purchaseForm.getValues()
      const purchaseInitData: PurchaseInitiationData = {
        voucherType: purchaseData.voucherType,
        isGift: true,
      }

      if (purchaseData.voucherType === "treatment") {
        purchaseInitData.treatmentId = purchaseData.treatmentId
        purchaseInitData.selectedDurationId = purchaseData.selectedDurationId
      } else {
        purchaseInitData.monetaryValue = purchaseData.monetaryValue
      }

      const result = await initiatePurchaseGiftVoucher(purchaseInitData)

      if (result.success) {
        const newVoucherId = result.voucherId!
        setVoucherId(newVoucherId)

        // Simulate payment success
        const paymentResult = await confirmGiftVoucherPurchase({
          voucherId: newVoucherId,
          paymentId: `PAY-${Date.now()}`,
          success: true,
          amount: result.amount!,
        })

        if (paymentResult.success) {
          // Set gift details
          const giftDetails: GiftDetailsPayload = {
            recipientName: data.recipientName,
            recipientPhone: data.recipientPhone,
            greetingMessage: data.greetingMessage,
            sendDate: data.sendDate || "immediate",
          }

          const giftResult = await setGiftDetails(newVoucherId, giftDetails)

          if (giftResult.success) {
            setStep("complete")
            toast({
              title: t("purchaseGiftVoucher.giftSuccess"),
              description: t("purchaseGiftVoucher.giftSuccessDescription"),
            })
          } else {
            toast({
              title: t("common.error"),
              description: giftResult.error,
              variant: "destructive",
            })
          }
        } else {
          toast({
            title: "Payment Failed",
            description: paymentResult.error,
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "Purchase Failed",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: t("common.error"),
        description: "Failed to process gift voucher",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (step === "select") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("purchaseGiftVoucher.title")}</h1>
            <p className="text-gray-600">{t("purchaseGiftVoucher.description")}</p>
          </div>

          <form onSubmit={purchaseForm.handleSubmit(handleProceedToPayment)} className="space-y-8">
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-6 w-6" />
                  {t("purchaseGiftVoucher.selectType")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card
                    className={cn(
                      "cursor-pointer border-2 transition-all duration-200 hover:shadow-md",
                      watchVoucherType === "monetary"
                        ? "border-blue-500 bg-blue-50 shadow-md"
                        : "border-gray-200 hover:border-gray-300",
                    )}
                    onClick={() => purchaseForm.setValue("voucherType", "monetary")}
                  >
                    <CardContent className="p-6 text-center">
                      <CreditCard className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                      <h3 className="font-semibold text-lg mb-2">{t("purchaseGiftVoucher.monetaryVoucher")}</h3>
                      <p className="text-sm text-gray-600">{t("purchaseGiftVoucher.monetaryDescription")}</p>
                    </CardContent>
                  </Card>

                  <Card
                    className={cn(
                      "cursor-pointer border-2 transition-all duration-200 hover:shadow-md",
                      watchVoucherType === "treatment"
                        ? "border-blue-500 bg-blue-50 shadow-md"
                        : "border-gray-200 hover:border-gray-300",
                    )}
                    onClick={() => purchaseForm.setValue("voucherType", "treatment")}
                  >
                    <CardContent className="p-6 text-center">
                      <Gift className="h-12 w-12 mx-auto mb-4 text-purple-600" />
                      <h3 className="font-semibold text-lg mb-2">{t("purchaseGiftVoucher.treatmentVoucher")}</h3>
                      <p className="text-sm text-gray-600">{t("purchaseGiftVoucher.treatmentDescription")}</p>
                    </CardContent>
                  </Card>
                </div>

                {watchVoucherType === "monetary" && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <Label htmlFor="monetaryValue" className="text-lg font-medium">
                      {t("purchaseGiftVoucher.amount")} ({t("common.currency")})
                    </Label>
                    <Input
                      id="monetaryValue"
                      type="number"
                      min="150"
                      placeholder="150"
                      className="text-lg p-3"
                      {...purchaseForm.register("monetaryValue", { valueAsNumber: true })}
                    />
                    {purchaseForm.formState.errors.monetaryValue && (
                      <p className="text-sm text-red-600">{purchaseForm.formState.errors.monetaryValue.message}</p>
                    )}
                  </div>
                )}

                {watchVoucherType === "treatment" && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <div className="space-y-2">
                      <Label className="text-lg font-medium">{t("purchaseGiftVoucher.selectTreatment")}</Label>
                      <Select onValueChange={(value) => purchaseForm.setValue("treatmentId", value)}>
                        <SelectTrigger className="text-lg p-3">
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
                        <Label className="text-lg font-medium">{t("treatments.selectDuration")}</Label>
                        <Select onValueChange={(value) => purchaseForm.setValue("selectedDurationId", value)}>
                          <SelectTrigger className="text-lg p-3">
                            <SelectValue placeholder={t("purchaseGiftVoucher.chooseDuration")} />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedTreatment.durations.map((duration) => (
                              <SelectItem key={duration._id} value={duration._id}>
                                {duration.name} - {duration.price} {t("common.currency")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}

                <Separator />

                <div className="flex items-center space-x-3 p-4 bg-yellow-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="isGift"
                    {...purchaseForm.register("isGift")}
                    className="w-5 h-5 rounded border-gray-300"
                  />
                  <Label htmlFor="isGift" className="text-lg font-medium cursor-pointer">
                    {t("purchaseGiftVoucher.sendAsGift")}
                  </Label>
                </div>

                {calculatedPrice > 0 && (
                  <Alert className="border-green-200 bg-green-50">
                    <AlertDescription>
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-medium">{t("purchaseGiftVoucher.total")}:</span>
                        <Badge variant="secondary" className="text-xl px-4 py-2">
                          {calculatedPrice} {t("common.currency")}
                        </Badge>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => router.back()} className="px-6 py-3">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={loading || calculatedPrice <= 0}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
              >
                {loading ? (
                  t("common.processing")
                ) : (
                  <>
                    {t("purchaseGiftVoucher.proceedToPayment")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  if (step === "gift") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("purchaseGiftVoucher.giftDetails")}</h1>
            <p className="text-gray-600">{t("purchaseGiftVoucher.giftDetailsDescription")}</p>
          </div>

          <form onSubmit={giftForm.handleSubmit(handleGiftDetails)} className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-6 w-6" />
                  {t("purchaseGiftVoucher.giftDetails")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="recipientName" className="text-lg font-medium">
                    {t("purchaseGiftVoucher.recipientName")}
                  </Label>
                  <Input
                    id="recipientName"
                    {...giftForm.register("recipientName")}
                    placeholder={t("purchaseGiftVoucher.recipientNamePlaceholder")}
                    className="text-lg p-3"
                  />
                  {giftForm.formState.errors.recipientName && (
                    <p className="text-sm text-red-600">{giftForm.formState.errors.recipientName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipientPhone" className="text-lg font-medium">
                    {t("purchaseGiftVoucher.recipientPhone")}
                  </Label>
                  <Input
                    id="recipientPhone"
                    {...giftForm.register("recipientPhone")}
                    placeholder={t("purchaseGiftVoucher.phonePlaceholder")}
                    className="text-lg p-3"
                  />
                  {giftForm.formState.errors.recipientPhone && (
                    <p className="text-sm text-red-600">{giftForm.formState.errors.recipientPhone.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="greetingMessage" className="text-lg font-medium">
                    {t("purchaseGiftVoucher.greetingMessage")}
                  </Label>
                  <Textarea
                    id="greetingMessage"
                    {...giftForm.register("greetingMessage")}
                    placeholder={t("purchaseGiftVoucher.greetingPlaceholder")}
                    rows={4}
                    className="text-lg p-3"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-lg font-medium">{t("giftVouchers.fields.sendDate")}</Label>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant={!giftForm.watch("sendDate") ? "default" : "outline"}
                      onClick={() => giftForm.setValue("sendDate", "")}
                      className="flex-1"
                    >
                      {t("purchaseGiftVoucher.sendNow")}
                    </Button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {giftForm.watch("sendDate")
                            ? format(new Date(giftForm.watch("sendDate")!), "PPP")
                            : t("purchaseGiftVoucher.pickDate")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={giftForm.watch("sendDate") ? new Date(giftForm.watch("sendDate")!) : undefined}
                          onSelect={(date) => giftForm.setValue("sendDate", date?.toISOString())}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStep("complete")} className="px-6 py-3">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("purchaseGiftVoucher.skipGiftDetails")}
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
              >
                {loading ? (
                  t("common.processing")
                ) : (
                  <>
                    {t("purchaseGiftVoucher.setGiftDetails")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  if (step === "complete") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-8">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="bg-white p-8 rounded-2xl shadow-xl">
            <div className="bg-green-100 p-6 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <Check className="h-12 w-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-green-900 mb-4">
              {watchIsGift ? t("purchaseGiftVoucher.giftSuccess") : t("purchaseGiftVoucher.purchaseSuccess")}
            </h1>
            <p className="text-green-700 text-lg mb-8">
              {watchIsGift
                ? t("purchaseGiftVoucher.giftSuccessDescription")
                : t("purchaseGiftVoucher.purchaseSuccessDescription")}
            </p>

            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => router.push("/dashboard/member/gift-vouchers")}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              >
                {t("purchaseGiftVoucher.viewMyVouchers")}
              </Button>
              <Button variant="outline" onClick={() => router.push("/dashboard/member")} className="px-6 py-3">
                {t("purchaseGiftVoucher.backToDashboard")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
