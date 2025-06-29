"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CreditCard, ArrowLeft, Banknote, FileText, Gift, Info } from "lucide-react"

interface BookingCreatePaymentStepProps {
  formData: any
  onUpdate: (data: any) => void
  paymentMethods: any[]
  coupons: any[]
  giftVouchers: any[]
  onNext: () => void
  onPrev: () => void
}

export default function BookingCreatePaymentStep({
  formData,
  onUpdate,
  paymentMethods,
  coupons,
  giftVouchers,
  onNext,
  onPrev
}: BookingCreatePaymentStepProps) {
  const { t, dir } = useTranslation()
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateStep = () => {
    const newErrors: Record<string, string> = {}

    if (formData.paymentType === "immediate" && !formData.paymentMethodId) {
      newErrors.paymentMethodId = "יש לבחור אמצעי תשלום"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep()) {
      onNext()
    }
  }

  const calculateFinalPrice = () => {
    let basePrice = 320 // Default price, should come from treatment selection
    let discount = 0
    let additionalFees = 0

    // Apply coupon discount
    if (formData.appliedCouponCode) {
      discount = basePrice * 0.1 // 10% discount example
    }

    // Apply gift voucher
    if (formData.appliedGiftVoucherId) {
      discount = Math.min(discount + 100, basePrice) // 100 NIS gift voucher example
    }

    // Evening/weekend surcharge
    const isEvening = formData.bookingDateTime && formData.bookingDateTime.getHours() >= 20
    const isWeekend = formData.bookingDateTime && [5, 6].includes(formData.bookingDateTime.getDay())
    
    if (isEvening || isWeekend) {
      additionalFees += 50
    }

    return {
      basePrice,
      discount,
      additionalFees,
      finalPrice: basePrice - discount + additionalFees
    }
  }

  const priceBreakdown = calculateFinalPrice()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            תשלום והנחות
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Payment Type Selection */}
          <div className="space-y-3">
            <Label>סוג תשלום</Label>
            <RadioGroup
              value={formData.paymentType}
              onValueChange={(value) => onUpdate({ paymentType: value })}
              className="space-y-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="immediate" id="immediate" />
                <Label htmlFor="immediate" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  תשלום מיידי
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cash" id="cash" />
                <Label htmlFor="cash" className="flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  תשלום במזומן למטפל
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="invoice" id="invoice" />
                <Label htmlFor="invoice" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  חשבונית (לעסקים)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Payment Method Selection for Immediate Payment */}
          {formData.paymentType === "immediate" && (
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">אמצעי תשלום *</Label>
              <Select
                value={formData.paymentMethodId || ""}
                onValueChange={(value) => onUpdate({ paymentMethodId: value })}
              >
                <SelectTrigger className={errors.paymentMethodId ? "border-red-500" : ""}>
                  <SelectValue placeholder="בחר אמצעי תשלום..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card1">ויזה ****1234</SelectItem>
                  <SelectItem value="card2">מאסטרקארד ****5678</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="new">הוסף כרטיס חדש</SelectItem>
                </SelectContent>
              </Select>
              {errors.paymentMethodId && (
                <p className="text-sm text-red-500">{errors.paymentMethodId}</p>
              )}
            </div>
          )}

          {/* Coupon Code */}
          <div className="space-y-2">
            <Label htmlFor="couponCode">קוד קופון</Label>
            <div className="flex gap-2">
              <Input
                id="couponCode"
                value={formData.appliedCouponCode || ""}
                onChange={(e) => onUpdate({ appliedCouponCode: e.target.value })}
                placeholder="הכנס קוד קופון"
              />
              <Button variant="outline" size="sm">
                החל
              </Button>
            </div>
          </div>

          {/* Gift Voucher */}
          <div className="space-y-2">
            <Label htmlFor="giftVoucher">שובר מתנה</Label>
            <Select
              value={formData.appliedGiftVoucherId || ""}
              onValueChange={(value) => onUpdate({ appliedGiftVoucherId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="בחר שובר מתנה..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">ללא שובר מתנה</SelectItem>
                <SelectItem value="voucher1">שובר מתנה - 100 ש"ח</SelectItem>
                <SelectItem value="voucher2">שובר מתנה - 200 ש"ח</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Subscription Redemption */}
          <div className="space-y-2">
            <Label htmlFor="subscription">פדיון מנוי</Label>
            <Select
              value={formData.redeemedSubscriptionId || ""}
              onValueChange={(value) => onUpdate({ redeemedSubscriptionId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="בחר מנוי לפדיון..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">ללא פדיון מנוי</SelectItem>
                <SelectItem value="sub1">מנוי חודשי - 2 טיפולים נותרו</SelectItem>
                <SelectItem value="sub2">מנוי שנתי - 8 טיפולים נותרו</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Info Cards */}
          {formData.paymentType === "cash" && (
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Banknote className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">תשלום במזומן</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      התשלום יתבצע במזומן למטפל בתום הטיפול. אנא הכינו סכום מדויק.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {formData.paymentType === "invoice" && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800">תשלום בחשבונית</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      חשבונית תישלח לכתובת האימייל תוך 24 שעות. תנאי תשלום: 30 יום.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Price Breakdown */}
      <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Gift className="h-5 w-5" />
            סיכום מחיר
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span>מחיר בסיס:</span>
            <span>₪{priceBreakdown.basePrice}</span>
          </div>
          
          {priceBreakdown.discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>הנחה:</span>
              <span>-₪{priceBreakdown.discount}</span>
            </div>
          )}
          
          {priceBreakdown.additionalFees > 0 && (
            <div className="flex justify-between text-orange-600">
              <span>תוספת שעות מיוחדות:</span>
              <span>+₪{priceBreakdown.additionalFees}</span>
            </div>
          )}
          
          <hr className="border-gray-300" />
          
          <div className="flex justify-between text-lg font-bold">
            <span>סה"כ לתשלום:</span>
            <span className="text-green-600">₪{priceBreakdown.finalPrice}</span>
          </div>
          
          <p className="text-xs text-gray-600 mt-2">
            * המחיר כולל מע"מ, ציוד, חומרים והגעת המטפל
          </p>
        </CardContent>
      </Card>

      {/* Applied Discounts Summary */}
      {(formData.appliedCouponCode || formData.appliedGiftVoucherId || formData.redeemedSubscriptionId) && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg">הנחות מופעלות</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {formData.appliedCouponCode && (
              <div className="flex justify-between items-center">
                <span>קוד קופון: {formData.appliedCouponCode}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onUpdate({ appliedCouponCode: "" })}
                >
                  ביטול
                </Button>
              </div>
            )}
            {formData.appliedGiftVoucherId && (
              <div className="flex justify-between items-center">
                <span>שובר מתנה</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onUpdate({ appliedGiftVoucherId: "" })}
                >
                  ביטול
                </Button>
              </div>
            )}
            {formData.redeemedSubscriptionId && (
              <div className="flex justify-between items-center">
                <span>פדיון מנוי</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onUpdate({ redeemedSubscriptionId: "" })}
                >
                  ביטול
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cancellation Policy */}
      <Card>
        <CardContent className="pt-6">
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm leading-relaxed">
              <div className="space-y-2">
                <div className="font-medium">מדיניות ביטול:</div>
                <div>
                  • ביטול הזמנה מרגע ביצועה יחוייב בדמי ביטול של 5% מסכום ההזמנה.
                </div>
                <div>
                  • ביטול הזמנה פחות מ 24 שעות ממועד הטיפול יחוייב בדמי ביטול של 50% מסכום ההזמנה.
                </div>
                <div>
                  • ביטול הזמנה פחות מ 4 שעות ממועד הטיפול יחוייב בדמי ביטול מלאים של 100%.
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          חזור
        </Button>
        <Button onClick={handleNext}>
          המשך
        </Button>
      </div>
    </div>
  )
} 
