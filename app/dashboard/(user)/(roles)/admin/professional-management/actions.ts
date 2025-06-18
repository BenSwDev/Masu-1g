"use server"

import dbConnect from "@/lib/db/mongoose"
import ProfessionalProfile, { IProfessionalProfile, ProfessionalStatus } from "@/lib/db/models/professional-profile"
import User, { IUser } from "@/lib/db/models/user"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { revalidatePath } from "next/cache"
import { Types } from "mongoose"
import { hash } from "bcryptjs"
import Booking, { IBooking } from "@/lib/db/models/booking"

interface GetProfessionalsOptions {
  page?: number
  limit?: number
  search?: string
  status?: ProfessionalStatus
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

interface GetProfessionalsResult {
  success: boolean
  data?: {
    professionals: (IProfessionalProfile & { userId: IUser })[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }
  error?: string
}

interface CreateProfessionalResult {
  success: boolean
  professional?: IProfessionalProfile & { userId: IUser }
  error?: string
}

interface UpdateProfessionalResult {
  success: boolean
  professional?: IProfessionalProfile & { userId: IUser }
  error?: string
}

interface DeleteProfessionalResult {
  success: boolean
  error?: string
}

type ProfessionalWithUser = IProfessionalProfile & { userId: IUser }

export async function getProfessionals(options: GetProfessionalsOptions = {}): Promise<GetProfessionalsResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
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
    } = options

    const query: Record<string, unknown> = {}

    if (search) {
      query["userId.name"] = { $regex: search, $options: "i" }
    }

    if (status) {
      query.status = status
    }

    const total = await ProfessionalProfile.countDocuments(query)
    const pages = Math.ceil(total / limit)

    const professionals = await ProfessionalProfile.find(query)
      .populate("userId", "name email phone gender birthDate")
      .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    return {
      success: true,
      data: {
        professionals: professionals as unknown as ProfessionalWithUser[],
        pagination: {
          page,
          limit,
          total,
          pages
        }
      }
    }
  } catch (error) {
    console.error("Error getting professionals:", error)
    return { success: false, error: "Failed to get professionals" }
  }
}

export async function getProfessionalById(id: string): Promise<CreateProfessionalResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const professional = await ProfessionalProfile.findById(id)
      .populate("userId", "name email phone gender birthDate")
      .populate("bookings")
      .lean()

    if (!professional) {
      return { success: false, error: "Professional not found" }
    }

    return { success: true, professional: professional as unknown as ProfessionalWithUser }
  } catch (error) {
    console.error("Error getting professional:", error)
    return { success: false, error: "Failed to get professional" }
  }
}

export async function createProfessional(formData: FormData): Promise<CreateProfessionalResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const phone = formData.get("phone") as string
    const gender = formData.get("gender") as string
    const birthDate = formData.get("birthDate") as string

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return { success: false, error: "User already exists" }
    }

    // Create user
    const hashedPassword = await hash("123456", 12) // Default password
    const user = await User.create({
      name,
      email,
      phone,
      gender,
      birthDate,
      password: hashedPassword,
      roles: ["professional"],
      activeRole: "professional"
    })

    // Create professional profile
    const professional = await ProfessionalProfile.create({
      userId: user._id,
      status: "pending_admin_approval" as ProfessionalStatus,
      appliedAt: new Date()
    })

    const populatedProfessional = await ProfessionalProfile.findById(professional._id)
      .populate("userId", "name email phone gender birthDate")
      .lean()

    return { 
      success: true, 
      professional: populatedProfessional as unknown as ProfessionalWithUser 
    }
  } catch (error) {
    console.error("Error creating professional:", error)
    return { success: false, error: "Failed to create professional" }
  }
}

export async function updateProfessionalStatus(
  id: string,
  status: ProfessionalStatus,
  adminNote?: string,
  rejectionReason?: string
): Promise<UpdateProfessionalResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const professional = await ProfessionalProfile.findById(id)
    if (!professional) {
      return { success: false, error: "Professional not found" }
    }

    const updateData: Partial<IProfessionalProfile> = { status }

    if (status === "active") {
      updateData.approvedAt = new Date()
    } else if (status === "rejected") {
      updateData.rejectedAt = new Date()
      updateData.rejectionReason = rejectionReason
    }

    if (adminNote) {
      updateData.adminNotes = adminNote
    }

    const updatedProfessional = await ProfessionalProfile.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    )
      .populate("userId", "name email phone gender birthDate")
      .lean()

    if (!updatedProfessional) {
      return { success: false, error: "Failed to update professional" }
    }

    revalidatePath("/dashboard/admin/professional-management")
    return { 
      success: true, 
      professional: updatedProfessional as unknown as ProfessionalWithUser 
    }
  } catch (error) {
    console.error("Error updating professional status:", error)
    return { success: false, error: "Failed to update professional status" }
  }
}

export async function updateProfessionalTreatments(
  id: string,
  treatments: IProfessionalProfile["treatments"]
): Promise<UpdateProfessionalResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const professional = await ProfessionalProfile.findByIdAndUpdate(
      id,
      { treatments },
      { new: true }
    )
      .populate("userId", "name email phone gender birthDate")
      .lean()

    if (!professional) {
      return { success: false, error: "Professional not found" }
    }

    revalidatePath("/dashboard/admin/professional-management")
    return { 
      success: true, 
      professional: professional as unknown as ProfessionalWithUser 
    }
  } catch (error) {
    console.error("Error updating professional treatments:", error)
    return { success: false, error: "Failed to update professional treatments" }
  }
}

export async function updateProfessionalWorkAreas(
  id: string,
  workAreas: IProfessionalProfile["workAreas"]
): Promise<UpdateProfessionalResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const professional = await ProfessionalProfile.findByIdAndUpdate(
      id,
      { workAreas },
      { new: true }
    )
      .populate("userId", "name email phone gender birthDate")
      .lean()

    if (!professional) {
      return { success: false, error: "Professional not found" }
    }

    revalidatePath("/dashboard/admin/professional-management")
    return { 
      success: true, 
      professional: professional as unknown as ProfessionalWithUser 
    }
  } catch (error) {
    console.error("Error updating professional work areas:", error)
    return { success: false, error: "Failed to update professional work areas" }
  }
}

export async function deleteProfessional(id: string): Promise<DeleteProfessionalResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const professional = await ProfessionalProfile.findById(id)
    if (!professional) {
      return { success: false, error: "Professional not found" }
    }

    // Check if professional has any active bookings
    const activeBookings = await Booking.countDocuments({
      professionalId: new Types.ObjectId(id),
      status: { $in: ["confirmed", "in_process"] as IBooking["status"][] }
    })

    if (activeBookings > 0) {
      return { success: false, error: "Cannot delete professional with active bookings" }
    }

    // Delete professional profile
    await ProfessionalProfile.findByIdAndDelete(id)

    // Delete associated user
    await User.findByIdAndDelete(professional.userId)

    revalidatePath("/dashboard/admin/professional-management")
    return { success: true }
  } catch (error) {
    console.error("Error deleting professional:", error)
    return { success: false, error: "Failed to delete professional" }
  }
} 