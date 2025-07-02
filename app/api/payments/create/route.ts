import { NextRequest, NextResponse } from "next/server"
import { cardcomService } from "@/lib/services/cardcom-service"
import { Payment } from "@/lib/db/models/payment"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    const body = await request.json()
    const { 
      bookingId, 
      amount, 
      description, 
      customerName, 
      customerEmail, 
      customerPhone,
      type // booking, subscription, gift_voucher
    } = body

    // ולידציה
    if (!bookingId || !amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "נתונים חסרים או לא תקינים" },
        { status: 400 }
      )
    }

    // יצירת מזהה תשלום ייחודי
    const paymentId = crypto.randomUUID()

    // יצירת רשומת תשלום ב-MongoDB
    const payment = new Payment({
      _id: paymentId,
      order_id: bookingId,
      booking_id: bookingId,
      sum: amount,
      pay_type: "ccard",
      sub_type: "token",
      input_data: {
        bookingId,
        amount,
        description,
        customerName,
        customerEmail,
        customerPhone,
        type: type || 'booking', // default to booking if not specified
        timestamp: new Date().toISOString()
      },
      start_time: new Date()
    })

    await payment.save()

    // יצירת URL אחיד להפניה לקבלת תוצאות
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const callbackUrl = `${baseUrl}/api/payments/callback?paymentId=${paymentId}`

    logger.info("Creating payment", {
      paymentId,
      bookingId,
      amount,
      customerEmail
    })

    // קריאה ל-CARDCOM
    const cardcomResult = await cardcomService.createPayment({
      amount,
      description: description || `הזמנה ${bookingId}`,
      paymentId,
      customerName,
      customerEmail,
      customerPhone,
      resultUrl: callbackUrl
    })

    if (cardcomResult.success && cardcomResult.data?.url) {
      logger.info("Payment created successfully", {
        paymentId,
        redirectUrl: cardcomResult.data.url
      })

      return NextResponse.json({
        success: true,
        paymentId,
        redirectUrl: cardcomResult.data.url,
        lowProfileCode: cardcomResult.data.LowProfileCode
      })
    } else {
      // עדכון הרשומה עם השגיאה
      await Payment.findByIdAndUpdate(paymentId, {
        result_data: cardcomResult,
        end_time: new Date(),
        complete: false
      })

      logger.error("Failed to create payment", {
        paymentId,
        error: cardcomResult.error
      })

      return NextResponse.json(
        { success: false, error: cardcomResult.error || "שגיאה ביצירת התשלום" },
        { status: 500 }
      )
    }

  } catch (error) {
    logger.error("Payment creation API error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      { success: false, error: "שגיאה פנימית בשרת" },
      { status: 500 }
    )
  }
} 