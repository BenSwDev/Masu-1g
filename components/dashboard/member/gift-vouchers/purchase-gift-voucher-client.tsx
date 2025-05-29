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
import { Gift, CreditCard, CalendarIcon, Check } from "lucide-react"
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
          if (data.isGift) {
            setStep("gift")
          } else {
            setStep("complete")
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
      const giftDetails: GiftDetailsPayload = {
        recipientName: data.recipientName,
        recipientPhone: data.recipientPhone,
        greetingMessage: data.greetingMessage,
        sendDate: data.sendDate || "immediate",
      }

      const result = await setGiftDetails(voucherId, giftDetails)

      if (result.success) {
        setStep("complete")
        toast({
          title: "Gift Details Set",
          description: "Your gift voucher has been configured successfully",
        })
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to set gift details",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (step === "select") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("purchaseGiftVoucher.title")}</h1>
          <p className="text-gray-600 mt-2">{t("purchaseGiftVoucher.description")}</p>
        </div>

        <form onSubmit={purchaseForm.handleSubmit(handlePurchase)} className="space-y-6">
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
                    placeholder="150"
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
                    <Select onValueChange={(value) => purchaseForm.setValue("treatmentId", value)}>
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
                      <Select onValueChange={(value) => purchaseForm.setValue("selectedDurationId", value)}>
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
              {loading ? t("common.processing") : t("purchaseGiftVoucher.proceedToPayment")}
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

        <form onSubmit={giftForm.handleSubmit(handleGiftDetails)} className="space-y-6">
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
                <Input id="recipientPhone" {...giftForm.register("recipientPhone")} placeholder={t("purchaseGiftVoucher.phonePlaceholder")} />
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
                <Label>{t("purchaseGiftVoucher.sendDate")}</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={!giftForm.watch("sendDate") ? "default" : "outline"}
                    onClick={() => giftForm.setValue("sendDate", "")}
                  >
                    {t("purchaseGiftVoucher.sendNow")}
                  </Button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-start text-left font-normal">
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
            <Button type="button" variant="outline" onClick={() => setStep("complete")}>
              {t("purchaseGiftVoucher.skipGiftDetails")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("common.processing") : t("purchaseGiftVoucher.setGiftDetails")}
            </Button>
          </div>
        </form>
      </div>
    )
  }

  if (step === "complete") {
    return (
      <div className="max-w-2xl mx-auto space-y-6 text-center">
        <div className="bg-green-50 p-8 rounded-lg">
          <Check className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-green-900 mb-2">
            {watchIsGift ? t("purchaseGiftVoucher.giftSuccess") : t("purchaseGiftVoucher.purchaseSuccess")}
          </h1>
          <p className="text-green-700">
            {watchIsGift
              ? t("purchaseGiftVoucher.giftSuccessDescription")
              : t("purchaseGiftVoucher.purchaseSuccessDescription")}
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <Button onClick={() => router.push("/dashboard/member/gift-vouchers")}>
            {t("purchaseGiftVoucher.viewMyVouchers")}
          </Button>
          <Button variant="outline" onClick={() => router.push("/dashboard/member")}>
            {t("purchaseGiftVoucher.backToDashboard")}
          </Button>
        </div>
      </div>
    )
  }

  return null
}
