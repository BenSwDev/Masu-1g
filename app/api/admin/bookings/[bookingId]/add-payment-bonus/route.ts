import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { addPaymentBonusToBooking } from "@/actions/booking-actions"
import { logger } from "@/lib/logs/logger"
import mongoose from "mongoose"

interface RouteParams {
  params: Promise<{
    bookingId: string
  }>
}

/**
 * POST /api/admin/bookings/[bookingId]/add-payment-bonus
 * Add payment bonus to a booking
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Check admin authorization
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { bookingId } = await params
    if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
      return NextResponse.json(
        { success: false, error: "Invalid booking ID" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { amount, description } = body

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Amount must be greater than 0" },
        { status: 400 }
      )
    }

    if (!description || description.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Description is required" },
        { status: 400 }
      )
    }

    // Use the action to add payment bonus
    const result = await addPaymentBonusToBooking(bookingId, Number(amount), description.trim())
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    // Send notifications to suitable professionals if needed
    if (result.shouldNotifyProfessionals) {
      try {
        const { sendPaymentBonusNotifications } = await import("@/actions/unified-professional-notifications")
        const notificationResult = await sendPaymentBonusNotifications(bookingId, Number(amount), description.trim())
        
        if (notificationResult.success) {
          logger.info("Payment bonus notifications sent", {
            bookingId,
            sentCount: notificationResult.sentCount
          })
        } else {
          logger.warn("Failed to send payment bonus notifications", {
            bookingId,
            error: notificationResult.error
          })
        }
      } catch (notificationError) {
        logger.error("Error sending payment bonus notifications", {
          bookingId,
          error: notificationError
        })
        // Don't fail the operation if notifications fail
      }
    }

    return NextResponse.json({
      success: true,
      booking: result.booking,
      message: "Payment bonus added successfully",
      notificationsSent: result.shouldNotifyProfessionals
    })

  } catch (error) {
    logger.error("Error adding payment bonus:", error)
    return NextResponse.json(
      { success: false, error: "Failed to add payment bonus" },
      { status: 500 }
    )
  }
} 