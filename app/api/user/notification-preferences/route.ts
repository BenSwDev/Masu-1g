import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { getUserNotificationPreferences, updateUserNotificationPreferences } from "@/actions/notification-service"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const result = await getUserNotificationPreferences(session.user.id)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in notification-preferences GET API:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const preferences = await request.json()

    const result = await updateUserNotificationPreferences(session.user.id, preferences)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in notification-preferences PUT API:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
} 