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
import { z } from "zod"
import Treatment from "@/lib/db/models/treatment"

// Validation schemas
const GetProfessionalsSchema = z.object({
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(10),
  search: z.string().optional().default(""),
  status: z.enum(["active", "pending_admin_approval", "pending_user_action", "rejected", "suspended"]).optional(),
  sortBy: z.string().optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc")
})

const CreateProfessionalSchema = z.object({
  name: z.string().min(2, "שם חייב להכיל לפחות 2 תווים"),
  email: z.string().email("כתובת אימייל לא תקינה"),
  phone: z.string().min(10, "מספר טלפון חייב להכיל לפחות 10 ספרות"),
  gender: z.enum(["male", "female"]),
  birthDate: z.string().optional()
})

const ProfessionalTreatmentPricingSchema = z.object({
  treatmentId: z.string().min(1, "מזהה טיפול נדרש"),
  durationId: z.string().optional(),
  professionalPrice: z.number().min(0, "מחיר מטפל חייב להיות חיובי")
})

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
    stats: {
      total: number
      active: number
      byStatus: Record<string, number>
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

// Helper function to check admin authorization
async function requireAdminAuth() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.roles?.includes("admin")) {
    throw new Error("Unauthorized: Admin access required")
  }
  return session
}

// Helper function to build search query
function _buildSearchQuery(search: string, status?: ProfessionalStatus) {
  const query: any = {}
  
  // Add search conditions if search term provided
  if (search.trim()) {
    const searchRegex = { $regex: search.trim(), $options: "i" }
    query.$or = [
      { "userId.name": searchRegex },
      { "userId.email": searchRegex },
      { "userId.phone": searchRegex }
    ]
  }

  // Add status filter
  if (status) {
    query.status = status
  }

  return query
}

export async function getProfessionals(options: GetProfessionalsOptions = {}): Promise<GetProfessionalsResult> {
  try {
    // Authorize user
    await requireAdminAuth()

    // Connect to database
    await dbConnect()

    // Validate and sanitize input
    const validatedOptions = GetProfessionalsSchema.parse(options)
    const { page, limit, search, status, sortBy, sortOrder } = validatedOptions

    // Build aggregation pipeline for better performance
    const pipeline: any[] = [
      // Lookup user data
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userId"
        }
      },
      // Unwind user data
      {
        $unwind: "$userId"
      },
      // Match only users with professional role
      {
        $match: {
          "userId.roles": "professional"
        }
      }
    ]

    // Add search and status filters
    const matchStage: any = {}

    if (search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: "i" }
      matchStage.$or = [
        { "userId.name": searchRegex },
        { "userId.email": searchRegex },
        { "userId.phone": searchRegex }
      ]
    }

    if (status) {
      matchStage.status = status
    }

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage })
    }

    // Count total documents for pagination
    const countPipeline = [...pipeline, { $count: "total" }]
    const countResult = await ProfessionalProfile.aggregate(countPipeline)
    const total = countResult[0]?.total || 0
    const pages = Math.ceil(total / limit)

    // Add sorting
    const sortStage: any = {}
    if (sortBy === "user.name") {
      sortStage["userId.name"] = sortOrder === "asc" ? 1 : -1
    } else {
      sortStage[sortBy] = sortOrder === "asc" ? 1 : -1
    }
    pipeline.push({ $sort: sortStage })

    // Add pagination
    pipeline.push(
      { $skip: (page - 1) * limit },
      { $limit: limit }
    )

    // Execute query
    const professionals = await ProfessionalProfile.aggregate(pipeline)

    // Get statistics
    const stats = await ProfessionalProfile.getStatistics()

    return {
      success: true,
      data: {
        professionals: professionals as ProfessionalWithUser[],
        pagination: {
          page,
          limit,
          total,
          pages
        },
        stats
      }
    }
  } catch (error) {
    console.error("Error getting professionals:", error)
    
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return { success: false, error: "אין לך הרשאה לצפות במטפלים" }
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "שגיאה בטעינת המטפלים" 
    }
  }
}

export async function getProfessionalById(id: string): Promise<CreateProfessionalResult> {
  try {
    // Validate input
    if (!id || !Types.ObjectId.isValid(id)) {
      return { success: false, error: "מזהה מטפל לא תקין" }
    }

    // Authorize user
    await requireAdminAuth()

    // Connect to database
    await dbConnect()

    const professional = await ProfessionalProfile.findById(id)
      .populate("userId", "name email phone gender birthDate roles")
      .lean()

    if (!professional) {
      return { success: false, error: "מטפל לא נמצא" }
    }

    // Verify user has professional role
    const user = professional.userId as IUser
    if (!user.roles?.includes("professional")) {
      return { success: false, error: "המשתמש אינו מטפל" }
    }

    return { success: true, professional: professional as ProfessionalWithUser }
  } catch (error) {
    console.error("Error getting professional:", error)
    
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return { success: false, error: "אין לך הרשאה לצפות במטפל" }
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "שגיאה בטעינת המטפל" 
    }
  }
}

export async function createProfessional(formData: FormData): Promise<CreateProfessionalResult> {
  try {
    // Authorize user
    await requireAdminAuth()

    // Extract and validate form data
    const rawData = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      gender: formData.get("gender") as string,
      birthDate: formData.get("birthDate") as string
    }

    const validatedData = CreateProfessionalSchema.parse(rawData)

    // Connect to database
    await dbConnect()

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { email: validatedData.email },
        { phone: validatedData.phone }
      ]
    })
    
    if (existingUser) {
      return { 
        success: false, 
        error: "משתמש עם אימייל או טלפון זה כבר קיים במערכת" 
      }
    }

    // Create user with transaction
    const session = await User.startSession()
    
    try {
      await session.withTransaction(async () => {
    // Create user
    const hashedPassword = await hash("123456", 12) // Default password
        const user = await User.create([{
          name: validatedData.name,
          email: validatedData.email,
          phone: validatedData.phone,
          gender: validatedData.gender,
          birthDate: validatedData.birthDate ? new Date(validatedData.birthDate) : undefined,
      password: hashedPassword,
      roles: ["professional"],
          activeRole: "professional",
          isEmailVerified: false,
          isPhoneVerified: false
        }], { session })

    // Create professional profile
        await ProfessionalProfile.create([{
          userId: user[0]._id,
      status: "pending_admin_approval" as ProfessionalStatus,
          isActive: true,
          treatments: [],
          workAreas: [],
          totalEarnings: 0,
          pendingPayments: 0,
          financialTransactions: [],
      appliedAt: new Date()
        }], { session })
      })
    } finally {
      await session.endSession()
    }

    // Fetch the created professional with populated user data
    const createdProfessionalQuery = await ProfessionalProfile.findOne({ 
      "userId": { $in: await User.find({ email: validatedData.email }).select("_id") }
    })
      .populate("userId", "name email phone gender birthDate roles")
      .lean()

    if (!createdProfessionalQuery) {
      throw new Error("שגיאה ביצירת המטפל")
    }

    // Revalidate the professional management page
    revalidatePath("/dashboard/admin/professional-management")

    return { 
      success: true, 
      professional: createdProfessionalQuery as ProfessionalWithUser 
    }
  } catch (error) {
    console.error("Error creating professional:", error)
    
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return { success: false, error: "אין לך הרשאה ליצור מטפל" }
    }
    
    if (error instanceof z.ZodError) {
      const fieldErrors = error.errors.map(err => err.message).join(", ")
      return { success: false, error: `שגיאות בנתונים: ${fieldErrors}` }
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "שגיאה ביצירת המטפל" 
    }
  }
}

export async function updateProfessionalStatus(
  id: string,
  status: ProfessionalStatus,
  adminNote?: string,
  rejectionReason?: string
): Promise<UpdateProfessionalResult> {
  try {
    // Validate input
    if (!id || !Types.ObjectId.isValid(id)) {
      return { success: false, error: "מזהה מטפל לא תקין" }
    }

    if (!["active", "pending_admin_approval", "pending_user_action", "rejected", "suspended"].includes(status)) {
      return { success: false, error: "סטטוס לא תקין" }
    }

    // Authorize user
    const session = await requireAdminAuth()

    // Connect to database
    await dbConnect()

    const professional = await ProfessionalProfile.findById(id)
    if (!professional) {
      return { success: false, error: "מטפל לא נמצא" }
    }

    // Prepare update data
    const updateData: Partial<IProfessionalProfile> = { 
      status,
      lastActiveAt: new Date()
    }

    // Add status-specific fields
    if (status === "active") {
      updateData.approvedAt = new Date()
      updateData.rejectedAt = undefined
      updateData.rejectionReason = undefined
    } else if (status === "rejected") {
      updateData.rejectedAt = new Date()
      updateData.approvedAt = undefined
      if (rejectionReason) {
      updateData.rejectionReason = rejectionReason
      }
    } else if (status === "pending_admin_approval" || status === "pending_user_action") {
      updateData.approvedAt = undefined
      updateData.rejectedAt = undefined
      updateData.rejectionReason = undefined
    }

    // Add admin notes
    if (adminNote) {
      updateData.adminNotes = adminNote
    }

    const updatedProfessional = await ProfessionalProfile.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("userId", "name email phone gender birthDate roles")
      .lean()

    if (!updatedProfessional) {
      return { success: false, error: "שגיאה בעדכון המטפל" }
    }

    // Log the status change for audit
    console.log(`Professional ${id} status changed to ${status} by admin ${session.user.id}`)

    // Revalidate the professional management page
    revalidatePath("/dashboard/admin/professional-management")

    return { 
      success: true, 
      professional: updatedProfessional as ProfessionalWithUser 
    }
  } catch (error) {
    console.error("Error updating professional status:", error)
    
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return { success: false, error: "אין לך הרשאה לעדכן מטפל" }
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "שגיאה בעדכון סטטוס המטפל" 
    }
  }
}

export async function updateProfessionalTreatments(
  professionalId: string,
  treatments: Array<{
    treatmentId: string
    durationId?: string
    professionalPrice: number
  }>
): Promise<UpdateProfessionalResult> {
  try {
    console.log('updateProfessionalTreatments called with:', { professionalId, treatmentsCount: treatments.length })
    
    // Validate input
    if (!professionalId || !Array.isArray(treatments)) {
      return { success: false, error: "נתונים לא תקינים" }
    }

    const validatedTreatments = treatments.map(treatment => 
      ProfessionalTreatmentPricingSchema.parse(treatment)
    )
    
    console.log('Treatments validated successfully:', validatedTreatments.length)

    // Authorization check
    console.log('Checking admin authorization...')
    await requireAdminAuth()
    console.log('Admin authorization passed')

    // Connect to database
    console.log('Connecting to database...')
    await dbConnect()
    console.log('Database connected')

    // Verify professional exists
    const professional = await ProfessionalProfile.findById(professionalId)
    if (!professional) {
      return { success: false, error: "מטפל לא נמצא" }
    }

    console.log('Professional found:', professional._id)

    // Validate treatments exist and are active
    const treatmentIds = [...new Set(validatedTreatments.map(t => t.treatmentId))]
    console.log('Validating treatments:', treatmentIds)
    
    const existingTreatments = await Treatment.find({
      _id: { $in: treatmentIds },
      isActive: true
    })

    console.log('Found treatments:', existingTreatments.length, 'expected:', treatmentIds.length)

    if (existingTreatments.length !== treatmentIds.length) {
      return { success: false, error: "חלק מהטיפולים לא נמצאו או לא פעילים" }
    }

    // Update professional treatments
    console.log('Updating professional treatments...')
    const updatedProfessional = await ProfessionalProfile.findByIdAndUpdate(
      professionalId,
      {
        $set: {
          treatments: validatedTreatments,
          updatedAt: new Date()
        }
      },
      { 
        new: true,
        runValidators: true
      }
    )
      .populate("userId", "name email phone gender birthDate roles")
      .lean()

    if (!updatedProfessional) {
      return { success: false, error: "שגיאה בעדכון הטיפולים" }
    }

    console.log('Professional treatments updated successfully')

    // Revalidate the professional management page
    revalidatePath("/dashboard/admin/professional-management")

    return {
      success: true,
      professional: updatedProfessional as unknown as ProfessionalWithUser
    }

  } catch (error) {
    console.error('Error updating professional treatments:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available')
    
    if (error instanceof z.ZodError) {
      console.error('Validation errors:', error.errors)
      return {
        success: false,
        error: error.errors.map(e => e.message).join(', ')
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "שגיאה בעדכון הטיפולים"
    }
  }
}

export async function updateProfessionalBankDetails(
  id: string,
  bankDetails: { bankName: string; branchNumber: string; accountNumber: string }
): Promise<UpdateProfessionalResult> {
  try {
    // Validate input
    if (!id || !Types.ObjectId.isValid(id)) {
      return { success: false, error: "מזהה מטפל לא תקין" }
    }

    if (!bankDetails.bankName || !bankDetails.branchNumber || !bankDetails.accountNumber) {
      return { success: false, error: "כל פרטי חשבון הבנק נדרשים" }
    }

    // Authorize user
    await requireAdminAuth()

    // Connect to database
    await dbConnect()

    const professional = await ProfessionalProfile.findByIdAndUpdate(
      id,
      { 
        bankDetails: {
          bankName: bankDetails.bankName.trim(),
          branchNumber: bankDetails.branchNumber.trim(),
          accountNumber: bankDetails.accountNumber.trim()
        },
        lastActiveAt: new Date()
      },
      { new: true, runValidators: true }
    )
      .populate("userId", "name email phone gender birthDate roles")
      .lean()

    if (!professional) {
      return { success: false, error: "מטפל לא נמצא" }
    }

    // Revalidate the professional management page
    revalidatePath("/dashboard/admin/professional-management")

    return { 
      success: true, 
      professional: professional as ProfessionalWithUser 
    }
  } catch (error) {
    console.error("Error updating professional bank details:", error)
    
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return { success: false, error: "אין לך הרשאה לעדכן פרטי חשבון הבנק" }
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "שגיאה בעדכון פרטי חשבון הבנק" 
    }
  }
}

export async function updateProfessionalWorkAreas(
  id: string,
  workAreas: IProfessionalProfile["workAreas"]
): Promise<UpdateProfessionalResult> {
  try {
    // Validate input
    if (!id || !Types.ObjectId.isValid(id)) {
      return { success: false, error: "מזהה מטפל לא תקין" }
    }

    if (!Array.isArray(workAreas)) {
      return { success: false, error: "רשימת איזורי עבודה לא תקינה" }
    }

    // Authorize user
    await requireAdminAuth()

    // Connect to database
    await dbConnect()

    // Validate work area objects
    const validatedWorkAreas = workAreas.map(workArea => {
      if (!workArea.cityId || !workArea.cityName) {
        throw new Error("נתוני איזור עבודה חסרים")
      }
      
      const validDistanceRadii = ["20km", "40km", "60km", "80km", "unlimited"]
      if (!validDistanceRadii.includes(workArea.distanceRadius)) {
        throw new Error("רדיוס מרחק לא תקין")
      }
      
      return {
        cityId: new Types.ObjectId(workArea.cityId),
        cityName: workArea.cityName,
        distanceRadius: workArea.distanceRadius,
        coveredCities: Array.isArray(workArea.coveredCities) ? workArea.coveredCities : []
      }
    })

    const professional = await ProfessionalProfile.findByIdAndUpdate(
      id,
      { 
        workAreas: validatedWorkAreas,
        lastActiveAt: new Date()
      },
      { new: true, runValidators: true }
    )
      .populate("userId", "name email phone gender birthDate roles")
      .lean()

    if (!professional) {
      return { success: false, error: "מטפל לא נמצא" }
    }

    // Update covered cities for each work area
    try {
      const updatedProfessional = await ProfessionalProfile.findById(id)
      if (updatedProfessional) {
        for (let i = 0; i < updatedProfessional.workAreas.length; i++) {
          await updatedProfessional.updateCoveredCities(i)
        }
      }
    } catch (coveredCitiesError) {
      // Log error and return it as part of response for user awareness
      console.error("Error updating covered cities:", coveredCitiesError)
      return { 
        success: false, 
        error: "איזורי העבודה עודכנו אבל עדכון הערים המכוסות נכשל. אנא נסה שוב." 
      }
    }

    // Revalidate the professional management page
    revalidatePath("/dashboard/admin/professional-management")

    return { 
      success: true, 
      professional: professional as ProfessionalWithUser 
    }
  } catch (error) {
    console.error("Error updating professional work areas:", error)
    
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return { success: false, error: "אין לך הרשאה לעדכן איזורי עבודה של המטפל" }
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "שגיאה בעדכון איזורי העבודה" 
    }
  }
}

export async function deleteProfessional(id: string): Promise<DeleteProfessionalResult> {
  try {
    // Validate input
    if (!id || !Types.ObjectId.isValid(id)) {
      return { success: false, error: "מזהה מטפל לא תקין" }
    }

    // Authorize user
    await requireAdminAuth()

    // Connect to database
    await dbConnect()

    const professional = await ProfessionalProfile.findById(id)
    if (!professional) {
      return { success: false, error: "מטפל לא נמצא" }
    }

    // Check if professional has any active bookings
    const activeBookings = await Booking.countDocuments({
      professionalId: new Types.ObjectId(id),
      status: { $in: ["confirmed", "in_process"] as IBooking["status"][] }
    })

    if (activeBookings > 0) {
      return { 
        success: false, 
        error: `לא ניתן למחוק מטפל עם ${activeBookings} הזמנות פעילות` 
      }
    }

    // Check if professional has any pending bookings
    const pendingBookings = await Booking.countDocuments({
      professionalId: new Types.ObjectId(id),
      status: { $in: ["pending_professional_assignment", "pending_payment"] as IBooking["status"][] }
    })

    if (pendingBookings > 0) {
      return { 
        success: false, 
        error: `לא ניתן למחוק מטפל עם ${pendingBookings} הזמנות ממתינות` 
      }
    }

    // Use transaction for safe deletion
    const session = await ProfessionalProfile.startSession()
    
    try {
      await session.withTransaction(async () => {
        // Delete professional profile first
        await ProfessionalProfile.findByIdAndDelete(id, { session })

    // Delete associated user
        await User.findByIdAndDelete(professional.userId, { session })
      })
    } finally {
      await session.endSession()
    }

    // Revalidate the professional management page
    revalidatePath("/dashboard/admin/professional-management")

    return { success: true }
  } catch (error) {
    console.error("Error deleting professional:", error)
    
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return { success: false, error: "אין לך הרשאה למחוק מטפל" }
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "שגיאה במחיקת המטפל" 
    }
  }
} 