import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import Booking from "@/lib/db/models/booking"
import ProfessionalProfile from "@/lib/db/models/professional-profile"
import { Types } from "mongoose"

interface RouteParams {
  params: Promise<{
    bookingId: string
  }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    await dbConnect()

    const { bookingId } = await params
    const { professionalId } = await request.json()

    if (!professionalId) {
      return NextResponse.json(
        { success: false, error: "Professional ID is required" },
        { status: 400 }
      )
    }

    // Validate booking exists
    const booking = await Booking.findById(bookingId)
    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      )
    }

    // Check if booking is already assigned
    if (booking.professionalId) {
      return NextResponse.json(
        { success: false, error: "Booking is already assigned to a professional" },
        { status: 400 }
      )
    }

    // Validate professional exists and is active
    const professionalProfile = await ProfessionalProfile.findOne({
      userId: new Types.ObjectId(professionalId),
      status: "active",
      isActive: true
    }).populate("userId")

    if (!professionalProfile) {
      return NextResponse.json(
        { success: false, error: "Professional not found or not active" },
        { status: 404 }
      )
    }

    // Validate professional can handle this booking
    const professionalUser = professionalProfile.userId as any

    // Check gender preference
    if (booking.therapistGenderPreference && booking.therapistGenderPreference !== "any") {
      if (professionalUser.gender !== booking.therapistGenderPreference) {
        return NextResponse.json(
          { success: false, error: "Professional gender does not match booking preference" },
          { status: 400 }
        )
      }
    }

    // Check if professional handles this treatment
    const treatmentId = booking.treatmentId.toString()
    const canHandleTreatment = professionalProfile.treatments.some(treatment => 
      treatment.treatmentId.toString() === treatmentId
    )

    if (!canHandleTreatment) {
      return NextResponse.json(
        { success: false, error: "Professional does not handle this treatment" },
        { status: 400 }
      )
    }

    // Check if professional covers the booking city
    if (booking.bookingAddressSnapshot?.city) {
      const bookingCity = booking.bookingAddressSnapshot.city

      const coversCity = professionalProfile.workAreas.some(workArea => {
        return workArea.coveredCities.some(city => 
          city.toLowerCase() === bookingCity.toLowerCase()
        )
      })

      if (!coversCity) {
        return NextResponse.json(
          { success: false, error: "Professional does not cover this city" },
          { status: 400 }
        )
      }
    }

    // Use the proper assignment function that sends notifications
    const { assignProfessionalToBooking } = await import("@/actions/booking-actions")
    const assignResult = await assignProfessionalToBooking(bookingId, professionalId)
    
    if (!assignResult.success) {
      return NextResponse.json(
        { success: false, error: assignResult.error || "Failed to assign professional" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      booking: assignResult.booking,
      message: "Booking assigned to professional successfully"
    })

  } catch (error) {
    console.error("Error in assign booking API:", error)
    return NextResponse.json(
      { success: false, error: "Failed to assign booking to professional" },
      { status: 500 }
    )
  }
} 