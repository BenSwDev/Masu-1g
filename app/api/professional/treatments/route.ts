import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import ProfessionalProfile from "@/lib/db/models/professional-profile"
import { logger } from "@/lib/logs/logger"

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: "לא מורשה" },
        { status: 401 }
      )
    }

    if (session.user.activeRole !== "professional") {
      return NextResponse.json(
        { success: false, error: "נדרש תפקיד מטפל" },
        { status: 403 }
      )
    }

    await dbConnect()

    const { treatments } = await request.json()

    if (!Array.isArray(treatments)) {
      return NextResponse.json(
        { success: false, error: "נתונים לא תקינים" },
        { status: 400 }
      )
    }

    // Find the professional profile for the current user
    const professionalProfile = await ProfessionalProfile.findOne({
      userId: session.user.id,
      status: 'active'
    })

    if (!professionalProfile) {
      return NextResponse.json(
        { success: false, error: "פרופיל מטפל לא נמצא" },
        { status: 404 }
      )
    }

    // Validate treatments format
    const validatedTreatments = treatments.map(treatment => {
      if (!treatment.treatmentId || typeof treatment.professionalPrice !== 'number') {
        throw new Error("נתוני טיפול לא תקינים")
      }
      
      return {
        treatmentId: treatment.treatmentId,
        ...(treatment.durationId && { durationId: treatment.durationId }),
        professionalPrice: Math.max(0, treatment.professionalPrice) // Ensure non-negative
      }
    })

    // Update the professional's treatments
    professionalProfile.treatments = validatedTreatments
    await professionalProfile.save()

    logger.info("Professional treatments updated", {
      professionalId: professionalProfile._id,
      userId: session.user.id,
      treatmentsCount: validatedTreatments.length,
      totalEarnings: validatedTreatments.reduce((sum, t) => sum + t.professionalPrice, 0)
    })

    return NextResponse.json({
      success: true,
      message: "הטיפולים עודכנו בהצלחה",
      treatmentsCount: validatedTreatments.length
    })

  } catch (error) {
    logger.error("Error updating professional treatments:", {
      error: error instanceof Error ? error.message : String(error),
      userId: session?.user?.id
    })

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "שגיאה בעדכון הטיפולים" 
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: "לא מורשה" },
        { status: 401 }
      )
    }

    if (session.user.activeRole !== "professional") {
      return NextResponse.json(
        { success: false, error: "נדרש תפקיד מטפל" },
        { status: 403 }
      )
    }

    await dbConnect()

    // Find the professional profile for the current user
    const professionalProfile = await ProfessionalProfile.findOne({
      userId: session.user.id,
      status: 'active'
    }).populate('treatments.treatmentId', 'name description category')

    if (!professionalProfile) {
      return NextResponse.json(
        { success: false, error: "פרופיל מטפל לא נמצא" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      treatments: professionalProfile.treatments || [],
      totalTreatments: professionalProfile.treatments?.length || 0
    })

  } catch (error) {
    logger.error("Error fetching professional treatments:", {
      error: error instanceof Error ? error.message : String(error),
      userId: session?.user?.id
    })

    return NextResponse.json(
      { 
        success: false, 
        error: "שגיאה בטעינת הטיפולים" 
      },
      { status: 500 }
    )
  }
} 