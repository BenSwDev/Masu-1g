import { NextRequest, NextResponse } from "next/server"
import { Payment } from "@/lib/db/models/payment"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"

export async function GET(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    await dbConnect()

    const { paymentId } = params

    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: "Payment ID is required" },
        { status: 400 }
      )
    }

    // חיפוש התשלום במסד הנתונים
    const payment = await Payment.findById(paymentId)

    if (!payment) {
      return NextResponse.json(
        { success: false, error: "Payment not found" },
        { status: 404 }
      )
    }

    // קביעת מצב התשלום
    let status = 'pending'
    let paymentData = null

    if (payment.complete === true) {
      status = 'completed'
      paymentData = {
        transactionId: payment.transaction_id,
        cardcomInternalDealNumber: payment.cardcom_internal_deal_number,
        paymentId: payment._id,
        amount: payment.sum,
        bookingId: payment.booking_id,
        completedAt: payment.end_time,
        resultData: payment.result_data
      }
    } else if (payment.complete === false && payment.end_time) {
      status = 'failed'
    }

    logger.info("Payment status checked", {
      paymentId,
      status,
      complete: payment.complete,
      hasEndTime: !!payment.end_time
    })

    return NextResponse.json({
      success: true,
      status,
      paymentData,
      payment: {
        id: payment._id,
        bookingId: payment.booking_id,
        amount: payment.sum,
        complete: payment.complete,
        startTime: payment.start_time,
        endTime: payment.end_time,
        hasToken: payment.has_token || false
      }
    })

  } catch (error) {
    logger.error("Payment status check error", {
      paymentId: params.paymentId,
      error: error instanceof Error ? error.message : String(error)
    })

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
} 