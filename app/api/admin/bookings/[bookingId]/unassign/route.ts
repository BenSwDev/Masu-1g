import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import Booking from "@/lib/db/models/booking"

interface RouteParams {
  params: {
    bookingId: string
  }
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

    const { bookingId } = params

    // Validate booking exists
    const booking = await Booking.findById(bookingId)
    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      )
    }

    // Check if booking is assigned to a professional
    if (!booking.professionalId) {
      return NextResponse.json(
        { success: false, error: "Booking is not assigned to any professional" },
        { status: 400 }
      )
    }

    // Check if booking can be unassigned (not completed or cancelled)
    if (booking.status === "completed") {
      return NextResponse.json(
        { success: false, error: "Cannot unassign completed booking" },
        { status: 400 }
      )
    }

    // Unassign professional from booking
    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      {
        $unset: { professionalId: "" },
        status: "in_process" // Reset status to in_process when unassigned
      },
      { new: true }
    ).populate("treatmentId")
     .populate("userId")

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      message: "Professional unassigned from booking successfully"
    })

  } catch (error) {
    console.error("Error in unassign booking API:", error)
    return NextResponse.json(
      { success: false, error: "Failed to unassign professional from booking" },
      { status: 500 }
    )
  }
} 