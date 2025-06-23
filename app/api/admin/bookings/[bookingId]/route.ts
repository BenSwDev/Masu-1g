import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import dbConnect from '@/lib/db/mongoose'
import Booking from '@/lib/db/models/booking'
import User from '@/lib/db/models/user'
import { logger } from '@/lib/logs/logger'
import mongoose from 'mongoose'
import type { PopulatedBooking, BookingStatus } from '@/types/booking'

interface RouteParams {
  params: {
    bookingId: string
  }
}

// GET /api/admin/bookings/[bookingId] - Get specific booking
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    const booking = await Booking.findById(params.bookingId)
      .populate("treatmentId")
      .populate("professionalId")
      .populate("userId")
      .populate("priceDetails.appliedCouponId")
      .populate("priceDetails.appliedGiftVoucherId")
      .populate("priceDetails.redeemedUserSubscriptionId")
      .populate("paymentDetails.paymentMethodId")
      .lean()

    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      booking: {
        ...booking,
        _id: booking._id,
        treatmentId: booking.treatmentId,
        professionalId: booking.professionalId || null,
        userId: booking.userId,
      } as PopulatedBooking,
    })

  } catch (error) {
    logger.error("Error fetching booking by ID:", { error, bookingId: params.bookingId })
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch booking' 
    }, { status: 500 })
  }
}

// PUT /api/admin/bookings/[bookingId] - Update booking
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    const updates = await request.json()

    const booking = await Booking.findById(params.bookingId)
    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 })
    }

    // Apply updates
    if (updates.status !== undefined) booking.status = updates.status
    if (updates.bookingDateTime !== undefined) booking.bookingDateTime = new Date(updates.bookingDateTime)
    if (updates.recipientName !== undefined) booking.recipientName = updates.recipientName
    if (updates.recipientPhone !== undefined) booking.recipientPhone = updates.recipientPhone
    if (updates.recipientEmail !== undefined) booking.recipientEmail = updates.recipientEmail
    if (updates.notes !== undefined) booking.notes = updates.notes
    if (updates.professionalId !== undefined) {
      if (updates.professionalId) {
        // Verify professional exists
        const professional = await User.findById(updates.professionalId)
        if (!professional || !professional.roles.includes("professional")) {
          return NextResponse.json({ success: false, error: 'Professional not found' }, { status: 400 })
        }
        booking.professionalId = new mongoose.Types.ObjectId(updates.professionalId)
      } else {
        booking.professionalId = undefined
      }
    }
    if (updates.paymentStatus !== undefined) {
      booking.paymentDetails.paymentStatus = updates.paymentStatus
    }

    // Ensure required fields have valid values for backward compatibility
    if (!booking.treatmentCategory) {
      booking.treatmentCategory = new mongoose.Types.ObjectId()
    }
    if (typeof booking.staticTreatmentPrice !== 'number') {
      booking.staticTreatmentPrice = booking.priceDetails?.basePrice || 0
    }
    if (typeof booking.staticTherapistPay !== 'number') {
      booking.staticTherapistPay = 0
    }
    if (typeof booking.companyFee !== 'number') {
      booking.companyFee = 0
    }
    if (!booking.consents) {
      booking.consents = {
        customerAlerts: "email",
        patientAlerts: "email",
        marketingOptIn: false,
        termsAccepted: false
      }
    }

    await booking.save()

    // Handle completion trigger
    if (updates.status === "completed") {
      try {
        const { sendReviewReminder } = await import("@/actions/review-actions")
        await sendReviewReminder(params.bookingId)
      } catch (err) {
        logger.error("Failed to send review reminder:", err)
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      booking: booking.toObject() 
    })

  } catch (error) {
    logger.error("Error updating booking:", { 
      error: error instanceof Error ? error.message : String(error),
      bookingId: params.bookingId 
    })
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update booking' 
    }, { status: 500 })
  }
} 