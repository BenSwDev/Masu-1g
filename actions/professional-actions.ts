"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import mongoose from "mongoose"
import { revalidatePath } from "next/cache"
import ProfessionalProfile, {
  type IProfessionalProfile,
  type ProfessionalStatus,
  type ITreatmentPricing,
  type IWorkArea
} from "@/lib/db/models/professional-profile"
import bcrypt from "bcryptjs"
import User from "@/lib/db/models/user"
import Booking from "@/lib/db/models/booking"
import Treatment from "@/lib/db/models/treatment"
import { City, CityDistance } from "@/lib/db/models/city-distance"

// Create a new professional
export async function createProfessional(formData: FormData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.activeRole !== "admin") {
      return { success: false, error: "לא מורשה" }
    }

    await dbConnect()

    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const phone = formData.get("phone") as string
    const gender = formData.get("gender") as string || "male"
    const birthDate = formData.get("birthDate") as string
    const password = null
    const status: ProfessionalStatus = "pending_admin_approval"

    if (!name || !email || !phone) {
      return { success: false, error: "שם, אימייל וטלפון נדרשים" }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return { success: false, error: "משתמש עם אימייל זה כבר קיים" }
    }

    const finalPassword = password || Math.random().toString(36).slice(-8)
    const hashedPassword = await bcrypt.hash(finalPassword, 10)

    // Create user account
    const userData: any = {
      name,
      email,
      phone,
      password: hashedPassword,
      gender,
      roles: ["professional"],
      activeRole: "professional",
      isEmailVerified: false
    }

    if (birthDate) {
      userData.dateOfBirth = new Date(birthDate)
    }

    const user = new User(userData)
    await user.save()

    // Create professional profile with initial data
    const professionalProfile = new ProfessionalProfile({
      userId: user._id,
      status,
      treatments: [],
      workAreas: [],
      isActive: false,
      adminNotes: "נוצר על ידי מנהל - המטפל צריך להשלים הגדרה"
    })

    await professionalProfile.save()

    // Return complete professional data with user info
    const completeProfile = await ProfessionalProfile.findById(professionalProfile._id)
      .populate('userId', 'name email phone gender dateOfBirth')
      .lean()

    if (completeProfile?.userId && (completeProfile.userId as any).dateOfBirth) {
      ;(completeProfile.userId as any).birthDate = (completeProfile.userId as any).dateOfBirth
      delete (completeProfile.userId as any).dateOfBirth
    }

    revalidatePath("/dashboard/admin/professional-management")

    return { success: true, professional: completeProfile }
  } catch (error) {
    console.error("Error creating professional:", error)
    return { success: false, error: "יצירת המטפל נכשלה" }
  }
}

// Update professional profile (complete update)
export async function updateProfessionalProfile(
  professionalId: string,
  updates: {
    profileImage?: string
  }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.activeRole !== "admin") {
      return { success: false, error: "לא מורשה" }
    }

    await dbConnect()

    const professional = await ProfessionalProfile.findById(professionalId)
    if (!professional) {
      return { success: false, error: "מטפל לא נמצא" }
    }

    // Update only provided fields
    if (updates.profileImage !== undefined) professional.profileImage = updates.profileImage

    // Update last active time
    professional.lastActiveAt = new Date()

    await professional.save()

    // Return updated professional with populated data
    const updatedProfessional = await ProfessionalProfile.findById(professionalId)
      .populate('userId', 'name email phone gender dateOfBirth')
      .populate('treatments.treatmentId')
      .populate('workAreas.cityId')
      .lean()

    if (updatedProfessional?.userId && (updatedProfessional.userId as any).dateOfBirth) {
      ;(updatedProfessional.userId as any).birthDate = (updatedProfessional.userId as any).dateOfBirth
      delete (updatedProfessional.userId as any).dateOfBirth
    }

    revalidatePath("/dashboard/admin/professional-management")

    return { success: true, professional: updatedProfessional }
  } catch (error) {
    console.error("Error updating professional profile:", error)
    return { success: false, error: "עדכון הפרופיל נכשל" }
  }
}

// Update user info for professional
export async function updateProfessionalUserInfo(
  userId: string,
  updates: {
    name?: string
    phone?: string
    gender?: string
    birthDate?: string
  }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.activeRole !== "admin") {
      return { success: false, error: "לא מורשה" }
    }

    await dbConnect()

    const user = await User.findById(userId)
    if (!user) {
      return { success: false, error: "משתמש לא נמצא" }
    }

    // Update only provided fields
    if (updates.name) user.name = updates.name
    if (updates.phone) user.phone = updates.phone
    if (updates.gender) user.gender = updates.gender as "male" | "female" | "other"
    if (updates.birthDate) user.dateOfBirth = new Date(updates.birthDate)

    await user.save()

    revalidatePath("/dashboard/admin/professional-management")

    const userObj: any = user.toObject()
    if (userObj.dateOfBirth) {
      userObj.birthDate = userObj.dateOfBirth
      delete userObj.dateOfBirth
    }

    return { success: true, user: userObj }
  } catch (error) {
    console.error("Error updating professional user info:", error)
    return { success: false, error: "עדכון פרטי המשתמש נכשל" }
  }
}

// Get all professionals with filtering and pagination
export async function getProfessionals(params?: {
  page?: number
  limit?: number
  search?: string
  status?: ProfessionalStatus
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.activeRole !== "admin") {
      return { success: false, error: "לא מורשה" }
    }

    await dbConnect()

    const {
      page = 1,
      limit = 10,
      search = "",
      status,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = params || {}

    // Build query
    const query: any = {}
    
    if (status) {
      query.status = status
    }

    // Build aggregation pipeline
    const pipeline: any[] = [
      { $match: query },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userId"
        }
      },
      { $unwind: "$userId" },
      {
        $addFields: { "userId.birthDate": "$userId.dateOfBirth" }
      },
      { $project: { "userId.dateOfBirth": 0 } },
      {
        $lookup: {
          from: "treatments",
          localField: "treatments.treatmentId",
          foreignField: "_id",
          as: "treatmentDetails"
        }
      }
    ]

    // Add search filter
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { "userId.name": { $regex: search, $options: "i" } },
            { "userId.email": { $regex: search, $options: "i" } },
            { "userId.phone": { $regex: search, $options: "i" } }
          ]
        }
      })
    }

    // Add sorting
    const sortObj: any = {}
    if (sortBy.startsWith('user.')) {
      const field = sortBy.replace('user.', 'userId.')
      sortObj[field] = sortOrder === 'asc' ? 1 : -1
    } else {
      sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1
    }
    pipeline.push({ $sort: sortObj })

    // Get total count
    const countPipeline = [...pipeline, { $count: "total" }]
    const countResult = await ProfessionalProfile.aggregate(countPipeline)
    const total = countResult[0]?.total || 0

    // Add pagination
    pipeline.push(
      { $skip: (page - 1) * limit },
      { $limit: limit }
    )

    const professionals = await ProfessionalProfile.aggregate(pipeline)

    return {
      success: true,
      data: {
        professionals,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    }
  } catch (error) {
    console.error("Error fetching professionals:", error)
    return { success: false, error: "השגת המטפלים נכשלה" }
  }
}

// Get single professional by ID
export async function getProfessionalById(professionalId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.activeRole !== "admin") {
      return { success: false, error: "לא מורשה" }
    }

    await dbConnect()

    const professional = await ProfessionalProfile.findById(professionalId)
      .populate('userId', 'name email phone gender dateOfBirth')
      .populate('treatments.treatmentId')
      .populate('workAreas.cityId')
      .lean()

    if (professional?.userId && (professional.userId as any).dateOfBirth) {
      ;(professional.userId as any).birthDate = (professional.userId as any).dateOfBirth
      delete (professional.userId as any).dateOfBirth
    }

    if (!professional) {
      return { success: false, error: "מטפל לא נמצא" }
    }

    // Get professional's bookings
    const bookings = await Booking.find({ 
      professionalId: (professional as any)._id 
    })
      .populate('treatmentId', 'name')
      .sort({ bookingDateTime: -1 })
      .limit(10)
      .lean()

    return {
      success: true,
      professional: {
        ...professional,
        bookings
      }
    }
  } catch (error) {
    console.error("Error fetching professional:", error)
    return { success: false, error: "השגת המטפל נכשלה" }
  }
}

// Update professional status
export async function updateProfessionalStatus(
  professionalId: string,
  status: ProfessionalStatus,
  adminNote?: string,
  rejectionReason?: string
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.activeRole !== "admin") {
      return { success: false, error: "לא מורשה" }
    }

    await dbConnect()

    const professional = await ProfessionalProfile.findById(professionalId)
    if (!professional) {
      return { success: false, error: "מטפל לא נמצא" }
    }

    const updateData: any = {
      status,
      adminNotes: adminNote,
      lastActiveAt: new Date(),
      isActive: status === "active"
    }

    if (status === "active" && professional.status !== "active") {
      updateData.approvedAt = new Date()
    } else if (status === "rejected") {
      updateData.rejectedAt = new Date()
      updateData.rejectionReason = rejectionReason
    }

    await ProfessionalProfile.findByIdAndUpdate(professionalId, updateData)

    revalidatePath("/dashboard/admin/professional-management")

    return { success: true }
  } catch (error) {
    console.error("Error updating professional status:", error)
    return { success: false, error: "עדכון סטטוס המטפל נכשל" }
  }
}

// Update professional treatments
export async function updateProfessionalTreatments(
  professionalId: string,
  treatments: ITreatmentPricing[]
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.activeRole !== "admin") {
      return { success: false, error: "לא מורשה" }
    }

    await dbConnect()

    await ProfessionalProfile.findByIdAndUpdate(professionalId, {
      treatments,
      lastActiveAt: new Date()
    })

    revalidatePath("/dashboard/admin/professional-management")

    return { success: true }
  } catch (error) {
    console.error("Error updating professional treatments:", error)
    return { success: false, error: "עדכון טיפולי המטפל נכשל" }
  }
}

// Update professional work areas
export async function updateProfessionalWorkAreas(
  professionalId: string,
  workAreas: IWorkArea[]
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.activeRole !== "admin") {
      return { success: false, error: "לא מורשה" }
    }

    await dbConnect()

    // Calculate covered cities for each work area
    const updatedWorkAreas = await Promise.all(
      workAreas.map(async (area) => {
        try {
          const coveredCities = await (CityDistance as any).getCoveredCities(
            area.cityName,
            area.distanceRadius
          )
          
          return {
            ...area,
            coveredCities: coveredCities
              .map((city: any) => city.toCityName || city.name)
              .filter((name: string) => name && name !== area.cityName)
          }
        } catch (error) {
          console.error("Error calculating covered cities:", error)
          return area // Return original area if calculation fails
        }
      })
    )

    await ProfessionalProfile.findByIdAndUpdate(professionalId, {
      workAreas: updatedWorkAreas,
      lastActiveAt: new Date()
    })

    revalidatePath("/dashboard/admin/professional-management")

    return { success: true }
  } catch (error) {
    console.error("Error updating professional work areas:", error)
    return { success: false, error: "עדכון איזורי פעילות המטפל נכשל" }
  }
}



// Simple list of professionals for dropdowns
export async function getProfessionalList() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.activeRole !== "admin") {
      return { success: false, error: "לא מורשה" }
    }

    await dbConnect()

    const professionals = await ProfessionalProfile.find({})
      .populate('userId', 'name')
      .select('_id userId')
      .lean()

    const list = professionals.map((p: any) => ({
      id: p._id.toString(),
      name: p.userId?.name || 'ללא שם'
    }))

    return { success: true, data: { professionals: list } }
  } catch (error) {
    console.error("Error fetching professional list:", error)
    return { success: false, error: "השגת רשימת המטפלים נכשלה" }
  }
}





// Get available treatments for professional assignment
export async function getAvailableTreatments() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.activeRole !== "admin") {
      return { success: false, error: "לא מורשה" }
    }

    await dbConnect()

    const treatments = await Treatment.find({ isActive: true })
      .populate('durations')
      .lean()

    return { success: true, treatments }
  } catch (error) {
    console.error("Error fetching treatments:", error)
    return { success: false, error: "השגת הטיפולים נכשלה" }
  }
}

// Get available cities for work area assignment
export async function getAvailableCities() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.activeRole !== "admin") {
      return { success: false, error: "לא מורשה" }
    }

    await dbConnect()

    const cities = await City.find({ isActive: true })
      .select('name coordinates')
      .sort({ name: 1 })
      .lean()

    return { success: true, cities }
  } catch (error) {
    console.error("Error fetching cities:", error)
    return { success: false, error: "השגת הערים נכשלה" }
  }
}

// Delete professional (for admin use only)
export async function deleteProfessional(professionalId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.activeRole !== "admin") {
      return { success: false, error: "לא מורשה" }
    }

    await dbConnect()

    const professional = await ProfessionalProfile.findById(professionalId)
    if (!professional) {
      return { success: false, error: "מטפל לא נמצא" }
    }

    // Check if professional has active bookings
    const activeBookings = await Booking.countDocuments({
      professionalId: professionalId,
      status: { $in: ['confirmed', 'in_process'] }
    })

    if (activeBookings > 0) {
      return { 
        success: false, 
        error: "לא ניתן למחוק מטפל עם הזמנות פעילות" 
      }
    }

    // Delete professional profile
    await ProfessionalProfile.findByIdAndDelete(professionalId)

    // Note: We don't delete the user account, just remove the professional profile
    // The user can still exist as a regular user

    revalidatePath("/dashboard/admin/professional-management")

    return { success: true }
  } catch (error) {
    console.error("Error deleting professional:", error)
    return { success: false, error: "מחיקת המטפל נכשלה" }
  }
}

