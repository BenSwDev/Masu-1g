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
  type IWorkArea,
  type IFinancialTransaction
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
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const phone = formData.get("phone") as string
    const gender = formData.get("gender") as string || "male"
    const birthDate = formData.get("birthDate") as string
    const password = formData.get("password") as string | null
    const isActiveStr = formData.get("isActive") as string | null
    const isActive = isActiveStr ? isActiveStr === "true" || isActiveStr === "on" : true

    if (!name || !email || !phone || !password) {
      return { success: false, error: "Name, email, phone and password are required" }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return { success: false, error: "User with this email already exists" }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

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
      userData.birthDate = new Date(birthDate)
    }

    const user = new User(userData)
    await user.save()

    // Create empty professional profile
    const professionalProfile = new ProfessionalProfile({
      userId: user._id,
      status: "pending_user_action", // User needs to complete setup
      treatments: [],
      workAreas: [],
      isActive,
      adminNotes: "Created by admin - user needs to complete setup"
    })

    await professionalProfile.save()

    // Return complete professional data with user info
    const completeProfile = await ProfessionalProfile.findById(professionalProfile._id)
      .populate('userId', 'name email phone gender birthDate')
      .lean()

    revalidatePath("/dashboard/admin/professional-management")

    return { success: true, professional: completeProfile }
  } catch (error) {
    console.error("Error creating professional:", error)
    return { success: false, error: "Failed to create professional" }
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
      return { success: false, error: "Unauthorized" }
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
          as: "user"
        }
      },
      { $unwind: "$user" },
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
            { "user.name": { $regex: search, $options: "i" } },
            { "user.email": { $regex: search, $options: "i" } },
            { "user.phone": { $regex: search, $options: "i" } },
            { specialization: { $regex: search, $options: "i" } }
          ]
        }
      })
    }

    // Add sorting
    const sortObj: any = {}
    if (sortBy.startsWith('user.')) {
      sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1
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
      professionals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  } catch (error) {
    console.error("Error fetching professionals:", error)
    return { success: false, error: "Failed to fetch professionals" }
  }
}

// Get single professional by ID
export async function getProfessionalById(professionalId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.activeRole !== "admin") {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const professional = await ProfessionalProfile.findById(professionalId)
      .populate('userId', 'name email phone gender birthDate')
      .populate('treatments.treatmentId')
      .populate('workAreas.cityId')
      .lean()

    if (!professional) {
      return { success: false, error: "Professional not found" }
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
    return { success: false, error: "Failed to fetch professional" }
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
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const professional = await ProfessionalProfile.findById(professionalId)
    if (!professional) {
      return { success: false, error: "Professional not found" }
    }

    const updateData: any = {
      status,
      adminNotes: adminNote
    }

    if (status === "active" && professional.status !== "active") {
      updateData.approvedAt = new Date()
    } else if (status === "rejected") {
      updateData.rejectedAt = new Date()
      updateData.rejectionReason = rejectionReason
    }

    await ProfessionalProfile.findByIdAndUpdate(professionalId, updateData)

    revalidatePath("/dashboard/admin/professionals")

    return { success: true }
  } catch (error) {
    console.error("Error updating professional status:", error)
    return { success: false, error: "Failed to update professional status" }
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
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    await ProfessionalProfile.findByIdAndUpdate(professionalId, {
      treatments
    })

    revalidatePath("/dashboard/admin/professionals")

    return { success: true }
  } catch (error) {
    console.error("Error updating professional treatments:", error)
    return { success: false, error: "Failed to update professional treatments" }
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
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    // Calculate covered cities for each work area
    const updatedWorkAreas = await Promise.all(
      workAreas.map(async (area) => {
        const coveredCities = await (CityDistance as any).getCoveredCities(
          area.cityName,
          area.distanceRadius
        )
        
        return {
          ...area,
          coveredCities: coveredCities.map((city: any) => city.toCityName || city.name)
        }
      })
    )

    await ProfessionalProfile.findByIdAndUpdate(professionalId, {
      workAreas: updatedWorkAreas
    })

    revalidatePath("/dashboard/admin/professionals")

    return { success: true }
  } catch (error) {
    console.error("Error updating professional work areas:", error)
    return { success: false, error: "Failed to update professional work areas" }
  }
}

// Add financial transaction
export async function addProfessionalFinancialTransaction(
  professionalId: string,
  transaction: Omit<IFinancialTransaction, 'date'>
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.activeRole !== "admin") {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const professional = await ProfessionalProfile.findById(professionalId)
    if (!professional) {
      return { success: false, error: "Professional not found" }
    }

    await professional.addFinancialTransaction(transaction)

    revalidatePath("/dashboard/admin/professionals")

    return { success: true }
  } catch (error) {
    console.error("Error adding financial transaction:", error)
    return { success: false, error: "Failed to add financial transaction" }
  }
}

// Simple list of professionals for dropdowns
export async function getProfessionalList() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.activeRole !== "admin") {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const professionals = await ProfessionalProfile.find({})
      .populate('userId', 'name')
      .select('_id userId')
      .lean()

    const list = professionals.map((p: any) => ({
      id: p._id.toString(),
      name: p.userId?.name || 'Unnamed'
    }))

    return { success: true, professionals: list }
  } catch (error) {
    console.error("Error fetching professional list:", error)
    return { success: false, error: "Failed to fetch professionals" }
  }
}

// Admin adjustment (credit or penalty)
export async function adminAdjustProfessionalBalance(
  professionalId: string,
  amount: number,
  note?: string
) {
  const type = amount >= 0 ? 'bonus' : 'penalty'
  return addProfessionalFinancialTransaction(professionalId, {
    type,
    amount: Math.abs(amount),
    description: type === 'bonus' ? 'Admin credit' : 'Admin penalty',
    adminNote: note,
  })
}

// Get professional financial report
export async function getProfessionalFinancialReport(
  professionalId: string,
  period: 'daily' | 'weekly' | 'monthly' | 'yearly',
  date?: Date
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.activeRole !== "admin") {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const professional = await ProfessionalProfile.findById(professionalId)
    if (!professional) {
      return { success: false, error: "Professional not found" }
    }

    const now = date || new Date()
    let startDate: Date
    let endDate: Date = new Date(now)

    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
        break
      case 'weekly':
        const weekStart = now.getDate() - now.getDay()
        startDate = new Date(now.getFullYear(), now.getMonth(), weekStart)
        endDate = new Date(now.getFullYear(), now.getMonth(), weekStart + 7)
        break
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
        break
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1)
        endDate = new Date(now.getFullYear() + 1, 0, 1)
        break
    }

    const transactions = professional.financialTransactions.filter(
      (t: any) => t.date >= startDate && t.date < endDate
    )

    const summary = {
      totalEarnings: transactions
        .filter((t: any) => t.type === 'booking_payment' || t.type === 'bonus')
        .reduce((sum: any, t: any) => sum + t.amount, 0),
      totalPenalties: transactions
        .filter((t: any) => t.type === 'penalty')
        .reduce((sum: any, t: any) => sum + Math.abs(t.amount), 0),
      totalAdjustments: transactions
        .filter((t: any) => t.type === 'adjustment')
        .reduce((sum: any, t: any) => sum + t.amount, 0),
      transactionCount: transactions.length
    }

    return {
      success: true,
      report: {
        period,
        startDate,
        endDate,
        transactions,
        summary
      }
    }
  } catch (error) {
    console.error("Error generating financial report:", error)
    return { success: false, error: "Failed to generate financial report" }
  }
}

// Get available treatments for professional assignment
export async function getAvailableTreatments() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.activeRole !== "admin") {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const treatments = await Treatment.find({ isActive: true })
      .populate('durations')
      .lean()

    return { success: true, treatments }
  } catch (error) {
    console.error("Error fetching treatments:", error)
    return { success: false, error: "Failed to fetch treatments" }
  }
}

// Get available cities for work area assignment
export async function getAvailableCities() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.activeRole !== "admin") {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const cities = await City.find({ isActive: true })
      .select('name coordinates')
      .sort({ name: 1 })
      .lean()

    return { success: true, cities }
  } catch (error) {
    console.error("Error fetching cities:", error)
    return { success: false, error: "Failed to fetch cities" }
  }
}

