"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription
} from "@/components/common/ui/drawer"
import { Button } from "@/components/common/ui/button"
import { Alert, AlertDescription } from "@/components/common/ui/alert"
import { Progress } from "@/components/common/ui/progress"
import { 
  Loader2, 
  CreditCard, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  Clock,
  Shield,
  X
} from "lucide-react"
import { cn } from "@/lib/utils/utils"

interface PaymentDrawerProps {
  isOpen: boolean
  onClose: () => void
  paymentUrl?: string
  paymentId?: string
  bookingId?: string
  amount?: number
  description?: string
  onSuccess: (data: any) => void
  onError: (error: string) => void
  className?: string
}

type PaymentStatus = 'loading' | 'ready' | 'iframe_loaded' | 'processing' | 'success' | 'failed' | 'error'

export function PaymentDrawer({
  isOpen,
  onClose,
  paymentUrl,
  paymentId,
  bookingId,
  amount,
  description,
  onSuccess,
  onError,
  className
}: PaymentDrawerProps) {
  const [status, setStatus] = useState<PaymentStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [retryCountdown, setRetryCountdown] = useState(0)
  const [iframeKey, setIframeKey] = useState(0)

  // 🔧 FIX: כשpaymentUrl מגיע מהAPI, מציג את iframe מיד
  useEffect(() => {
    if (paymentUrl && status === 'loading') {
      setStatus('ready') // מציג iframe מיד
    }
  }, [paymentUrl, status])

  // ✅ בוטל polling - משתמשים רק בPostMessage מCARDCOM iframe

  // מאזין להודעות מ-iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // בטיחות - וודא שהמסר מגיע מ-CARDCOM
      if (!event.origin.includes('cardcom.solutions') && event.origin !== window.location.origin) {
        return
      }

      const data = event.data
      
      if (data.type === 'payment_started') {
        setStatus('processing')
      } else if (data.type === 'payment_complete') {
        if (data.status === 'success') {
          setStatus('success')
          onSuccess(data)
        } else {
          setStatus('failed')
          setError(data.error || 'התשלום נכשל')
        }
      } else if (data.type === 'payment_cancelled') {
        handleCancel()
      }
    }

    if (isOpen) {
      window.addEventListener('message', handleMessage)
    }
    
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [isOpen, onSuccess])

  const handleIframeLoad = () => {
    setStatus('iframe_loaded')
    setError(null)
  }

  const handleIframeError = () => {
    setStatus('error')
    setError("שגיאה בטעינת דף התשלום")
  }

  const handleCancel = () => {
    setStatus('loading')
    onClose()
  }

  const handleRetry = () => {
    setStatus('loading')
    setError(null)
    setIframeKey(prev => prev + 1)
    setRetryCountdown(0)
  }

  const handleFailedRetry = () => {
    setRetryCountdown(10)
    const countdown = setInterval(() => {
      setRetryCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdown)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // התחלת countdown אוטומטית כאשר תשלום נכשל
  useEffect(() => {
    if (status === 'failed' && retryCountdown === 0) {
      handleFailedRetry()
    }
  }, [status])

  // ניקוי כאשר הdrawer נסגר
  useEffect(() => {
    if (!isOpen) {
      setStatus('loading')
      setError(null)
      setRetryCountdown(0)
    }
  }, [isOpen])

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <h3 className="text-lg font-medium">מכין את דף התשלום</h3>
            <p className="text-sm text-muted-foreground text-center">
              אנא המתן בזמן שאנחנו מכינים עבורך דף תשלום מאובטח
            </p>
          </div>
        )

      case 'ready':
        return (
          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>התקדמות תשלום</span>
                <span>שלב 1 מתוך 3</span>
              </div>
              <Progress value={33} className="h-2" />
            </div>

            {/* Payment Info */}
            <Alert className="bg-blue-50 border-blue-200">
              <Shield className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <div className="space-y-1">
                  <div className="font-medium">תשלום מאובטח</div>
                  <div className="text-xs">
                    {description && <div>עבור: {description}</div>}
                    {amount && <div>סכום: ₪{amount.toFixed(2)}</div>}
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            {/* CARDCOM iframe */}
            {paymentUrl && (
              <div className="relative">
                <iframe
                  key={iframeKey}
                  src={paymentUrl}
                  width="100%"
                  height="500"
                  frameBorder="0"
                  allowTransparency={true}
                  scrolling="auto"
                  className="rounded-lg border bg-white"
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                  title="דף תשלום מאובטח"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-top-navigation"
                />
                
                {/* Security indicators */}
                <div className="mt-2 flex items-center justify-center text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    חיבור מאובטח SSL
                  </div>
                  <span className="mx-2">•</span>
                  <span>מופעל על ידי CARDCOM</span>
                </div>
              </div>
            )}
          </div>
        )

      case 'iframe_loaded':
        return (
          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>התקדמות תשלום</span>
                <span>שלב 2 מתוך 3</span>
              </div>
              <Progress value={66} className="h-2" />
            </div>

            {/* Payment Info */}
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="space-y-1">
                  <div className="font-medium">דף תשלום נטען בהצלחה</div>
                  <div className="text-xs">
                    מלא את פרטי התשלום בדף שלמעלה
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            {/* CARDCOM iframe */}
            {paymentUrl && (
              <div className="relative">
                <iframe
                  key={iframeKey}
                  src={paymentUrl}
                  width="100%"
                  height="500"
                  frameBorder="0"
                  allowTransparency={true}
                  scrolling="auto"
                  className="rounded-lg border bg-white"
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                  title="דף תשלום מאובטח"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-top-navigation"
                />
                
                {/* Security indicators */}
                <div className="mt-2 flex items-center justify-center text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    חיבור מאובטח SSL
                  </div>
                  <span className="mx-2">•</span>
                  <span>מופעל על ידי CARDCOM</span>
                </div>
              </div>
            )}
          </div>
        )

      case 'processing':
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="relative">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <CreditCard className="h-8 w-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-primary" />
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-lg font-medium">מעבד תשלום...</h3>
              <p className="text-sm text-muted-foreground">
                אנא המתן בזמן שאנחנו מעבדים את התשלום שלך
              </p>
              <div className="space-y-1">
                <Progress value={66} className="h-2" />
                <div className="text-xs text-muted-foreground">שלב 2 מתוך 3</div>
              </div>
            </div>

            <Alert className="bg-yellow-50 border-yellow-200 w-full">
              <Clock className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>חשוב:</strong> אל תסגור חלון זה או תעזוב את הדף בזמן עיבוד התשלום
              </AlertDescription>
            </Alert>
          </div>
        )

      case 'success':
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="relative">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-green-800">התשלום הושלם בהצלחה!</h3>
              <p className="text-sm text-muted-foreground">
                קיבלת אישור תשלום במייל שלך
              </p>
              <div className="space-y-1">
                <Progress value={100} className="h-2" />
                <div className="text-xs text-muted-foreground">הושלם בהצלחה</div>
              </div>
            </div>

            <Alert className="bg-green-50 border-green-200 w-full">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="space-y-1">
                  <div className="font-medium">ההזמנה נרשמה במערכת</div>
                  <div className="text-xs">בקרוב תקבל אישור הזמנה נוסף</div>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )

      case 'failed':
      case 'error':
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="relative">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-red-800">התשלום נכשל</h3>
              <p className="text-sm text-muted-foreground">
                {error || 'אירעה שגיאה בעיבוד התשלום'}
              </p>
            </div>

            <Alert variant="destructive" className="w-full">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div>התשלום לא הושלם. אנא נסה שוב או צור קשר לתמיכה</div>
                  {retryCountdown > 0 && (
                    <div className="text-xs">
                      תוכל לנסות שוב בעוד {retryCountdown} שניות
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>

            <div className="flex gap-2 w-full">
              <Button 
                onClick={handleRetry} 
                disabled={retryCountdown > 0}
                className="flex-1"
              >
                {retryCountdown > 0 ? (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    נסה שוב ({retryCountdown})
                  </>
                ) : (
                  'נסה שוב'
                )}
              </Button>
              <Button onClick={handleCancel} variant="outline" className="flex-1">
                ביטול
              </Button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DrawerContent className={cn(
        "max-w-md mx-auto max-h-[85vh]",
        className
      )}>
        <DrawerHeader className="relative">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                תשלום מאובטח
              </DrawerTitle>
              <DrawerDescription>
                השלם את התשלום כדי לאשר את ההזמנה
              </DrawerDescription>
            </div>
            
            {/* X button - only show in certain states */}
            {(status === 'iframe_loaded' || status === 'failed' || status === 'error') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DrawerHeader>

        <div className="px-4 pb-6">
          {renderContent()}
        </div>
      </DrawerContent>
    </Drawer>
  )
} 