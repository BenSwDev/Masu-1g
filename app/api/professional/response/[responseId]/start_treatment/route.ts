import { NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"
import mongoose from "mongoose"

/**
 * POST /api/professional/response/[responseId]/start_treatment
 * Mark treatment as started
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

    // Check if booking is in on_way status
    if (booking.status !== "on_way") {
      return NextResponse.json(
        { success: false, error: "יש לסמן 'בדרך' תחילה" },
        { status: 400 }
      )
    }

    // Update booking status to in_treatment
    await Booking.findByIdAndUpdate(booking._id, {
      status: "in_treatment"
    })

    logger.info("Professional started treatment", {
      responseId,
      bookingId: booking._id,
      professionalId: professional._id,
      professionalName: professional.name
    })

    return NextResponse.json({
      success: true,
      message: "הטיפול התחיל בהצלחה! תוכל לסמן 'השלמת טיפול' בסיום"
    })

  } catch (error) {
    logger.error("Error in professional response start_treatment:", error)
    return NextResponse.json(
      { success: false, error: "שגיאה בשרת" },
      { status: 500 }
    )
  }
} 