"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Label } from "@/components/common/ui/label"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import { 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calculator,
  Receipt,
  CreditCard,
  Percent,
  Building,
  Calendar
} from "lucide-react"
import type { PopulatedBooking } from "@/types/booking"

interface BookingFinancialTabProps {
  booking: PopulatedBooking
  onUpdate: (updates: Partial<PopulatedBooking>) => void
}

export default function BookingFinancialTab({ booking, onUpdate }: BookingFinancialTabProps) {
  const { t } = useTranslation()

  const formatDate = (date?: Date | string) => {
    if (!date) return "לא צוין"
    return format(new Date(date), "dd/MM/yyyy בשעה HH:mm", { locale: he })
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return "₪0"
    return `₪${amount.toFixed(2)}`
  }

  // Financial calculations
  const totalRevenue = booking.totalPrice || 0
  const professionalCommission = booking.professionalCommission || 0
  const platformCommission = totalRevenue - professionalCommission
  const commissionRate = totalRevenue > 0 ? ((platformCommission / totalRevenue) * 100).toFixed(1) : 0

  return (
    <div className="space-y-6">
      {/* Revenue Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            סקירת הכנסות
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 text-center p-4 bg-green-50 rounded-lg">
              <Label className="text-sm font-medium text-green-800">סך הכנסות</Label>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
            </div>

            <div className="space-y-2 text-center p-4 bg-blue-50 rounded-lg">
              <Label className="text-sm font-medium text-blue-800">עמלת מטפל</Label>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(professionalCommission)}</p>
            </div>

            <div className="space-y-2 text-center p-4 bg-purple-50 rounded-lg">
              <Label className="text-sm font-medium text-purple-800">עמלת פלטפורמה</Label>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(platformCommission)}</p>
            </div>
          </div>

          <div className="flex items-center justify-center p-3 bg-gray-50 rounded-lg">
            <div className="text-center">
              <Label className="text-sm font-medium">אחוז עמלה</Label>
              <p className="text-lg font-semibold">{commissionRate}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            פירוט כלכלי מפורט
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {/* Base Price */}
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm">מחיר בסיס הטיפול</Label>
              </div>
              <span className="font-medium">{formatCurrency(booking.basePrice)}</span>
            </div>

            {/* Transport Fee */}
            {booking.transportFee && booking.transportFee > 0 && (
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-sm">דמי נסיעה</Label>
                </div>
                <span className="font-medium">{formatCurrency(booking.transportFee)}</span>
              </div>
            )}

            {/* Service Fee */}
            {booking.serviceFee && booking.serviceFee > 0 && (
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-sm">דמי שירות</Label>
                </div>
                <span className="font-medium">{formatCurrency(booking.serviceFee)}</span>
              </div>
            )}

            {/* Discount */}
            {booking.discountAmount && booking.discountAmount > 0 && (
              <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-red-600" />
                  <Label className="text-sm text-red-800">הנחה</Label>
                </div>
                <span className="font-medium text-red-600">-{formatCurrency(booking.discountAmount)}</span>
              </div>
            )}

            {/* Total */}
            <div className="flex justify-between items-center p-4 bg-blue-100 rounded border-2 border-blue-200">
              <Label className="text-lg font-semibold text-blue-800">סך הכל</Label>
              <span className="text-xl font-bold text-blue-600">{formatCurrency(totalRevenue)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Commission Structure */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5" />
            מבנה עמלות
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 border rounded">
              <Label className="text-sm font-medium">עמלת מטפל ({((professionalCommission / totalRevenue) * 100).toFixed(1)}%)</Label>
              <span className="font-semibold text-blue-600">{formatCurrency(professionalCommission)}</span>
            </div>

            <div className="flex justify-between items-center p-3 border rounded">
              <Label className="text-sm font-medium">עמלת פלטפורמה ({commissionRate}%)</Label>
              <span className="font-semibold text-purple-600">{formatCurrency(platformCommission)}</span>
            </div>

            {booking.professionalId && typeof booking.professionalId === 'object' && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <Label className="text-sm font-medium text-blue-800">פרטי מטפל</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">שם</Label>
                    <p className="text-sm">{booking.professionalId.name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">דרגת עמלה</Label>
                    <p className="text-sm">{booking.professionalId.commissionTier || "סטנדרט"}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Status & Dates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            סטטוס תשלום ותאריכים
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">סטטוס תשלום ללקוח</Label>
              <Badge variant={booking.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                {booking.paymentStatus === 'paid' ? 'שולם' : 'לא שולם'}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">סטטוס תשלום למטפל</Label>
              <Badge variant={booking.professionalPaymentStatus === 'paid' ? 'default' : 'secondary'}>
                {booking.professionalPaymentStatus === 'paid' ? 'שולם' : 'לא שולם'}
              </Badge>
            </div>

            {booking.paymentDate && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">תאריך תשלום מלקוח</Label>
                <p className="text-sm">{formatDate(booking.paymentDate)}</p>
              </div>
            )}

            {booking.professionalPaymentDate && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">תאריך תשלום למטפל</Label>
                <p className="text-sm">{formatDate(booking.professionalPaymentDate)}</p>
              </div>
            )}
          </div>

          {/* Outstanding payments */}
          {booking.paymentStatus === 'paid' && booking.professionalPaymentStatus !== 'paid' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-600" />
                <span className="font-medium text-amber-800">תשלום המתנה למטפל</span>
              </div>
              <p className="text-sm text-amber-700 mt-1">
                יש לשלם למטפל: {formatCurrency(professionalCommission)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revenue Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            ניתוח רווחיות
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">רווח ברוטו לפלטפורמה</Label>
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(platformCommission)}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">אחוז רווח מההזמנה</Label>
              <p className="text-lg font-semibold">
                {commissionRate}%
              </p>
            </div>

            {booking.transportFee && booking.transportFee > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">הכנסה מדמי נסיעה</Label>
                <p className="text-lg font-semibold text-blue-600">
                  {formatCurrency(booking.transportFee)}
                </p>
              </div>
            )}

            {booking.serviceFee && booking.serviceFee > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">הכנסה מדמי שירות</Label>
                <p className="text-lg font-semibold text-purple-600">
                  {formatCurrency(booking.serviceFee)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Guidelines */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800 text-sm">הנחיות כלכליות</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700 text-sm">
          <ul className="space-y-1 list-disc list-inside">
            <li>וודא שחישובי העמלות נכונים לפני העברת תשלום למטפל</li>
            <li>בדוק התאמה בין סטטוס התשלום לרישומים הפיננסיים</li>
            <li>תיעד כל שינוי במחיר או בעמלות</li>
            <li>עקוב אחר תשלומים חסרים או מעוכבים</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
} 