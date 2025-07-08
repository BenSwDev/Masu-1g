import { NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"
import mongoose from "mongoose"
import { verifyProfessionalToken } from "@/lib/auth/jwt-auth"

// Function to send review request to customer
async function sendReviewRequest(bookingId: string) {
  try {
    const { unifiedNotificationService } = await import("@/lib/notifications/unified-notification-service")
    const Booking = (await import("@/lib/db/models/booking")).default
    const User = (await import("@/lib/db/models/user")).default
    const Treatment = (await import("@/lib/db/models/treatment")).default
    
    // Get booking with related data
    const booking = await Booking.findById(bookingId)
      .populate('userId', 'name email phone notificationPreferences')
      .populate('treatmentId', 'name')
      .populate('professionalId', 'name')
      .lean()
    
    if (!booking) {
      logger.error("Booking not found for review request", { bookingId })
      return
    }

    const customer = booking.userId as any
    const treatment = booking.treatmentId as any
    const professional = booking.professionalId as any

    if (!customer || !treatment || !professional) {
      logger.error("Missing required data for review request", { bookingId })
      return
    }

    // Create review URL
    const reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/review/booking/${bookingId}`

    const notificationData = {
      type: "review_request" as const,
      customerName: customer.name,
      treatmentName: treatment.name,
      professionalName: professional.name,
      reviewUrl: reviewUrl,
      bookingId: bookingId,
      bookingNumber: booking.bookingNumber || `#${bookingId.slice(-8)}`
    }

    // Prepare notification recipients
    const recipients = []
    
    // Add email if customer has email and email notifications enabled
    if (customer.email && customer.notificationPreferences?.methods?.includes('email')) {
      recipients.push({
        type: "email" as const,
        value: customer.email,
        name: customer.name,
        language: customer.notificationPreferences?.language || "he"
      })
    }
    
    // Add SMS if customer has phone and SMS notifications enabled
    if (customer.phone && customer.notificationPreferences?.methods?.includes('sms')) {
      recipients.push({
        type: "phone" as const,
        value: customer.phone,
        language: customer.notificationPreferences?.language || "he"
      })
    }

    // If no notification preferences, send to both email and phone by default
    if (!recipients.length) {
      if (customer.email) {
        recipients.push({
          type: "email" as const,
          value: customer.email,
          name: customer.name,
          language: "he"
        })
      }
      if (customer.phone) {
        recipients.push({
          type: "phone" as const,
          value: customer.phone,
          language: "he"
        })
      }
    }

    if (recipients.length > 0) {
      await unifiedNotificationService.sendNotificationToMultiple(recipients, notificationData)
      logger.info("Review request sent successfully", {
        bookingId,
        recipientCount: recipients.length,
        customerName: customer.name
      })
    } else {
      logger.warn("No notification recipients for review request", {
        bookingId,
        customerName: customer.name
      })
    }

  } catch (error) {
    logger.error("Error sending review request", { bookingId, error })
    throw error
  }
}

/**
 * POST /api/professional/response/[responseId]/complete_treatment
 * Mark treatment as completed
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ responseId: string }> }
) {
  try {
    await dbConnect()

    const { responseId } = await params

    if (!responseId || !mongoose.Types.ObjectId.isValid(responseId)) {
      return NextResponse.json(
        { success: false, error: "מזהה תגובה לא תקין" },
        { status: 400 }
      )
    }

    // Verify JWT token
    const tokenData = verifyProfessionalToken(request)
    if (!tokenData || tokenData.responseId !== responseId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Import models
    const ProfessionalResponse = (await import("@/lib/db/models/professional-response")).default
    const Booking = (await import("@/lib/db/models/booking")).default

    // Get response with booking
    const response = await ProfessionalResponse.findById(responseId)
      .populate('bookingId')
      .populate('professionalId')

    if (!response) {
      return NextResponse.json(
        { success: false, error: "לא נמצאה תגובה" },
        { status: 404 }
      )
    }

    // Check if response was accepted
    if (response.status !== "accepted") {
      return NextResponse.json(
        { success: false, error: "יש לאשר את ההזמנה תחילה" },
        { status: 400 }
      )
    }

    const booking = response.bookingId as any
    const professional = response.professionalId as any

    // Check if booking is in in_treatment status
    if (booking.status !== "in_treatment") {
      return NextResponse.json(
        { success: false, error: "יש לסמן 'התחלת טיפול' תחילה" },
        { status: 400 }
      )
    }

    // Update booking status to completed
    await Booking.findByIdAndUpdate(booking._id, {
      status: "completed"
    })

    // Send review request to customer
    try {
      await sendReviewRequest(booking._id.toString())
    } catch (reviewError) {
      logger.error("Failed to send review request", {
        bookingId: booking._id,
        error: reviewError
      })
      // Don't fail the treatment completion if review request fails
    }

    logger.info("Professional completed treatment", {
      responseId,
      bookingId: booking._id,
      professionalId: professional._id,
      professionalName: professional.name
    })

    return NextResponse.json({
      success: true,
      message: "הטיפול הושלם בהצלחה! תודה על עבודתך המקצועית"
    })

  } catch (error) {
    logger.error("Error in professional response complete_treatment:", error)
    return NextResponse.json(
      { success: false, error: "שגיאה בשרת" },
      { status: 500 }
    )
  }
} 