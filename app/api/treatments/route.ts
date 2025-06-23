import { NextResponse } from "next/server"
import dbConnect from "@/lib/db/mongoose"
import Treatment from "@/lib/db/models/treatment"

export async function GET() {
  try {
    console.log('Treatments API: Starting request...')
    
    // Check if MongoDB URI is configured
    if (!process.env.MONGODB_URI) {
      console.error('Treatments API: MONGODB_URI not configured')
      return NextResponse.json(
        { 
          success: false, 
          error: "Database not configured",
          details: "MONGODB_URI environment variable is missing"
        },
        { status: 500 }
      )
    }

    console.log('Treatments API: MongoDB URI found, attempting connection...')
    
    // Connect to database
    await dbConnect()
    console.log('Treatments API: Database connected successfully')
    
    // Get all active treatments with complete data
    const treatments = await Treatment.find({ isActive: true })
      .select("name description category isActive pricingType fixedPrice fixedProfessionalPrice defaultDurationMinutes durations allowTherapistGenderSelection createdAt updatedAt")
      .sort({ category: 1, name: 1 })
      .lean()

    console.log(`Treatments API: Found ${treatments.length} treatments`)

    const transformedTreatments = treatments.map(treatment => ({
      _id: treatment._id.toString(),
      name: treatment.name,
      description: treatment.description,
      category: treatment.category || "other",
      isActive: treatment.isActive,
      pricingType: treatment.pricingType || "fixed",
      // Fixed pricing fields
      fixedPrice: treatment.fixedPrice,
      fixedProfessionalPrice: treatment.fixedProfessionalPrice,
      defaultDurationMinutes: treatment.defaultDurationMinutes,
      // Duration-based pricing
      durations: treatment.durations?.map(duration => ({
        _id: duration._id?.toString() || '',
        minutes: duration.minutes,
        price: duration.price,
        professionalPrice: duration.professionalPrice,
        isActive: duration.isActive
      })) || [],
      allowTherapistGenderSelection: treatment.allowTherapistGenderSelection,
      createdAt: treatment.createdAt,
      updatedAt: treatment.updatedAt
    }))

    console.log('Treatments API: Data transformed successfully')

    return NextResponse.json({
      success: true,
      treatments: transformedTreatments
    })
  } catch (error) {
    console.error("Treatments API Error:", error)
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
        error: "Failed to fetch treatments",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
} 