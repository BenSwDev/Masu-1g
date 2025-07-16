"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"

interface PaymentData {
  bookingId: string
  amount: number
  description: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  type?: "booking" | "subscription" | "gift_voucher"
  createDocument?: boolean
  documentType?: "Order" | "Invoice" | "Receipt"
}

interface UsePaymentDrawerProps {
  onSuccess?: (data: any) => void
  onError?: (error: string) => void
}

interface PaymentDrawerState {
  isOpen: boolean
  isLoading: boolean
  paymentUrl?: string
  paymentId?: string
  paymentData?: PaymentData
  error?: string
}

export function usePaymentDrawer({ onSuccess, onError }: UsePaymentDrawerProps = {}) {
  const [state, setState] = useState<PaymentDrawerState>({
    isOpen: false,
    isLoading: false
  })

  const openDrawer = useCallback(async (paymentData: PaymentData) => {
    setState(prev => ({ 
      ...prev, 
      isOpen: true, 
      isLoading: true, 
      paymentData,
      error: undefined 
    }))

    try {
      // יצירת תשלום עם מצב drawer
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...paymentData,
          drawerMode: true // ✅ מצב drawer
        }),
      })

      const result = await response.json()

      if (result.success && result.redirectUrl) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          paymentUrl: result.redirectUrl,
          paymentId: result.paymentId
        }))
      } else {
        throw new Error(result.error || 'שגיאה ביצירת התשלום')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'שגיאה ביצירת התשלום'
      
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }))
      
      toast.error(errorMessage)
      
      if (onError) {
        onError(errorMessage)
      }
    }
  }, [onError])

  const closeDrawer = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      isOpen: false,
      isLoading: false,
      paymentUrl: undefined,
      paymentId: undefined,
      paymentData: undefined,
      error: undefined
    }))
  }, [])

  const handleSuccess = useCallback((data: any) => {
    toast.success('התשלום הושלם בהצלחה!')
    
    // נסגור את הdrawer אחרי 2 שניות
    setTimeout(() => {
      closeDrawer()
    }, 2000)
    
    if (onSuccess) {
      onSuccess(data)
    }
  }, [onSuccess, closeDrawer])

  const handleError = useCallback((error: string) => {
    setState(prev => ({ 
      ...prev, 
      error 
    }))
    
    toast.error(error)
    
    if (onError) {
      onError(error)
    }
  }, [onError])

  return {
    // State
    isOpen: state.isOpen,
    isLoading: state.isLoading,
    paymentUrl: state.paymentUrl,
    paymentId: state.paymentId,
    paymentData: state.paymentData,
    error: state.error,
    
    // Actions
    openDrawer,
    closeDrawer,
    handleSuccess,
    handleError
  }
} 