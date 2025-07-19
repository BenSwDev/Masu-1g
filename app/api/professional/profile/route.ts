import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import ProfessionalProfile from "@/lib/db/models/professional-profile"
import User from "@/lib/db/models/user"
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

    const { userDetails, professionalDetails } = await request.json()

    if (!userDetails || !professionalDetails) {
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

    // Update user details
    const userUpdates: any = {}
    if (userDetails.name && userDetails.name.trim()) {
      userUpdates.name = userDetails.name.trim()
    }
    if (userDetails.email && userDetails.email.trim()) {
      userUpdates.email = userDetails.email.trim().toLowerCase()
    }
    if (userDetails.phone) {
      userUpdates.phone = userDetails.phone
    }
    if (userDetails.gender && ['male', 'female'].includes(userDetails.gender)) {
      userUpdates.gender = userDetails.gender
    }
    if (userDetails.birthDate) {
      try {
        userUpdates.dateOfBirth = new Date(userDetails.birthDate)
      } catch (error) {
        console.warn('Invalid birth date:', userDetails.birthDate)
      }
    }

    // Update user in database
    if (Object.keys(userUpdates).length > 0) {
      userUpdates.updatedAt = new Date()
      await User.findByIdAndUpdate(session.user.id, userUpdates)
    }

    // Update professional details (only preferences, not status)
    const professionalUpdates: any = {}
    if (professionalDetails.genderPreference && 
        ['no_preference', 'male_only', 'female_only'].includes(professionalDetails.genderPreference)) {
      professionalUpdates.genderPreference = professionalDetails.genderPreference
    }

    // Update professional profile in database
    if (Object.keys(professionalUpdates).length > 0) {
      professionalUpdates.updatedAt = new Date()
      await ProfessionalProfile.findByIdAndUpdate(professionalProfile._id, professionalUpdates)
    }

    logger.info("Professional profile updated by user", {
      professionalId: professionalProfile._id,
      userId: session.user.id,
      userUpdates: Object.keys(userUpdates),
      professionalUpdates: Object.keys(professionalUpdates)
    })

    return NextResponse.json({
      success: true,
      message: "הפרופיל עודכן בהצלחה"
    })

  } catch (error) {
    logger.error("Error updating professional profile:", {
      error: error instanceof Error ? error.message : String(error),
      userId: session?.user?.id
    })

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "שגיאה בעדכון הפרופיל" 
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

    // Find the professional profile and user details
    const professionalProfile = await ProfessionalProfile.findOne({
      userId: session.user.id,
      status: 'active'
    }).lean()

    if (!professionalProfile) {
      return NextResponse.json(
        { success: false, error: "פרופיל מטפל לא נמצא" },
        { status: 404 }
      )
    }

    const user = await User.findById(session.user.id).lean()
    if (!user) {
      return NextResponse.json(
        { success: false, error: "משתמש לא נמצא" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      professional: {
        _id: professionalProfile._id.toString(),
        userId: {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone,
          gender: user.gender,
          dateOfBirth: user.dateOfBirth
        },
        status: professionalProfile.status,
        isActive: professionalProfile.isActive,
        genderPreference: professionalProfile.genderPreference,
        appliedAt: professionalProfile.appliedAt,
        lastActiveAt: professionalProfile.lastActiveAt,
        updatedAt: professionalProfile.updatedAt
      }
    })

  } catch (error) {
    logger.error("Error fetching professional profile:", {
      error: error instanceof Error ? error.message : String(error),
      userId: session?.user?.id
    })

    return NextResponse.json(
      { 
        success: false, 
        error: "שגיאה בטעינת הפרופיל" 
      },
      { status: 500 }
    )
  }
} 