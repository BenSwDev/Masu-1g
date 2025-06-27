"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Separator } from "@/components/common/ui/separator"
import { CheckCircle, User, Stethoscope, Clock, MapPin, CreditCard, ArrowLeft, Send } from "lucide-react"
import { format } from "date-fns"
import { formatPhoneForDisplay } from "@/lib/utils/phone-utils"

interface BookingCreateConfirmationStepProps {
  formData: any
  onUpdate: (data: any) => void
  onCreateBooking: () => void
  onPrev: () => void
  isLoading: boolean
}

export default function BookingCreateConfirmationStep({
  formData,
  onUpdate,
  onCreateBooking,
  onPrev,
  isLoading
}: BookingCreateConfirmationStepProps) {
  const { t, dir } = useTranslation()

  const getCustomerDisplayName = () => {
    if (formData.customerType === "guest") {
      return `${formData.guestInfo?.firstName} ${formData.guestInfo?.lastName}`
    } else {
      return "לקוח קיים"
    }
  }

  const getRecipientDisplayName = () => {
    if (formData.isBookingForSomeoneElse && formData.recipientInfo) {
      return `${formData.recipientInfo.firstName} ${formData.recipientInfo.lastName}`
    }
    return null
  }

  const getTreatmentDisplayName = () => {
    return "עיסוי שוודי"
  }

  const getAddressDisplay = () => {
    if (formData.addressType === "custom" && formData.customAddress) {
      const addr = formData.customAddress
      return `${addr.street} ${addr.houseNumber}${addr.apartmentNumber ? `, דירה ${addr.apartmentNumber}` : ''}, ${addr.city}`
    } else {
      return "כתובת קיימת"
    }
  }

  const getPaymentMethodDisplay = () => {
    switch (formData.paymentType) {
      case "immediate":
        return "תשלום מיידי בכרטיס אשראי"
      case "cash":
        return "תשלום במזומן למטפל"
      case "invoice":
        return "תשלום בחשבונית"
      default:
        return "לא צוין"
    }
  }

  const calculatePrice = () => {
    let basePrice = 320
    let discount = 0
    let additionalFees = 0

    if (formData.appliedCouponCode) {
      discount += basePrice * 0.1
    }

    if (formData.appliedGiftVoucherId) {
      discount += 100
    }

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

  const priceBreakdown = calculatePrice()

  return (
    <div className="space-y-6">
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-green-800">
            <CheckCircle className="h-8 w-8" />
            <div>
              <h2 className="text-2xl font-bold">אישור פרטי ההזמנה</h2>
              <p className="text-green-700">אנא בדוק את כל הפרטים לפני יצירת ההזמנה</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            פרטי לקוח
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">שם לקוח:</span>
            <span className="font-medium">{getCustomerDisplayName()}</span>
          </div>
          
          {formData.customerType === "guest" && formData.guestInfo && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600">אימייל:</span>
                <span className="font-medium">{formData.guestInfo.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">טלפון:</span>
                <span className="font-medium">{formatPhoneForDisplay(formData.guestInfo.phone || "")}</span>
              </div>
            </>
          )}

          {formData.isBookingForSomeoneElse && (
            <>
              <Separator />
              <div className="flex justify-between">
                <span className="text-gray-600">מטופל:</span>
                <span className="font-medium">{getRecipientDisplayName()}</span>
              </div>
              {formData.recipientInfo && (
                <div className="flex justify-between">
                  <span className="text-gray-600">טלפון מטופל:</span>
                  <span className="font-medium">{formatPhoneForDisplay(formData.recipientInfo.phone || "")}</span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            פרטי טיפול
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">סוג טיפול:</span>
            <span className="font-medium">{getTreatmentDisplayName()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">משך זמן:</span>
            <span className="font-medium">60 דקות</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">העדפת מטפל:</span>
            <span className="font-medium">
              {formData.therapistGenderPreference === "any" && "ללא העדפה"}
              {formData.therapistGenderPreference === "male" && "מטפל זכר"}
              {formData.therapistGenderPreference === "female" && "מטפלת נקבה"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            תזמון
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {formData.bookingDateTime && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600">תאריך:</span>
                <span className="font-medium">{format(formData.bookingDateTime, "PPP")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">שעה:</span>
                <span className="font-medium">{format(formData.bookingDateTime, "HH:mm")}</span>
              </div>
            </>
          )}
          {formData.isFlexibleTime && (
            <div className="flex justify-between">
              <span className="text-gray-600">גמישות:</span>
              <span className="font-medium">±{formData.flexibilityRangeHours} שעות</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            כתובת הטיפול
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">כתובת:</span>
            <span className="font-medium">{getAddressDisplay()}</span>
          </div>
          {formData.addressType === "custom" && formData.customAddress?.parking && (
            <div className="flex justify-between">
              <span className="text-gray-600">חניה:</span>
              <Badge variant="secondary">זמינה</Badge>
            </div>
          )}
          {formData.addressType === "custom" && formData.customAddress?.notes && (
            <div className="pt-2 border-t">
              <span className="text-gray-600 text-sm">הערות:</span>
              <p className="text-sm mt-1">{formData.customAddress.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            תשלום
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">אמצעי תשלום:</span>
            <span className="font-medium">{getPaymentMethodDisplay()}</span>
          </div>

          {(formData.appliedCouponCode || formData.appliedGiftVoucherId || formData.redeemedSubscriptionId) && (
            <>
              <Separator />
              <div className="space-y-2">
                <span className="text-gray-600 text-sm">הנחות מופעלות:</span>
                {formData.appliedCouponCode && (
                  <div className="flex justify-between">
                    <span className="text-sm">קוד קופון:</span>
                    <Badge variant="secondary">{formData.appliedCouponCode}</Badge>
                  </div>
                )}
                {formData.appliedGiftVoucherId && (
                  <div className="flex justify-between">
                    <span className="text-sm">שובר מתנה:</span>
                    <Badge variant="secondary">100 ש"ח</Badge>
                  </div>
                )}
                {formData.redeemedSubscriptionId && (
                  <div className="flex justify-between">
                    <span className="text-sm">פדיון מנוי:</span>
                    <Badge variant="secondary">מנוי חודשי</Badge>
                  </div>
                )}
              </div>
            </>
          )}

          <Separator />
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">מחיר בסיס:</span>
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
            
            <Separator />
            
            <div className="flex justify-between text-lg font-bold">
              <span>סה"כ לתשלום:</span>
              <span className="text-green-600">₪{priceBreakdown.finalPrice}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h4 className="font-medium text-blue-800 mb-2">הערות חשובות:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• אישור ההזמנה יישלח לאימייל הלקוח</li>
            <li>• המטפל יקבל התראה על ההזמנה החדשה</li>
            <li>• ניתן לבטל או לשנות את ההזמנה עד 24 שעות לפני הטיפול</li>
            <li>• המטפל יצור קשר עם הלקוח לאישור סופי 2-4 שעות לפני הטיפול</li>
          </ul>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev} disabled={isLoading}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          חזור
        </Button>
        <Button 
          onClick={onCreateBooking} 
          disabled={isLoading}
          size="lg"
          className="bg-green-600 hover:bg-green-700"
        >
          {isLoading ? (
            "יוצר הזמנה..."
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              צור הזמנה
            </>
          )}
        </Button>
      </div>
    </div>
  )
} 