import { NextResponse } from "next/server"
import { getSubscriptionsForSelection } from "@/actions/subscription-actions"

export async function GET() {
  try {
    const result = await getSubscriptionsForSelection()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching subscriptions for selection:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch subscriptions", subscriptions: [] },
      { status: 500 }
    )
  }
} 