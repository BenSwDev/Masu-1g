"use client"

import { useEffect } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Separator } from "@/components/common/ui/separator"
import { Badge } from "@/components/common/ui/badge"
import { 
  CheckCircle2, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Mail, 
  Phone, 
  CreditCard, 
  Bell,
  Gift,
  Star,
  Download,
  Share2
} from "lucide-react"
import { format } from "date-fns"
import { he } from "date-fns/locale"

interface BookingDetails {
  bookingNumber: string
  treatmentName: string
  treatmentDuration: number
  bookingDateTime: Date
  finalAmount: number
  paymentStatus: "paid" | "not_required"
  guestInfo: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  address: {
    fullAddress: string
    city: string
  }
  isGift?: boolean
  giftGreeting?: string
  consents: {
    customerAlerts: "sms" | "email" | "none"
    marketingOptIn: boolean
    termsAccepted: boolean
  }
}

interface GuestFinalConfirmationStepProps {
  bookingDetails: BookingDetails
  onComplete: () => void
  onReview?: () => void
}

export function GuestFinalConfirmationStep({
  bookingDetails,
  onComplete,
  onReview
}: GuestFinalConfirmationStepProps) {
  const { t, dir, language } = useTranslation()

  // ➕ Trigger order events when component mounts
  useEffect(() => {
    // This would trigger the order event system
    console.warn("Order events triggered for booking:", bookingDetails.bookingNumber)
  }, [bookingDetails.bookingNumber])

  const formatPrice = (amount: number) => {
    return `₪${amount.toFixed(2)}`
  }

  const formatDate = (date: Date) => {
    return format(date, "EEEE, d MMMM yyyy", { 
      locale: language === "he" ? he : undefined 
    })
  }

  const formatTime = (date: Date) => {
    return format(date, "HH:mm")
  }

  const getStatusBadge = () => {
    if (bookingDetails.paymentStatus === "paid") {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {t("bookings.status.confirmed")}
        </Badge>
      )
    }
    return (
      <Badge className="bg-blue-100 text-blue-800 border-blue-200">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        {t("bookings.status.confirmed")}
      </Badge>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6" dir={dir} lang={language}>
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-green-800 mb-2">
          {t("bookings.final.title")}
        </h1>
        <p className="text-lg text-muted-foreground mb-4">
          {t("bookings.final.subtitle")}
        </p>
        {getStatusBadge()}
      </div>

      {/* Booking Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t("bookings.final.summary")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Booking Number */}
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">
              {t("bookings.final.bookingNumber")}
            </div>
            <div className="text-2xl font-bold font-mono text-primary">
              #{bookingDetails.bookingNumber}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Treatment Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">
                {t("bookings.final.treatment")}
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Star className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <div className="font-medium">{bookingDetails.treatmentName}</div>
                    <div className="text-sm text-muted-foreground">
                      {bookingDetails.treatmentDuration} {t("common.minutes")}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <div className="font-medium">{formatDate(bookingDetails.bookingDateTime)}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatTime(bookingDetails.bookingDateTime)}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium">{bookingDetails.address.city}</div>
                    <div className="text-sm text-muted-foreground">
                      {bookingDetails.address.fullAddress}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">
                {t("bookings.final.customer")}
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <div className="font-medium">
                      {bookingDetails.guestInfo.firstName} {bookingDetails.guestInfo.lastName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t("bookings.final.primaryContact")}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium">{bookingDetails.guestInfo.email}</div>
                    <div className="text-sm text-muted-foreground">
                      {t("bookings.final.confirmationSent")}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-purple-500 mt-0.5" />
                  <div>
                    <div className="font-medium">{bookingDetails.guestInfo.phone}</div>
                    <div className="text-sm text-muted-foreground">
                      {bookingDetails.consents.customerAlerts === "sms" 
                        ? t("bookings.final.smsUpdates") 
                        : t("bookings.final.emailUpdates")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Gift Information */}
          {bookingDetails.isGift && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Gift className="h-5 w-5 text-red-500" />
                  {t("bookings.final.giftDetails")}
                </h3>
                {bookingDetails.giftGreeting && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">
                      {t("bookings.final.giftMessage")}:
                    </div>
                                         <div className="italic">&ldquo;{bookingDetails.giftGreeting}&rdquo;</div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Payment Information */}
          <Separator />
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-500" />
              {t("bookings.final.payment")}
            </h3>
            <div className="flex justify-between items-center p-4 bg-green-50 border border-green-200 rounded-lg">
              <span className="font-medium">{t("bookings.final.totalPaid")}:</span>
              <span className="text-xl font-bold text-green-700">
                {bookingDetails.paymentStatus === "paid" 
                  ? formatPrice(bookingDetails.finalAmount)
                  : t("bookings.final.noPaymentRequired")}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What's Next */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t("bookings.final.whatsNext.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium text-green-700">
                  {t("bookings.final.whatsNext.immediate")}
                </h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    {t("bookings.final.whatsNext.confirmationEmail")}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    {t("bookings.final.whatsNext.professionalNotified")}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    {t("bookings.final.whatsNext.calendarAdded")}
                  </li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-blue-700">
                  {t("bookings.final.whatsNext.beforeTreatment")}
                </h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-blue-600" />
                    {t("bookings.final.whatsNext.professionalContact")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-blue-600" />
                    {t("bookings.final.whatsNext.reminder24h")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-blue-600" />
                    {t("bookings.final.whatsNext.arrivalNotification")}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
          <Download className="h-5 w-5" />
          <span className="text-sm">{t("bookings.final.actions.download")}</span>
        </Button>
        
        <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
          <Share2 className="h-5 w-5" />
          <span className="text-sm">{t("bookings.final.actions.share")}</span>
        </Button>
        
        <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
          <Calendar className="h-5 w-5" />
          <span className="text-sm">{t("bookings.final.actions.calendar")}</span>
        </Button>

        {onReview && (
          <Button variant="outline" className="h-auto p-4 flex flex-col gap-2" onClick={onReview}>
            <Star className="h-5 w-5" />
            <span className="text-sm">{t("bookings.final.actions.review")}</span>
          </Button>
        )}
      </div>

      {/* Continue Button */}
      <div className="text-center pt-4">
        <Button onClick={onComplete} size="lg" className="px-8">
          {t("bookings.final.continue")}
        </Button>
      </div>
    </div>
  )
} 