import { NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"
import mongoose from "mongoose"

/**
 * GET /api/professional/response/[responseId]
 * Get professional response and booking details
 */
export async function GET(
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

    // Get response with related data
    const response = await ProfessionalResponse.findById(responseId)
      .populate({
        path: 'professionalId',
        select: 'name email phone'
      })
      .populate({
        path: 'bookingId',
        select: 'bookingNumber treatmentId bookingDateTime bookingAddressSnapshot status priceDetails notes professionalId',
        populate: {
          path: 'treatmentId',
          select: 'name'
        }
      })
      .lean()

    if (!response) {
      return NextResponse.json(
        { success: false, error: "לא נמצאה תגובה" },
        { status: 404 }
      )
    }

    const booking = response.bookingId as any
    const professional = response.professionalId as any

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "לא נמצאה הזמנה" },
        { status: 404 }
      )
    }

    // Check if this professional can still respond
    // They can respond if:
    // 1. Their response is still pending
    // 2. The booking doesn't have a professional assigned OR it's assigned to them
    // 3. The booking is in an appropriate status
    const canRespond = (
      response.status === "pending" &&
      (!booking.professionalId || booking.professionalId.toString() === professional._id.toString()) &&
      ["pending_professional", "confirmed", "on_way", "in_treatment"].includes(booking.status)
    )

    const responseData = {
      _id: response._id,
      status: response.status,
      booking: {
        _id: booking._id,
        bookingNumber: booking.bookingNumber,
        treatmentName: booking.treatmentId?.name || "טיפול",
        bookingDateTime: booking.bookingDateTime,
        address: {
          city: booking.bookingAddressSnapshot?.city || "",
          street: booking.bookingAddressSnapshot?.street || "",
          streetNumber: booking.bookingAddressSnapshot?.streetNumber || ""
        },
        status: booking.status,
        price: booking.priceDetails?.finalAmount || 0,
        notes: booking.notes
      },
      professionalName: professional.name,
      canRespond,
      bookingCurrentStatus: booking.status
    }

    return NextResponse.json({
      success: true,
      data: responseData
    })

  } catch (error) {
    logger.error("Error in professional response GET:", error)
    return NextResponse.json(
      { success: false, error: "שגיאה בשרת" },
      { status: 500 }
    )
  }
} 