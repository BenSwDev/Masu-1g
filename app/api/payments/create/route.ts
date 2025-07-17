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
      bookingId, // יכול להיות null עבור payment-first flow
      amount, 
      description, 
      customerName, 
      customerEmail, 
      customerPhone,
      type, // booking, subscription, gift_voucher
      createDocument, // האם ליצור מסמך (חשבונית)
      documentType, // סוג המסמך
      drawerMode, // האם להשתמש במצב drawer
      // ✅ נתונים חדשים עבור payment-first flow
      bookingData, // כל נתוני הbooking לשמירה עתידית
      paymentFirst = false // האם זה payment-first flow
    } = body

    // ולידציה בסיסית
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "נתונים חסרים או לא תקינים" },
        { status: 400 }
      )
    }

    // עבור payment-first flow, לא נדרש bookingId
    if (!paymentFirst && !bookingId) {
      return NextResponse.json(
        { success: false, error: "נתונים חסרים או לא תקינים" },
        { status: 400 }
      )
    }

    // יצירת מזהה תשלום ייחודי
    const paymentId = crypto.randomUUID()

    // Generate callback URLs for CARDCOM
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "https://v0-masu-lo.vercel.app"
    const callbackUrl = `${baseUrl}/api/payments/callback?paymentId=${paymentId}`

    logger.info("Creating CARDCOM payment URL", {
      paymentId,
      bookingId: bookingId || "payment-first",
      amount,
      customerEmail,
      paymentFirst
    })

    // 🔧 קודם קוראים ל-CARDCOM, רק אחר כך יוצרים Payment record
    const cardcomResult = await cardcomService.createLowProfilePayment({
      amount,
      description: description || `הזמנת טיפול - תשלום ${paymentId}`,
      paymentId,
      customerName,
      customerEmail,
      customerPhone,
      successUrl: `${baseUrl}/payment/success`,
      errorUrl: `${baseUrl}/payment/error`,
      createDocument: createDocument !== false, // ברירת מחדל true
      documentType: documentType || (type === "booking" ? "Order" : "Receipt"),
      drawerMode: drawerMode === true // העברת מצב drawer
    })

    if (cardcomResult.success && cardcomResult.data?.url) {
      // ✅ רק עכשיו יוצרים Payment record - אחרי שCARDCOM הצליח
      const payment = new Payment({
        _id: paymentId,
        order_id: bookingId || paymentId, // אם אין booking, נשתמש בpaymentId
        booking_id: bookingId, // יכול להיות null
        sum: amount,
        pay_type: "ccard",
        sub_type: "token",
        input_data: {
          bookingId: bookingId || null,
          amount,
          description,
          customerName,
          customerEmail,
          customerPhone,
          type: type || 'booking',
          timestamp: new Date().toISOString(),
          paymentFirst,
          // ✅ שמירת נתוני booking לעיבוד עתידי
          bookingData: paymentFirst ? bookingData : undefined
        },
        start_time: new Date(),
        cardcom_url: cardcomResult.data.url,
        low_profile_code: cardcomResult.data.LowProfileCode
      })

      await payment.save()

      logger.info("Payment URL created successfully", {
        paymentId,
        redirectUrl: cardcomResult.data.url,
        paymentFirst
      })

      return NextResponse.json({
        success: true,
        paymentId,
        redirectUrl: cardcomResult.data.url,
        lowProfileCode: cardcomResult.data.LowProfileCode,
        paymentFirst
      })
    } else {
      // ❌ אם CARDCOM נכשל - לא יוצרים Payment record בכלל
      logger.error("Failed to create CARDCOM payment URL", {
        paymentId,
        error: cardcomResult.error,
        fullCardcomResult: cardcomResult,
        amount,
        customerEmail
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