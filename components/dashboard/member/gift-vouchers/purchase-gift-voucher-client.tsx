"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Textarea } from "@/components/common/ui/textarea"
import { Checkbox } from "@/components/common/ui/checkbox"
import { Badge } from "@/components/common/ui/badge"
import { Separator } from "@/components/common/ui/separator"
import { Alert, AlertDescription } from "@/components/common/ui/alert"
import { Calendar } from "@/components/common/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/common/ui/popover"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import {
  Gift,
  CreditCard,
  Sparkles,
  CalendarIcon,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/common/ui/use-toast"
import {
  initiatePurchaseGiftVoucher,
  confirmGiftVoucherPurchase,
  setGiftDetails,
  type PurchaseInitiationData,
  type GiftDetailsPayload,
} from "@/actions/gift-voucher-actions"
import { getAllTreatments } from "@/actions/treatment-actions"

interface Treatment {
  _id: string
  name: string
  description?: string
  durations: Array<{
    _id: string
    minutes: number
    price: number
  }>
  basePrice?: number
}

type Step = "type" | "details" | "payment" | "gift" | "success"

export default function PurchaseGiftVoucherClient() {
  const router = useRouter()
  const { toast } = useToast()

  // State
  const [currentStep, setCurrentStep] = useState<Step>("type")
  const [loading, setLoading] = useState(false)
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [voucherId, setVoucherId] = useState<string>("")

  // Form data
  const [voucherType, setVoucherType] = useState<"treatment" | "monetary" | "">("")
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<string>("")
  const [monetaryValue, setMonetaryValue] = useState<number>(150)
  const [validityDays, setValidityDays] = useState<number>(365)
  const [isGift, setIsGift] = useState(false)

  // Gift details
  const [recipientName, setRecipientName] = useState("")
  const [recipientPhone, setRecipientPhone] = useState("")
  const [greetingMessage, setGreetingMessage] = useState("")
  const [sendDate, setSendDate] = useState<Date>()
  const [sendImmediately, setSendImmediately] = useState(true)

  // Load treatments
  useEffect(() => {
    const loadTreatments = async () => {
      try {
        const result = await getAllTreatments()
        if (result.success && result.treatments) {
          setTreatments(result.treatments)
        }
      } catch (error) {
        console.error("Error loading treatments:", error)
      }
    }
    loadTreatments()
  }, [])

  // Calculate price
  const calculatePrice = () => {
    if (voucherType === "monetary") {
      return monetaryValue
    }
    if (voucherType === "treatment" && selectedTreatment) {
      if (selectedDuration && selectedTreatment.durations?.length > 0) {
        const duration = selectedTreatment.durations.find((d) => d._id === selectedDuration)
        return duration?.price || 0
      }
      return selectedTreatment.basePrice || 0
    }
    return 0
  }

  // Validation
  const canProceedFromType = () => {
    if (voucherType === "treatment") {
      return selectedTreatment && (selectedTreatment.durations?.length === 0 || selectedDuration)
    }
    return voucherType === "monetary" && monetaryValue >= 150
  }

  const canProceedFromGift = () => {
    if (!isGift) return true
    return recipientName.trim() && recipientPhone.trim() && (sendImmediately || sendDate)
  }

  // Handle purchase
  const handlePurchase = async () => {
    setLoading(true)
    try {
      const purchaseData: PurchaseInitiationData = {
        voucherType: voucherType as "treatment" | "monetary",
        validityDays,
      }

      if (voucherType === "treatment") {
        purchaseData.treatmentId = selectedTreatment?._id
        if (selectedDuration) {
          purchaseData.selectedDurationId = selectedDuration
        }
      } else {
        purchaseData.monetaryValue = monetaryValue
      }

      const result = await initiatePurchaseGiftVoucher(purchaseData)

      if (result.success && result.voucherId) {
        setVoucherId(result.voucherId)

        // Simulate payment success (in real app, this would be handled by payment provider)
        const confirmResult = await confirmGiftVoucherPurchase(result.voucherId, `payment_${Date.now()}`)

        if (confirmResult.success) {
          if (isGift) {
            setCurrentStep("gift")
          } else {
            setCurrentStep("success")
          }
        } else {
          throw new Error(confirmResult.error || "Payment confirmation failed")
        }
      } else {
        throw new Error(result.error || "Purchase initiation failed")
      }
    } catch (error) {
      console.error("Purchase error:", error)
      toast({
        title: "שגיאה ברכישה",
        description: error instanceof Error ? error.message : "אירעה שגיאה בתהליך הרכישה",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle gift setup
  const handleGiftSetup = async () => {
    if (!voucherId) return

    setLoading(true)
    try {
      const giftDetails: GiftDetailsPayload = {
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        greetingMessage: greetingMessage.trim() || undefined,
        sendDate: sendImmediately ? undefined : sendDate,
      }

      const result = await setGiftDetails(voucherId, giftDetails)

      if (result.success) {
        setCurrentStep("success")
        toast({
          title: "השובר נשלח בהצלחה!",
          description: sendImmediately ? "השובר נשלח למקבל" : "השובר יישלח בתאריך שנבחר",
        })
      } else {
        throw new Error(result.error || "Failed to set gift details")
      }
    } catch (error) {
      console.error("Gift setup error:", error)
      toast({
        title: "שגיאה בשליחת המתנה",
        description: error instanceof Error ? error.message : "אירעה שגיאה בשליחת המתנה",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case "type":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">בחר סוג שובר</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    voucherType === "treatment" && "ring-2 ring-primary",
                  )}
                  onClick={() => setVoucherType("treatment")}
                >
                  <CardContent className="p-6 text-center">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary" />
                    <h3 className="font-semibold mb-2">שובר טיפול</h3>
                    <p className="text-sm text-muted-foreground">שובר לטיפול ספציפי שניתן למימוש</p>
                  </CardContent>
                </Card>

                <Card
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    voucherType === "monetary" && "ring-2 ring-primary",
                  )}
                  onClick={() => setVoucherType("monetary")}
                >
                  <CardContent className="p-6 text-center">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 text-primary" />
                    <h3 className="font-semibold mb-2">שובר כספי</h3>
                    <p className="text-sm text-muted-foreground">סכום כסף שניתן לממש בכל טיפול</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {voucherType === "treatment" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="treatment">בחר טיפול</Label>
                  <Select
                    onValueChange={(value) => {
                      const treatment = treatments.find((t) => t._id === value)
                      setSelectedTreatment(treatment || null)
                      setSelectedDuration("")
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר טיפול" />
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

                {selectedTreatment && selectedTreatment.durations?.length > 0 && (
                  <div>
                    <Label htmlFor="duration">בחר משך זמן</Label>
                    <Select onValueChange={setSelectedDuration}>
                      <SelectTrigger>
                        <SelectValue placeholder="בחר משך זמן" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedTreatment.durations.map((duration) => (
                          <SelectItem key={duration._id} value={duration._id}>
                            {duration.minutes} דקות - ₪{duration.price}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {voucherType === "monetary" && (
              <div>
                <Label htmlFor="amount">סכום (מינימום ₪150)</Label>
                <Input
                  id="amount"
                  type="number"
                  min={150}
                  value={monetaryValue}
                  onChange={(e) => setMonetaryValue(Number(e.target.value))}
                  className="text-left"
                />
              </div>
            )}

            <div>
              <Label htmlFor="validity">תוקף השובר (ימים)</Label>
              <Select value={validityDays.toString()} onValueChange={(value) => setValidityDays(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="90">3 חודשים</SelectItem>
                  <SelectItem value="180">6 חודשים</SelectItem>
                  <SelectItem value="365">שנה</SelectItem>
                  <SelectItem value="730">שנתיים</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )

      case "details":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">פרטי השובר</h2>

              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">סוג שובר:</span>
                      <Badge variant="outline">{voucherType === "treatment" ? "שובר טיפול" : "שובר כספי"}</Badge>
                    </div>

                    {voucherType === "treatment" && selectedTreatment && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="font-medium">טיפול:</span>
                          <span>{selectedTreatment.name}</span>
                        </div>
                        {selectedDuration && (
                          <div className="flex justify-between items-center">
                            <span className="font-medium">משך זמן:</span>
                            <span>
                              {selectedTreatment.durations?.find((d) => d._id === selectedDuration)?.minutes} דקות
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {voucherType === "monetary" && (
                      <div className="flex justify-between items-center">
                        <span className="font-medium">ערך כספי:</span>
                        <span>₪{monetaryValue}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <span className="font-medium">תוקף:</span>
                      <span>{validityDays} ימים</span>
                    </div>

                    <Separator />

                    <div className="flex justify-between items-center text-lg font-semibold">
                      <span>מחיר כולל:</span>
                      <span>₪{calculatePrice()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex items-center space-x-2 space-x-reverse">
              <Checkbox id="isGift" checked={isGift} onCheckedChange={(checked) => setIsGift(checked as boolean)} />
              <Label htmlFor="isGift" className="flex items-center gap-2">
                <Gift className="h-4 w-4" />
                שלח כמתנה
              </Label>
            </div>
          </div>
        )

      case "payment":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">תשלום</h2>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>זהו דמו - התשלום יאושר אוטומטית</AlertDescription>
              </Alert>

              <Card className="mt-4">
                <CardContent className="p-6">
                  <div className="text-center">
                    <CreditCard className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">סיכום התשלום</h3>
                    <p className="text-3xl font-bold text-primary">₪{calculatePrice()}</p>
                    <p className="text-muted-foreground mt-2">
                      {voucherType === "treatment" ? "שובר טיפול" : "שובר כספי"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )

      case "gift":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">פרטי המתנה</h2>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="recipientName">שם המקבל *</Label>
                  <Input
                    id="recipientName"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="הזן שם מלא"
                  />
                </div>

                <div>
                  <Label htmlFor="recipientPhone">טלפון המקבל *</Label>
                  <Input
                    id="recipientPhone"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder="05X-XXXXXXX"
                    dir="ltr"
                  />
                </div>

                <div>
                  <Label htmlFor="greeting">ברכה (אופציונלי)</Label>
                  <Textarea
                    id="greeting"
                    value={greetingMessage}
                    onChange={(e) => setGreetingMessage(e.target.value)}
                    placeholder="כתוב ברכה אישית..."
                    rows={3}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id="sendNow"
                      checked={sendImmediately}
                      onCheckedChange={(checked) => setSendImmediately(checked as boolean)}
                    />
                    <Label htmlFor="sendNow">שלח מיידי</Label>
                  </div>

                  {!sendImmediately && (
                    <div>
                      <Label>תאריך שליחה</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !sendDate && "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {sendDate ? format(sendDate, "PPP", { locale: he }) : "בחר תאריך"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={sendDate}
                            onSelect={setSendDate}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )

      case "success":
        return (
          <div className="text-center space-y-6">
            <div>
              <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <h2 className="text-2xl font-semibold mb-2">השובר נרכש בהצלחה!</h2>
              <p className="text-muted-foreground">
                {isGift ? "השובר נשלח למקבל המתנה" : "השובר זמין באזור האישי שלך"}
              </p>
            </div>

            <div className="flex gap-4 justify-center">
              <Button onClick={() => router.push("/dashboard/member/gift-vouchers")}>צפה בשוברים שלי</Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                רכוש שובר נוסף
              </Button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // Render navigation
  const renderNavigation = () => {
    if (currentStep === "success") return null

    return (
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => {
            if (currentStep === "details") setCurrentStep("type")
            else if (currentStep === "payment") setCurrentStep("details")
            else if (currentStep === "gift") setCurrentStep("payment")
          }}
          disabled={currentStep === "type"}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          חזור
        </Button>

        <Button
          onClick={() => {
            if (currentStep === "type" && canProceedFromType()) {
              setCurrentStep("details")
            } else if (currentStep === "details") {
              setCurrentStep("payment")
            } else if (currentStep === "payment") {
              handlePurchase()
            } else if (currentStep === "gift") {
              handleGiftSetup()
            }
          }}
          disabled={
            loading ||
            (currentStep === "type" && !canProceedFromType()) ||
            (currentStep === "gift" && !canProceedFromGift())
          }
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {currentStep === "payment" ? "שלם עכשיו" : currentStep === "gift" ? "שלח מתנה" : "המשך"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              רכישת שובר מתנה
            </CardTitle>
            {currentStep !== "success" && (
              <Badge variant="outline">
                שלב{" "}
                {currentStep === "type"
                  ? "1"
                  : currentStep === "details"
                    ? "2"
                    : currentStep === "payment"
                      ? "3"
                      : currentStep === "gift"
                        ? "4"
                        : ""}{" "}
                מתוך {isGift ? "4" : "3"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderStepContent()}
          {renderNavigation()}
        </CardContent>
      </Card>
    </div>
  )
}
