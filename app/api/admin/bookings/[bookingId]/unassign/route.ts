import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth/require-admin-session"
import { unassignProfessionalFromBooking } from "@/actions/booking-actions"

export async function POST(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    // Require admin session
    const session = await requireAdminSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { bookingId } = params

    if (!bookingId) {
      return NextResponse.json({ error: "Booking ID is required" }, { status: 400 })
    }

    // Unassign professional from booking
    const result = await unassignProfessionalFromBooking(bookingId)

    if (result.success) {
      return NextResponse.json({
        success: true,
        booking: result.booking,
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || "Failed to unassign professional",
      }, { status: 400 })
    }
  } catch (error) {
    console.error("Error in unassign professional API:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error",
    }, { status: 500 })
  }
} 