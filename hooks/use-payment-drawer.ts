"use client"

import { useState } from "react"

interface UsePaymentDrawerProps {
  onSuccess: (data: any) => void
  onError: (error: string) => void
}

interface PaymentDrawerData {
  bookingId?: string
  amount: number
  description: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  type?: "booking" | "subscription" | "gift_voucher"
  createDocument?: boolean
  documentType?: "Order" | "Invoice" | "Receipt"
  // ✅ נתונים חדשים עבור payment-first flow
  bookingData?: any // כל נתוני הbooking לשמירה
  paymentFirst?: boolean // האם להשתמש בתהליך החדש
}

export function usePaymentDrawer({ onSuccess, onError }: UsePaymentDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)
  const [paymentId, setPaymentId] = useState<string | null>(null)

  const openDrawer = async (data: PaymentDrawerData) => {
    setIsLoading(true)
    
    try {
      console.log("🏦 Opening payment drawer", { 
        hasBookingId: !!data.bookingId, 
        amount: data.amount,
        paymentFirst: data.paymentFirst 
      })

      // קריאת API ליצירת תשלום
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId: data.bookingId,
          amount: data.amount,
          description: data.description,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          type: data.type || "booking",
          createDocument: data.createDocument,
          documentType: data.documentType,
          drawerMode: true,
          // ✅ נתונים חדשים עבור payment-first flow
          bookingData: data.bookingData,
          paymentFirst: data.paymentFirst || false
        }),
      })

      const result = await response.json()

      if (result.success && result.redirectUrl) {
        setPaymentUrl(result.redirectUrl)
        setPaymentId(result.paymentId)
        setIsOpen(true)
        
        console.log("✅ Payment URL created successfully", { 
          paymentId: result.paymentId,
          paymentFirst: result.paymentFirst 
        })
      } else {
        console.error("❌ Payment URL creation failed:", result.error)
        onError(result.error || "שגיאה ביצירת קישור התשלום")
      }
    } catch (error) {
      console.error("❌ Payment drawer error:", error)
      onError("שגיאה ביצירת התשלום")
    } finally {
      setIsLoading(false)
    }
  }

  const closeDrawer = () => {
    setIsOpen(false)
    setPaymentUrl(null)
    setPaymentId(null)
  }

  const handleSuccess = (data: any) => {
    console.log("✅ Payment completed successfully", data)
    closeDrawer()
    onSuccess(data)
  }

  const handleError = (error: string) => {
    console.error("❌ Payment failed:", error)
    onError(error)
  }

  return {
    isOpen,
    isLoading,
    paymentUrl,
    paymentId,
    openDrawer,
    closeDrawer,
    onSuccess: handleSuccess,
    onError: handleError,
  }
} 