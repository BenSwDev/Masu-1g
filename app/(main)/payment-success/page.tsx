"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { CheckCircle, XCircle, Loader2, Home, Receipt, Calendar } from "lucide-react"
import { Alert, AlertDescription } from "@/components/common/ui/alert"
import { LandingHeader } from "@/components/landing/header"
import { LandingFooter } from "@/components/landing/footer"
import { SiteFooter } from "@/components/common/site-footer"

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [paymentData, setPaymentData] = useState<any>(null)

  const paymentId = searchParams.get("paymentId")
  const bookingId = searchParams.get("bookingId")
  const status = searchParams.get("status")
  const complete = searchParams.get("complete")
  const reason = searchParams.get("reason")

  // קביעת סטטוס התשלום
  const isSuccess = status === "success" && complete === "1"
  const isFailure = status === "error" || complete === "0" || reason

  useEffect(() => {
    const updateBookingStatus = async () => {
      if (bookingId && (isSuccess || isFailure)) {
        try {
          const response = await fetch(`/api/bookings/${bookingId}/payment-status`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              paymentStatus: isSuccess ? 'success' : 'failed',
              transactionId: paymentId
            })
          })

          const result = await response.json()
          
          if (!result.success) {
            console.error('Failed to update booking status:', result.error)
          }

          setPaymentData({
            paymentId,
            bookingId,
            status: isSuccess ? "success" : "failed",
            reason: reason || undefined,
            bookingUpdated: result.success,
            booking: result.booking
          })
        } catch (error) {
          console.error('Error updating booking status:', error)
          setPaymentData({
            paymentId,
            bookingId,
            status: isSuccess ? "success" : "failed",
            reason: reason || undefined,
            bookingUpdated: false
          })
        }
      } else {
        setPaymentData({
          paymentId,
          bookingId,
          status: isSuccess ? "success" : "failed",
          reason: reason || undefined
        })
      }
      setIsLoading(false)
    }

    // Add a small delay to ensure the payment process is complete
    const timer = setTimeout(updateBookingStatus, 1000)
    return () => clearTimeout(timer)
  }, [paymentId, bookingId, isSuccess, isFailure, reason])

  const handleGoHome = () => {
    router.push("/")
  }

  const handleBookAnother = () => {
    router.push("/bookings/treatment")
  }

  const handleViewBooking = () => {
    if (paymentData?.booking?.bookingNumber) {
      // Navigate to the booking details page using the booking number
      router.push(`/booking-details/${paymentData.booking.bookingNumber}`)
    } else if (bookingId) {
      // Fallback to booking ID if booking number is not available
      router.push(`/booking-details/${bookingId}`)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <LandingHeader />
        <main className="flex-1">
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-2xl mx-auto">
              <Card className="w-full">
                <CardContent className="p-8 text-center">
                  <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
                  <h2 className="text-xl font-semibold mb-2">מעבד תוצאות תשלום</h2>
                  <p className="text-muted-foreground">אנא המתן בזמן שאנו מעבדים את התשלום שלך...</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        <LandingFooter />
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <LandingHeader />
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto">
            <Card className="w-full">
              <CardContent className="p-8">
            {isSuccess ? (
              // הצלחה
              <div className="text-center space-y-6">
                <div className="flex flex-col items-center">
                  <CheckCircle className="h-20 w-20 text-green-500 mb-6" />
                  <h1 className="text-3xl font-bold text-green-700 mb-4">
                    🎉 ההזמנה בוצעה בהצלחה!
                  </h1>
                  <p className="text-lg text-muted-foreground mb-2">
                    תודה רבה! ההזמנה שלך אושרה ונרשמה במערכת.
                  </p>
                  <p className="text-muted-foreground">
                    נציג שירות יצור איתך קשר בקרוב לתיאום מטפל.
                  </p>
                </div>

                {paymentData?.paymentId && (
                  <Alert className="bg-green-50 border-green-200">
                    <AlertDescription>
                      <div className="space-y-2 text-sm">
                        <div><strong>מזהה תשלום:</strong> {paymentData.paymentId}</div>
                        {paymentData.bookingId && (
                          <div><strong>מזהה הזמנה:</strong> {paymentData.bookingId}</div>
                        )}
                        {paymentData.booking?.bookingNumber && (
                          <div><strong>מספר הזמנה:</strong> {paymentData.booking.bookingNumber}</div>
                        )}
                        {paymentData.booking?.treatmentName && (
                          <div><strong>טיפול:</strong> {paymentData.booking.treatmentName}</div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">מה הלאה?</h3>
                  <ul className="text-sm text-blue-800 space-y-1 text-right">
                    <li>• פרטי ההזמנה נשלחו אליך באימייל ו/או SMS</li>
                    <li>• נציג שירות יצור איתך קשר תוך 24 שעות</li>
                    <li>• המטפל יקבל את פרטי ההזמנה ויצור קשר לתיאום</li>
                    <li>• תקבל עדכון כשהמטפל יאושר עבור ההזמנה</li>
                  </ul>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  {bookingId && (
                    <Button onClick={handleViewBooking} className="flex-1" size="lg">
                      <Receipt className="w-5 h-5 mr-2" />
                      צפה בפרטי ההזמנה
                    </Button>
                  )}
                  
                  <Button onClick={handleBookAnother} variant="outline" className="flex-1" size="lg">
                    <Calendar className="w-5 h-5 mr-2" />
                    הזמן טיפול נוסף
                  </Button>
                  
                  <Button onClick={handleGoHome} variant="outline" className="flex-1" size="lg">
                    <Home className="w-5 h-5 mr-2" />
                    חזרה לדף הבית
                  </Button>
                </div>
              </div>
            ) : (
              // כישלון
              <div className="text-center space-y-6">
                <div className="flex flex-col items-center">
                  <XCircle className="h-20 w-20 text-red-500 mb-6" />
                  <h1 className="text-3xl font-bold text-red-700 mb-4">
                    התשלום נכשל
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    מצטערים, אירעה שגיאה בביצוע התשלום.
                  </p>
                </div>

                {reason && (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertDescription>
                      <div className="text-sm">
                        <strong>סיבת הכישלון:</strong> {getFailureReason(reason)}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>חשוב:</strong> לא חויבת על התשלום הזה. ההזמנה לא נרשמה במערכת.
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button onClick={() => router.back()} className="flex-1" size="lg">
                    נסה שוב
                  </Button>
                  
                  <Button onClick={handleGoHome} variant="outline" className="flex-1" size="lg">
                    <Home className="w-5 h-5 mr-2" />
                    חזרה לדף הבית
                  </Button>
                </div>
              </div>
            )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <LandingFooter />
      <SiteFooter />
    </div>
  )
}

function getFailureReason(reason: string): string {
  const reasons: Record<string, string> = {
    "payment_failed": "התשלום נדחה על ידי כרטיס האשראי",
    "missing_identifiers": "חסרים פרטים נדרשים לביצוע התשלום",
    "payment_not_found": "התשלום לא נמצא במערכת",
    "internal_error": "שגיאה פנימית במערכת",
    "callback_error": "שגיאה בקבלת תגובה מחברת האשראי",
    "user_cancelled": "התשלום בוטל על ידי המשתמש"
  }
  
  return reasons[reason] || "שגיאה לא ידועה"
} 