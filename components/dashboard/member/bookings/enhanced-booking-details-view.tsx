"use client"

import React from "react"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { Separator } from "@/components/common/ui/separator"
import { 
  Calendar,
  MapPin,
  User,
  Phone,
  CreditCard,
  Clock,
  MessageSquare,
  Star,
  AlertTriangle,
  RefreshCw,
  ExternalLink
} from "lucide-react"
import { cn } from "@/lib/utils"
import BookingStatusTimeline from "./booking-status-timeline"
import type { PopulatedBooking } from "@/types/booking"

interface EnhancedBookingDetailsViewProps {
  booking: PopulatedBooking
  onRefresh?: () => void
  onWriteReview?: () => void
  onCancel?: () => void
  className?: string
}

/**
 * תצוגת פרטי הזמנה משופרת עם טיים-ליין ומידע מקיף
 * כולל עדכונים בזמן אמת וממשק ידידותי ללקוח
 */
export default function EnhancedBookingDetailsView({
  booking,
  onRefresh,
  onWriteReview,
  onCancel,
  className
}: EnhancedBookingDetailsViewProps) {

  const canCancel = () => {
    const cancelableStatuses = ["pending_professional", "confirmed"]
    const bookingDate = new Date(booking.bookingDateTime)
    const now = new Date()
    const hoursUntilBooking = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    return cancelableStatuses.includes(booking.status) && hoursUntilBooking > 2
  }

  const canWriteReview = () => {
    return booking.status === "completed" || booking.status === "pending_review"
  }

  const getNextAction = () => {
    switch (booking.status) {
      case "pending_payment":
        return {
          text: "השלם תשלום",
          action: () => {/* TODO: Implement payment flow */},
          variant: "default" as const,
          urgent: true
        }
      case "pending_professional":
        return {
          text: "ממתין למטפל",
          action: null,
          variant: "outline" as const,
          urgent: false
        }
      case "confirmed":
        return {
          text: "הזמנה מאושרת",
          action: null,
          variant: "outline" as const,
          urgent: false
        }
      case "on_way":
        return {
          text: "המטפל בדרך",
          action: null,
          variant: "outline" as const,
          urgent: false
        }
      case "pending_review":
        return {
          text: "כתוב חוות דעת",
          action: onWriteReview,
          variant: "default" as const,
          urgent: false
        }
      default:
        return null
    }
  }

  const nextAction = getNextAction()

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with main booking info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">
                {booking.treatmentId?.name || "טיפול לא מוגדר"}
              </CardTitle>
              <CardDescription className="text-lg mt-1">
                הזמנה #{booking.bookingNumber}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {nextAction && nextAction.urgent && (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
              {onRefresh && (
                <Button variant="outline" size="sm" onClick={onRefresh}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  רענן
                </Button>
              )}
            </div>
          </div>
          
          {/* Next Action */}
          {nextAction && (
            <div className={cn(
              "p-4 rounded-lg border",
              nextAction.urgent ? "bg-amber-50 border-amber-200" : "bg-blue-50 border-blue-200"
            )}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={cn(
                    "font-medium",
                    nextAction.urgent ? "text-amber-900" : "text-blue-900"
                  )}>
                    {nextAction.urgent ? "פעולה נדרשת" : "הצעד הבא"}
                  </h3>
                  <p className={cn(
                    "text-sm mt-1",
                    nextAction.urgent ? "text-amber-700" : "text-blue-700"
                  )}>
                    {nextAction.text}
                  </p>
                </div>
                {nextAction.action && (
                  <Button 
                    variant={nextAction.variant} 
                    onClick={nextAction.action}
                    className={nextAction.urgent ? "bg-amber-600 hover:bg-amber-700" : ""}
                  >
                    {nextAction.text}
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Status Timeline */}
      <BookingStatusTimeline booking={booking} />

      {/* Booking Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            פרטי הזמנה
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-500" />
              <div>
                <p className="font-medium">תאריך וזמן</p>
                <p className="text-sm text-gray-600">
                  {format(new Date(booking.bookingDateTime), "PPP בשעה HH:mm", { locale: he })}
                  {booking.isFlexibleTime && (
                    <Badge variant="outline" className="mr-2 text-xs">
                      זמן גמיש
                    </Badge>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-gray-500" />
              <div>
                <p className="font-medium">משך הטיפול</p>
                <p className="text-sm text-gray-600">
                  {booking.treatmentId?.defaultDurationMinutes ? 
                    `${booking.treatmentId.defaultDurationMinutes} דקות` : 
                    "לא מוגדר"}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Address */}
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">כתובת הטיפול</p>
              {booking.bookingAddressSnapshot ? (
                <div className="text-sm text-gray-600 space-y-1">
                  <p>{booking.bookingAddressSnapshot.fullAddress}</p>
                  {booking.bookingAddressSnapshot.notes && (
                    <p className="text-xs bg-gray-50 p-2 rounded">
                      הערות: {booking.bookingAddressSnapshot.notes}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">כתובת לא זמינה</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Recipient Details */}
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-gray-500 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">פרטי המטופל</p>
              <div className="text-sm text-gray-600 space-y-1">
                {booking.isBookingForSomeoneElse ? (
                  <>
                    <p>שם: {booking.recipientName}</p>
                    {booking.recipientPhone && (
                      <p>טלפון: {booking.recipientPhone}</p>
                    )}
                    <Badge variant="outline" className="text-xs">
                      הזמנה עבור אדם אחר
                    </Badge>
                  </>
                ) : (
                  <p>הזמנה עצמית</p>
                )}
                {booking.recipientGender && (
                  <p>מין: {booking.recipientGender === "male" ? "זכר" : "נקבה"}</p>
                )}
              </div>
            </div>
          </div>

          {/* Professional Details */}
          {booking.professionalId && (
            <>
              <Separator />
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">המטפל שלך</p>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>{booking.professionalId.name}</p>
                    {booking.status === "confirmed" || booking.status === "on_way" ? (
                      <Badge variant="default" className="text-xs">
                        מטפל מאושר
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        מטפל זמני
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Preferences */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="font-medium text-sm">העדפת מין מטפל</p>
              <p className="text-sm text-gray-600">
                {booking.therapistGenderPreference === "male" ? "זכר" :
                 booking.therapistGenderPreference === "female" ? "נקבה" :
                 "ללא העדפה"}
              </p>
            </div>
            {booking.specialRequests && (
              <div>
                <p className="font-medium text-sm">בקשות מיוחדות</p>
                <p className="text-sm text-gray-600">{booking.specialRequests}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            פרטי תשלום
          </CardTitle>
        </CardHeader>
        <CardContent>
          {booking.priceDetails ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>מחיר בסיסי</span>
                <span>₪{booking.priceDetails.baseAmount?.toLocaleString() || "0"}</span>
              </div>
              {booking.priceDetails.discountAmount && booking.priceDetails.discountAmount > 0 && (
                <div className="flex justify-between items-center text-green-600">
                  <span>הנחה</span>
                  <span>-₪{booking.priceDetails.discountAmount.toLocaleString()}</span>
                </div>
              )}
              {booking.priceDetails.additionalFees && booking.priceDetails.additionalFees > 0 && (
                <div className="flex justify-between items-center">
                  <span>עמלות נוספות</span>
                  <span>₪{booking.priceDetails.additionalFees.toLocaleString()}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between items-center font-medium text-lg">
                <span>סה"כ לתשלום</span>
                <span>₪{booking.priceDetails.finalAmount?.toLocaleString() || "0"}</span>
              </div>
              
              {booking.paymentMethod && (
                <div className="text-sm text-gray-600 mt-2">
                  אמצעי תשלום: {booking.paymentMethod}
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500">פרטי תשלום לא זמינים</p>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {booking.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              הערות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{booking.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>פעולות</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {canWriteReview() && onWriteReview && (
              <Button onClick={onWriteReview} variant="default">
                <Star className="h-4 w-4 mr-2" />
                כתוב חוות דעת
              </Button>
            )}
            
            {canCancel() && onCancel && (
              <Button onClick={onCancel} variant="destructive">
                <ExternalLink className="h-4 w-4 mr-2" />
                בטל הזמנה
              </Button>
            )}
            
            <Button variant="outline" onClick={() => window.open(`tel:${booking.professionalId?.phone || ""}`)}>
              <Phone className="h-4 w-4 mr-2" />
              צור קשר עם המטפל
            </Button>
            
            <Button variant="outline" onClick={() => window.open("https://wa.me/972XXXXXXXXX")}>
              <MessageSquare className="h-4 w-4 mr-2" />
              תמיכה
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 