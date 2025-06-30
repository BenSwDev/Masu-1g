import { NextRequest, NextResponse } from "next/server"
import { updateBookingStatusAfterPayment } from "@/actions/booking-actions"
import { logger } from "@/lib/logs/logger"

export async function POST(request: NextRequest, { params }: { params: { bookingId: string } }) {
  try {
    const { bookingId } = params
    const body = await request.json()
    const { paymentStatus, transactionId } = body

    if (!bookingId) {
      return NextResponse.json({ success: false, error: "Booking ID is required" }, { status: 400 })
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
      transactionId,
    })

    // Add timeout wrapper for the database operation
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database operation timeout")), 25000)
    )

    const updatePromise = updateBookingStatusAfterPayment(bookingId, paymentStatus, transactionId)

    const result = (await Promise.race([updatePromise, timeoutPromise])) as any

    if (result.success) {
      logger.info("Payment status updated successfully", {
        bookingId,
        paymentStatus,
        bookingStatus: result.booking?.status,
      })

      return NextResponse.json({
        success: true,
        booking: result.booking,
      })
    } else {
      logger.error("Failed to update payment status", {
        bookingId,
        error: result.error,
      })

      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }
  } catch (error) {
    logger.error("Error in payment status API:", {
      error: error instanceof Error ? error.message : String(error),
      bookingId: params.bookingId,
    })

    // Handle specific timeout errors
    if (
      error instanceof Error &&
      (error.message.includes("timeout") ||
        error.message.includes("buffering") ||
        error.message.includes("Database operation timeout"))
    ) {
      return NextResponse.json(
        { success: false, error: "Database connection timeout. Please try again." },
        { status: 503 } // Service Temporarily Unavailable
      )
    }

    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
