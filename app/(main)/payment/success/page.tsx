"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/common/ui/card"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

export default function PaymentCallbackPage() {
  const searchParams = useSearchParams()
  const messagesSent = useRef(false)
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    // Extract all CARDCOM parameters + our own paymentId
    const params = {
      paymentId: searchParams.get("paymentId"),
      drawer: searchParams.get("drawer"),
      error: searchParams.get("error"),
      // CARDCOM parameters
      terminalnumber: searchParams.get("terminalnumber"),
      lowprofilecode: searchParams.get("lowprofilecode"),
      ResponeCode: searchParams.get("ResponeCode"), // Note: CARDCOM typo
      ResponseCode: searchParams.get("ResponseCode"),
      Operation: searchParams.get("Operation"),
      Status: searchParams.get("Status"),
      IssuerAuthCodeDescription: searchParams.get("IssuerAuthCodeDescription"),
    }

    console.log('🏦 CARDCOM callback received:', params)

    // Determine success based on CARDCOM response or error parameter
    const isSuccess = !params.error && (params.ResponseCode === "0" || params.ResponeCode === "0")
    setStatus(isSuccess ? 'success' : 'error')

    // Send message to parent window (drawer) and redirect
    const handleCallback = async () => {
      if (messagesSent.current) return
      messagesSent.current = true

      // Data to send to parent window
      const callbackData = {
        type: 'payment_complete',
        status: isSuccess ? 'success' : 'failed',
        complete: isSuccess ? '1' : '0',
        paymentId: params.paymentId,
        transactionId: params.lowprofilecode,
        ...params
      }

      console.log('📤 Sending callback data to parent:', callbackData)

      // Try to communicate with parent window (drawer mode)
      try {
        if (window.parent && window.parent !== window) {
          // We're in an iframe - send message to parent
          window.parent.postMessage(callbackData, '*')
          console.log('✅ Message sent to parent window')
          
          // Close the iframe after a short delay
          setTimeout(() => {
            try {
              window.parent.postMessage({ type: 'close_payment_frame' }, '*')
            } catch (error) {
              console.warn('Could not close iframe:', error)
            }
          }, 2000)
        }
      } catch (error) {
        console.warn('Error communicating with parent:', error)
      }

      // Also redirect to the main payment success page as fallback
      setTimeout(() => {
        const successUrl = `/payment-success?${searchParams.toString()}`
        if (window.parent && window.parent !== window) {
          // In iframe - try to redirect parent
          try {
            window.parent.location.href = successUrl
          } catch (error) {
            window.location.href = successUrl
          }
        } else {
          // Regular window
          window.location.href = successUrl
        }
      }, 3000)
    }

    handleCallback()
  }, [searchParams])

  const getMessage = () => {
    switch (status) {
      case 'success':
        return 'התשלום הושלם בהצלחה!'
      case 'error':
        return 'התשלום נכשל, נסה שוב'
      default:
        return 'מעבד תוצאות תשלום...'
    }
  }

  const getIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
      case 'error':
        return <XCircle className="h-12 w-12 text-red-500 mx-auto" />
      default:
        return <Loader2 className="h-12 w-12 text-blue-500 mx-auto animate-spin" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          {getIcon()}
          <h2 className="text-xl font-semibold mt-4 mb-2">{getMessage()}</h2>
          <p className="text-muted-foreground text-sm">
            {status === 'loading' && 'מתעדכן עם המערכת...'}
            {status === 'success' && 'מעביר חזרה לאתר...'}
            {status === 'error' && 'מעביר לעמוד השגיאה...'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 