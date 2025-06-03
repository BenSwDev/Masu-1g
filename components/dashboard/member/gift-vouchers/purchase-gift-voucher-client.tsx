"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/common/ui/form"
import { Input } from "@/components/common/ui/input"
import { Textarea } from "@/components/common/ui/textarea"
import { Switch } from "@/components/common/ui/switch"
import { useToast } from "@/components/common/ui/use-toast"
import { Loader2 } from "lucide-react"
import { StepIndicator } from "@/components/common/purchase/step-indicator"
import { PurchaseCard } from "@/components/common/purchase/purchase-card"
import { PurchaseNavigation } from "@/components/common/purchase/purchase-navigation"
import { PurchaseSummary } from "@/components/common/purchase/purchase-summary"
import { AnimatedContainer } from "@/components/common/purchase/animated-container"
import { PurchaseSuccess } from "@/components/common/purchase/purchase-success"
import { PaymentMethodSelector } from "@/components/common/purchase/payment-method-selector"

// Mock data for gift vouchers
const GIFT_VOUCHER_TYPES = [
  {
    id: "monetary",
    name: "Monetary Gift Voucher",
    description: "Gift a specific amount of money",
    image: "/placeholder.svg?height=100&width=200",
  },
  {
    id: "treatment",
    name: "Treatment Gift Voucher",
    description: "Gift a specific treatment",
    image: "/placeholder.svg?height=100&width=200",
  },
]

const TREATMENTS = [
  {
    id: "massage",
    name: "Massage",
    description: "Relaxing full body massage",
    price: 200,
    duration: true,
    image: "/placeholder.svg?height=100&width=200",
  },
  {
    id: "facial",
    name: "Facial Treatment",
    description: "Rejuvenating facial care",
    price: 150,
    duration: false,
    image: "/placeholder.svg?height=100&width=200",
  },
  {
    id: "manicure",
    name: "Manicure",
    description: "Nail care and polish",
    price: 80,
    duration: false,
    image: "/placeholder.svg?height=100&width=200",
  },
]

const DURATIONS = [
  { id: "30", name: "30 minutes", price: 200 },
  { id: "60", name: "60 minutes", price: 350 },
  { id: "90", name: "90 minutes", price: 500 },
]

const MONETARY_AMOUNTS = [
  { id: "100", amount: 100 },
  { id: "200", amount: 200 },
  { id: "300", amount: 300 },
  { id: "500", amount: 500 },
  { id: "custom", amount: "Custom" },
]

// Form schema
const giftDetailsSchema = z.object({
  recipientName: z.string().min(1, "Recipient name is required"),
  recipientEmail: z.string().email("Invalid email address"),
  message: z.string().optional(),
})

export default function PurchaseGiftVoucherClient() {
  const { t } = useTranslation()
  const router = useRouter()
  const { toast } = useToast()

  // State
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedVoucherType, setSelectedVoucherType] = useState<string | null>(null)
  const [selectedTreatment, setSelectedTreatment] = useState<string | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null)
  const [selectedAmount, setSelectedAmount] = useState<string | null>(null)
  const [customAmount, setCustomAmount] = useState<number | null>(null)
  const [sendAsGift, setSendAsGift] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("credit_card")
  const [purchaseComplete, setPurchaseComplete] = useState(false)

  // Form
  const form = useForm<z.infer<typeof giftDetailsSchema>>({
    resolver: zodResolver(giftDetailsSchema),
    defaultValues: {
      recipientName: "",
      recipientEmail: "",
      message: "",
    },
  })

  // Dynamic steps based on selections
  const getSteps = () => {
    const baseSteps = ["gift_voucher.steps.type"]

    if (selectedVoucherType === "treatment") {
      baseSteps.push("gift_voucher.steps.treatment")

      const treatment = TREATMENTS.find((t) => t.id === selectedTreatment)
      if (treatment?.duration) {
        baseSteps.push("gift_voucher.steps.duration")
      }
    } else if (selectedVoucherType === "monetary") {
      baseSteps.push("gift_voucher.steps.amount")
    }

    if (sendAsGift) {
      baseSteps.push("gift_voucher.steps.recipient")
    }

    baseSteps.push("gift_voucher.steps.payment")
    baseSteps.push("gift_voucher.steps.summary")

    return baseSteps
  }

  const steps = getSteps()

  // Calculate total price
  const calculateTotal = () => {
    if (selectedVoucherType === "monetary") {
      if (selectedAmount === "custom" && customAmount) {
        return customAmount
      } else if (selectedAmount) {
        return Number.parseInt(selectedAmount)
      }
    } else if (selectedVoucherType === "treatment") {
      const treatment = TREATMENTS.find((t) => t.id === selectedTreatment)
      if (treatment) {
        if (treatment.duration && selectedDuration) {
          const duration = DURATIONS.find((d) => d.id === selectedDuration)
          return duration ? duration.price : 0
        }
        return treatment.price
      }
    }
    return 0
  }

  const total = calculateTotal()

  // Summary items
  const getSummaryItems = () => {
    const items = []

    if (selectedVoucherType === "monetary") {
      items.push({
        label: t("gift_voucher.monetary_voucher"),
        value: total,
      })
    } else if (selectedVoucherType === "treatment") {
      const treatment = TREATMENTS.find((t) => t.id === selectedTreatment)
      if (treatment) {
        items.push({
          label: treatment.name,
          value: treatment.duration ? 0 : treatment.price,
        })

        if (treatment.duration && selectedDuration) {
          const duration = DURATIONS.find((d) => d.id === selectedDuration)
          if (duration) {
            items.push({
              label: duration.name,
              value: duration.price,
            })
          }
        }
      }
    }

    return items
  }

  // Navigation
  const canGoNext = () => {
    switch (currentStep) {
      case 0: // Voucher type
        return !!selectedVoucherType
      case 1: // Treatment or Amount
        if (selectedVoucherType === "treatment") {
          return !!selectedTreatment
        } else {
          return (
            !!selectedAmount &&
            (selectedAmount !== "custom" || (selectedAmount === "custom" && !!customAmount && customAmount > 0))
          )
        }
      case 2: // Duration or Recipient
        if (selectedVoucherType === "treatment") {
          const treatment = TREATMENTS.find((t) => t.id === selectedTreatment)
          if (treatment?.duration) {
            return !!selectedDuration
          }
        }
        return form.formState.isValid
      case 3: // Payment or Recipient
        if (
          (selectedVoucherType === "treatment" && TREATMENTS.find((t) => t.id === selectedTreatment)?.duration) ||
          (sendAsGift && currentStep === steps.length - 3)
        ) {
          return form.formState.isValid
        }
        return true
      case 4: // Payment or Summary
        return true
      default:
        return true
    }
  }

  const handleNext = async () => {
    if (currentStep === steps.length - 2) {
      // Process payment
      setIsLoading(true)
      try {
        // Simulate payment processing
        await new Promise((resolve) => setTimeout(resolve, 2000))

        // Mark all steps as completed
        setCompletedSteps([...Array(steps.length).keys()])
        setCurrentStep(steps.length - 1)
        setPurchaseComplete(true)

        toast({
          title: t("gift_voucher.purchase_success"),
          description: t("gift_voucher.purchase_success_description"),
        })
      } catch (error) {
        toast({
          title: t("gift_voucher.purchase_error"),
          description: t("gift_voucher.purchase_error_description"),
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    } else {
      // Update completed steps
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps([...completedSteps, currentStep])
      }
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleContinue = () => {
    router.push("/dashboard/member/gift-vouchers")
  }

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Voucher type
        return (
          <AnimatedContainer isVisible={currentStep === 0} key="step-0">
            <h2 className="text-2xl font-bold mb-6">{t("gift_voucher.select_type")}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {GIFT_VOUCHER_TYPES.map((type) => (
                <PurchaseCard
                  key={type.id}
                  title={type.name}
                  description={type.description}
                  image={type.image}
                  selected={selectedVoucherType === type.id}
                  onClick={() => setSelectedVoucherType(type.id)}
                />
              ))}
            </div>
          </AnimatedContainer>
        )

      case 1: // Treatment or Amount
        if (selectedVoucherType === "treatment") {
          return (
            <AnimatedContainer isVisible={currentStep === 1} key="step-1-treatment">
              <h2 className="text-2xl font-bold mb-6">{t("gift_voucher.select_treatment")}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {TREATMENTS.map((treatment) => (
                  <PurchaseCard
                    key={treatment.id}
                    title={treatment.name}
                    description={treatment.description}
                    price={treatment.price}
                    image={treatment.image}
                    selected={selectedTreatment === treatment.id}
                    onClick={() => setSelectedTreatment(treatment.id)}
                  />
                ))}
              </div>
            </AnimatedContainer>
          )
        } else {
          return (
            <AnimatedContainer isVisible={currentStep === 1} key="step-1-amount">
              <h2 className="text-2xl font-bold mb-6">{t("gift_voucher.select_amount")}</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {MONETARY_AMOUNTS.map((option) => (
                  <PurchaseCard
                    key={option.id}
                    title={option.id === "custom" ? t("gift_voucher.custom_amount") : `₪${option.amount}`}
                    selected={selectedAmount === option.id}
                    onClick={() => setSelectedAmount(option.id)}
                  />
                ))}
              </div>

              {selectedAmount === "custom" && (
                <div className="mt-6">
                  <FormLabel>{t("gift_voucher.enter_custom_amount")}</FormLabel>
                  <div className="flex items-center mt-2">
                    <span className="text-lg mr-2">₪</span>
                    <Input
                      type="number"
                      min="1"
                      value={customAmount || ""}
                      onChange={(e) => setCustomAmount(Number.parseInt(e.target.value) || null)}
                      className="max-w-xs"
                    />
                  </div>
                </div>
              )}
            </AnimatedContainer>
          )
        }

      case 2: // Duration or Gift Details or Payment
        if (selectedVoucherType === "treatment") {
          const treatment = TREATMENTS.find((t) => t.id === selectedTreatment)
          if (treatment?.duration) {
            return (
              <AnimatedContainer isVisible={currentStep === 2} key="step-2-duration">
                <h2 className="text-2xl font-bold mb-6">{t("gift_voucher.select_duration")}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {DURATIONS.map((duration) => (
                    <PurchaseCard
                      key={duration.id}
                      title={duration.name}
                      price={duration.price}
                      selected={selectedDuration === duration.id}
                      onClick={() => setSelectedDuration(duration.id)}
                    />
                  ))}
                </div>
              </AnimatedContainer>
            )
          }
        }

        // Gift option
        return (
          <AnimatedContainer isVisible={currentStep === 2} key="step-2-gift-option">
            <h2 className="text-2xl font-bold mb-6">{t("gift_voucher.gift_options")}</h2>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-medium">{t("gift_voucher.send_as_gift")}</h3>
                    <p className="text-muted-foreground">{t("gift_voucher.send_as_gift_description")}</p>
                  </div>
                  <Switch checked={sendAsGift} onCheckedChange={setSendAsGift} />
                </div>

                {sendAsGift && (
                  <Form {...form}>
                    <form className="space-y-4">
                      <FormField
                        control={form.control}
                        name="recipientName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("gift_voucher.recipient_name")}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="recipientEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("gift_voucher.recipient_email")}</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("gift_voucher.gift_message")}</FormLabel>
                            <FormControl>
                              <Textarea {...field} rows={3} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          </AnimatedContainer>
        )

      case 3: // Payment or Gift Details
        if (
          (selectedVoucherType === "treatment" && TREATMENTS.find((t) => t.id === selectedTreatment)?.duration) ||
          (sendAsGift && currentStep === 3)
        ) {
          return (
            <AnimatedContainer isVisible={currentStep === 3} key="step-3-gift-details">
              <h2 className="text-2xl font-bold mb-6">{t("gift_voucher.gift_details")}</h2>
              <Form {...form}>
                <form className="space-y-4">
                  <Card>
                    <CardContent className="p-6 space-y-4">
                      <FormField
                        control={form.control}
                        name="recipientName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("gift_voucher.recipient_name")}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="recipientEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("gift_voucher.recipient_email")}</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("gift_voucher.gift_message")}</FormLabel>
                            <FormControl>
                              <Textarea {...field} rows={3} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </form>
              </Form>
            </AnimatedContainer>
          )
        }

        // Payment
        return (
          <AnimatedContainer isVisible={currentStep === 3} key="step-3-payment">
            <h2 className="text-2xl font-bold mb-6">{t("gift_voucher.payment")}</h2>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t("gift_voucher.payment_method")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <PaymentMethodSelector
                    methods={[]}
                    selectedMethod={paymentMethod}
                    onSelectMethod={setPaymentMethod}
                  />
                </CardContent>
              </Card>

              <PurchaseSummary
                items={getSummaryItems()}
                total={{
                  label: t("gift_voucher.total"),
                  value: total,
                }}
              />
            </div>
          </AnimatedContainer>
        )

      case 4: // Summary or Payment
        if (currentStep === steps.length - 2) {
          return (
            <AnimatedContainer isVisible={currentStep === 4} key="step-4-summary">
              <h2 className="text-2xl font-bold mb-6">{t("gift_voucher.review_purchase")}</h2>
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("gift_voucher.purchase_details")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-medium">{t("gift_voucher.voucher_type")}</h3>
                      <p>
                        {selectedVoucherType === "monetary"
                          ? t("gift_voucher.monetary_voucher")
                          : t("gift_voucher.treatment_voucher")}
                      </p>
                    </div>

                    {selectedVoucherType === "monetary" && (
                      <div>
                        <h3 className="font-medium">{t("gift_voucher.amount")}</h3>
                        <p>₪{total}</p>
                      </div>
                    )}

                    {selectedVoucherType === "treatment" && selectedTreatment && (
                      <>
                        <div>
                          <h3 className="font-medium">{t("gift_voucher.treatment")}</h3>
                          <p>{TREATMENTS.find((t) => t.id === selectedTreatment)?.name}</p>
                        </div>

                        {TREATMENTS.find((t) => t.id === selectedTreatment)?.duration && selectedDuration && (
                          <div>
                            <h3 className="font-medium">{t("gift_voucher.duration")}</h3>
                            <p>{DURATIONS.find((d) => d.id === selectedDuration)?.name}</p>
                          </div>
                        )}
                      </>
                    )}

                    {sendAsGift && (
                      <div>
                        <h3 className="font-medium">{t("gift_voucher.recipient")}</h3>
                        <p>
                          {form.getValues().recipientName} ({form.getValues().recipientEmail})
                        </p>
                      </div>
                    )}

                    <div>
                      <h3 className="font-medium">{t("gift_voucher.payment_method")}</h3>
                      <p>
                        {paymentMethod === "credit_card"
                          ? t("payment.methods.credit_card")
                          : t("payment.methods.wallet")}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <PurchaseSummary
                  items={getSummaryItems()}
                  total={{
                    label: t("gift_voucher.total"),
                    value: total,
                  }}
                />
              </div>
            </AnimatedContainer>
          )
        } else {
          // Payment
          return (
            <AnimatedContainer isVisible={currentStep === 4} key="step-4-payment">
              <h2 className="text-2xl font-bold mb-6">{t("gift_voucher.payment")}</h2>
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("gift_voucher.payment_method")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PaymentMethodSelector
                      methods={[]}
                      selectedMethod={paymentMethod}
                      onSelectMethod={setPaymentMethod}
                    />
                  </CardContent>
                </Card>

                <PurchaseSummary
                  items={getSummaryItems()}
                  total={{
                    label: t("gift_voucher.total"),
                    value: total,
                  }}
                />
              </div>
            </AnimatedContainer>
          )
        }

      case 5: // Success
        return (
          <AnimatedContainer isVisible={currentStep === 5} key="step-5-success">
            <PurchaseSuccess
              title={t("gift_voucher.purchase_success")}
              message={t("gift_voucher.purchase_success_description")}
              onContinue={handleContinue}
              continueLabel={t("gift_voucher.view_gift_vouchers")}
            />
          </AnimatedContainer>
        )

      default:
        return null
    }
  }

  return (
    <div className="container max-w-4xl mx-auto py-8">
      {!purchaseComplete && (
        <StepIndicator steps={steps} currentStep={currentStep} completedSteps={completedSteps} className="mb-8" />
      )}

      {isLoading && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-lg">{t("gift_voucher.processing_payment")}</p>
          </div>
        </div>
      )}

      {renderStepContent()}

      {!purchaseComplete && (
        <PurchaseNavigation
          onNext={handleNext}
          onBack={handleBack}
          canGoNext={canGoNext()}
          canGoBack={currentStep > 0}
          isLoading={isLoading}
          isLastStep={currentStep === steps.length - 2}
        />
      )}
    </div>
  )
}
