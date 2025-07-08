import { NextRequest, NextResponse } from "next/server"
import { handleProfessionalResponse } from "@/actions/notification-service"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ responseId: string }> }
) {
  try {
    const { responseId } = await params
    const { action, responseMethod } = await request.json()

    if (!responseId) {
      return NextResponse.json(
        { success: false, error: "Response ID is required" },
        { status: 400 }
      )
    }

    if (!action || !["accept", "decline"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Valid action (accept/decline) is required" },
        { status: 400 }
      )
    }

    const result = await handleProfessionalResponse(
      responseId, 
      action, 
      responseMethod || "sms"
    )
    
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in professional response API:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
} 