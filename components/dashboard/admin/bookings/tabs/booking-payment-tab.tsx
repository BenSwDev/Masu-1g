"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { Label } from "@/components/common/ui/label"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import { 
  CreditCard,
  DollarSign,
  Gift,
  Percent,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle
} from "lucide-react"
import type { PopulatedBooking } from "@/types/booking"

interface BookingPaymentTabProps {
  booking: PopulatedBooking
  onUpdate: (updates: Partial<PopulatedBooking>) => void
}

export default function BookingPaymentTab({ booking, onUpdate }: BookingPaymentTabProps) {
  const { t } = useTranslation()

  const formatDate = (date?: Date | string) => {
    if (!date) return "לא צוין"
    return format(new Date(date), "dd/MM/yyyy בשעה HH:mm", { locale: he })
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return "₪0"
    return `₪${amount.toFixed(2)}`
  }

  const getPaymentStatusBadge = (status?: string) => {
    switch (status) {
      case "paid":
        return <Badge variant="default" className="bg-green-100 text-green-800">שולם</Badge>
      case "pending":
        return <Badge variant="secondary">ממתין לתשלום</Badge>
      case "failed":
        return <Badge variant="destructive">נכשל</Badge>
      case "refunded":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">הוחזר</Badge>
      case "cancelled":
        return <Badge variant="outline">בוטל</Badge>
      default:
        return <Badge variant="secondary">לא ידוע</Badge>
    }
  }

  const getPaymentMethodName = (method?: string) => {
    switch (method) {
      case "credit_card": return "כרטיס אשראי"
      case "cash": return "מזומן"
      case "bank_transfer": return "העברה בנקאית"
      case "gift_voucher": return "שובר מתנה"
      case "coupon": return "קופון"
      default: return method || "לא צוין"
    }
  }

  return (
    <div className="space-y-6">
      {/* Payment Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            סטטוס תשלום
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">סטטוס נוכחי</Label>
              {getPaymentStatusBadge(booking.paymentStatus)}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">סכום כולל</Label>
              <p className="text-lg font-semibold">{formatCurrency(booking.totalPrice)}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">סכום שולם</Label>
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(booking.paidAmount || 0)}
              </p>
            </div>
          </div>

          {/* Outstanding Amount */}
          {booking.totalPrice && booking.paidAmount !== undefined && booking.totalPrice > booking.paidAmount && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <span className="font-medium text-amber-800">יתרה לתשלום</span>
              </div>
              <p className="text-2xl font-bold text-amber-600 mt-2">
                {formatCurrency(booking.totalPrice - booking.paidAmount)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            אמצעי תשלום
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">אמצעי תשלום</Label>
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <span>{getPaymentMethodName(booking.paymentMethod)}</span>
              </div>
            </div>

            {booking.paymentDate && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">תאריך תשלום</Label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{formatDate(booking.paymentDate)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Payment Transaction ID */}
          {booking.paymentTransactionId && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">מזהה עסקה</Label>
              <p className="text-sm font-mono bg-gray-100 p-2 rounded">
                {booking.paymentTransactionId}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            פירוט מחיר
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {/* Base Price */}
            <div className="flex justify-between items-center">
              <Label className="text-sm">מחיר בסיס</Label>
              <span>{formatCurrency(booking.basePrice)}</span>
            </div>

            {/* Transport Fee */}
            {booking.transportFee && booking.transportFee > 0 && (
              <div className="flex justify-between items-center">
                <Label className="text-sm">דמי נסיעה</Label>
                <span>{formatCurrency(booking.transportFee)}</span>
              </div>
            )}

            {/* Service Fee */}
            {booking.serviceFee && booking.serviceFee > 0 && (
              <div className="flex justify-between items-center">
                <Label className="text-sm">דמי שירות</Label>
                <span>{formatCurrency(booking.serviceFee)}</span>
              </div>
            )}

            {/* Total Before Discounts */}
            <div className="flex justify-between items-center pt-2 border-t">
              <Label className="text-sm font-medium">סך הכל לפני הנחות</Label>
              <span className="font-medium">
                {formatCurrency((booking.basePrice || 0) + (booking.transportFee || 0) + (booking.serviceFee || 0))}
              </span>
            </div>

            {/* Discounts */}
            {booking.discountAmount && booking.discountAmount > 0 && (
              <div className="flex justify-between items-center text-green-600">
                <div className="flex items-center gap-1">
                  <Percent className="w-4 h-4" />
                  <Label className="text-sm">הנחה</Label>
                </div>
                <span>-{formatCurrency(booking.discountAmount)}</span>
              </div>
            )}

            {/* Final Total */}
            <div className="flex justify-between items-center pt-2 border-t">
              <Label className="text-lg font-semibold">סך הכל לתשלום</Label>
              <span className="text-lg font-bold">{formatCurrency(booking.totalPrice)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coupons & Discounts */}
      {(booking.couponId || booking.discountAmount) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="w-5 h-5" />
              קופונים והנחות
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {booking.couponId && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-green-800">קופון מופעל</Label>
                    <p className="text-sm text-green-700">
                      {typeof booking.couponId === 'object' 
                        ? booking.couponId.code 
                        : 'קופון לא זמין'}
                    </p>
                  </div>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    פעיל
                  </Badge>
                </div>
                {typeof booking.couponId === 'object' && booking.couponId.description && (
                  <p className="text-sm text-green-600 mt-2">
                    {booking.couponId.description}
                  </p>
                )}
              </div>
            )}

            {booking.discountAmount && booking.discountAmount > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">סכום הנחה</Label>
                <p className="text-lg font-semibold text-green-600">
                  -{formatCurrency(booking.discountAmount)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Gift Voucher */}
      {booking.isGift && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5" />
              מתנה
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-pink-50 border border-pink-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-pink-600" />
                <span className="font-medium text-pink-800">הזמנה זו היא מתנה</span>
              </div>
              
              {booking.giftGreeting && (
                <div className="mt-3">
                  <Label className="text-sm font-medium text-pink-800">הודעת ברכה</Label>
                  <p className="text-sm text-pink-700 mt-1">
                    {booking.giftGreeting}
                  </p>
                </div>
              )}

              {booking.recipientName && (
                <div className="mt-3">
                  <Label className="text-sm font-medium text-pink-800">מקבל המתנה</Label>
                  <p className="text-sm text-pink-700 mt-1">
                    {booking.recipientName}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      {booking.paymentHistory && booking.paymentHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              היסטוריית תשלומים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {booking.paymentHistory.map((payment, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{getPaymentMethodName(payment.method)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(payment.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(payment.amount)}</p>
                    {getPaymentStatusBadge(payment.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Guidelines */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800 text-sm">הנחיות תשלום</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700 text-sm">
          <ul className="space-y-1 list-disc list-inside">
            <li>בדוק שסטטוס התשלום תואם למצב הפועל</li>
            <li>במקרה של החזר, וודא עיבוד נכון במערכת התשלומים</li>
            <li>תיעד שינויים במחיר או בהנחות</li>
            <li>עבור מתנות, וודא שפרטי המקבל נכונים</li>
          </ul>
        </CardContent>
      </Card>

      {/* Cancellation Policy */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-amber-800 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            מדיניות ביטול הזמנות
          </CardTitle>
        </CardHeader>
        <CardContent className="text-amber-700 text-sm">
          <div className="space-y-3">
            <div className="p-3 bg-amber-100 rounded-lg border border-amber-200">
              <h4 className="font-semibold text-amber-800 mb-2">דמי ביטול לפי זמן:</h4>
              <ul className="space-y-2">
                <li className="flex justify-between">
                  <span>ביטול מרגע ביצוע ההזמנה:</span>
                  <span className="font-semibold">5% מסכום ההזמנה</span>
                </li>
                <li className="flex justify-between">
                  <span>ביטול פחות מ-24 שעות מהטיפול:</span>
                  <span className="font-semibold">50% מסכום ההזמנה</span>
                </li>
                <li className="flex justify-between">
                  <span>ביטול פחות מ-4 שעות מהטיפול:</span>
                  <span className="font-semibold text-red-600">100% מסכום ההזמנה</span>
                </li>
              </ul>
            </div>
            
            <div className="text-xs text-amber-600">
              <p>
                <strong>הערה:</strong> דמי הביטול יחושבו על בסיס סכום ההזמנה הכולל ({formatCurrency(booking.totalPrice)})
                ויופיעו כניכוי מהסכום המוחזר ללקוח.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 