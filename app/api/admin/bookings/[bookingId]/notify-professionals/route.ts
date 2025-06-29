import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { logger } from "@/lib/logs/logger"
import mongoose from "mongoose"
import { sendManualProfessionalNotifications } from "@/actions/unified-professional-notifications"

/**
 * POST /api/admin/bookings/[bookingId]/notify-professionals
 * Send notifications to selected professionals using the unified system
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
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

    const { bookingId } = params
    if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
      return NextResponse.json(
        { success: false, error: "Invalid booking ID" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { professionals } = body

    if (!professionals || !Array.isArray(professionals) || professionals.length === 0) {
      return NextResponse.json(
        { success: false, error: "No professionals selected" },
        { status: 400 }
      )
    }

    logger.info("Admin sending notifications to selected professionals", {
      bookingId,
      professionalCount: professionals.length,
      adminId: session.user.id
    })

    // Use the unified notification system
    const result = await sendManualProfessionalNotifications(bookingId, professionals)

    if (result.success) {
      return NextResponse.json({
        success: true,
        sentCount: result.sentCount,
        results: result.results,
        message: `התראות נשלחו בהצלחה ל-${result.sentCount} מטפלים`
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

  } catch (error) {
    logger.error("Error in notify-professionals endpoint:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Internal server error" 
      },
      { status: 500 }
    )
  }
} 