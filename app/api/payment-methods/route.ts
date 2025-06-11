import { NextResponse } from "next/server"

export async function GET() {
  try {
    // For now, return empty array since guests don't have payment methods
    // In a real implementation, you might want to return available payment options
    return NextResponse.json({
      success: true,
      paymentMethods: []
    })
  } catch (error) {
    console.error("Error fetching payment methods:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch payment methods", paymentMethods: [] },
      { status: 500 }
    )
  }
} 