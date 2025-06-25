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
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle
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

  // Use the new financial fields from priceDetails
  const customerPayment = booking.priceDetails?.finalAmount || 0
  const professionalPayment = booking.priceDetails?.totalProfessionalPayment || 0
  const officeCommission = booking.priceDetails?.totalOfficeCommission || 0
  const baseProfessionalPayment = booking.priceDetails?.baseProfessionalPayment || 0
  const surchargesProfessionalPayment = booking.priceDetails?.surchargesProfessionalPayment || 0

  return (
    <div className="space-y-6">
      {/* Financial Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            סקירה פיננסית
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 text-center p-4 bg-blue-50 rounded-lg">
              <Label className="text-sm font-medium text-blue-800">לקוח משלם</Label>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(customerPayment)}</p>
            </div>

            <div className="space-y-2 text-center p-4 bg-green-50 rounded-lg">
              <Label className="text-sm font-medium text-green-800">מטפל מקבל</Label>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(professionalPayment)}</p>
            </div>

            <div className={`space-y-2 text-center p-4 rounded-lg ${
              officeCommission >= 0 ? 'bg-purple-50' : 'bg-red-50'
            }`}>
              <Label className={`text-sm font-medium ${
                officeCommission >= 0 ? 'text-purple-800' : 'text-red-800'
              }`}>
                רווח משרד
              </Label>
              <p className={`text-2xl font-bold ${
                officeCommission >= 0 ? 'text-purple-600' : 'text-red-600'
              }`}>
                {officeCommission >= 0 ? '' : '-'}₪{Math.abs(officeCommission).toFixed(2)}
              </p>
              {officeCommission < 0 && (
                <p className="text-xs text-red-600">המשרד משלם מהכיס</p>
              )}
            </div>
          </div>

          {/* Financial Health Indicator */}
          <div className="flex items-center justify-center p-3 bg-gray-50 rounded-lg">
            <div className="text-center">
              <Label className="text-sm font-medium">מצב פיננסי</Label>
              <div className="flex items-center justify-center gap-2 mt-1">
                {officeCommission >= 0 ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-lg font-semibold text-green-600">רווחי</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span className="text-lg font-semibold text-red-600">הפסד</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Professional Payment Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            פירוט תשלום מטפל
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {/* Base Professional Payment */}
            {baseProfessionalPayment > 0 && (
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-blue-600" />
                  <Label className="text-sm">תשלום בסיס לטיפול</Label>
                </div>
                <span className="font-medium text-blue-600">{formatCurrency(baseProfessionalPayment)}</span>
              </div>
            )}

            {/* Surcharges Professional Payment */}
            {surchargesProfessionalPayment > 0 && (
              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-yellow-600" />
                  <Label className="text-sm">תשלום מתוספות</Label>
                </div>
                <span className="font-medium text-yellow-600">{formatCurrency(surchargesProfessionalPayment)}</span>
              </div>
            )}

            {/* Total Professional Payment */}
            <div className="flex justify-between items-center p-4 bg-green-100 rounded border-2 border-green-200">
              <Label className="text-lg font-semibold text-green-800">סה"כ תשלום למטפל</Label>
              <span className="text-xl font-bold text-green-600">{formatCurrency(professionalPayment)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Payment Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            פירוט תשלום לקוח
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
              <span className="font-medium">{formatCurrency(booking.priceDetails?.basePrice || 0)}</span>
            </div>

            {/* Surcharges */}
            {booking.priceDetails?.surcharges && booking.priceDetails.surcharges.length > 0 && (
              <>
                {booking.priceDetails.surcharges.map((surcharge, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-yellow-50 rounded">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-yellow-600" />
                      <Label className="text-sm">{surcharge.description}</Label>
                    </div>
                    <span className="font-medium text-yellow-600">{formatCurrency(surcharge.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center p-2 bg-yellow-100 rounded font-medium">
                  <span className="text-sm">סך תוספות</span>
                  <span className="text-yellow-600">{formatCurrency(booking.priceDetails.totalSurchargesAmount || 0)}</span>
                </div>
              </>
            )}

            {/* Discount */}
            {(booking.priceDetails?.discountAmount || 0) > 0 && (
              <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-red-600" />
                  <Label className="text-sm text-red-800">הנחה מקופון</Label>
                </div>
                <span className="font-medium text-red-600">-{formatCurrency(booking.priceDetails.discountAmount)}</span>
              </div>
            )}

            {/* Voucher Applied */}
            {(booking.priceDetails?.voucherAppliedAmount || 0) > 0 && (
              <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-red-600" />
                  <Label className="text-sm text-red-800">שובר מתנה</Label>
                </div>
                <span className="font-medium text-red-600">-{formatCurrency(booking.priceDetails.voucherAppliedAmount)}</span>
              </div>
            )}

            {/* Final Customer Payment */}
            <div className="flex justify-between items-center p-4 bg-blue-100 rounded border-2 border-blue-200">
              <Label className="text-lg font-semibold text-blue-800">סה"כ לקוח משלם</Label>
              <span className="text-xl font-bold text-blue-600">{formatCurrency(customerPayment)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Office Commission Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5" />
            ניתוח רווח משרד
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">חישוב רווח משרד:</Label>
                <span className="text-sm text-muted-foreground">לקוח משלם - מטפל מקבל</span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span>לקוח משלם:</span>
                <span className="font-medium">₪{customerPayment.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span>מטפל מקבל:</span>
                <span className="font-medium">₪{professionalPayment.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t">
                <Label className="font-medium">רווח משרד:</Label>
                <span className={`font-bold text-lg ${
                  officeCommission >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {officeCommission >= 0 ? '₪' : '-₪'}{Math.abs(officeCommission).toFixed(2)}
                </span>
              </div>
              
              {officeCommission < 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium text-red-800">הטיפול מכוסה על ידי מנוי/שובר</span>
                  </div>
                  <p className="text-sm text-red-700 mt-1">
                    המשרד משלם למטפל מהכיס שלו כי הלקוח לא משלם (מנוי או שובר מכסה את הטיפול)
                  </p>
                </div>
              )}
            </div>
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
              <Label className="text-sm font-medium">סטטוס תשלום מלקוח</Label>
              <Badge variant={booking.paymentDetails?.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                {booking.paymentDetails?.paymentStatus === 'paid' ? 'שולם' : 
                 booking.paymentDetails?.paymentStatus === 'not_required' ? 'לא נדרש' : 'לא שולם'}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">סטטוס תשלום למטפל</Label>
              <Badge variant="secondary">
                טרם הוגדר במערכת
              </Badge>
            </div>

            {booking.createdAt && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">תאריך יצירת הזמנה</Label>
                <p className="text-sm">{formatDate(booking.createdAt)}</p>
              </div>
            )}

            {booking.updatedAt && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">תאריך עדכון אחרון</Label>
                <p className="text-sm">{formatDate(booking.updatedAt)}</p>
              </div>
            )}
          </div>

          {/* Outstanding payments */}
          {booking.paymentDetails?.paymentStatus === 'paid' && professionalPayment > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-600" />
                <span className="font-medium text-amber-800">תשלום המתנה למטפל</span>
              </div>
              <p className="text-sm text-amber-700 mt-1">
                יש לשלם למטפל: {formatCurrency(professionalPayment)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            סיכום פיננסי
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">סוג הכיסוי</Label>
              <div className="text-sm">
                {booking.priceDetails?.isFullyCoveredByVoucherOrSubscription ? (
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    מכוסה במלואו
                  </Badge>
                ) : booking.priceDetails?.isBaseTreatmentCoveredBySubscription ? (
                  <Badge variant="outline" className="bg-blue-100 text-blue-800">
                    מכוסה על ידי מנוי
                  </Badge>
                ) : booking.priceDetails?.isBaseTreatmentCoveredByTreatmentVoucher ? (
                  <Badge variant="outline" className="bg-purple-100 text-purple-800">
                    מכוסה על ידי שובר
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    תשלום מלא
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">רווחיות עבור המשרד</Label>
              <div className="text-sm">
                {officeCommission > 0 ? (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    רווחי (₪{officeCommission.toFixed(2)})
                  </Badge>
                ) : officeCommission === 0 ? (
                  <Badge variant="outline">
                    איזון (₪0)
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    הפסד (₪{Math.abs(officeCommission).toFixed(2)})
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Guidelines */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800 text-sm">הנחיות פיננסיות</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700 text-sm">
          <ul className="space-y-1 list-disc list-inside">
            <li>וודא שחישובי התשלומים נכונים לפני העברת תשלום למטפל</li>
            <li>בדוק התאמה בין סטטוס התשלום לרישומים הפיננסיים</li>
            <li>תיעד כל שינוי במחיר או בתשלומים</li>
            <li>עקוב אחר תשלומים חסרים או מעוכבים</li>
            <li>במקרה של הפסד (רווח שלילי) - הטיפול מכוסה על ידי מנוי/שובר</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
} 