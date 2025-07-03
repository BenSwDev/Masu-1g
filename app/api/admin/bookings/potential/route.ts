import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import Booking from "@/lib/db/models/booking"
import ProfessionalProfile from "@/lib/db/models/professional-profile"
import User from "@/lib/db/models/user"
import { Types } from "mongoose"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    await dbConnect()

    const { searchParams } = new URL(request.url)
    const professionalId = searchParams.get("professionalId")

    if (!professionalId) {
      return NextResponse.json(
        { success: false, error: "Professional ID is required" },
        { status: 400 }
      )
    }

    // Get professional profile
    const professionalProfile = await ProfessionalProfile.findOne({
      userId: new Types.ObjectId(professionalId)
    }).populate("userId")

    if (!professionalProfile) {
      return NextResponse.json(
        { success: false, error: "Professional profile not found" },
        { status: 404 }
      )
    }

    // Get professional user details
    const professionalUser = professionalProfile.userId as any

    console.log("Professional details:", {
      id: professionalId,
      name: professionalUser.name,
      gender: professionalUser.gender,
      treatments: professionalProfile.treatments?.length || 0,
      workAreas: professionalProfile.workAreas?.length || 0
    })

    // Build query for potential bookings
    const potentialBookingsQuery: any = {
      professionalId: { $exists: false }, // Not assigned to any professional
      status: { $in: ["pending_professional", "confirmed"] }, // Only active bookings
    }

    // Get all unassigned bookings
    const unassignedBookings = await Booking.find(potentialBookingsQuery)
      .populate("treatmentId")
      .populate("userId")
      .populate("priceDetails.appliedCouponId")
      .populate("priceDetails.appliedGiftVoucherId")
      .populate("priceDetails.redeemedUserSubscriptionId")
      .populate("paymentDetails.paymentMethodId")
      .sort({ createdAt: -1 })
      .lean()

    console.log(`Found ${unassignedBookings.length} unassigned bookings`)

    // Filter bookings that match professional criteria
    const potentialBookings = unassignedBookings.filter(booking => {
      // Check gender preference
      if (booking.therapistGenderPreference && booking.therapistGenderPreference !== "any") {
        if (professionalUser.gender !== booking.therapistGenderPreference) {
          console.log(`Booking ${booking.bookingNumber}: Gender mismatch - needs ${booking.therapistGenderPreference}, professional is ${professionalUser.gender}`)
          return false
        }
      }

      // Check if professional handles this treatment
      const treatmentId = typeof booking.treatmentId === 'object' 
        ? booking.treatmentId._id.toString() 
        : booking.treatmentId.toString()

      const canHandleTreatment = professionalProfile.treatments.some(treatment => 
        treatment.treatmentId.toString() === treatmentId
      )

      if (!canHandleTreatment) {
        console.log(`Booking ${booking.bookingNumber}: Treatment not handled - needs ${treatmentId}`)
        return false
      }

      // Check if professional covers the booking city
      if (booking.bookingAddressSnapshot?.city) {
        const bookingCity = booking.bookingAddressSnapshot.city

        // Check if any of the professional's work areas covers this city
        const coversCity = professionalProfile.workAreas.some(workArea => {
          // Check if the city is in the covered cities list
          const cityMatch = workArea.coveredCities.some(city => 
            city.toLowerCase() === bookingCity.toLowerCase()
          )
          
          // Also check if it's the main city of the work area
          const isMainCity = workArea.cityName && 
            workArea.cityName.toLowerCase() === bookingCity.toLowerCase()
          
          return cityMatch || isMainCity
        })

        if (!coversCity) {
          console.log(`Booking ${booking.bookingNumber}: City not covered - needs ${bookingCity}`)
          return false
        }
      }

      console.log(`Booking ${booking.bookingNumber}: MATCHES professional criteria`)
      return true
    })

    console.log(`Found ${potentialBookings.length} potential bookings for professional ${professionalUser.name}`)

    return NextResponse.json({
      success: true,
      bookings: potentialBookings.map(booking => ({
        ...booking,
        _id: booking._id.toString(),
        userId: booking.userId ? {
          ...booking.userId,
          _id: booking.userId._id.toString()
        } : null,
        treatmentId: booking.treatmentId ? {
          ...booking.treatmentId,
          _id: booking.treatmentId._id.toString()
        } : null,
      })),
      debug: {
        professionalId,
        professionalName: professionalUser.name,
        totalUnassigned: unassignedBookings.length,
        totalPotential: potentialBookings.length,
        professionalTreatments: professionalProfile.treatments?.length || 0,
        professionalWorkAreas: professionalProfile.workAreas?.length || 0
      }
    })
  } catch (error) {
    console.error("Error in potential bookings API:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch potential bookings" },
      { status: 500 }
    )
  }
} 