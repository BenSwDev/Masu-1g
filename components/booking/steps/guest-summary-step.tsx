"use client"

import { useState, useMemo } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { Separator } from "@/components/common/ui/separator"
import { Skeleton } from "@/components/common/ui/skeleton"
import { Badge } from "@/components/common/ui/badge"
import { CheckCircle, Calendar, Clock, User, Mail, Phone, FileText, CreditCard, Tag, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import type { BookingInitialData, SelectedBookingOptions, CalculatedPriceDetails } from "@/types/booking"

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
}

interface GuestSummaryStepProps {
  initialData: BookingInitialData
  bookingOptions: Partial<SelectedBookingOptions>
  guestInfo: Partial<GuestInfo>
  calculatedPrice: CalculatedPriceDetails | null
  isPriceCalculating: boolean
  onNext: () => void
  onPrev: () => void
  setBookingOptions?: React.Dispatch<React.SetStateAction<Partial<SelectedBookingOptions>>>
  voucher?: any
  userSubscription?: any
}

export function GuestSummaryStep({
  initialData,
  bookingOptions,
  guestInfo,
  calculatedPrice,
  isPriceCalculating,
  onNext,
  onPrev,
  setBookingOptions,
  voucher,
  userSubscription,
}: GuestSummaryStepProps) {
  const { t, language, dir } = useTranslation()
  const [couponCode, setCouponCode] = useState(bookingOptions.appliedCouponCode || "")
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)

  const isRedeeming = Boolean(voucher || userSubscription)

  const getSubscriptionName = () => {
    if (bookingOptions.source === "subscription_redemption" && userSubscription) {
      return userSubscription.subscriptionId?.name || t("bookings.unknownSubscription")
    }
    return null
  }

  const selectedGiftVoucherDisplay = useMemo(() => {
    if (bookingOptions.source === "gift_voucher_redemption" && voucher) {
      if (voucher.voucherType === "treatment") {
        return `${voucher.code} (${voucher.treatmentName}${voucher.selectedDurationName ? ` - ${voucher.selectedDurationName}` : ""})`
      }
      return `${voucher.code} (שובר כספי - יתרה: ${voucher.remainingAmount?.toFixed(2)} ₪)`
    }
    return null
  }, [bookingOptions.source, voucher])

  const selectedTreatment = useMemo(() => {
    return (initialData?.activeTreatments || []).find(
      (t) => t._id.toString() === bookingOptions.selectedTreatmentId
    )
  }, [initialData?.activeTreatments, bookingOptions.selectedTreatmentId])

  const selectedDuration = useMemo(() => {
    if (selectedTreatment?.pricingType === "duration_based" && selectedTreatment.durations) {
      return selectedTreatment.durations.find((d: any) => d._id.toString() === bookingOptions.selectedDurationId)
    }
    return null
  }, [selectedTreatment, bookingOptions.selectedDurationId])

  const formatDateString = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date
    return format(dateObj, "EEEE, d MMMM yyyy", { locale: language === "he" ? he : undefined })
  }

  const getTreatmentDurationText = () => {
    if (selectedTreatment?.pricingType === "fixed") {
      return selectedTreatment.defaultDuration 
        ? `${selectedTreatment.defaultDuration} דקות`
        : "משך סטנדרטי"
    }
    if (selectedDuration) {
      const hours = Math.floor((selectedDuration.minutes || 0) / 60)
      const mins = (selectedDuration.minutes || 0) % 60
      let durationString = ""
      if (hours > 0) {
        durationString += `${hours} ${hours === 1 ? "שעה" : "שעות"}`
      }
      if (mins > 0) {
        if (hours > 0) durationString += ` ו`
        durationString += `${mins} דקות`
      }
      return durationString || `${selectedDuration.minutes} דקות`
    }
    return ""
  }

  const getGenderPreferenceText = () => {
    switch (bookingOptions.therapistGenderPreference) {
      case "male":
        return "מטפל גבר"
      case "female":
        return "מטפלת אישה"
      case "any":
      default:
        return "ללא העדפה"
    }
  }

  const formatPrice = (amount: number) => {
    return `₪${amount.toFixed(2)}`
  }

  const handleCouponApply = async () => {
    if (!couponCode.trim() || !setBookingOptions) return
    setIsApplyingCoupon(true)
    try {
      // Apply coupon to booking options - this will trigger price recalculation
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
    if (!setBookingOptions) return
    setCouponCode("")
    setBookingOptions(prev => ({
      ...prev,
      appliedCouponCode: undefined
    }))
  }

  return (
    <div className="space-y-6" dir={dir}>
      <div className="text-center">
        <CheckCircle className="mx-auto h-12 w-12 text-primary mb-4" />
        <h2 className="text-2xl font-semibold tracking-tight">סיכום ההזמנה</h2>
        <p className="text-muted-foreground mt-2">בדוק את פרטי ההזמנה לפני המעבר לתשלום</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Guest Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {guestInfo.isBookingForSomeoneElse ? "פרטי המזמין" : "פרטי האורח"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">שם:</span>
                <span className="font-medium">{guestInfo.firstName} {guestInfo.lastName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  אימייל:
                </span>
                <span className="font-medium">{guestInfo.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  טלפון:
                </span>
                <span className="font-medium">{guestInfo.phone}</span>
              </div>
              {!guestInfo.isBookingForSomeoneElse && (
                <>
                  {guestInfo.birthDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">תאריך לידה:</span>
                      <span className="font-medium">{format(guestInfo.birthDate, "dd/MM/yyyy")}</span>
                    </div>
                  )}
                  {guestInfo.gender && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">מגדר:</span>
                      <span className="font-medium">
                        {guestInfo.gender === "male" ? "גבר" : guestInfo.gender === "female" ? "אישה" : "אחר"}
                      </span>
                    </div>
                  )}
                </>
              )}
              {guestInfo.notes && (
                <div>
                  <span className="text-muted-foreground flex items-center gap-1 mb-2">
                    <FileText className="h-4 w-4" />
                    הערות:
                  </span>
                  <p className="text-sm bg-muted p-3 rounded-lg">{guestInfo.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recipient Information (when booking for someone else) */}
        {guestInfo.isBookingForSomeoneElse && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                פרטי מקבל הטיפול
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">שם:</span>
                  <span className="font-medium">{guestInfo.recipientFirstName} {guestInfo.recipientLastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    אימייל:
                  </span>
                  <span className="font-medium">{guestInfo.recipientEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    טלפון:
                  </span>
                  <span className="font-medium">{guestInfo.recipientPhone}</span>
                </div>
                {guestInfo.recipientBirthDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">תאריך לידה:</span>
                    <span className="font-medium">{format(guestInfo.recipientBirthDate, "dd/MM/yyyy")}</span>
                  </div>
                )}
                {guestInfo.recipientGender && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">מגדר:</span>
                    <span className="font-medium">
                      {guestInfo.recipientGender === "male" ? "גבר" : guestInfo.recipientGender === "female" ? "אישה" : "אחר"}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Booking Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              פרטי ההזמנה
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-muted-foreground">טיפול:</span>
                <div className="font-medium text-right">
                  <span>{selectedTreatment?.name}</span>
                  {getSubscriptionName() && (
                    <span className="block text-xs text-primary mt-1">
                      🎫 משתמש במנוי: {getSubscriptionName()}
                    </span>
                  )}
                  {selectedGiftVoucherDisplay && (
                    <span className="block text-xs text-primary mt-1">
                      🎁 משתמש בשובר: {selectedGiftVoucherDisplay}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">קטגוריה:</span>
                <Badge variant="secondary">{selectedTreatment?.category}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">משך זמן:</span>
                <span className="font-medium">{getTreatmentDurationText()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  תאריך:
                </span>
                <span className="font-medium">
                  {bookingOptions.bookingDate ? formatDateString(bookingOptions.bookingDate) : "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  שעה:
                </span>
                <span className="font-medium">{bookingOptions.bookingTime || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">העדפת מטפל:</span>
                <span className="font-medium">{getGenderPreferenceText()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coupon Code Section - Hide when redeeming voucher/subscription */}
      {setBookingOptions && !isRedeeming && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              קוד קופון
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="coupon-code" className="sr-only">
                  קוד קופון
                </Label>
                <Input
                  id="coupon-code"
                  placeholder="הכנס קוד קופון"
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
                החל קופון
              </Button>
            </div>
            {bookingOptions.appliedCouponCode && (
              <div className="mt-2 flex items-center justify-between text-sm text-green-600">
                <span className="flex items-center">
                  <CheckCircle className="mr-1 h-4 w-4" />
                  קופון הוחל בהצלחה
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCouponRemove}
                  className="h-6 px-2 text-xs"
                >
                  הסר קופון
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Price Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            פירוט מחיר
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isPriceCalculating ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
            </div>
          ) : calculatedPrice ? (
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>מחיר בסיס:</span>
                <span>{formatPrice(calculatedPrice.basePrice)}</span>
              </div>
              
              {calculatedPrice.surcharges && calculatedPrice.surcharges.length > 0 && (
                <div className="space-y-2">
                  {calculatedPrice.surcharges.map((surcharge, index) => (
                    <div key={index} className="flex justify-between text-orange-600">
                      <span>{surcharge.description || "תוספת מחיר"}:</span>
                      <span>+{formatPrice(surcharge.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              {calculatedPrice.couponDiscount && calculatedPrice.couponDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span className="flex items-center gap-1">
                    <Tag className="h-4 w-4" />
                    הנחת קופון:
                  </span>
                  <span>-{formatPrice(calculatedPrice.couponDiscount)}</span>
                </div>
              )}

              <Separator />
              
              <div className="flex justify-between text-lg font-semibold">
                <span>סכום לתשלום:</span>
                <span className="text-primary">{formatPrice(calculatedPrice.finalAmount)}</span>
              </div>

              {calculatedPrice.finalAmount === 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 text-sm font-medium">
                    ההזמנה חינמית - אין צורך בתשלום
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-4">
              <p>לא ניתן לחשב את המחיר כרגע. אנא נסה שוב.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          חזור
        </Button>
        <Button 
          onClick={onNext} 
          disabled={isPriceCalculating || !calculatedPrice}
        >
          {calculatedPrice?.finalAmount === 0 
            ? "אשר הזמנה" 
            : "המשך לתשלום"
          }
        </Button>
      </div>
    </div>
  )
} 