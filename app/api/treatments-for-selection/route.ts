import { NextResponse } from "next/server"
import { getTreatmentsForSelection } from "@/actions/gift-voucher-actions"

export async function GET() {
  try {
    const result = await getTreatmentsForSelection()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching treatments for selection:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch treatments", treatments: [] },
      { status: 500 }
    )
  }
} 