import { NextResponse } from "next/server"
import dbConnect from "@/lib/db/mongoose"
import { City } from "@/lib/db/models/city-distance"

export async function GET() {
  try {
    console.log('Cities API: Starting request...')
    
    // Check if MongoDB URI is configured
    if (!process.env.MONGODB_URI) {
      console.error('Cities API: MONGODB_URI not configured')
      return NextResponse.json(
        { 
          success: false, 
          error: "Database not configured",
          details: "MONGODB_URI environment variable is missing"
        },
        { status: 500 }
      )
    }

    console.log('Cities API: MongoDB URI found, attempting connection...')
    
    // Connect to database
    await dbConnect()
    console.log('Cities API: Database connected successfully')
    
    // Get all active cities
    const cities = await City.find({ isActive: true })
      .select("name isActive coordinates")
      .sort({ name: 1 })
      .lean()

    console.log(`Cities API: Found ${cities.length} cities`)

    const transformedCities = cities.map(city => ({
      _id: city._id.toString(),
      name: city.name,
      isActive: city.isActive,
      coordinates: city.coordinates
    }))

    console.log('Cities API: Data transformed successfully')

    return NextResponse.json({
      success: true,
      cities: transformedCities
    })
  } catch (error) {
    console.error("Cities API Error:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack available')
    
    // Check if it's a connection error
    if (error instanceof Error && error.message.includes('connect')) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Database connection failed",
          details: "Cannot connect to MongoDB. Please ensure MongoDB is running.",
          mongoError: error.message
        },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch cities",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
} 