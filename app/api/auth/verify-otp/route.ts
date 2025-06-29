import { NextRequest, NextResponse } from "next/server"
import { verifyOTP } from "@/actions/notification-service"

export async function POST(request: NextRequest) {
  try {
    const { phone, otp } = await request.json()

    if (!phone || !otp) {
      return NextResponse.json(
        { success: false, error: "Phone number and OTP are required" },
        { status: 400 }
      )
    }

    const result = await verifyOTP(phone, otp)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in verify-otp API:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
} 