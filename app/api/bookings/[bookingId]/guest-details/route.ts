import { NextRequest, NextResponse } from "next/server"
import { getBookingById } from "@/actions/booking-actions"
import { dbConnect } from "@/lib/db/db"
import { Booking } from "@/lib/db/models/booking"
import { Treatment } from "@/lib/db/models/treatment"
import { logger } from "@/lib/logs/logger"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  let bookingId: string | undefined
  try {
    const resolvedParams = await params
    bookingId = resolvedParams.bookingId

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: "מזהה הזמנה חסר" },
        { status: 400 }
      )
    }

    await dbConnect()

    // Get booking by booking number (6-digit number) or by ID (ObjectId)
    let booking
    
    // Check if bookingId is a valid ObjectId (24 characters hex) or a booking number
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(bookingId)
    
    if (isObjectId) {
      // Search by _id
      booking = await Booking.findById(bookingId)
        .populate('treatmentId', 'name')
        .populate('professionalId', 'name phone')
        .lean()
    } else {
      // Search by booking number
      booking = await Booking.findOne({ bookingNumber: bookingId })
        .populate('treatmentId', 'name')
        .populate('professionalId', 'name phone')
        .lean()
    }

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "הזמנה לא נמצאה" },
        { status: 404 }
      )
    }

    // Format booking data for guest view
    const formattedBooking = {
      bookingNumber: booking.bookingNumber,
      treatmentName: (booking.treatmentId as any)?.name || "לא זמין",
      bookingDateTime: booking.bookingDateTime,
      status: booking.status,
      priceDetails: {
        basePrice: booking.priceDetails.basePrice,
        totalSurchargesAmount: booking.priceDetails.totalSurchargesAmount,
        finalAmount: booking.priceDetails.finalAmount,
        surcharges: booking.priceDetails.surcharges || []
      },
      bookingAddressSnapshot: {
        fullAddress: booking.bookingAddressSnapshot?.fullAddress || "לא זמין",
        city: booking.bookingAddressSnapshot?.city || "לא זמין",
        street: booking.bookingAddressSnapshot?.street || "לא זמין",
        notes: booking.bookingAddressSnapshot?.notes
      },
      recipientName: booking.recipientName,
      recipientPhone: booking.recipientPhone,
      recipientEmail: booking.recipientEmail,
      bookedByUserName: booking.bookedByUserName,
      bookedByUserPhone: booking.bookedByUserPhone,
      bookedByUserEmail: booking.bookedByUserEmail,
      isBookingForSomeoneElse: booking.isBookingForSomeoneElse || false,
      professionalId: booking.professionalId ? {
        name: (booking.professionalId as any).name,
        phone: (booking.professionalId as any).phone
      } : null,
      paymentDetails: {
        paymentStatus: booking.paymentDetails.paymentStatus,
        transactionId: booking.paymentDetails.transactionId
      }
    }

    logger.info("Guest booking details retrieved successfully", {
      bookingId,
      bookingNumber: booking.bookingNumber
    })

    return NextResponse.json({
      success: true,
      booking: formattedBooking
    })

  } catch (error) {
    logger.error("Error retrieving guest booking details:", {
      bookingId: bookingId,
      error: error instanceof Error ? error.message : String(error)
    })

    return NextResponse.json(
      { success: false, error: "שגיאה בטעינת פרטי ההזמנה" },
      { status: 500 }
    )
  }
} 