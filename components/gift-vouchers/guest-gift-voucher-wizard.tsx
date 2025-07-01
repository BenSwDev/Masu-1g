"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { GuestInfoStep } from "@/components/booking/steps/guest-info-step"
import { GuestTreatmentSelectionStep } from "@/components/booking/steps/guest-treatment-selection-step"
import { GuestPaymentStep } from "@/components/booking/steps/guest-payment-step"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Progress } from "@/components/ui/progress"
import { useTranslation } from "@/lib/translations/i18n"
import {
  initiateGuestPurchaseGiftVoucher,
  confirmGuestGiftVoucherPurchase,
  saveAbandonedGiftVoucherPurchase,
  type GiftVoucherPlain,
} from "@/actions/gift-voucher-actions"
import GuestGiftVoucherConfirmation from "./guest-gift-voucher-confirmation"
import { createGuestUser } from "@/actions/booking-actions"
import type { ITreatment } from "@/lib/db/models/treatment"
import type { CalculatedPriceDetails } from "@/types/booking"
import { formatPhoneForDisplay } from "@/lib/phone-utils"

interface Props {
  treatments: ITreatment[]
  currentUser: any
}

export default function GuestGiftVoucherWizard({ treatments, currentUser }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const { t, language, dir } = useTranslation()
  const [currentStep, setCurrentStep] = useState(1)
  const [voucherType, setVoucherType] = useState<"monetary" | "treatment">("monetary")
  const [monetaryValue, setMonetaryValue] = useState(150)
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string>("")
  const [selectedDurationId, setSelectedDurationId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [purchaseComplete, setPurchaseComplete] = useState(false)
  const [purchasedVoucher, setPurchasedVoucher] = useState<GiftVoucherPlain | null>(null)
  const [guestUserId, setGuestUserId] = useState<string | null>(null)

  // Extract user information safely
  const [first, ...rest] = ((currentUser?.name as string) || "").split(" ")
  const defaultGuestInfo = {
    firstName: first || "",
    lastName: rest.join(" ") || "",
    email: (currentUser?.email as string) || "",
    phone: (currentUser?.phone as string) || "",
    gender: undefined as "male" | "female" | "other" | undefined,
    birthDate: undefined as Date | undefined,
  }

  const [guestInfo, setGuestInfo] = useState<any>(defaultGuestInfo)

  const selectedTreatment = treatments.find(t => String(t._id) === selectedTreatmentId)
  const selectedDuration =
    selectedTreatment?.pricingType === "duration_based"
      ? selectedTreatment.durations?.find(d => d._id.toString() === selectedDurationId)
      : undefined

  const price =
    voucherType === "monetary"
      ? Math.max(monetaryValue, 150)
      : selectedTreatment?.pricingType === "fixed"
        ? selectedTreatment.fixedPrice || 0
        : selectedDuration?.price || 0

  const calculatedPrice: CalculatedPriceDetails = {
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
    // Add required fields for CalculatedPriceDetails
    totalProfessionalPayment: 0,
    totalOfficeCommission: 0,
    baseProfessionalPayment: 0,
    surchargesProfessionalPayment: 0,
  }

  const TOTAL_STEPS = 6
  const nextStep = () => setCurrentStep(s => Math.min(s + 1, TOTAL_STEPS))
  const prevStep = () => setCurrentStep(s => Math.max(s - 1, 1))

  useEffect(() => {
    if (guestUserId) {
      saveAbandonedGiftVoucherPurchase(guestUserId, {
        guestInfo,
        purchaseOptions: {
          voucherType,
          treatmentId: selectedTreatmentId,
          selectedDurationId,
          monetaryValue: voucherType === "monetary" ? monetaryValue : undefined,
          isGift: guestInfo.isGift,
        },
        currentStep,
      })
    }
  }, [
    guestUserId,
    guestInfo,
    voucherType,
    selectedTreatmentId,
    selectedDurationId,
    monetaryValue,
    currentStep,
  ])

  const handleGuestInfoSubmit = async (info: any) => {
    setGuestInfo(info)
    if (!guestUserId) {
      const result = await createGuestUser({
        name: info.firstName + ' ' + (info.lastName || ''),
        email: info.email,
        phone: info.phone,
      })
      if (result.success && result.userId) {
        setGuestUserId(result.userId)
      }
    }
    nextStep()
  }

  const handlePurchase = async () => {
    setIsLoading(true)
    let sendDateForPayload: string | undefined = "immediate"
    if (
      guestInfo.isGift &&
      guestInfo.sendOption === "scheduled" &&
      guestInfo.sendDate &&
      guestInfo.sendTime
    ) {
      const [h, m] = guestInfo.sendTime.split(":").map(Number)
      const combined = new Date(guestInfo.sendDate)
      combined.setHours(h, m, 0, 0)
      sendDateForPayload = combined.toISOString()
    }

    const initRes = await initiateGuestPurchaseGiftVoucher({
      voucherType,
      treatmentId: voucherType === "treatment" ? selectedTreatmentId : undefined,
      selectedDurationId: voucherType === "treatment" ? selectedDurationId || undefined : undefined,
      monetaryValue: voucherType === "monetary" ? price : undefined,
      isGift: guestInfo.isGift || false,
      recipientName: guestInfo.recipientFirstName
        ? guestInfo.recipientFirstName + " " + guestInfo.recipientLastName
        : undefined,
      recipientPhone: guestInfo.recipientPhone,
      greetingMessage: guestInfo.greetingMessage,
      sendDate: sendDateForPayload,
      guestInfo: {
        name: guestInfo.firstName + " " + guestInfo.lastName,
        email: guestInfo.email,
        phone: guestInfo.phone,
      },
    })

    if (!initRes.success || !initRes.voucherId) {
      toast({ variant: "destructive", title: "שגיאה", description: initRes.error || "" })
      setIsLoading(false)
      return
    }

    const confirmRes = await confirmGuestGiftVoucherPurchase({
      voucherId: initRes.voucherId,
      paymentId: `guest_payment_${Date.now()}`,
      amount: price,
      success: true,
      guestInfo: {
        name: guestInfo.firstName + " " + guestInfo.lastName,
        email: guestInfo.email,
        phone: guestInfo.phone,
      },
    })

    setIsLoading(false)
    if (confirmRes.success && confirmRes.voucher) {
      // Immediately redirect to confirmation page
      const voucherId = confirmRes.voucher._id || (confirmRes.voucher as any).id
      if (voucherId) {
        router.push(`/purchase/gift-voucher/confirmation?voucherId=${voucherId}&status=success`)
      } else {
        // Fallback to showing confirmation step
        setPurchasedVoucher(confirmRes.voucher)
        setPurchaseComplete(true)
        setCurrentStep(6)
      }
    } else {
      toast({ variant: "destructive", title: "שגיאה", description: confirmRes.error || "" })
    }
  }

  const renderVoucherTypeStep = () => (
    <div className="space-y-6" dir={dir} lang={language}>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          {t("giftVouchers.fields.selectVoucherType")}
        </h2>
        <p className="text-gray-600 mt-2">{t("giftVouchers.wizard.chooseTypeDesc")}</p>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Card
          className={`cursor-pointer border-2 ${voucherType === "monetary" ? "border-blue-500" : "border-gray-200"}`}
          onClick={() => {
            setVoucherType("monetary")
            setSelectedTreatmentId("")
            setSelectedDurationId("")
          }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {t("giftVouchers.monetaryVoucher")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{t("giftVouchers.monetaryDesc")}</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer border-2 ${voucherType === "treatment" ? "border-blue-500" : "border-gray-200"}`}
          onClick={() => {
            setVoucherType("treatment")
            setMonetaryValue(150)
          }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {t("giftVouchers.treatmentVoucher")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{t("giftVouchers.treatmentDesc")}</p>
          </CardContent>
        </Card>
      </div>
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={prevStep}>
          {t("common.back")}
        </Button>
        <Button onClick={nextStep}>{t("common.next")}</Button>
      </div>
    </div>
  )

  const renderMonetaryStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6" dir={dir} lang={language}>
        <h2 className="text-2xl font-semibold text-gray-900">
          {t("giftVouchers.wizard.amountTitle")}
        </h2>
        <p className="text-gray-600 mt-2">{t("giftVouchers.wizard.amountDesc")}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>סכום</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="number"
            min={150}
            value={monetaryValue}
            onChange={e => setMonetaryValue(Number(e.target.value))}
            placeholder="150"
          />
        </CardContent>
      </Card>
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={prevStep}>
          {t("common.back")}
        </Button>
        <Button onClick={nextStep} disabled={monetaryValue < 150}>
          {t("common.next")}
        </Button>
      </div>
    </div>
  )

  const renderTreatmentStep = () => (
    <GuestTreatmentSelectionStep
      initialData={{
        activeTreatments: treatments,
        activeUserSubscriptions: [],
        usableGiftVouchers: [],
        userPreferences: {
          therapistGender: "any",
          notificationMethods: [],
          notificationLanguage: "he",
        },
        userAddresses: [],
        userPaymentMethods: [],
        workingHoursSettings: {},
        currentUser: {
          id: "",
          name: "",
          email: "",
        },
      }}
      bookingOptions={{ selectedTreatmentId, selectedDurationId }}
      setBookingOptions={(update: any) => {
        const prev = { selectedTreatmentId, selectedDurationId }
        const next = typeof update === "function" ? update(prev) : update
        if (next.selectedTreatmentId !== undefined)
          setSelectedTreatmentId(next.selectedTreatmentId || "")
        if (next.selectedDurationId !== undefined)
          setSelectedDurationId(next.selectedDurationId || "")
      }}
      onNext={nextStep}
      onPrev={prevStep}
      hideGenderPreference
      showPrice={false}
    />
  )

  const renderSummaryStep = () => (
    <div className="space-y-6" dir={dir} lang={language}>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold">{t("giftVouchers.wizard.summaryTitle")}</h2>
        <p className="text-gray-600 mt-2">{t("giftVouchers.wizard.summaryDesc")}</p>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <Card>
            <CardHeader>
              <CardTitle>{t("giftVouchers.voucherDetailsTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>{t("giftVouchers.type")}</span>
                <span>
                  {voucherType === "monetary"
                    ? t("giftVouchers.types.monetary")
                    : t("giftVouchers.types.treatment")}
                </span>
              </div>
              {voucherType === "monetary" ? (
                <div className="flex justify-between">
                  <span>{t("giftVouchers.value")}</span>
                  <span>{price} ₪</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span>{t("giftVouchers.treatment")}</span>
                    <span>{selectedTreatment?.name}</span>
                  </div>
                  {selectedDuration && (
                    <div className="flex justify-between">
                      <span>{t("giftVouchers.duration")}</span>
                      <span>
                        {selectedDuration.minutes} {t("common.minutes")}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>{t("giftVouchers.price")}</span>
                    <span>{price} ₪</span>
                  </div>
                </>
              )}
              {guestInfo.isGift && (
                <>
                  <div className="flex justify-between">
                    <span>{t("giftVouchers.recipient")}</span>
                    <span>
                      {guestInfo.recipientFirstName} {guestInfo.recipientLastName}
                    </span>
                  </div>
                  {guestInfo.sendOption === "scheduled" &&
                    guestInfo.sendDate &&
                    guestInfo.sendTime && (
                      <div className="flex justify-between">
                        <span>{t("giftVouchers.sendTime")}</span>
                        <span>
                          {guestInfo.sendDate.toLocaleDateString()} {guestInfo.sendTime}
                        </span>
                      </div>
                    )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle>{t("giftVouchers.purchaserDetails")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>{t("common.name")}</span>
                <span>
                  {guestInfo.firstName} {guestInfo.lastName}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{t("common.email")}</span>
                <span>{guestInfo.email}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("common.phone")}</span>
                <span>{formatPhoneForDisplay(guestInfo.phone || "")}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={prevStep}>
          {t("common.back")}
        </Button>
        <Button onClick={nextStep}>{t("giftVouchers.wizard.continueToPay")}</Button>
      </div>
    </div>
  )

  const renderStep = () => {
    if (currentStep === 1) return renderVoucherTypeStep()
    if (currentStep === 2)
      return voucherType === "monetary" ? renderMonetaryStep() : renderTreatmentStep()
    if (currentStep === 3)
      return (
        <GuestInfoStep
          guestInfo={guestInfo}
          setGuestInfo={setGuestInfo}
          onNext={handleGuestInfoSubmit}
          onPrev={prevStep}
          defaultBookingForSomeoneElse
          hideRecipientBirthGender
          showGiftOptions
        />
      )
    if (currentStep === 4) return renderSummaryStep()
    if (currentStep === 5)
      return (
        <GuestPaymentStep
          calculatedPrice={calculatedPrice}
          guestInfo={guestInfo}
          setGuestInfo={setGuestInfo}
          onConfirm={handlePurchase}
          onPrev={prevStep}
          isLoading={isLoading}
        />
      )
    if (currentStep === 6 && purchaseComplete)
      return <GuestGiftVoucherConfirmation voucher={purchasedVoucher} />
    return null
  }

  const progress = (currentStep / TOTAL_STEPS) * 100

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6" dir={dir} lang={language}>
      <Progress value={progress} className="mb-8" />
      {renderStep()}
    </div>
  )
}
