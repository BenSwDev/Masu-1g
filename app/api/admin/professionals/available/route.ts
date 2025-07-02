import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"

/**
 * GET /api/admin/professionals/available
 * Get all available professionals for admin notifications
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    await dbConnect()

    // Import models
    const User = (await import("@/lib/db/models/user")).default
    const ProfessionalProfile = (await import("@/lib/db/models/professional-profile")).default

    // Get all professionals with their profiles
    const professionals = await User.find({
      roles: "professional",
      isActive: true
    })
    .select("name email phone gender preferredLanguage")
    .lean()

    // Get professional profiles for additional info
    const professionalIds = professionals.map(p => p._id)
    const profiles = await ProfessionalProfile.find({
      userId: { $in: professionalIds }
    })
    .populate('workAreas.cityId', 'name')
    .populate('treatments.treatmentId', 'name')
    .select('userId workAreas treatments isActive')
    .lean()

    // Create a map of profiles by userId
    const profileMap = new Map()
    profiles.forEach(profile => {
      profileMap.set(profile.userId.toString(), profile)
    })

    // Combine user data with profile data
    const result = professionals
      .filter(prof => {
        const profile = profileMap.get(prof._id.toString())
        return profile && profile.isActive
      })
      .map(prof => {
        const profile = profileMap.get(prof._id.toString())
        return {
          _id: prof._id,
          name: prof.name,
          email: prof.email,
          phone: prof.phone,
          gender: prof.gender,
          profileId: profile._id,
          workAreas: profile.workAreas || [],
          treatments: profile.treatments || [],
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))

    logger.info(`Retrieved ${result.length} available professionals for admin`, {
      adminId: session.user.id
    })

    return NextResponse.json({
      success: true,
      professionals: result,
      count: result.length
    })

  } catch (error) {
    logger.error("Error in available professionals endpoint:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Internal server error" 
      },
      { status: 500 }
    )
  }
} 