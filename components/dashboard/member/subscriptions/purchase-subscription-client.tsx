"use client"

import { useTranslation } from "@/lib/translations/i18n"
import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { purchaseSubscription } from "@/actions/user-subscription-actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Separator } from "@/components/common/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/common/ui/alert"
import { Label } from "@/components/common/ui/label"
import {
  CheckCircle,
  Info,
  ShoppingCart,
  CreditCardIcon,
  PackageIcon,
  TagIcon,
  CalendarDaysIcon,
  HashIcon,
  Palette,
  DollarSignIcon,
} from "lucide-react"
import type { Subscription } from "@/lib/db/models/subscription" // Assuming full Subscription type
import type { Treatment } from "@/lib/db/models/treatment" // Assuming full Treatment type
import type { PaymentMethod } from "@/lib/db/models/payment-method" // Assuming full PaymentMethod type

interface PurchaseSubscriptionClientProps {
  subscriptions?: Subscription[]
  treatments?: Treatment[]
  paymentMethods?: PaymentMethod[]
}

export default function PurchaseSubscriptionClient({
  subscriptions = [],
  treatments = [],
  paymentMethods = [],
}: PurchaseSubscriptionClientProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string>("")
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string>("")
  const [selectedDurationMinutes, setSelectedDurationMinutes] = useState<string>("") // Store as string from Select
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  const selectedSubscription = useMemo(
    () => subscriptions.find((sub) => String(sub._id) === selectedSubscriptionId),
    [subscriptions, selectedSubscriptionId],
  )

  const selectedTreatment = useMemo(
    () => treatments.find((treatment) => String(treatment._id) === selectedTreatmentId),
    [treatments, selectedTreatmentId],
  )

  // Reset duration when treatment changes
  useEffect(() => {
    setSelectedDurationMinutes("")
  }, [selectedTreatmentId])

  const activeDurationsForSelectedTreatment = useMemo(() => {
    if (selectedTreatment?.pricingType === "duration_based" && selectedTreatment.durations) {
      return selectedTreatment.durations.filter((d) => d.isActive)
    }
    return []
  }, [selectedTreatment])

  const currentTreatmentSessionPrice = useMemo(() => {
    if (!selectedTreatment) return 0
    if (selectedTreatment.pricingType === "fixed") {
      return selectedTreatment.fixedPrice || 0
    }
    if (selectedTreatment.pricingType === "duration_based") {
      if (!selectedDurationMinutes) return 0
      const durationOption = activeDurationsForSelectedTreatment.find(
        (d) => d.minutes === Number.parseInt(selectedDurationMinutes),
      )
      return durationOption?.price || 0
    }
    return 0
  }, [selectedTreatment, selectedDurationMinutes, activeDurationsForSelectedTreatment])

  const calculatedTotalSubscriptionPrice = useMemo(() => {
    if (selectedSubscription && currentTreatmentSessionPrice > 0) {
      const paidTreatmentsCount = Math.max(0, selectedSubscription.quantity - selectedSubscription.bonusQuantity)
      return currentTreatmentSessionPrice * paidTreatmentsCount
    }
    return 0
  }, [selectedSubscription, currentTreatmentSessionPrice])

  const handlePurchase = async () => {
    if (!selectedSubscriptionId || !selectedTreatmentId || !selectedPaymentMethodId) {
      toast.error(t("subscriptions.purchase.selectAllFieldsError"))
      return
    }

    if (selectedTreatment?.pricingType === "duration_based" && !selectedDurationMinutes) {
      toast.error(t("subscriptions.purchase.selectDurationError"))
      return
    }

    setIsLoading(true)
    try {
      const params: Parameters<typeof purchaseSubscription>[0] = {
        subscriptionId: selectedSubscriptionId,
        treatmentId: selectedTreatmentId,
        paymentMethodId: selectedPaymentMethodId,
      }
      if (selectedTreatment?.pricingType === "duration_based" && selectedDurationMinutes) {
        params.selectedDurationMinutes = Number.parseInt(selectedDurationMinutes)
      }

      const result = await purchaseSubscription(params)

      if (result.success) {
        toast.success(t("subscriptions.purchase.success"))
        router.push("/dashboard/member/subscriptions")
        router.refresh()
      } else {
        toast.error(result.error || t("subscriptions.purchase.error"))
      }
    } catch (error) {
      toast.error(t("subscriptions.purchase.error"))
    } finally {
      setIsLoading(false)
    }
  }

  const paidTreatmentsInPackage = selectedSubscription
    ? Math.max(0, selectedSubscription.quantity - selectedSubscription.bonusQuantity)
    : 0

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          {t("subscriptions.purchase.title")}
        </h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">{t("subscriptions.purchase.description")}</p>
      </header>

      {subscriptions.length === 0 || treatments.length === 0 ? (
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertTitle>{t("common.error")}</AlertTitle>
          <AlertDescription>
            {subscriptions.length === 0 && t("subscriptions.purchase.noSubscriptionsAvailable")}
            {subscriptions.length > 0 && treatments.length === 0 && t("treatments.noTreatmentsAvailablePurchase")}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            {/* Step 1: Select Subscription Package */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PackageIcon className="h-6 w-6 text-primary" />
                  {t("subscriptions.purchase.selectSubscription")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedSubscriptionId} onValueChange={setSelectedSubscriptionId}>
                  <SelectTrigger id="subscription-package">
                    <SelectValue placeholder={t("subscriptions.purchase.selectSubscriptionPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {subscriptions.map((sub) => (
                      <SelectItem key={String(sub._id)} value={String(sub._id)}>
                        {sub.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSubscription && (
                  <div className="mt-4 p-3 bg-muted/50 rounded-md border border-muted">
                    <h4 className="font-semibold">{selectedSubscription.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{selectedSubscription.description}</p>
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <div className="flex items-center">
                        <HashIcon className="h-4 w-4 mr-1 text-sky-600" />
                        {t("subscriptions.fields.quantity")}: {selectedSubscription.quantity}
                      </div>
                      <div className="flex items-center">
                        <TagIcon className="h-4 w-4 mr-1 text-sky-600" />
                        {t("subscriptions.fields.bonusQuantity")}: {selectedSubscription.bonusQuantity}
                      </div>
                      <div className="flex items-center font-medium">
                        <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                        {t("subscriptions.fields.paidTreatments")}: {paidTreatmentsInPackage}
                      </div>
                      <div className="flex items-center">
                        <CalendarDaysIcon className="h-4 w-4 mr-1 text-sky-600" />
                        {t("subscriptions.fields.validityMonths")}: {selectedSubscription.validityMonths}{" "}
                        {t("common.months")}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Select Treatment & Duration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-6 w-6 text-primary" />
                  {t("treatments.selectTreatment")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  value={selectedTreatmentId}
                  onValueChange={setSelectedTreatmentId}
                  disabled={treatments.length === 0}
                >
                  <SelectTrigger id="treatment-select">
                    <SelectValue placeholder={t("treatments.selectTreatmentPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {treatments.map((treatment) => (
                      <SelectItem key={String(treatment._id)} value={String(treatment._id)}>
                        {treatment.name}
                        {treatment.pricingType === "fixed" && ` (${treatment.fixedPrice}₪)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedTreatment && selectedTreatment.pricingType === "duration_based" && (
                  <div className="space-y-2">
                    <Label htmlFor="treatment-duration">{t("treatments.selectDuration")}</Label>
                    <Select
                      value={selectedDurationMinutes}
                      onValueChange={setSelectedDurationMinutes}
                      disabled={activeDurationsForSelectedTreatment.length === 0}
                    >
                      <SelectTrigger id="treatment-duration">
                        <SelectValue placeholder={t("treatments.selectDurationPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {activeDurationsForSelectedTreatment.map((duration) => (
                          <SelectItem key={duration.minutes} value={String(duration.minutes)}>
                            {t("treatments.durationOption", {
                              minutes: duration.minutes,
                              price: duration.price,
                            })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {activeDurationsForSelectedTreatment.length === 0 && (
                      <p className="text-sm text-destructive">{t("treatments.noActiveDurations")}</p>
                    )}
                  </div>
                )}

                {selectedTreatment && (
                  <div className="mt-4 p-3 bg-muted/50 rounded-md border border-muted">
                    <h4 className="font-semibold">{selectedTreatment.name}</h4>
                    <div className="mt-2 grid grid-cols-1 gap-y-1 text-sm">
                      <div className="flex items-center">
                        <Info className="h-4 w-4 mr-1 text-sky-600" />
                        {t("treatments.fields.category")}:{" "}
                        {t(
                          `treatments.categories.${selectedTreatment.category.toLowerCase()}` as any,
                          selectedTreatment.category,
                        )}
                      </div>
                      {selectedTreatment.pricingType === "fixed" && (
                        <div className="flex items-center">
                          <DollarSignIcon className="h-4 w-4 mr-1 text-sky-600" />
                          {t("treatments.fields.price")}: {selectedTreatment.fixedPrice}₪
                        </div>
                      )}
                      {selectedTreatment.pricingType === "duration_based" &&
                        selectedDurationMinutes &&
                        currentTreatmentSessionPrice > 0 && (
                          <div className="flex items-center">
                            <DollarSignIcon className="h-4 w-4 mr-1 text-sky-600" />
                            {t("treatments.fields.selectedDurationPrice")}: {currentTreatmentSessionPrice}₪{" "}
                            {t("treatments.forDuration", { minutes: selectedDurationMinutes })}
                          </div>
                        )}
                      {selectedTreatment.description && (
                        <p className="text-xs text-muted-foreground mt-1 col-span-full">
                          {selectedTreatment.description}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 3: Select Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCardIcon className="h-6 w-6 text-primary" />
                  {t("paymentMethods.selectPaymentMethod")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paymentMethods.length === 0 ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>{t("paymentMethods.noPaymentMethods")}</AlertTitle>
                    <AlertDescription>
                      {t("paymentMethods.pleaseAddPaymentMethod")}
                      <Button
                        variant="link"
                        className="p-0 h-auto ml-1 rtl:mr-1 rtl:ml-0"
                        onClick={() => router.push("/dashboard/member/payment-methods")}
                      >
                        {t("paymentMethods.addNew")}
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Select value={selectedPaymentMethodId} onValueChange={setSelectedPaymentMethodId}>
                    <SelectTrigger id="payment-method">
                      <SelectValue placeholder={t("paymentMethods.selectPaymentMethodPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((pm) => (
                        <SelectItem key={String(pm._id)} value={String(pm._id)}>
                          {pm.cardName || t("paymentMethods.card")} - **** {pm.cardNumber.slice(-4)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Column 2: Summary & Purchase */}
          <div className="md:col-span-1 space-y-6">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-6 w-6 text-primary" />
                  {t("subscriptions.purchase.summary")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedSubscription ? (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t("subscriptions.fields.name")}:</span>
                    <span className="font-medium text-right">{selectedSubscription.name}</span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("subscriptions.purchase.summaryNoSubscription")}</p>
                )}

                {selectedTreatment ? (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t("treatments.fields.name")}:</span>
                    <span className="font-medium text-right">
                      {selectedTreatment.name}
                      {selectedTreatment.pricingType === "duration_based" &&
                        selectedDurationMinutes &&
                        ` (${selectedDurationMinutes} ${t("common.minutes")})`}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("subscriptions.purchase.summaryNoTreatment")}</p>
                )}

                {currentTreatmentSessionPrice > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{t("treatments.pricePerSession")}:</span>
                    <span className="font-medium">{currentTreatmentSessionPrice}₪</span>
                  </div>
                )}

                {selectedSubscription && (
                  <>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">{t("subscriptions.fields.paidTreatments")}:</span>
                      <span className="font-medium">x {paidTreatmentsInPackage}</span>
                    </div>
                  </>
                )}

                <Separator />
                <div className="flex justify-between items-center text-xl font-bold">
                  <span>{t("common.totalPrice")}:</span>
                  <span>{calculatedTotalSubscriptionPrice.toFixed(2)}₪</span>
                </div>
                {selectedSubscription && currentTreatmentSessionPrice > 0 && paidTreatmentsInPackage > 0 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    ({currentTreatmentSessionPrice}₪ {t("common.perTreatment")} x {paidTreatmentsInPackage}{" "}
                    {t("common.treatments")})
                  </p>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handlePurchase}
                  disabled={
                    !selectedSubscriptionId ||
                    !selectedTreatmentId ||
                    (selectedTreatment?.pricingType === "duration_based" && !selectedDurationMinutes) ||
                    !selectedPaymentMethodId ||
                    isLoading ||
                    paymentMethods.length === 0 ||
                    currentTreatmentSessionPrice === 0
                  }
                >
                  {isLoading && (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-background mr-2"></div>
                  )}
                  {!isLoading && <CheckCircle className="mr-2 h-5 w-5 rtl:ml-2 rtl:mr-0" />}
                  {isLoading ? t("common.processing") : t("subscriptions.purchase.confirmAndPay")}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
