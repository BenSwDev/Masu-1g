import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import Booking from "@/lib/db/models/booking"
import { logger } from "@/lib/logs/logger"
import mongoose from "mongoose"

interface RouteParams {
  params: Promise<{
    bookingId: string
  }>
}

/**
 * PUT /api/admin/bookings/[bookingId]/edit-payment-bonus
 * Edit payment bonus for a booking
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    const body = await request.json()
    const { amount, description } = body

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Amount must be greater than 0" },
        { status: 400 }
      )
    }

    if (!description || description.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Description is required" },
        { status: 400 }
      )
    }

    await dbConnect()

    // Find the booking
    const booking = await Booking.findById(bookingId)
    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      )
    }

    // Check if booking has a payment bonus
    if (!booking.priceDetails?.paymentBonus) {
      return NextResponse.json(
        { success: false, error: "Booking does not have a payment bonus to edit" },
        { status: 400 }
      )
    }

    // Update payment bonus
    booking.priceDetails.paymentBonus = {
      amount: Number(amount),
      description: description.trim(),
      addedBy: session.user.id,
      addedAt: new Date()
    }

    // Recalculate total professional payment
    const currentBasePay = booking.priceDetails.baseProfessionalPayment || 0
    const currentSurcharges = booking.priceDetails.surchargesProfessionalPayment || 0
    const bonusAmount = booking.priceDetails.paymentBonus.amount
    
    booking.priceDetails.totalProfessionalPayment = currentBasePay + currentSurcharges + bonusAmount

    // Recalculate office commission
    const customerPaid = booking.priceDetails.finalAmount || 0
    const professionalReceives = booking.priceDetails.totalProfessionalPayment
    booking.priceDetails.totalOfficeCommission = customerPaid - professionalReceives

    await booking.save()

    logger.info("Payment bonus edited for booking", {
      bookingId,
      amount,
      description,
      editedBy: session.user.id,
      newTotalProfessionalPayment: booking.priceDetails.totalProfessionalPayment
    })

    return NextResponse.json({
      success: true,
      booking: booking.toObject(),
      message: "Payment bonus updated successfully"
    })

  } catch (error) {
    logger.error("Error editing payment bonus:", error)
    return NextResponse.json(
      { success: false, error: "Failed to edit payment bonus" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/bookings/[bookingId]/edit-payment-bonus
 * Delete payment bonus from a booking
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    await dbConnect()

    // Find the booking
    const booking = await Booking.findById(bookingId)
    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      )
    }

    // Check if booking has a payment bonus
    if (!booking.priceDetails?.paymentBonus) {
      return NextResponse.json(
        { success: false, error: "Booking does not have a payment bonus to delete" },
        { status: 400 }
      )
    }

    // Remove payment bonus
    booking.priceDetails.paymentBonus = undefined

    // Recalculate total professional payment without bonus
    const currentBasePay = booking.priceDetails.baseProfessionalPayment || 0
    const currentSurcharges = booking.priceDetails.surchargesProfessionalPayment || 0
    
    booking.priceDetails.totalProfessionalPayment = currentBasePay + currentSurcharges

    // Recalculate office commission
    const customerPaid = booking.priceDetails.finalAmount || 0
    const professionalReceives = booking.priceDetails.totalProfessionalPayment
    booking.priceDetails.totalOfficeCommission = customerPaid - professionalReceives

    await booking.save()

    logger.info("Payment bonus deleted from booking", {
      bookingId,
      deletedBy: session.user.id,
      newTotalProfessionalPayment: booking.priceDetails.totalProfessionalPayment
    })

    return NextResponse.json({
      success: true,
      booking: booking.toObject(),
      message: "Payment bonus removed successfully"
    })

  } catch (error) {
    logger.error("Error deleting payment bonus:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete payment bonus" },
      { status: 500 }
    )
  }
} 