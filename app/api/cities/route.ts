import { NextResponse } from "next/server"
import dbConnect from "@/lib/db/mongoose"
import { City } from "@/lib/db/models/city-distance"

export async function GET() {
  try {
    await dbConnect()
    
    // Get all active cities
    const cities = await City.find({ isActive: true })
      .select("name isActive coordinates")
      .sort({ name: 1 })
      .lean()

    return NextResponse.json({
      success: true,
      cities: cities.map(city => ({
        _id: city._id.toString(),
        name: city.name,
        isActive: city.isActive,
        coordinates: city.coordinates
      }))
    })
  } catch (error) {
    console.error("Error fetching cities:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch cities" },
      { status: 500 }
    )
  }
} 