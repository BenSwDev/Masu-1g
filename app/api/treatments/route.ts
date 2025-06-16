import { NextResponse } from "next/server"
import dbConnect from "@/lib/db/mongoose"
import Treatment from "@/lib/db/models/treatment"

export async function GET() {
  try {
    await dbConnect()
    
    // Get all active treatments
    const treatments = await Treatment.find({ isActive: true })
      .select("name description isActive")
      .sort({ name: 1 })
      .lean()

    return NextResponse.json({
      success: true,
      treatments: treatments.map(treatment => ({
        _id: treatment._id.toString(),
        name: treatment.name,
        description: treatment.description,
        isActive: treatment.isActive
      }))
    })
  } catch (error) {
    console.error("Error fetching treatments:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch treatments" },
      { status: 500 }
    )
  }
} 