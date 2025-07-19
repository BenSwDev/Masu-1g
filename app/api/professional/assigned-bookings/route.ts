import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import ProfessionalProfile from "@/lib/db/models/professional-profile"
import Booking from "@/lib/db/models/booking"
import { logger } from "@/lib/logs/logger"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: "לא מורשה" },
        { status: 401 }
      )
    }

    if (session.user.activeRole !== "professional") {
      return NextResponse.json(
        { success: false, error: "נדרש תפקיד מטפל" },
        { status: 403 }
      )
    }

    await dbConnect()

    // Find the professional profile for the current user
    const professionalProfile = await ProfessionalProfile.findOne({
      userId: session.user.id,
      status: 'active'
    })

    if (!professionalProfile) {
      return NextResponse.json(
        { success: false, error: "פרופיל מטפל לא נמצא" },
        { status: 404 }
      )
    }

    // Find bookings assigned to this professional
    const assignedBookings = await Booking.find({
      assignedProfessional: professionalProfile._id,
      status: { $in: ['confirmed', 'in_progress', 'completed'] }
    })
    .sort({ preferredDate: 1, preferredTime: 1 })
    .lean()

    // Format bookings for client
    const formattedBookings = assignedBookings.map(booking => ({
      _id: booking._id.toString(),
      treatmentType: booking.treatmentType,
      status: booking.status,
      preferredDate: booking.preferredDate,
      preferredTime: booking.preferredTime,
      bookingAddress: booking.bookingAddress,
      guestInfo: booking.guestInfo,
      priceDetails: booking.priceDetails,
      createdAt: booking.createdAt
    }))

    logger.info("Professional assigned bookings retrieved", {
      professionalId: professionalProfile._id,
      userId: session.user.id,
      bookingsCount: formattedBookings.length
    })

    return NextResponse.json({
      success: true,
      bookings: formattedBookings,
      total: formattedBookings.length
    })

  } catch (error) {
    logger.error("Error fetching professional assigned bookings:", {
      error: error instanceof Error ? error.message : String(error),
      userId: session?.user?.id
    })

    return NextResponse.json(
      { 
        success: false, 
        error: "שגיאה בטעינת ההזמנות המשוייכות" 
      },
      { status: 500 }
    )
  }
} 