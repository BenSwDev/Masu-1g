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
  const bookingNumber = searchParams.get("bookingNumber")
  const status = searchParams.get("status")
  const complete = searchParams.get("complete")
  const reason = searchParams.get("reason")

  // קביעת סטטוס התשלום
  const isSuccess = status === "success" && complete === "1"
  const isFailure = status === "error" || complete === "0" || reason

  // Add special CSS class for this page
  useEffect(() => {
    document.documentElement.classList.add('payment-success-page')
    document.body.classList.add('payment-success-page')
    
    return () => {
      document.documentElement.classList.remove('payment-success-page')
      document.body.classList.remove('payment-success-page')
    }
  }, [])

  useEffect(() => {
    const updateBookingStatus = async () => {
      const finalBookingId = bookingId || bookingNumber
      if (finalBookingId && (isSuccess || isFailure)) {
        try {
          const response = await fetch(`/api/bookings/${finalBookingId}/payment-status`, {
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
            bookingId: finalBookingId,
            status: isSuccess ? "success" : "failed",
            reason: reason || undefined,
            bookingUpdated: result.success,
            booking: result.booking
          })
        } catch (error) {
          console.error('Error updating booking status:', error)
          setPaymentData({
            paymentId,
            bookingId: finalBookingId,
            status: isSuccess ? "success" : "failed",
            reason: reason || undefined,
            bookingUpdated: false
          })
        }
      } else {
        setPaymentData({
          paymentId,
          bookingId: finalBookingId,
          status: isSuccess ? "success" : "failed",
          reason: reason || undefined
        })
      }
      setIsLoading(false)
    }

    // Add a small delay to ensure the payment process is complete
    const timer = setTimeout(updateBookingStatus, 1000)
    return () => clearTimeout(timer)
  }, [paymentId, bookingId, bookingNumber, isSuccess, isFailure, reason])

  const handleGoHome = () => {
    router.push("/")
  }

  const handleBookAnother = () => {
    router.push("/bookings/treatment")
  }

  const handleViewBooking = () => {
    if (paymentData?.booking?.bookingNumber) {
      router.push(`/booking-details/${paymentData.booking.bookingNumber}`)
    } else if (paymentData?.bookingId) {
      router.push(`/booking-details/${paymentData.bookingId}`)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LandingHeader />
        <main className="py-8">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <Card className="shadow-lg">
                <CardContent className="p-8 text-center">
                  <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600 mb-4" />
                  <h2 className="text-xl font-semibold mb-2">מעבד תוצאות תשלום</h2>
                  <p className="text-gray-600">אנא המתן בזמן שאנו מעבדים את התשלום שלך...</p>
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
    <div className="min-h-screen bg-gray-50">
      <LandingHeader />
      <main className="py-8">
        <div className="container mx-auto px-4 pb-8">
          <div className="max-w-2xl mx-auto">
            {isSuccess ? (
              // הצלחה - עיצוב זהה לאימייל
              <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-fade-in-up">
                {/* Header with gradient - כמו באימייל */}
                <div className="bg-gradient-to-br from-blue-600 to-purple-700 p-8 text-center text-white">
                  <h1 className="text-3xl font-bold mb-2 text-shadow">
                    🎉 ההזמנה בוצעה בהצלחה!
                  </h1>
                  <p className="text-blue-100 font-light">
                    תודה רבה על הזמנתך
                  </p>
                </div>

                {/* Content - כמו באימייל */}
                <div className="p-8">
                  <h2 className="text-2xl font-semibold text-blue-600 mb-6">
                    ההזמנה בוצעה בהצלחה!
                  </h2>
                  
                  <p className="text-gray-700 mb-4 text-lg leading-relaxed">
                    שלום,
                  </p>
                  
                  <p className="text-gray-700 mb-6 leading-relaxed">
                    ההזמנה שלך בוצעה בהצלחה ומחכה לשיוך מטפל/ת.
                    בעת האישור הסופי תתקבל הודעת אסמס.
                  </p>

                  {/* Booking Card - כמו באימייל */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-600 rounded-xl p-6 mb-6 text-center">
                    <h3 className="text-xl font-semibold text-blue-600 mb-4">
                      פרטי ההזמנה
                    </h3>
                    
                    <div className="space-y-3">
                      {paymentData?.booking?.treatmentName && (
                        <div className="flex justify-between items-center py-2 border-b border-blue-200">
                          <span className="font-semibold text-gray-700">טיפול:</span>
                          <span className="text-blue-600 font-medium">{paymentData.booking.treatmentName}</span>
                        </div>
                      )}
                      
                      {(paymentData?.booking?.bookingNumber || bookingNumber) && (
                        <div className="flex justify-between items-center py-2 border-b border-blue-200">
                          <span className="font-semibold text-gray-700">מספר הזמנה:</span>
                          <span className="text-blue-600 font-medium">{paymentData?.booking?.bookingNumber || bookingNumber}</span>
                        </div>
                      )}
                      
                      {paymentData?.booking?.customerName && (
                        <div className="flex justify-between items-center py-2 border-b border-blue-200">
                          <span className="font-semibold text-gray-700">שם הלקוח:</span>
                          <span className="text-blue-600 font-medium">{paymentData.booking.customerName}</span>
                        </div>
                      )}
                      
                      {paymentData?.booking?.customerPhone && (
                        <div className="flex justify-between items-center py-2 border-b border-blue-200">
                          <span className="font-semibold text-gray-700">טלפון:</span>
                          <span className="text-blue-600 font-medium">{paymentData.booking.customerPhone}</span>
                        </div>
                      )}
                      
                      {paymentData?.booking?.preferredDate && (
                        <div className="flex justify-between items-center py-2 border-b border-blue-200">
                          <span className="font-semibold text-gray-700">תאריך מועדף:</span>
                          <span className="text-blue-600 font-medium">
                            {new Date(paymentData.booking.preferredDate).toLocaleDateString('he-IL')}
                          </span>
                        </div>
                      )}
                      
                      {paymentData?.booking?.preferredTime && (
                        <div className="flex justify-between items-center py-2 border-b border-blue-200">
                          <span className="font-semibold text-gray-700">שעה מועדפת:</span>
                          <span className="text-blue-600 font-medium">{paymentData.booking.preferredTime}</span>
                        </div>
                      )}
                      
                      {paymentData?.booking?.address && (
                        <div className="flex justify-between items-center py-2 border-b border-blue-200">
                          <span className="font-semibold text-gray-700">כתובת:</span>
                          <span className="text-blue-600 font-medium">{paymentData.booking.address}</span>
                        </div>
                      )}
                      
                      {paymentData?.booking?.price && (
                        <div className="flex justify-between items-center py-2 border-b border-blue-200">
                          <span className="font-semibold text-gray-700">מחיר:</span>
                          <span className="text-blue-600 font-medium">₪{paymentData.booking.price}</span>
                        </div>
                      )}
                      
                      {paymentData?.paymentId && (
                        <div className="flex justify-between items-center py-2">
                          <span className="font-semibold text-gray-700">מזהה תשלום:</span>
                          <span className="text-blue-600 font-medium">{paymentData.paymentId}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Next Steps - כמו באימייל */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                    <h3 className="font-semibold text-blue-900 mb-3">מה הלאה?</h3>
                    <ul className="text-sm text-blue-800 space-y-2 text-right">
                      <li>• פרטי ההזמנה נשלחו אליך באימייל ו/או SMS</li>
                      <li>• נציג שירות יצור איתך קשר תוך 24 שעות</li>
                      <li>• המטפל יקבל את פרטי ההזמנה ויצור קשר לתיאום</li>
                      <li>• תקבל עדכון כשהמטפל יאושר עבור ההזמנה</li>
                    </ul>
                  </div>

                  {/* Button - כמו באימייל */}
                  <div className="text-center mb-8">
                    <Button 
                      onClick={handleViewBooking}
                      className="bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 text-white font-semibold py-4 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105"
                      size="lg"
                    >
                      צפייה בהזמנה
                    </Button>
                  </div>

                  {/* Additional Actions */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button 
                      onClick={handleBookAnother} 
                      variant="outline" 
                      className="flex-1 border-blue-600 text-blue-600 hover:bg-blue-50" 
                      size="lg"
                    >
                      <Calendar className="w-5 h-5 mr-2" />
                      הזמן טיפול נוסף
                    </Button>
                    
                    <Button 
                      onClick={handleGoHome} 
                      variant="outline" 
                      className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50" 
                      size="lg"
                    >
                      <Home className="w-5 h-5 mr-2" />
                      חזרה לדף הבית
                    </Button>
                  </div>

                  {/* Footer - כמו באימייל */}
                  <div className="mt-8 pt-6 border-t border-gray-200 text-center text-gray-600">
                    <p className="font-medium">בברכה,</p>
                    <p>צוות מאסו</p>
                    <div className="mt-4 text-sm">
                      <p>לכל שאלה או בעיה ניתן לפנות אלינו:</p>
                      <p className="font-medium">072-330-3000</p>
                      <p className="text-blue-600">masu.co.il</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // כישלון
              <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-fade-in-up">
                <div className="bg-gradient-to-br from-red-500 to-red-700 p-8 text-center text-white">
                  <XCircle className="mx-auto h-20 w-20 mb-4" />
                  <h1 className="text-3xl font-bold mb-2">
                    התשלום נכשל
                  </h1>
                  <p className="text-red-100">
                    מצטערים, אירעה שגיאה בביצוע התשלום
                  </p>
                </div>

                <div className="p-8">
                  {reason && (
                    <Alert className="bg-red-50 border-red-200 mb-6">
                      <AlertDescription>
                        <div className="text-sm">
                          <strong>סיבת הכישלון:</strong> {getFailureReason(reason)}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
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
              </div>
            )}
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