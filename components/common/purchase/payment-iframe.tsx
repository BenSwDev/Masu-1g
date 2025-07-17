"use client"

import { useState, useEffect } from "react"
import { Loader2, CreditCard, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface PaymentIframeProps {
  paymentUrl: string
  bookingId?: string
  onSuccess: (data: any) => void
  onError: (error: string) => void
  onCancel?: () => void
  height?: string
  className?: string
}

export function PaymentIframe({ 
  paymentUrl, 
  bookingId,
  onSuccess, 
  onError, 
  onCancel,
  height = "600px",
  className = ""
}: PaymentIframeProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [iframeKey, setIframeKey] = useState(0)

  useEffect(() => {
    // רישום מאזין לmessages מ-CARDCOM
    const handleMessage = async (event: MessageEvent) => {
      // בטיחות - וודא שהמסר מגיע מ-CARDCOM או קומפוננטים מקומיים
      if (!event.origin.includes('cardcom.solutions') && event.origin !== window.location.origin) {
        return
      }

      const data = event.data
      
      if (data.type === 'payment_complete') {
        if (data.status === 'success') {
          // עדכון סטטוס התשלום בשרת
          if (data.bookingId || bookingId) {
            try {
              const response = await fetch(`/api/bookings/${data.bookingId || bookingId}/payment-status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  paymentStatus: 'success',
                  transactionId: data.transactionId || data.InternalDealNumber
                })
              })
              
              const result = await response.json()
              if (result.success) {
                console.log('✅ Payment status updated successfully')
              } else {
                console.warn('⚠️ Failed to update payment status:', result.error)
              }
            } catch (error) {
              console.error('❌ Error updating payment status:', error)
            }
          }
          
          onSuccess(data)
        } else {
          // עדכון סטטוס כישלון בשרת
          if (data.bookingId || bookingId) {
            try {
              await fetch(`/api/bookings/${data.bookingId || bookingId}/payment-status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  paymentStatus: 'failed',
                  transactionId: data.transactionId || data.InternalDealNumber
                })
              })
            } catch (error) {
              console.error('❌ Error updating failed payment status:', error)
            }
          }
          
          onError(data.error || 'תשלום נכשל')
        }
      } else if (data.type === 'payment_cancelled') {
        onCancel?.()
      }
    }

    window.addEventListener('message', handleMessage)
    
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [onSuccess, onError, onCancel])

  const handleIframeLoad = () => {
    setLoading(false)
    setError(null)
  }

  const handleIframeError = () => {
    setLoading(false)
    setError("שגיאה בטעינת דף התשלום")
  }

  const retryPayment = () => {
    setLoading(true)
    setError(null)
    setIframeKey(prev => prev + 1) // Force iframe reload
  }

  if (error) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
        <div className="flex gap-2">
          <Button onClick={retryPayment} variant="outline">
            נסה שוב
          </Button>
          {onCancel && (
            <Button onClick={onCancel} variant="ghost">
              ביטול
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div 
          className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg border"
          style={{ height }}
        >
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
          <p className="text-sm text-gray-600 mb-2">טוען דף תשלום מאובטח...</p>
          <div className="flex items-center text-xs text-gray-500">
            <CreditCard className="h-4 w-4 mr-1" />
            מופעל על ידי CARDCOM
          </div>
        </div>
      )}
      
      <iframe
        key={iframeKey}
        src={paymentUrl}
        width="100%"
        height={height}
        frameBorder="0"
        allowTransparency={true}
        scrolling="auto"
        className="rounded-lg border bg-white"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        title="דף תשלום מאובטח"
        sandbox="allow-scripts allow-same-origin allow-forms allow-top-navigation allow-modals allow-popups"
      />
      
      {/* חיווי בטיחות */}
      <div className="mt-2 flex items-center justify-center text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          חיבור מאובטח SSL
        </div>
        <span className="mx-2">•</span>
        <span>מופעל על ידי CARDCOM</span>
      </div>
    </div>
  )
} 