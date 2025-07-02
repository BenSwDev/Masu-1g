import { NextRequest, NextResponse } from "next/server"
import { Payment } from "@/lib/db/models/payment"
import { Booking } from "@/lib/db/models/booking"
import { cardcomService, type TokenData } from "@/lib/services/cardcom-service"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"
import { updateBookingStatusAfterPayment } from "@/actions/booking-actions"

export async function GET(request: NextRequest) {
  try {
    await dbConnect()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const paymentId = searchParams.get("paymentId")
    
    // פרמטרים מ-CARDCOM
    const complete = searchParams.get("complete")
    const token = searchParams.get("token")
    const sum = searchParams.get("sum")
    const returnValue = searchParams.get("ReturnValue")
    const internalDealNumber = searchParams.get("InternalDealNumber")
    const last4 = searchParams.get("last4")
    const tokenData = searchParams.get("tokenData")
    const isMockPayment = searchParams.get("mock") === "true"

    logger.info("Payment callback received", {
      status,
      paymentId,
      complete,
      token,
      sum,
      returnValue,
      internalDealNumber,
      hasTokenData: !!tokenData,
      isMockPayment
    })

    if (!paymentId && !returnValue) {
      logger.error("Payment callback missing identifiers")
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/payment/result?status=error&complete=0&reason=missing_identifiers`)
    }

    // חיפוש התשלום
    const finalPaymentId = paymentId || returnValue
    const payment = await Payment.findById(finalPaymentId)
    
    if (!payment) {
      logger.error("Payment not found", { paymentId: finalPaymentId })
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/payment/result?status=error&complete=0&reason=payment_not_found`)
    }

    const isSuccess = status === "success" && complete === "1"
    
    // עדכון רשומת התשלום
    const updateData: any = {
      complete: isSuccess,
      end_time: new Date(),
      has_token: token === "1",
      result_data: {
        status,
        complete,
        token,
        sum,
        returnValue,
        internalDealNumber,
        last4,
        callbackTime: new Date().toISOString(),
        allParams: Object.fromEntries(searchParams.entries())
      }
    }

    if (internalDealNumber) {
      updateData.transaction_id = internalDealNumber
      updateData.cardcom_internal_deal_number = internalDealNumber
    }

    // אם יש נתוני טוקן - הצפנה ושמירה
    if (isSuccess && token === "1") {
      try {
        let parsedTokenData: TokenData
        
        if (isMockPayment) {
          // במצב בדיקה - יצירת נתוני טוקן מדומים
          parsedTokenData = {
            token: "TEST_TOKEN_" + Math.random().toString(36).substr(2, 16),
            last4: "1234",
            name: "Test Customer",
            phone: "050-1234567",
            email: "test@example.com"
          }
          logger.info("Mock token data created for test payment", {
            paymentId: finalPaymentId,
            last4: parsedTokenData.last4
          })
        } else if (tokenData) {
          // במצב ייצור - פענוח נתוני טוקן אמיתיים
          parsedTokenData = JSON.parse(decodeURIComponent(tokenData))
        } else {
          throw new Error("No token data available")
        }
        
        const encryptedTokenData = cardcomService.encryptTokenData(parsedTokenData)
        updateData.result_data.tokenData = encryptedTokenData
        
        logger.info("Token data encrypted and saved", {
          paymentId: finalPaymentId,
          last4: parsedTokenData.last4,
          isMock: isMockPayment
        })
      } catch (error) {
        logger.error("Failed to process token data", {
          paymentId: finalPaymentId,
          error: error instanceof Error ? error.message : String(error),
          isMock: isMockPayment
        })
      }
    }

    await Payment.findByIdAndUpdate(finalPaymentId, updateData)

    // עדכון סטטוס ההזמנה
    if (payment.booking_id) {
      try {
        const bookingUpdateResult = await updateBookingStatusAfterPayment(
          payment.booking_id,
          isSuccess ? "success" : "failed",
          internalDealNumber || undefined
        )

        if (bookingUpdateResult.success) {
          logger.info("Booking status updated successfully", {
            paymentId: finalPaymentId,
            bookingId: payment.booking_id,
            paymentStatus: isSuccess ? "success" : "failed"
          })
        } else {
          logger.error("Failed to update booking status", {
            paymentId: finalPaymentId,
            bookingId: payment.booking_id,
            error: bookingUpdateResult.error
          })
        }
      } catch (error) {
        logger.error("Error updating booking status", {
          paymentId: finalPaymentId,
          bookingId: payment.booking_id,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    // הפניה לעמוד תוצאות אחיד
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const reason = searchParams.get("reason") || (isSuccess ? undefined : "payment_failed")
    
    const resultUrl = `${baseUrl}/payment/result?paymentId=${finalPaymentId}&bookingId=${payment.booking_id}&status=${isSuccess ? 'success' : 'error'}&complete=${isSuccess ? '1' : '0'}${reason ? `&reason=${encodeURIComponent(reason)}` : ''}`
    
    return NextResponse.redirect(resultUrl)

  } catch (error) {
    logger.error("Payment callback error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    return NextResponse.redirect(`${baseUrl}/payment/result?status=error&complete=0&reason=internal_error`)
  }
}

// תמיכה גם ב-POST (למקרה ש-CARDCOM שולח POST)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    logger.info("Payment callback POST received", { body })
    
    // העברה לטיפול GET עם פרמטרים מה-body
    const params = new URLSearchParams()
    Object.entries(body).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        params.set(key, String(value))
      }
    })
    
    const newUrl = new URL(request.url)
    newUrl.search = params.toString()
    
    return GET(new NextRequest(newUrl.toString(), { method: "GET" }))
    
  } catch (error) {
    logger.error("Payment callback POST error", {
      error: error instanceof Error ? error.message : String(error)
    })
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    return NextResponse.redirect(`${baseUrl}/payment/result?status=error&complete=0&reason=callback_error`)
  }
} 