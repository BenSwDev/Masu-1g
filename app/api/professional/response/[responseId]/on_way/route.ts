import { NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"
import mongoose from "mongoose"

/**
 * POST /api/professional/response/[responseId]/on_way
 * Mark professional as on the way to treatment
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

    // Import models
    const ProfessionalResponse = (await import("@/lib/db/models/professional-response")).default
    const Booking = (await import("@/lib/db/models/booking")).default

    // Get response with booking
    const response = await ProfessionalResponse.findById(responseId)
      .populate({
        path: 'bookingId',
        populate: {
          path: 'treatmentId',
          select: 'name'
        }
      })
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

    // Check if booking is in confirmed status
    if (booking.status !== "confirmed") {
      return NextResponse.json(
        { success: false, error: "ההזמנה לא במצב המתאים" },
        { status: 400 }
      )
    }

    // Update booking status to on_way
    await Booking.findByIdAndUpdate(booking._id, {
      status: "on_way"
    })

    // Send notification to client
    try {
      const { unifiedNotificationService } = await import("@/lib/notifications/unified-notification-service")
      
      const treatmentName = booking.treatmentId?.name || "הטיפול"
      const bookingDateTime = new Date(booking.bookingDateTime)
      
      const notificationData = {
        type: "professional-on-way" as const,
        professionalName: professional.name,
        treatmentName,
        bookingDateTime,
        bookingNumber: booking.bookingNumber
      }

      // Send to booker
      if (booking.bookedByUserEmail) {
        await unifiedNotificationService.sendNotification(
          {
            type: "email",
            value: booking.bookedByUserEmail,
            name: booking.bookedByUserName || "לקוח יקר",
            language: "he"
          },
          notificationData
        )
      }

      if (booking.bookedByUserPhone) {
        await unifiedNotificationService.sendNotification(
          {
            type: "phone",
            value: booking.bookedByUserPhone,
            name: booking.bookedByUserName || "לקוח יקר",
            language: "he"
          },
          notificationData
        )
      }

      // Send to recipient if different from booker
      if (booking.recipientEmail && booking.recipientEmail !== booking.bookedByUserEmail) {
        await unifiedNotificationService.sendNotification(
          {
            type: "email",
            value: booking.recipientEmail,
            name: booking.recipientName || "לקוח יקר",
            language: "he"
          },
          notificationData
        )
      }

      if (booking.recipientPhone && booking.recipientPhone !== booking.bookedByUserPhone) {
        await unifiedNotificationService.sendNotification(
          {
            type: "phone",
            value: booking.recipientPhone,
            name: booking.recipientName || "לקוח יקר",
            language: "he"
          },
          notificationData
        )
      }

    } catch (notificationError) {
      logger.error("Failed to send on-way notification:", notificationError)
      // Continue anyway - the status update is more important
    }

    logger.info("Professional marked as on the way", {
      responseId,
      bookingId: booking._id,
      professionalId: professional._id,
      professionalName: professional.name
    })

    return NextResponse.json({
      success: true,
      message: "סומן כ'בדרך' בהצלחה! הלקוח קיבל הודעה"
    })

  } catch (error) {
    logger.error("Error in professional response on_way:", error)
    return NextResponse.json(
      { success: false, error: "שגיאה בשרת" },
      { status: 500 }
    )
  }
} 