"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { Loader2, Tag, CheckCircle } from "lucide-react"
import type { BookingInitialData, SelectedBookingOptions, CalculatedPriceDetails } from "@/types/booking"
import { Alert, AlertDescription } from "@/components/common/ui/alert"
import { Separator } from "@/components/common/ui/separator"

interface GuestPaymentStepProps {
  initialData: BookingInitialData
  bookingOptions: Partial<SelectedBookingOptions>
  setBookingOptions: React.Dispatch<React.SetStateAction<Partial<SelectedBookingOptions>>>
  calculatedPrice: CalculatedPriceDetails | null
  isLoadingPrice: boolean
  onNext: () => void
  onPrev: () => void
}

export default function GuestPaymentStep({
  initialData,
  bookingOptions,
  setBookingOptions,
  calculatedPrice,
  isLoadingPrice,
  onNext,
  onPrev,
}: GuestPaymentStepProps) {
  const { t } = useTranslation()
  const [couponCode, setCouponCode] = useState(bookingOptions.appliedCouponCode || "")
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)

  const handleCouponApply = async () => {
    if (!couponCode.trim()) return
    setIsApplyingCoupon(true)
    try {
      // Here you would typically call your API to validate and apply the coupon
      // For now, we'll just update the booking options
      setBookingOptions(prev => ({
        ...prev,
        appliedCouponCode: couponCode.trim()
      }))
    } catch (error) {
      console.error("Failed to apply coupon:", error)
    } finally {
      setIsApplyingCoupon(false)
    }
  }

  const handleCouponRemove = () => {
    setCouponCode("")
    setBookingOptions(prev => ({
      ...prev,
      appliedCouponCode: undefined
    }))
  }

  const priceSummaryContent = () => {
    if (!calculatedPrice) return null
    const {
      basePrice,
      surcharges,
      couponDiscount,
      finalAmount,
    } = calculatedPrice

    return (
      <>
        <div className="flex justify-between">
          <span>{t("bookings.steps.summary.basePrice")}:</span>
          <span>
            {basePrice.toFixed(2)} {t("common.currency")}
          </span>
        </div>
        {surcharges.map((surcharge, index) => (
          <div key={index} className="flex justify-between">
            <span>{t(surcharge.description) || surcharge.description}:</span>
            <span className="text-orange-600">
              + {surcharge.amount.toFixed(2)} {t("common.currency")}
            </span>
          </div>
        ))}
        {couponDiscount > 0 && (
          <div className="flex justify-between items-center font-medium text-green-600">
            <span className="flex items-center">
              <Tag className="mr-2 h-4 w-4" />
              {t("bookings.steps.summary.couponDiscount")}:
            </span>
            <span>
              - {couponDiscount.toFixed(2)} {t("common.currency")}
            </span>
          </div>
        )}
        <Separator className="my-3" />
        <div className="flex justify-between font-bold text-lg">
          <span>{t("bookings.steps.summary.totalAmount")}:</span>
          <span className="text-primary">
            {finalAmount.toFixed(2)} {t("common.currency")}
          </span>
        </div>
      </>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight">{t("bookings.steps.payment.title")}</h2>
        <p className="text-muted-foreground mt-2">{t("bookings.steps.payment.description")}</p>
      </div>

      {/* Coupon Code Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Tag className="mr-2 h-5 w-5 text-primary" />
            {t("bookings.steps.summary.couponCode")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="coupon-code" className="sr-only">
                {t("bookings.steps.summary.couponCode")}
              </Label>
              <Input
                id="coupon-code"
                placeholder={t("bookings.steps.summary.couponPlaceholder")}
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="text-base"
              />
            </div>
            <Button
              onClick={handleCouponApply}
              disabled={isApplyingCoupon || !couponCode.trim()}
              type="button"
            >
              {isApplyingCoupon && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("bookings.steps.summary.applyCoupon")}
            </Button>
          </div>
          {bookingOptions.appliedCouponCode && (
            <div className="mt-2 flex items-center justify-between text-sm text-green-600">
              <span className="flex items-center">
                <CheckCircle className="mr-1 h-4 w-4" />
                {t("bookings.steps.summary.couponApplied")}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCouponRemove}
                className="h-6 px-2 text-xs"
              >
                {t("bookings.steps.summary.removeCoupon")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Price Summary Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("common.priceSummary")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {isLoadingPrice && (
            <div className="flex items-center justify-center p-6 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary mr-3" />
              <span>{t("bookings.steps.summary.calculatingPrice")}</span>
            </div>
          )}
          {!isLoadingPrice && !calculatedPrice && (
            <Alert variant="destructive">
              <AlertDescription>{t("bookings.errors.priceCalculationUnavailable")}</AlertDescription>
            </Alert>
          )}
          {!isLoadingPrice && calculatedPrice && priceSummaryContent()}
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6">
        <Button
          variant="outline"
          type="button"
          onClick={onPrev}
          disabled={isLoadingPrice}
          size="lg"
          className="w-full sm:w-auto"
        >
          {t("common.back")}
        </Button>
        <Button
          type="button"
          onClick={onNext}
          disabled={isLoadingPrice || !calculatedPrice}
          size="lg"
          className="w-full sm:w-auto"
        >
          {isLoadingPrice && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("bookings.steps.payment.confirmBooking")}
        </Button>
      </div>
    </div>
  )
} 