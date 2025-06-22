import { NextResponse } from "next/server"
import dbConnect from "@/lib/db/mongoose"
import Treatment from "@/lib/db/models/treatment"

export async function GET() {
  try {
    await dbConnect()
    
    // Get all active treatments with complete data
    const treatments = await Treatment.find({ isActive: true })
      .select("name description category isActive pricingType fixedPrice fixedProfessionalPrice defaultDurationMinutes durations allowTherapistGenderSelection createdAt updatedAt")
      .sort({ category: 1, name: 1 })
      .lean()

    return NextResponse.json({
      success: true,
      treatments: treatments.map(treatment => ({
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
          _id: duration._id.toString(),
          minutes: duration.minutes,
          price: duration.price,
          professionalPrice: duration.professionalPrice,
          isActive: duration.isActive
        })) || [],
        allowTherapistGenderSelection: treatment.allowTherapistGenderSelection,
        createdAt: treatment.createdAt,
        updatedAt: treatment.updatedAt
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