"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { CheckCircle, XCircle, Loader2, Home, Receipt } from "lucide-react"
import { Alert, AlertDescription } from "@/components/common/ui/alert"

export default function PaymentResultPage() {
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
            bookingUpdated: result.success
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

  const handleViewBooking = () => {
    if (bookingId) {
      router.push(`/dashboard/member/bookings`)
    } else {
      router.push("/dashboard")
    }
  }

  const handleViewPurchases = () => {
    router.push("/dashboard/member/purchase-history")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">מעבד תוצאות תשלום</h2>
            <p className="text-gray-600">אנא המתן בזמן שאנו מעבדים את התשלום שלך...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="p-8">
          {isSuccess ? (
            // הצלחה
            <div className="text-center space-y-6">
              <div className="flex flex-col items-center">
                <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                <h1 className="text-2xl font-bold text-green-700 mb-2">
                  התשלום בוצע בהצלחה!
                </h1>
                <p className="text-gray-600">
                  תודה! התשלום שלך אושר ועובד בהצלחה.
                </p>
              </div>

              {paymentData?.paymentId && (
                <Alert className="bg-green-50 border-green-200">
                  <AlertDescription>
                    <div className="space-y-1 text-sm">
                      <div><strong>מזהה תשלום:</strong> {paymentData.paymentId}</div>
                      {paymentData.bookingId && (
                        <div><strong>מזהה הזמנה:</strong> {paymentData.bookingId}</div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  פרטי ההזמנה ואישור התשלום נשלחו אליך באימייל.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  {bookingId ? (
                    <Button onClick={handleViewBooking} className="flex-1">
                      <Receipt className="w-4 h-4 mr-2" />
                      צפה בהזמנה
                    </Button>
                  ) : (
                    <Button onClick={handleViewPurchases} className="flex-1">
                      <Receipt className="w-4 h-4 mr-2" />
                      צפה ברכישות
                    </Button>
                  )}
                  
                  <Button variant="outline" onClick={handleGoHome} className="flex-1">
                    <Home className="w-4 h-4 mr-2" />
                    חזרה לדף הבית
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            // כישלון
            <div className="text-center space-y-6">
              <div className="flex flex-col items-center">
                <XCircle className="h-16 w-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold text-red-700 mb-2">
                  התשלום נכשל
                </h1>
                <p className="text-gray-600">
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

              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  לא חויבת על התשלום הזה. אנא נסה שוב או פנה לשירות הלקוחות.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={() => router.back()} className="flex-1">
                    נסה שוב
                  </Button>
                  
                  <Button variant="outline" onClick={handleGoHome} className="flex-1">
                    <Home className="w-4 h-4 mr-2" />
                    חזרה לדף הבית
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
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