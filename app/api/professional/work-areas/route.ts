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

    const { workAreas } = await request.json()

    if (!Array.isArray(workAreas)) {
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

    // Validate work areas format
    const validatedWorkAreas = workAreas.map(area => {
      if (!area.cityName || !area.distanceRadius) {
        throw new Error("נתוני אזור פעילות לא תקינים")
      }
      
      return {
        cityId: area.cityId || null,
        cityName: area.cityName,
        distanceRadius: area.distanceRadius,
        coveredCities: area.coveredCities || []
      }
    })

    // Update the professional's work areas
    professionalProfile.workAreas = validatedWorkAreas
    await professionalProfile.save()

    // Calculate total unique cities for logging
    const allCitiesSet = new Set<string>()
    validatedWorkAreas.forEach(area => {
      if (area.coveredCities) {
        area.coveredCities.forEach(city => allCitiesSet.add(city))
      }
    })

    logger.info("Professional work areas updated", {
      professionalId: professionalProfile._id,
      userId: session.user.id,
      workAreasCount: validatedWorkAreas.length,
      totalCitiesCovered: allCitiesSet.size,
      workAreas: validatedWorkAreas.map(area => ({
        cityName: area.cityName,
        distanceRadius: area.distanceRadius,
        coveredCitiesCount: area.coveredCities?.length || 0
      }))
    })

    return NextResponse.json({
      success: true,
      message: "איזורי הפעילות עודכנו בהצלחה",
      workAreasCount: validatedWorkAreas.length,
      totalCitiesCovered: allCitiesSet.size
    })

  } catch (error) {
    logger.error("Error updating professional work areas:", {
      error: error instanceof Error ? error.message : String(error),
      userId: session?.user?.id
    })

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "שגיאה בעדכון איזורי הפעילות" 
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
    })

    if (!professionalProfile) {
      return NextResponse.json(
        { success: false, error: "פרופיל מטפל לא נמצא" },
        { status: 404 }
      )
    }

    // Calculate total unique cities
    const allCitiesSet = new Set<string>()
    if (professionalProfile.workAreas) {
      professionalProfile.workAreas.forEach(area => {
        if (area.coveredCities) {
          area.coveredCities.forEach(city => allCitiesSet.add(city))
        }
      })
    }

    return NextResponse.json({
      success: true,
      workAreas: professionalProfile.workAreas || [],
      totalWorkAreas: professionalProfile.workAreas?.length || 0,
      totalCitiesCovered: allCitiesSet.size
    })

  } catch (error) {
    logger.error("Error fetching professional work areas:", {
      error: error instanceof Error ? error.message : String(error),
      userId: session?.user?.id
    })

    return NextResponse.json(
      { 
        success: false, 
        error: "שגיאה בטעינת איזורי הפעילות" 
      },
      { status: 500 }
    )
  }
} 