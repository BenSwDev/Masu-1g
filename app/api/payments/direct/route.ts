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
      action, // "charge" או "refund"
      originalPaymentId // מזהה התשלום המקורי שממנו נלקח הטוקן
    } = body

    // ולידציה
    if (!bookingId || !amount || amount <= 0 || !action || !originalPaymentId) {
      return NextResponse.json(
        { success: false, error: "נתונים חסרים או לא תקינים" },
        { status: 400 }
      )
    }

    if (!["charge", "refund"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "פעולה לא תקינה - רק charge או refund מותרים" },
        { status: 400 }
      )
    }

    // חיפוש התשלום המקורי עם הטוקן
    const originalPayment = await Payment.findOne({
      $or: [
        { _id: originalPaymentId },
        { booking_id: bookingId, complete: true, has_token: true }
      ]
    }).sort({ created_at: 1 }) // הטוקן הראשון שנוצר

    if (!originalPayment || !originalPayment.result_data?.tokenData) {
      logger.error("Original payment or token not found", {
        originalPaymentId,
        bookingId,
        hasOriginalPayment: !!originalPayment,
        hasTokenData: !!originalPayment?.result_data?.tokenData
      })
      return NextResponse.json(
        { success: false, error: "לא נמצא טוקן תקף לביצוע הפעולה" },
        { status: 404 }
      )
    }

    // פענוח נתוני הטוקן
    const tokenData = cardcomService.decryptTokenData(originalPayment.result_data.tokenData)
    if (!tokenData) {
      logger.error("Failed to decrypt token data", { originalPaymentId })
      return NextResponse.json(
        { success: false, error: "שגיאה בפענוח נתוני הטוקן" },
        { status: 500 }
      )
    }

    // יצירת מזהה תשלום חדש
    const newPaymentId = crypto.randomUUID()

    // יצירת רשומת תשלום חדשה
    const newPayment = new Payment({
      _id: newPaymentId,
      order_id: bookingId,
      booking_id: bookingId,
      sum: amount,
      pay_type: action === "refund" ? "refund" : "ccard",
      sub_type: "direct",
      input_data: {
        bookingId,
        amount,
        description,
        action,
        originalPaymentId,
        tokenUsed: tokenData.token.substring(0, 8) + "...", // רק חלק מהטוקן ללוג
        timestamp: new Date().toISOString()
      },
      start_time: new Date()
    })

    await newPayment.save()

    logger.info(`Starting direct ${action}`, {
      newPaymentId,
      bookingId,
      amount,
      originalPaymentId,
      tokenLast4: tokenData.last4
    })

    // ביצוע הפעולה ב-CARDCOM
    const cardcomResult = action === "refund" 
      ? await cardcomService.directRefund({
          amount,
          description: description || `זיכוי להזמנה ${bookingId}`,
          token: tokenData.token,
          paymentId: newPaymentId
        })
      : await cardcomService.directCharge({
          amount,
          description: description || `חיוב נוסף להזמנה ${bookingId}`,
          token: tokenData.token,
          paymentId: newPaymentId
        })

    // עדכון רשומת התשלום עם התוצאה
    const updateData: any = {
      complete: cardcomResult.success,
      end_time: new Date(),
      result_data: {
        ...cardcomResult,
        processedAt: new Date().toISOString(),
        action
      }
    }

    if (cardcomResult.success && cardcomResult.data) {
      updateData.transaction_id = cardcomResult.data.TransactionID || cardcomResult.data.InternalDealNumber
      updateData.cardcom_internal_deal_number = cardcomResult.data.InternalDealNumber
    }

    await Payment.findByIdAndUpdate(newPaymentId, updateData)

    if (cardcomResult.success) {
      logger.info(`Direct ${action} completed successfully`, {
        newPaymentId,
        bookingId,
        amount,
        transactionId: updateData.transaction_id
      })

      return NextResponse.json({
        success: true,
        paymentId: newPaymentId,
        transactionId: updateData.transaction_id,
        action,
        amount,
        message: action === "refund" ? "הזיכוי בוצע בהצלחה" : "החיוב בוצע בהצלחה"
      })
    } else {
      logger.error(`Direct ${action} failed`, {
        newPaymentId,
        bookingId,
        error: cardcomResult.error
      })

      return NextResponse.json(
        { 
          success: false, 
          error: cardcomResult.error || `שגיאה ב${action === "refund" ? "זיכוי" : "חיוב"}`,
          paymentId: newPaymentId
        },
        { status: 500 }
      )
    }

  } catch (error) {
    logger.error("Direct payment API error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      { success: false, error: "שגיאה פנימית בשרת" },
      { status: 500 }
    )
  }
} 