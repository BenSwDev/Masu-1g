"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { Separator } from "@/components/common/ui/separator"
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  CreditCard, 
  Home,
  Loader2,
  AlertCircle
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/common/ui/alert"
import { format } from "date-fns"
import { he } from "date-fns/locale"

interface BookingDetails {
  bookingNumber: string
  treatmentName: string
  bookingDateTime: string
  status: string
  priceDetails: {
    basePrice: number
    totalSurchargesAmount: number
    finalAmount: number
    surcharges: Array<{
      description: string
      amount: number
    }>
  }
  bookingAddressSnapshot: {
    fullAddress: string
    city: string
    street: string
    notes?: string
  }
  recipientName: string
  recipientPhone?: string
  recipientEmail?: string
  bookedByUserName?: string
  bookedByUserPhone?: string
  bookedByUserEmail?: string
  isBookingForSomeoneElse: boolean
  professionalId?: {
    name: string
    phone: string
  }
  paymentDetails: {
    paymentStatus: string
    transactionId?: string
  }
}

export default function BookingDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [booking, setBooking] = useState<BookingDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const bookingId = params.bookingId as string

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        const response = await fetch(`/api/bookings/${bookingId}/guest-details`)
        const result = await response.json()

        if (result.success) {
          setBooking(result.booking)
        } else {
          setError(result.error || "לא ניתן לטעון את פרטי ההזמנה")
        }
      } catch (err) {
        setError("אירעה שגיאה בטעינת פרטי ההזמנה")
      } finally {
        setIsLoading(false)
      }
    }

    if (bookingId) {
      fetchBookingDetails()
    }
  }, [bookingId])

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive"; label: string; color: string }> = {
      pending_payment: { variant: "secondary", label: "ממתין לתשלום", color: "bg-yellow-100 text-yellow-800" },
      pending_professional: { variant: "default", label: "ממתינה לשיוך מטפל", color: "bg-orange-100 text-orange-800" },
      confirmed: { variant: "default", label: "מאושר", color: "bg-green-100 text-green-800" },
      completed: { variant: "default", label: "הושלם", color: "bg-green-100 text-green-800" },
      cancelled: { variant: "destructive", label: "בוטל", color: "bg-red-100 text-red-800" },
      refunded: { variant: "secondary", label: "הוחזר", color: "bg-purple-100 text-purple-800" },
    }

    const config = statusConfig[status] || statusConfig.pending_payment
    return (
      <Badge variant={config.variant} className={config.color}>
        {config.label}
      </Badge>
    )
  }

  const formatPrice = (amount: number) => {
    return `₪${amount.toFixed(2)}`
  }

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime)
    return {
      date: format(date, "EEEE, d MMMM yyyy", { locale: he }),
      time: format(date, "HH:mm")
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
              <h2 className="text-xl font-semibold mb-2">טוען פרטי הזמנה</h2>
              <p className="text-muted-foreground">אנא המתן...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2 text-red-700">שגיאה בטעינת ההזמנה</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => router.push("/")} variant="outline">
                <Home className="w-4 h-4 mr-2" />
                חזרה לדף הבית
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const { date, time } = formatDateTime(booking.bookingDateTime)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">פרטי הזמנה</h1>
          <p className="text-muted-foreground">מספר הזמנה: {booking.bookingNumber}</p>
        </div>

        {/* Status Alert */}
        <Alert className="bg-blue-50 border-blue-200">
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>סטטוס ההזמנה:</span>
              {getStatusBadge(booking.status)}
            </div>
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Treatment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                פרטי הטיפול
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="font-medium">טיפול:</span>
                <p className="text-lg">{booking.treatmentName}</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="font-medium flex items-center gap-1 mb-1">
                    <Calendar className="h-4 w-4" />
                    תאריך:
                  </span>
                  <p>{date}</p>
                </div>
                
                <div>
                  <span className="font-medium flex items-center gap-1 mb-1">
                    <Clock className="h-4 w-4" />
                    שעה:
                  </span>
                  <p>{time}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                כתובת הטיפול
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-medium">{booking.bookingAddressSnapshot.fullAddress}</p>
              <p className="text-muted-foreground">{booking.bookingAddressSnapshot.city}</p>
              {booking.bookingAddressSnapshot.notes && (
                <p className="text-sm text-muted-foreground">
                  <strong>הערות:</strong> {booking.bookingAddressSnapshot.notes}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Client Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {booking.isBookingForSomeoneElse ? "פרטי המזמין" : "פרטי הלקוח"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="font-medium">שם:</span>
                <p>{booking.bookedByUserName || "לא זמין"}</p>
              </div>
              
              {booking.bookedByUserPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{booking.bookedByUserPhone}</span>
                </div>
              )}
              
              {booking.bookedByUserEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{booking.bookedByUserEmail}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recipient Information (if different) */}
          {booking.isBookingForSomeoneElse && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  פרטי מקבל הטיפול
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="font-medium">שם:</span>
                  <p>{booking.recipientName}</p>
                </div>
                
                {booking.recipientPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>{booking.recipientPhone}</span>
                  </div>
                )}
                
                {booking.recipientEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{booking.recipientEmail}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Professional Information */}
          {booking.professionalId && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  פרטי המטפל
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="font-medium">שם:</span>
                  <p>{booking.professionalId.name}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{booking.professionalId.phone}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Price Details */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                פירוט מחיר
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>מחיר בסיס:</span>
                  <span>{formatPrice(booking.priceDetails.basePrice)}</span>
                </div>

                {booking.priceDetails.surcharges && booking.priceDetails.surcharges.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-orange-700">תוספות מחיר:</div>
                      {booking.priceDetails.surcharges.map((surcharge, index) => (
                        <div key={index} className="flex justify-between text-orange-600 text-sm">
                          <span>• {surcharge.description}:</span>
                          <span>+{formatPrice(surcharge.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-orange-600 font-medium">
                        <span>סה"כ תוספות:</span>
                        <span>+{formatPrice(booking.priceDetails.totalSurchargesAmount)}</span>
                      </div>
                    </div>
                  </>
                )}

                <Separator />
                
                <div className="flex justify-between font-bold text-lg">
                  <span>מחיר סופי:</span>
                  <span>{formatPrice(booking.priceDetails.finalAmount)}</span>
                </div>

                {booking.paymentDetails.transactionId && (
                  <div className="text-sm text-muted-foreground">
                    מזהה תשלום: {booking.paymentDetails.transactionId}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={() => router.push("/bookings/treatment")} size="lg">
            <Calendar className="w-5 h-5 mr-2" />
            הזמן טיפול נוסף
          </Button>
          
          <Button onClick={() => router.push("/")} variant="outline" size="lg">
            <Home className="w-5 h-5 mr-2" />
            חזרה לדף הבית
          </Button>
        </div>
      </div>
    </div>
  )
} 