import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { logger } from "@/lib/logs/logger"
import mongoose from "mongoose"
import { getSuitableProfessionalsForBooking } from "@/actions/booking-actions"
import { sendManualProfessionalNotifications } from "@/actions/unified-professional-notifications"

/**
 * POST /api/admin/bookings/[bookingId]/send-to-all-suitable
 * Send notifications to all suitable professionals for a booking
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
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

    logger.info("Admin sending notifications to all suitable professionals", {
      bookingId,
      adminId: session.user.id
    })

    // Get all suitable professionals for this booking
    const suitableProfessionalsResult = await getSuitableProfessionalsForBooking(bookingId)
    
    if (!suitableProfessionalsResult.success) {
      return NextResponse.json(
        { success: false, error: suitableProfessionalsResult.error },
        { status: 400 }
      )
    }

    const suitableProfessionals = suitableProfessionalsResult.professionals || []

    if (suitableProfessionals.length === 0) {
      return NextResponse.json(
        { success: false, error: "לא נמצאו מטפלים מתאימים להזמנה זו" },
        { status: 400 }
      )
    }

    // Prepare notification data for all suitable professionals
    // ✅ FIX: Need to get full professional data with notification preferences
    const { findSuitableProfessionals } = await import("@/actions/booking-actions")
    const fullProfessionalsResult = await findSuitableProfessionals(bookingId)
    
    if (!fullProfessionalsResult.success || !fullProfessionalsResult.professionals) {
      return NextResponse.json(
        { success: false, error: "Failed to get professional notification preferences" },
        { status: 400 }
      )
    }
    
    const professionalNotifications = fullProfessionalsResult.professionals.map(professional => {
      // Get notification preferences from user (professional)
      const userNotificationMethods = professional.userId?.notificationPreferences?.methods || ["sms"]
      
      return {
        professionalId: professional._id,
        email: !!professional.email && userNotificationMethods.includes("email"),
        sms: !!professional.phone && userNotificationMethods.includes("sms")
      }
    })

    // Send notifications using the unified system
    const result = await sendManualProfessionalNotifications(bookingId, professionalNotifications)

    if (result.success) {
      logger.info("Successfully sent notifications to all suitable professionals", {
        bookingId,
        sentCount: result.sentCount,
        totalSuitable: suitableProfessionals.length,
        adminId: session.user.id
      })

      return NextResponse.json({
        success: true,
        sentCount: result.sentCount,
        totalSuitable: suitableProfessionals.length,
        results: result.results,
        message: `התראות נשלחו בהצלחה ל-${result.sentCount} מטפלים מתאימים`
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

  } catch (error) {
    logger.error("Error in send-to-all-suitable endpoint:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Internal server error" 
      },
      { status: 500 }
    )
  }
} 