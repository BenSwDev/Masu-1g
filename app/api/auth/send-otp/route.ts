import { NextRequest, NextResponse } from "next/server"
import { sendOTP } from "@/actions/notification-service"

export async function POST(request: NextRequest) {
  try {
    const { phone, language } = await request.json()

    if (!phone) {
      return NextResponse.json(
        { success: false, error: "Phone number is required" },
        { status: 400 }
      )
    }

    const result = await sendOTP(phone, language || "he")

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in send-otp API:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
