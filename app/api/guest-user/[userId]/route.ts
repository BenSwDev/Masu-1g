import { NextRequest, NextResponse } from "next/server"
import { getUserProfile } from "@/actions/profile-actions"

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const result = await getUserProfile(params.userId)
    
    if (result.success) {
      return NextResponse.json({ success: true, user: result.user })
    } else {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 404 }
      )
    }
  } catch (error) {
    console.error("Error fetching guest user:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch user" },
      { status: 500 }
    )
  }
} 