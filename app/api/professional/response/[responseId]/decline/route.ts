import { NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"
import mongoose from "mongoose"
import { verifyProfessionalToken } from "@/lib/auth/jwt-auth"

/**
 * POST /api/professional/response/[responseId]/decline
 * Decline a booking by professional
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

    // Get response
    const response = await (ProfessionalResponse.findById as any)(responseId)
      .populate('professionalId')
      .populate('bookingId')

    if (!response) {
      return NextResponse.json(
        { success: false, error: "לא נמצאה תגובה" },
        { status: 404 }
      )
    }

    // Check if response is still pending
    if (response.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "התגובה כבר טופלה" },
        { status: 400 }
      )
    }

    // Update response status
    response.status = "declined"
    response.respondedAt = new Date()
    response.responseMethod = "app"
    await response.save()

    const professional = response.professionalId as any
    const booking = response.bookingId as any

    logger.info("Professional declined booking", {
      responseId,
      bookingId: booking._id,
      professionalId: professional._id,
      professionalName: professional.name
    })

    return NextResponse.json({
      success: true,
      message: "ההזמנה נדחתה בהצלחה"
    })

  } catch (error) {
    logger.error("Error in professional response decline:", error)
    return NextResponse.json(
      { success: false, error: "שגיאה בשרת" },
      { status: 500 }
    )
  }
} 