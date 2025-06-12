"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Separator } from "@/components/common/ui/separator"
import { Badge } from "@/components/common/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/common/ui/dialog"
import { Alert, AlertDescription } from "@/components/common/ui/alert"
import { Loader2, CreditCard, CheckCircle, XCircle, Tag, AlertTriangle } from "lucide-react"
import type { CalculatedPriceDetails } from "@/types/booking"

interface GuestInfo {
  firstName: string
  lastName: string
  email: string
  phone: string
  birthDate?: Date
  gender?: "male" | "female" | "other"
  notes?: string
  isBookingForSomeoneElse?: boolean
  recipientFirstName?: string
  recipientLastName?: string
  recipientEmail?: string
  recipientPhone?: string
  recipientBirthDate?: Date
  recipientGender?: "male" | "female" | "other"
}

interface GuestPaymentStepProps {
  calculatedPrice: CalculatedPriceDetails | null
  guestInfo: Partial<GuestInfo>
  onConfirm: () => void
  onPrev: () => void
  isLoading: boolean
}

export function GuestPaymentStep({
  calculatedPrice,
  guestInfo,
  onConfirm,
  onPrev,
  isLoading,
}: GuestPaymentStepProps) {
  const { t } = useTranslation()
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'failed'>('pending')
  const [countdown, setCountdown] = useState(0)
  const [isCountingDown, setIsCountingDown] = useState(false)

  // Countdown effect
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isCountingDown && countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => prev - 1)
      }, 1000)
    } else if (countdown === 0 && isCountingDown) {
      setIsCountingDown(false)
    }
    return () => clearInterval(interval)
  }, [countdown, isCountingDown])

  const formatPrice = (amount: number) => {
    return `₪${amount.toFixed(2)}`
  }

  const handlePayNow = () => {
    if (isCountingDown) return
    setShowPaymentModal(true)
    setPaymentStatus('pending')
  }

  const handlePaymentSuccess = () => {
    setPaymentStatus('success')
    setTimeout(() => {
      setShowPaymentModal(false)
      onConfirm()
    }, 1500)
  }

  const handlePaymentFailure = () => {
    setPaymentStatus('failed')
  }

  const handleTryAgain = () => {
    setShowPaymentModal(false)
    setPaymentStatus('pending')
    setCountdown(10)
    setIsCountingDown(true)
  }

  const closeModal = () => {
    setShowPaymentModal(false)
    setPaymentStatus('pending')
  }

  if (!calculatedPrice || calculatedPrice.finalAmount === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-4" />
        <h3 className="text-lg font-semibold mb-2">ההזמנה חינמית</h3>
        <p className="text-muted-foreground mb-6">אין צורך בתשלום</p>
        <div className="flex justify-between">
          <Button variant="outline" onClick={onPrev}>
            חזור
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            אשר הזמנה
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div className="text-center">
          <CreditCard className="mx-auto h-12 w-12 text-primary mb-4" />
          <h2 className="text-2xl font-semibold tracking-tight">תשלום</h2>
          <p className="text-muted-foreground mt-2">סיכום ההזמנה והמעבר לתשלום</p>
        </div>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              סיכום הזמנה
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Base Price */}
              <div className="flex justify-between">
                <span>מחיר בסיס:</span>
                <span>{formatPrice(calculatedPrice.basePrice)}</span>
              </div>
              
              {/* Surcharges */}
              {calculatedPrice.surcharges && calculatedPrice.surcharges.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-orange-700">תוספות מחיר:</div>
                  {calculatedPrice.surcharges.map((surcharge, index) => (
                    <div key={index} className="flex justify-between text-orange-600 text-sm pr-4">
                      <span>• {surcharge.description || "תוספת מחיר"}:</span>
                      <span>+{formatPrice(surcharge.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-orange-600 font-medium border-t pt-2">
                    <span>סה"כ תוספות:</span>
                    <span>+{formatPrice(calculatedPrice.totalSurchargesAmount)}</span>
                  </div>
                </div>
              )}

              {/* After subscription/voucher coverage */}
              {(calculatedPrice.isBaseTreatmentCoveredBySubscription || calculatedPrice.isBaseTreatmentCoveredByTreatmentVoucher) && (
                <div className="space-y-2">
                  <div className="flex justify-between text-green-600">
                    <span>
                      {calculatedPrice.isBaseTreatmentCoveredBySubscription 
                        ? "כוסה על ידי מנוי:" 
                        : "כוסה על ידי שובר טיפול:"}
                    </span>
                    <span>-{formatPrice(calculatedPrice.basePrice)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>מחיר לאחר כיסוי מנוי/שובר:</span>
                    <span>{formatPrice(calculatedPrice.treatmentPriceAfterSubscriptionOrTreatmentVoucher)}</span>
                  </div>
                </div>
              )}

              {/* Gift voucher application */}
              {calculatedPrice.voucherAppliedAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span className="flex items-center gap-1">
                    <Tag className="h-4 w-4" />
                    שובר מתנה:
                  </span>
                  <span>-{formatPrice(calculatedPrice.voucherAppliedAmount)}</span>
                </div>
              )}

              {/* Coupon discount */}
              {calculatedPrice.couponDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span className="flex items-center gap-1">
                    <Tag className="h-4 w-4" />
                    הנחת קופון:
                  </span>
                  <span>-{formatPrice(calculatedPrice.couponDiscount)}</span>
                </div>
              )}

              <Separator />
              
              {/* Final Amount */}
              <div className="flex justify-between text-xl font-bold">
                <span>סכום לתשלום:</span>
                <span className="text-primary">{formatPrice(calculatedPrice.finalAmount)}</span>
              </div>

              {calculatedPrice.isFullyCoveredByVoucherOrSubscription && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    ההזמנה מכוסה במלואה על ידי מנוי או שובר
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={onPrev} disabled={isLoading}>
            חזור
          </Button>
          <Button 
            onClick={handlePayNow} 
            disabled={isLoading || isCountingDown}
            size="lg"
            className="px-8"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isCountingDown ? (
              `נסה שוב בעוד ${countdown} שניות`
            ) : (
              `שלם כעת ${formatPrice(calculatedPrice.finalAmount)}`
            )}
          </Button>
        </div>
      </div>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={closeModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-center">תשלום מאובטח</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {paymentStatus === 'pending' && (
              <>
                {/* CardComm iframe simulation */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                  <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    כאן יהיה IFRAME של CARDCOMM
                  </h3>
                  <p className="text-gray-500">
                    ממשק התשלום המאובטח של CardComm
                  </p>
                  <div className="mt-4 p-4 bg-white border rounded">
                    <p className="text-sm text-gray-600">
                      סכום לתשלום: <span className="font-bold">{formatPrice(calculatedPrice.finalAmount)}</span>
                    </p>
                  </div>
                </div>

                {/* Demo buttons */}
                <div className="flex gap-4 justify-center">
                  <Button 
                    onClick={handlePaymentSuccess}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    דימוי הצלחה
                  </Button>
                  <Button 
                    onClick={handlePaymentFailure}
                    variant="destructive"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    דימוי כישלון
                  </Button>
                </div>
              </>
            )}

            {paymentStatus === 'success' && (
              <div className="text-center py-8">
                <CheckCircle className="mx-auto h-16 w-16 text-green-600 mb-4" />
                <h3 className="text-xl font-semibold text-green-700 mb-2">
                  התשלום בוצע בהצלחה!
                </h3>
                <p className="text-gray-600">
                  ההזמנה אושרה ופרטיה נשלחו אליך באימייל
                </p>
              </div>
            )}

            {paymentStatus === 'failed' && (
              <div className="text-center py-8">
                <XCircle className="mx-auto h-16 w-16 text-red-600 mb-4" />
                <h3 className="text-xl font-semibold text-red-700 mb-2">
                  התשלום נכשל
                </h3>
                <p className="text-gray-600 mb-6">
                  אירעה שגיאה בביצוע התשלום. אנא נסה שוב.
                </p>
                
                <Alert className="mb-6">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    לא חויבת. אין תשלום שבוצע עבור ההזמנה הזו.
                  </AlertDescription>
                </Alert>

                <Button onClick={handleTryAgain} className="w-full">
                  נסה שנית
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
} 