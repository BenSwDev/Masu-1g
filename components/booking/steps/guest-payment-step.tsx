﻿"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { usePaymentModal } from "@/hooks/use-payment-modal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Loader2,
  CreditCard,
  CheckCircle,
  XCircle,
  Tag,
  AlertTriangle,
  Info,
  Bell,
  Mail,
  MessageSquare,
  Globe,
} from "lucide-react"
import type { CalculatedPriceDetails } from "@/types/booking"

interface GuestInfo {
  firstName: string
  lastName: string
  email: string
  phone: string
  birthDate?: Date
  gender?: "male" | "female" | "other"
  notes?: string
  isBookingForSomeoneElse?: boolean
  recipientFirstName?: string
  recipientLastName?: string
  recipientEmail?: string
  recipientPhone?: string
  recipientBirthDate?: Date
  recipientGender?: "male" | "female" | "other"
  // Notification preferences
  bookerNotificationMethod?: "email" | "sms" | "both"
  bookerNotificationLanguage?: "he" | "en" | "ru"
  recipientNotificationMethod?: "email" | "sms" | "both"
  recipientNotificationLanguage?: "he" | "en" | "ru"
  // âž• ×”×¡×›×ž×•×ª ×—×“×©×•×ª
  consents?: {
    customerAlerts: "sms" | "email" | "none"
    patientAlerts: "sms" | "email" | "none"
    marketingOptIn: boolean
    termsAccepted: boolean
  }
}

interface GuestPaymentStepProps {
  calculatedPrice: CalculatedPriceDetails | null
  guestInfo: Partial<GuestInfo>
  setGuestInfo: (info: Partial<GuestInfo>) => void
  onConfirm: () => void
  onPrev: () => void
  isLoading: boolean
  createPendingBooking?: () => Promise<string | null>
  pendingBookingId?: string | null
  isRedeeming?: boolean
  customFailureHandler?: (reason?: string) => void | Promise<void>
}

export function GuestPaymentStep({
  calculatedPrice,
  guestInfo,
  setGuestInfo,
  onConfirm,
  onPrev,
  isLoading,
  createPendingBooking,
  pendingBookingId = null,
  isRedeeming = false,
  customFailureHandler,
}: GuestPaymentStepProps) {
  const { t, dir } = useTranslation()
  const {
    showPaymentModal,
    paymentStatus,
    countdown,
    isCountingDown,
    openModal,
    handlePaymentSuccess,
    handlePaymentFailure,
    handleTryAgain,
    handleOpenChange,
  } = usePaymentModal({
    onSuccess: async () => {
      console.log("ðŸ¦ GuestPaymentStep onSuccess triggered - payment simulation successful")

      // âœ… Simply call onConfirm which will create the final booking directly
      console.log("ðŸŽ¯ Calling onConfirm (handleFinalSubmit)")
      onConfirm()
    },
    onFailure: customFailureHandler,
  })
  const [marketingConsent, setMarketingConsent] = useState(true)
  const [termsAccepted, setTermsAccepted] = useState(true)

  // âž• ×©×“×•×ª ×”×¡×›×ž×•×ª ×—×“×©×™×
  const [customerAlerts, setCustomerAlerts] = useState<"sms" | "email" | "none">("sms")
  const [patientAlerts, setPatientAlerts] = useState<"sms" | "email" | "none">("sms")

  // Notification preferences state
  const [bookerNotificationMethod, setBookerNotificationMethod] = useState<
    "email" | "sms" | "both"
  >(guestInfo.bookerNotificationMethod || "sms")
  const [bookerNotificationLanguage, setBookerNotificationLanguage] = useState<"he" | "en" | "ru">(
    guestInfo.bookerNotificationLanguage || "he"
  )
  const [recipientNotificationMethod, setRecipientNotificationMethod] = useState<
    "email" | "sms" | "both"
  >(guestInfo.recipientNotificationMethod || "sms")
  const [recipientNotificationLanguage, setRecipientNotificationLanguage] = useState<
    "he" | "en" | "ru"
  >(guestInfo.recipientNotificationLanguage || "he")

  // Update guest info when notification preferences change
  useEffect(() => {
    setGuestInfo({
      ...guestInfo,
      bookerNotificationMethod,
      bookerNotificationLanguage,
      recipientNotificationMethod,
      recipientNotificationLanguage,
      // âž• ×”×¡×›×ž×•×ª ×—×“×©×•×ª
      consents: {
        customerAlerts,
        patientAlerts,
        marketingOptIn: marketingConsent,
        termsAccepted,
      },
    })
  }, [
    bookerNotificationMethod,
    bookerNotificationLanguage,
    recipientNotificationMethod,
    recipientNotificationLanguage,
    customerAlerts,
    patientAlerts,
    marketingConsent,
    termsAccepted,
  ])

  const formatPrice = (amount: number) => {
    return `â‚ª${amount.toFixed(2)}`
  }

  const handlePayNow = async () => {
    if (isCountingDown || !termsAccepted) return

    // Only open the payment modal - don't create booking or execute any other actions
    openModal()
  }

  if (
    !calculatedPrice ||
    (calculatedPrice.finalAmount === 0 && calculatedPrice.isFullyCoveredByVoucherOrSubscription)
  ) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex flex-col items-center">
          <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
          <h2 className="text-2xl font-semibold tracking-tight">
            {t("bookings.steps.payment.confirmTitleNoPayment")}
          </h2>
          <p className="text-muted-foreground mt-1 max-w-md mx-auto">
            {t("bookings.steps.payment.confirmDescNoPayment")}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
          <Button variant="outline" onClick={onPrev} disabled={isLoading} type="button" size="lg">
            {t("common.back")}
          </Button>
          <Button onClick={onConfirm} disabled={isLoading} type="button" size="lg">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("bookings.steps.payment.confirmBooking")}
          </Button>
        </div>
      </div>
    )
  }

  // Regular payment flow with full interface
  return (
    <>
      <div className="space-y-6" dir={dir}>
        <div className="text-center">
          <CreditCard className="mx-auto h-12 w-12 text-primary mb-4" />
          <h2 className="text-2xl font-semibold tracking-tight">×ª×©×œ×•×</h2>
          <p className="text-muted-foreground mt-2">×¡×™×›×•× ×”×”×–×ž× ×” ×•×”×ž×¢×‘×¨ ×œ×ª×©×œ×•×</p>
        </div>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              ×¡×™×›×•× ×”×–×ž× ×”
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Base Price */}
              <div className="flex justify-between">
                <span>×ž×—×™×¨ ×‘×¡×™×¡:</span>
                <span>{formatPrice(calculatedPrice.basePrice)}</span>
              </div>

              {/* Surcharges */}
              {calculatedPrice.surcharges && calculatedPrice.surcharges.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-orange-700">×ª×•×¡×¤×•×ª ×ž×—×™×¨:</div>
                  {calculatedPrice.surcharges.map((surcharge, index) => (
                    <div key={index} className="flex justify-between text-orange-600 text-sm pr-4">
                      <span>â€¢ {surcharge.description || "×ª×•×¡×¤×ª ×ž×—×™×¨"}:</span>
                      <span>+{formatPrice(surcharge.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-orange-600 font-medium border-t pt-2">
                    <span>×¡×”"×› ×ª×•×¡×¤×•×ª:</span>
                    <span>+{formatPrice(calculatedPrice.totalSurchargesAmount)}</span>
                  </div>
                </div>
              )}

              {/* After subscription/voucher coverage */}
              {(calculatedPrice.isBaseTreatmentCoveredBySubscription ||
                calculatedPrice.isBaseTreatmentCoveredByTreatmentVoucher) && (
                <div className="space-y-2">
                  <div className="flex justify-between text-green-600">
                    <span>
                      {calculatedPrice.isBaseTreatmentCoveredBySubscription
                        ? "×›×•×¡×” ×¢×œ ×™×“×™ ×ž× ×•×™:"
                        : "×›×•×¡×” ×¢×œ ×™×“×™ ×©×•×‘×¨ ×˜×™×¤×•×œ:"}
                    </span>
                    <span>-{formatPrice(calculatedPrice.basePrice)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>×ž×—×™×¨ ×œ××—×¨ ×›×™×¡×•×™ ×ž× ×•×™/×©×•×‘×¨:</span>
                    <span>
                      {formatPrice(
                        calculatedPrice.treatmentPriceAfterSubscriptionOrTreatmentVoucher
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Gift voucher application */}
              {calculatedPrice.voucherAppliedAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span className="flex items-center gap-1">
                    <Tag className="h-4 w-4" />
                    ×©×•×‘×¨ ×ž×ª× ×”:
                  </span>
                  <span>-{formatPrice(calculatedPrice.voucherAppliedAmount)}</span>
                </div>
              )}

              {/* Coupon discount */}
              {calculatedPrice.couponDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span className="flex items-center gap-1">
                    <Tag className="h-4 w-4" />
                    ×”× ×—×ª ×§×•×¤×•×Ÿ:
                  </span>
                  <span>-{formatPrice(calculatedPrice.couponDiscount)}</span>
                </div>
              )}

              <Separator />

              {/* Final Amount */}
              <div className="flex justify-between text-xl font-bold">
                <span>×¡×›×•× ×œ×ª×©×œ×•×:</span>
                <span className="text-primary">{formatPrice(calculatedPrice.finalAmount)}</span>
              </div>

              {calculatedPrice.isFullyCoveredByVoucherOrSubscription && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>×”×”×–×ž× ×” ×ž×›×•×¡×” ×‘×ž×œ×•××” ×¢×œ ×™×“×™ ×ž× ×•×™ ××• ×©×•×‘×¨</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              ×”×¢×“×¤×•×ª ×”×ª×¨××•×ª
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Booker Notification Preferences */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                ×”×ª×¨××•×ª ×¢×‘×•×¨ ×”×ž×–×ž×™×Ÿ ({guestInfo.firstName} {guestInfo.lastName})
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">××ž×¦×¢×™ ×”×ª×¨××”:</label>
                  <Select
                    value={bookerNotificationMethod}
                    onValueChange={(value: "email" | "sms" | "both") =>
                      setBookerNotificationMethod(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          ××™×ž×™×™×œ ×‘×œ×‘×“
                        </div>
                      </SelectItem>
                      <SelectItem value="sms">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          SMS ×‘×œ×‘×“
                        </div>
                      </SelectItem>
                      <SelectItem value="both">
                        <div className="flex items-center gap-2">
                          <Bell className="h-4 w-4" />
                          ××™×ž×™×™×œ + SMS
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">×©×¤×ª ×”×”×ª×¨××”:</label>
                  <Select
                    value={bookerNotificationLanguage}
                    onValueChange={(value: "he" | "en" | "ru") =>
                      setBookerNotificationLanguage(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="he">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          ×¢×‘×¨×™×ª
                        </div>
                      </SelectItem>
                      <SelectItem value="en">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          English
                        </div>
                      </SelectItem>
                      <SelectItem value="ru">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Ð ÑƒÑÑÐºÐ¸Ð¹
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Recipient Notification Preferences (only if booking for someone else) */}
            {guestInfo.isBookingForSomeoneElse && (
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  ×”×ª×¨××•×ª ×¢×‘×•×¨ ×ž×§×‘×œ ×”×˜×™×¤×•×œ ({guestInfo.recipientFirstName}{" "}
                  {guestInfo.recipientLastName})
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">××ž×¦×¢×™ ×”×ª×¨××”:</label>
                    <Select
                      value={recipientNotificationMethod}
                      onValueChange={(value: "email" | "sms" | "both") =>
                        setRecipientNotificationMethod(value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            ××™×ž×™×™×œ ×‘×œ×‘×“
                          </div>
                        </SelectItem>
                        <SelectItem value="sms">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            SMS ×‘×œ×‘×“
                          </div>
                        </SelectItem>
                        <SelectItem value="both">
                          <div className="flex items-center gap-2">
                            <Bell className="h-4 w-4" />
                            ××™×ž×™×™×œ + SMS
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">×©×¤×ª ×”×”×ª×¨××”:</label>
                    <Select
                      value={recipientNotificationLanguage}
                      onValueChange={(value: "he" | "en" | "ru") =>
                        setRecipientNotificationLanguage(value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="he">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            ×¢×‘×¨×™×ª
                          </div>
                        </SelectItem>
                        <SelectItem value="en">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            English
                          </div>
                        </SelectItem>
                        <SelectItem value="ru">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            Ð ÑƒÑÑÐºÐ¸Ð¹
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cancellation Policy and Consent Checkboxes */}
        <Card>
          <CardContent className="pt-6">
            {/* Cancellation Policy */}
            <Alert className="mb-6">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm leading-relaxed">
                <div className="space-y-2">
                  <div className="font-medium">×ž×“×™× ×™×•×ª ×‘×™×˜×•×œ:</div>
                  <div>â€¢ ×‘×™×˜×•×œ ×”×–×ž× ×” ×ž×¨×’×¢ ×‘×™×¦×•×¢×” ×™×—×•×™×™×‘ ×‘×“×ž×™ ×‘×™×˜×•×œ ×©×œ 5% ×ž×¡×›×•× ×”×”×–×ž× ×”.</div>
                  <div>
                    â€¢ ×‘×™×˜×•×œ ×”×–×ž× ×” ×¤×—×•×ª ×ž 24 ×©×¢×•×ª ×ž×ž×•×¢×“ ×”×˜×™×¤×•×œ ×™×—×•×™×™×‘ ×‘×“×ž×™ ×‘×™×˜×•×œ ×©×œ 50% ×ž×¡×›×•× ×”×”×–×ž× ×”.
                  </div>
                  <div>
                    â€¢ ×‘×™×˜×•×œ ×”×–×ž× ×” ×¤×—×•×ª ×ž 4 ×©×¢×•×ª ×ž×ž×•×¢×“ ×”×˜×™×¤×•×œ ×™×—×•×™×™×‘ ×‘×“×ž×™ ×‘×™×˜×•×œ ×ž×œ××™× ×©×œ 100%.
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            {/* Checkboxes */}
            <div className="space-y-4">
              <div className="flex items-start space-x-3 space-x-reverse">
                <Checkbox
                  id="marketing-consent"
                  checked={marketingConsent}
                  onCheckedChange={checked => setMarketingConsent(checked as boolean)}
                />
                <label
                  htmlFor="marketing-consent"
                  className="text-sm leading-relaxed cursor-pointer"
                >
                  ×× ×™ ×ž××©×¨/×ª ×§×‘×œ×ª ×“×™×•×•×¨ ×©×œ ×—×•×ž×¨×™× ×¤×¨×¡×•×ž×™×™×, ×”×¦×¢×•×ª ×™×©×•×•×§×™×•×ª ×•×¢×“×›×•× ×™× ×‘××ž×¦×¢×™ ×”×ž×“×™×”
                  ×”×©×•× ×™×, ×œ×¨×‘×•×ª ×‘×“×•××¨ ××œ×§×˜×¨×•× ×™ SMS ×•/××• ×©×™×—×” ×˜×œ×¤×•× ×™×ª
                </label>
              </div>

              <div className="flex items-start space-x-3 space-x-reverse">
                <Checkbox
                  id="terms-accepted"
                  checked={termsAccepted}
                  onCheckedChange={checked => setTermsAccepted(checked as boolean)}
                />
                <label htmlFor="terms-accepted" className="text-sm leading-relaxed cursor-pointer">
                  ×‘×‘×™×¦×•×¢ ×”×”×–×ž× ×” ×× ×™ ×ž××©×¨ ××ª ×”×¡×›×ž×ª×™ ×œ×ª× ××™ ×”×©×™×ž×•×© ×•×ž×“×™× ×™×•×ª ×”×¤×¨×˜×™×•×ª
                  <span className="text-red-500 mr-1">*</span>
                </label>
              </div>

              {!termsAccepted && (
                <div className="text-red-500 text-sm">
                  ×™×© ×œ××©×¨ ××ª ×ª× ××™ ×”×©×™×ž×•×© ×•×ž×“×™× ×™×•×ª ×”×¤×¨×˜×™×•×ª ×›×“×™ ×œ×”×ž×©×™×š
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={onPrev} disabled={isLoading}>
            ×—×–×•×¨
          </Button>
          <Button
            onClick={handlePayNow}
            disabled={isLoading || isCountingDown || !termsAccepted}
            size="lg"
            className="px-8"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isCountingDown
              ? `× ×¡×” ×©×•×‘ ×‘×¢×•×“ ${countdown} ×©× ×™×•×ª`
              : `×©×œ× ×›×¢×ª ${formatPrice(calculatedPrice.finalAmount)}`}
          </Button>
        </div>
      </div>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-center">×ª×©×œ×•× ×ž××•×‘×˜×—</DialogTitle>
          </DialogHeader>

          <div className="space-y-6" dir={dir}>
            {paymentStatus === "pending" && (
              <>
                {/* CardComm iframe simulation */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                  <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    ×›××Ÿ ×™×”×™×” IFRAME ×©×œ CARDCOMM
                  </h3>
                  <p className="text-gray-500">×ž×ž×©×§ ×”×ª×©×œ×•× ×”×ž××•×‘×˜×— ×©×œ CardComm</p>
                  <div className="mt-4 p-4 bg-white border rounded">
                    <p className="text-sm text-gray-600">
                      ×¡×›×•× ×œ×ª×©×œ×•×:{" "}
                      <span className="font-bold">{formatPrice(calculatedPrice.finalAmount)}</span>
                    </p>
                  </div>
                </div>

                {/* Demo buttons */}
                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={handlePaymentSuccess}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    ×“×™×ž×•×™ ×”×¦×œ×—×”
                  </Button>
                  <Button
                    onClick={() => handlePaymentFailure("×ª×©×œ×•× × ×›×©×œ ×¢×§×‘ ×‘×¢×™×” ×˜×›× ×™×ª")}
                    variant="destructive"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    ×“×™×ž×•×™ ×›×™×©×œ×•×Ÿ
                  </Button>
                </div>
              </>
            )}

            {paymentStatus === "success" && (
              <div className="text-center py-8">
                <CheckCircle className="mx-auto h-16 w-16 text-green-600 mb-4" />
                <h3 className="text-xl font-semibold text-green-700 mb-2">×”×ª×©×œ×•× ×‘×•×¦×¢ ×‘×”×¦×œ×—×”!</h3>
                <p className="text-gray-600">×”×”×–×ž× ×” ××•×©×¨×” ×•×¤×¨×˜×™×” × ×©×œ×—×• ××œ×™×š ×‘××™×ž×™×™×œ</p>
              </div>
            )}

            {paymentStatus === "failed" && (
              <div className="text-center py-8">
                <XCircle className="mx-auto h-16 w-16 text-red-600 mb-4" />
                <h3 className="text-xl font-semibold text-red-700 mb-2">×”×ª×©×œ×•× × ×›×©×œ</h3>
                <p className="text-gray-600 mb-6">××™×¨×¢×” ×©×’×™××” ×‘×‘×™×¦×•×¢ ×”×ª×©×œ×•×. ×× × × ×¡×” ×©×•×‘.</p>

                <Alert className="mb-6">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>×œ× ×—×•×™×‘×ª. ××™×Ÿ ×ª×©×œ×•× ×©×‘×•×¦×¢ ×¢×‘×•×¨ ×”×”×–×ž× ×” ×”×–×•.</AlertDescription>
                </Alert>

                <Button onClick={handleTryAgain} className="w-full">
                  × ×¡×” ×©× ×™×ª
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}


