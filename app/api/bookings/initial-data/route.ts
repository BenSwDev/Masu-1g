import { NextResponse } from "next/server"
import { getGuestBookingInitialData } from "@/actions/booking-actions"

export async function GET() {
  try {
    const result = await getGuestBookingInitialData()
    
    if (!result.success) {
      console.error("getGuestBookingInitialData failed:", result.error)
      return NextResponse.json(
        { success: false, error: result.error || "Failed to fetch initial data" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data
    })
  } catch (error) {
    console.error("Error in booking initial data API:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
} 