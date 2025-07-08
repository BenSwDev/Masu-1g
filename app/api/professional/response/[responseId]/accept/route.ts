import { NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"
import mongoose from "mongoose"

/**
 * POST /api/professional/response/[responseId]/accept
 * Accept a booking by professional
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
    const User = (await import("@/lib/db/models/user")).default

    // Use transaction to prevent race conditions
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
      // Get response with booking in transaction
      const response = await ProfessionalResponse.findById(responseId)
        .populate('bookingId')
        .populate('professionalId')
        .session(session)

      if (!response) {
        await session.abortTransaction()
        return NextResponse.json(
          { success: false, error: "לא נמצאה תגובה" },
          { status: 404 }
        )
      }

      // Check if response is still pending
      if (response.status !== "pending") {
        await session.abortTransaction()
        return NextResponse.json(
          { success: false, error: "התגובה כבר טופלה" },
          { status: 400 }
        )
      }

      const booking = response.bookingId as any
      const professional = response.professionalId as any

      // Check if booking is still available
      if (booking.professionalId && booking.professionalId.toString() !== professional._id.toString()) {
        await session.abortTransaction()
        return NextResponse.json(
          { success: false, error: "ההזמנה כבר נתפסה על ידי מטפל אחר" },
          { status: 400 }
        )
      }

      // Check booking status
      if (!["pending_professional", "confirmed"].includes(booking.status)) {
        await session.abortTransaction()
        return NextResponse.json(
          { success: false, error: "ההזמנה לא במצב המתאים לאישור" },
          { status: 400 }
        )
      }

      // Update response status
      response.status = "accepted"
      response.respondedAt = new Date()
      response.responseMethod = "app"
      await response.save({ session })

      // Update booking - assign professional and set status to confirmed
      await Booking.findByIdAndUpdate(
        booking._id,
        {
          professionalId: professional._id,
          status: "confirmed"
        },
        { session }
      )

      // Mark all other pending responses for this booking as expired
      await ProfessionalResponse.updateMany(
        {
          bookingId: booking._id,
          _id: { $ne: response._id },
          status: "pending"
        },
        { status: "expired" },
        { session }
      )

      await session.commitTransaction()

      logger.info("Professional accepted booking", {
        responseId,
        bookingId: booking._id,
        professionalId: professional._id,
        professionalName: professional.name
      })

      return NextResponse.json({
        success: true,
        message: "ההזמנה אושרה בהצלחה! תוכל עכשיו לסמן 'בדרך' כשתתחיל לנסוע"
      })

    } catch (error) {
      await session.abortTransaction()
      throw error
    } finally {
      session.endSession()
    }

  } catch (error) {
    logger.error("Error in professional response accept:", error)
    return NextResponse.json(
      { success: false, error: "שגיאה בשרת" },
      { status: 500 }
    )
  }
} 