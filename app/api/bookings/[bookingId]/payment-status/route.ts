import { NextRequest, NextResponse } from "next/server"
import { updateBookingStatusAfterPayment } from "@/actions/booking-actions"
import { logger } from "@/lib/logs/logger"

export async function POST(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const { bookingId } = params
    const body = await request.json()
    const { paymentStatus, transactionId } = body

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: "Booking ID is required" },
        { status: 400 }
      )
    }

    if (!paymentStatus || !["success", "failed"].includes(paymentStatus)) {
      return NextResponse.json(
        { success: false, error: "Valid payment status is required" },
        { status: 400 }
      )
    }

    logger.info("Processing payment status update", {
      bookingId,
      paymentStatus,
      transactionId
    })

    const result = await updateBookingStatusAfterPayment(
      bookingId,
      paymentStatus,
      transactionId
    )

    if (result.success) {
      logger.info("Payment status updated successfully", {
        bookingId,
        paymentStatus,
        bookingStatus: result.booking?.status
      })
      
      return NextResponse.json({
        success: true,
        booking: result.booking
      })
    } else {
      logger.error("Failed to update payment status", {
        bookingId,
        error: result.error
      })
      
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.error("Error in payment status API:", {
      error: error instanceof Error ? error.message : String(error),
      bookingId: params.bookingId
    })
    
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
} 