import { NextResponse } from "next/server"
import { initializeData } from "@/scripts/init-data"

export async function POST() {
  try {
    // TODO: Remove debug log

    
    await initializeData()
    
    return NextResponse.json({
      success: true,
      message: "Data initialization completed successfully"
    })
  } catch (error) {
    console.error("❌ Error in data initialization API:", error)
    
    return NextResponse.json(
      {
        success: false,
        error: "Failed to initialize data",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Data initialization endpoint - use POST to trigger initialization"
  })
} 
