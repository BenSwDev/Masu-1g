import { NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"
import mongoose from "mongoose"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    await dbConnect()
    
    const { bookingId } = await params

    if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
      return NextResponse.json(
        { success: false, error: "מזהה הזמנה לא תקין" },
        { status: 400 }
      )
    }

    const Booking = (await import("@/lib/db/models/booking")).default
    const Review = (await import("@/lib/db/models/review")).default

    // Get booking with populated data
    const booking = await Booking.findById(bookingId)
      .populate('userId', 'name email')
      .populate('treatmentId', 'name')
      .populate('professionalId', 'name')
      .lean()

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "הזמנה לא נמצאה" },
        { status: 404 }
      )
    }

    // Check if booking is completed
    const canReview = booking.status === 'completed'

    // Check if review already exists
    const existingReview = await Review.findOne({ bookingId }).lean()

    const bookingData = {
      _id: booking._id,
      bookingNumber: booking.bookingNumber || `#${booking._id.toString().slice(-8)}`,
      treatmentName: (booking.treatmentId as any)?.name || 'טיפול לא מוגדר',
      professionalName: (booking.professionalId as any)?.name || 'מטפל לא מוגדר',
      bookingDateTime: booking.bookingDateTime,
      address: booking.addressId,
      status: booking.status,
      canReview: canReview && !existingReview,
      existingReview: existingReview ? {
        rating: existingReview.rating,
        comment: existingReview.comment,
        createdAt: existingReview.createdAt
      } : null
    }

    return NextResponse.json({
      success: true,
      booking: bookingData
    })

  } catch (error) {
    logger.error("Error fetching booking for review:", error)
    return NextResponse.json(
      { success: false, error: "שגיאה בשרת" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    await dbConnect()
    
    const { bookingId } = await params
    const body = await request.json()
    const { rating, comment } = body

    if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
      return NextResponse.json(
        { success: false, error: "מזהה הזמנה לא תקין" },
        { status: 400 }
      )
    }

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: "דירוג חייב להיות בין 1-5" },
        { status: 400 }
      )
    }

    const Booking = (await import("@/lib/db/models/booking")).default
    const Review = (await import("@/lib/db/models/review")).default

    // Get booking
    const booking = await Booking.findById(bookingId)
      .populate('userId')
      .populate('treatmentId')
      .populate('professionalId')

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "הזמנה לא נמצאה" },
        { status: 404 }
      )
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      return NextResponse.json(
        { success: false, error: "ניתן לכתוב חוות דעת רק עבור הזמנות שהושלמו" },
        { status: 400 }
      )
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ bookingId })
    if (existingReview) {
      return NextResponse.json(
        { success: false, error: "כבר נכתבה חוות דעת עבור הזמנה זו" },
        { status: 400 }
      )
    }

    // Create review
    const review = new Review({
      bookingId,
      userId: booking.userId._id,
      professionalId: booking.professionalId._id,
      treatmentId: booking.treatmentId._id,
      rating,
      comment: comment?.trim() || null
    })

    await review.save()

    logger.info("Review submitted successfully", {
      bookingId,
      userId: booking.userId._id,
      professionalId: booking.professionalId._id,
      rating,
      hasComment: !!comment
    })

    return NextResponse.json({
      success: true,
      message: "חוות הדעת נשמרה בהצלחה"
    })

  } catch (error) {
    logger.error("Error submitting review:", error)
    return NextResponse.json(
      { success: false, error: "שגיאה בשרת" },
      { status: 500 }
    )
  }
} 