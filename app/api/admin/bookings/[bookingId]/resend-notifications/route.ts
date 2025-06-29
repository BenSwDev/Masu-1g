import { NextRequest, NextResponse } from "next/server"
import { resendProfessionalNotifications } from "@/actions/notification-service"

export async function POST(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const { bookingId } = params

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: "Booking ID is required" },
        { status: 400 }
      )
    }

    const result = await resendProfessionalNotifications(bookingId)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in resend-notifications API:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
} 