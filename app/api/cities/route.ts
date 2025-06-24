import { NextResponse } from "next/server"
import dbConnect from "@/lib/db/mongoose"
import { City } from "@/lib/db/models/city-distance"

export async function GET() {
  try {
    console.log("Cities API: Starting to fetch cities")
    await dbConnect()
    console.log("Cities API: Database connected")
    
    // Get all active cities
    const cities = await City.find({ isActive: true })
      .select("name isActive coordinates")
      .sort({ name: 1 })
      .lean()

    console.log("Cities API: Found cities:", cities.length)

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
      { success: false, error: "Failed to fetch cities", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
} 