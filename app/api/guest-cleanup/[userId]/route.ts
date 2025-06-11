import { NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/db/mongoose"
import User from "@/lib/db/models/user"
import Booking from "@/lib/db/models/booking"
import { logger } from "@/lib/logs/logger"

export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    await dbConnect()

    const { userId } = params

    // Find the guest user
    const guestUser = await User.findById(userId)
    if (!guestUser || !guestUser.isGuest) {
      return NextResponse.json(
        { success: false, error: "Guest user not found or not a guest account" },
        { status: 404 }
      )
    }

    // Delete any abandoned bookings associated with this guest
    await Booking.deleteMany({
      userId: userId,
      status: "abandoned",
      isGuestBooking: true
    })

    // Delete the guest user
    await User.findByIdAndDelete(userId)

    logger.info(`Guest user cleaned up: ${userId}`, {
      userId,
      email: guestUser.email,
      name: guestUser.name
    })

    return NextResponse.json({
      success: true,
      message: "Guest user and associated data cleaned up"
    })

  } catch (error) {
    logger.error("Error during guest cleanup:", error)
    
    // Return success even on error to not block the user experience
    return NextResponse.json({
      success: true,
      message: "Cleanup attempted but may have failed - proceeding anyway"
    })
  }
} 