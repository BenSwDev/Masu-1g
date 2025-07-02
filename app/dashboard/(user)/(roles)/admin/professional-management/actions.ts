"use server"

import ProfessionalProfile, { IProfessionalProfile, ProfessionalStatus } from "../../../../../../lib/db/models/professional-profile"
import User, { IUser } from "../../../../../../lib/db/models/user"
import Booking, { IBooking } from "../../../../../../lib/db/models/booking"
import Treatment from "../../../../../../lib/db/models/treatment"
import { Types } from "mongoose"
import { hash } from "bcryptjs"
import { z } from "zod"
import {
  requireAdminSession,
  connectToDatabase,
  AdminLogger,
  handleAdminError,
  validatePaginationOptions,
  revalidateAdminPath,
  createSuccessResult,
  createErrorResult,
  createPaginatedResult,
  serializeMongoObject,
  validateObjectId,
  buildSearchQuery,
  buildSortQuery,
  type AdminActionResult,
  type PaginatedResult,
  type AdminActionOptions
} from "../../../../../../lib/auth/admin-helpers"

// Types
export interface ProfessionalData {
  _id: string
  userId: {
    _id: string
    name: string
    email: string
    phone: string
    gender: "male" | "female" | "other"
    dateOfBirth?: string
    isActive: boolean
    createdAt?: string
    updatedAt?: string
  }
  status: ProfessionalStatus
  isActive: boolean
  treatments: Array<{
    treatmentId: string
    durationId?: string
    professionalPrice: number
  }>
  workAreas: Array<{
    cityId: string
    maxDistanceKm: number
  }>
  bankDetails?: {
    bankName: string
    branchNumber: string
    accountNumber: string
  }
  adminNotes?: string
  rejectionReason?: string
  createdAt?: string
  updatedAt?: string
}

export interface ProfessionalFilters extends AdminActionOptions {
  status?: ProfessionalStatus
  isActive?: boolean
  hasWorkAreas?: boolean
  hasBankDetails?: boolean
  treatmentId?: string
}

export interface CreateProfessionalData {
  name: string
  email: string
  phone: string
  gender: "male" | "female" | "other"
  dateOfBirth?: string
  password?: string
  treatments?: Array<{
    treatmentId: string
    durationId?: string
    professionalPrice: number
  }>
  workAreas?: Array<{
    cityId: string
    maxDistanceKm: number
  }>
  bankDetails?: {
    bankName: string
    branchNumber: string
    accountNumber: string
  }
}

export interface UpdateProfessionalData {
  name?: string
  email?: string
  phone?: string
  gender?: "male" | "female" | "other"
  dateOfBirth?: string
  status?: ProfessionalStatus
  isActive?: boolean
  treatments?: Array<{
    treatmentId: string
    durationId?: string
    professionalPrice: number
  }>
  workAreas?: Array<{
    cityId: string
    maxDistanceKm: number
  }>
  bankDetails?: {
    bankName: string
    branchNumber: string
    accountNumber: string
  }
  adminNotes?: string
  rejectionReason?: string
}

export interface ProfessionalStatistics {
  totalProfessionals: number
  activeProfessionals: number
  inactiveProfessionals: number
  pendingApproval: number
  rejectedProfessionals: number
  suspendedProfessionals: number
  professionalsWithBankDetails: number
  professionalsWithWorkAreas: number
  newProfessionalsThisMonth: number
  averageTreatmentsPerProfessional: number
}

// Validation schemas
const CreateProfessionalSchema = z.object({
  name: z.string().min(2, "שם חייב להכיל לפחות 2 תווים"),
  email: z.string().email("כתובת אימייל לא תקינה"),
  phone: z.string().min(10, "מספר טלפון חייב להכיל לפחות 10 ספרות"),
  gender: z.enum(["male", "female", "other"]),
  dateOfBirth: z.string().optional(),
  password: z.string().min(6, "סיסמה חייבת להכיל לפחות 6 תווים").optional()
})

const UpdateProfessionalSchema = z.object({
  name: z.string().min(2, "שם חייב להכיל לפחות 2 תווים").optional(),
  email: z.string().email("כתובת אימייל לא תקינה").optional(),
  phone: z.string().min(10, "מספר טלפון חייב להכיל לפחות 10 ספרות").optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  dateOfBirth: z.string().optional(),
  status: z.enum(["active", "pending_admin_approval", "pending_user_action", "rejected", "suspended"]).optional(),
  isActive: z.boolean().optional(),
  adminNotes: z.string().optional(),
  rejectionReason: z.string().optional()
})

const TreatmentPricingSchema = z.object({
  treatmentId: z.string().min(1, "מזהה טיפול נדרש"),
  durationId: z.string().optional(),
  professionalPrice: z.number().min(0, "מחיר מטפל חייב להיות חיובי")
})

const WorkAreaSchema = z.object({
  cityId: z.string().min(1, "מזהה עיר נדרש"),
  maxDistanceKm: z.number().min(0, "מרחק מקסימלי חייב להיות חיובי")
})

const BankDetailsSchema = z.object({
  bankName: z.string().min(1, "שם בנק נדרש"),
  branchNumber: z.string().min(1, "מספר סניף נדרש"),
  accountNumber: z.string().min(1, "מספר חשבון נדרש")
})

/**
 * Gets all professionals with filtering, sorting, and pagination
 */
export async function getProfessionals(
  filters: ProfessionalFilters = {}
): Promise<AdminActionResult<PaginatedResult<ProfessionalData>>> {
  const adminLogger = new AdminLogger("getProfessionals")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    const { page, limit, skip } = validatePaginationOptions(filters)
    const {
      status,
      isActive,
      hasWorkAreas,
      hasBankDetails,
      treatmentId,
      search,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = filters

    adminLogger.info("Fetching professionals", { filters, page, limit })

    // Build aggregation pipeline
    const pipeline: any[] = [
      // Lookup user data
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      // Unwind user data
      {
        $unwind: "$userDetails"
      },
      // Match only users with professional role
      {
        $match: {
          "userDetails.roles": "professional"
        }
      }
    ]

    // Build match conditions
    const matchConditions: any = {}

    // Search filter
    if (search) {
      const searchRegex = { $regex: search.trim(), $options: "i" }
      matchConditions.$or = [
        { "userDetails.name": searchRegex },
        { "userDetails.email": searchRegex },
        { "userDetails.phone": searchRegex }
      ]
    }

    // Status filter
    if (status) {
      matchConditions.status = status
    }

    // Active status filter
    if (typeof isActive === "boolean") {
      matchConditions.isActive = isActive
    }

    // Work areas filter
    if (typeof hasWorkAreas === "boolean") {
      if (hasWorkAreas) {
        matchConditions.workAreas = { $exists: true, $ne: [], $not: { $size: 0 } }
      } else {
        matchConditions.$or = [
          { workAreas: { $exists: false } },
          { workAreas: [] },
          { workAreas: { $size: 0 } }
        ]
      }
    }

    // Bank details filter
    if (typeof hasBankDetails === "boolean") {
      if (hasBankDetails) {
        matchConditions.bankDetails = { $exists: true, $ne: null }
      } else {
        matchConditions.$or = [
          { bankDetails: { $exists: false } },
          { bankDetails: null }
        ]
      }
    }

    // Treatment filter
    if (treatmentId) {
      matchConditions["treatments.treatmentId"] = treatmentId
    }

    // Add match stage if we have conditions
    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions })
    }

    // Get total count
    const countPipeline = [...pipeline, { $count: "total" }]
    const countResult = await ProfessionalProfile.aggregate(countPipeline)
    const totalProfessionals = countResult[0]?.total || 0

    adminLogger.info("Found professionals matching query", { totalProfessionals })

    // Add sorting
    const sortStage: any = {}
    if (sortBy === "name") {
      sortStage["userDetails.name"] = sortOrder === "asc" ? 1 : -1
    } else if (sortBy === "email") {
      sortStage["userDetails.email"] = sortOrder === "asc" ? 1 : -1
    } else {
      sortStage[sortBy] = sortOrder === "asc" ? 1 : -1
    }
    pipeline.push({ $sort: sortStage })

    // Add pagination
    pipeline.push({ $skip: skip }, { $limit: limit })

    // Execute query
    const professionals = await ProfessionalProfile.aggregate(pipeline)

    // Process professionals
    const professionalsData: ProfessionalData[] = professionals.map((prof: any) => {
      const serialized = serializeMongoObject<any>(prof)
      return {
        _id: serialized._id.toString(),
        userId: {
          _id: serialized.userDetails._id.toString(),
          name: serialized.userDetails.name,
          email: serialized.userDetails.email,
          phone: serialized.userDetails.phone,
          gender: serialized.userDetails.gender,
          dateOfBirth: serialized.userDetails.dateOfBirth,
          isActive: serialized.userDetails.isActive,
          createdAt: serialized.userDetails.createdAt,
          updatedAt: serialized.userDetails.updatedAt
        },
        status: serialized.status,
        isActive: serialized.isActive,
        treatments: serialized.treatments || [],
        workAreas: serialized.workAreas || [],
        bankDetails: serialized.bankDetails,
        adminNotes: serialized.adminNotes,
        rejectionReason: serialized.rejectionReason,
        createdAt: serialized.createdAt,
        updatedAt: serialized.updatedAt
      }
    })

    adminLogger.info("Successfully fetched professionals", { count: professionalsData.length })
    return createPaginatedResult(professionalsData, totalProfessionals, page, limit)
  } catch (error) {
    return handleAdminError(error, "getProfessionals")
  }
}

/**
 * Get professional by ID
 */
export async function getProfessionalById(professionalId: string): Promise<AdminActionResult<ProfessionalData>> {
  const adminLogger = new AdminLogger("getProfessionalById")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(professionalId, "מזהה מטפל")
    
    adminLogger.info("Fetching professional by ID", { professionalId })

    const pipeline = [
      { $match: { _id: new Types.ObjectId(professionalId) } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      { $unwind: "$userDetails" }
    ]

    const professionals = await ProfessionalProfile.aggregate(pipeline)
    
    if (!professionals || professionals.length === 0) {
      adminLogger.warn("Professional not found", { professionalId })
      return createErrorResult("מטפל לא נמצא")
    }

    const prof = professionals[0]
    const serialized = serializeMongoObject<any>(prof)
    const professionalData: ProfessionalData = {
      _id: serialized._id.toString(),
      userId: {
        _id: serialized.userDetails._id.toString(),
        name: serialized.userDetails.name,
        email: serialized.userDetails.email,
        phone: serialized.userDetails.phone,
        gender: serialized.userDetails.gender,
        dateOfBirth: serialized.userDetails.dateOfBirth,
        isActive: serialized.userDetails.isActive,
        createdAt: serialized.userDetails.createdAt,
        updatedAt: serialized.userDetails.updatedAt
      },
      status: serialized.status,
      isActive: serialized.isActive,
      treatments: serialized.treatments || [],
      workAreas: serialized.workAreas || [],
      bankDetails: serialized.bankDetails,
      adminNotes: serialized.adminNotes,
      rejectionReason: serialized.rejectionReason,
      createdAt: serialized.createdAt,
      updatedAt: serialized.updatedAt
    }

    adminLogger.info("Successfully fetched professional", { professionalId })
    return createSuccessResult(professionalData)
  } catch (error) {
    return handleAdminError(error, "getProfessionalById")
  }
}

/**
 * Create new professional
 */
export async function createProfessional(professionalData: CreateProfessionalData): Promise<AdminActionResult<ProfessionalData>> {
  const adminLogger = new AdminLogger("createProfessional")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    adminLogger.info("Creating new professional", { email: professionalData.email })

    // Validate input
    const validatedData = CreateProfessionalSchema.parse(professionalData)

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { email: validatedData.email },
        { phone: validatedData.phone }
      ]
    })

    if (existingUser) {
      adminLogger.warn("User already exists", { email: validatedData.email, phone: validatedData.phone })
      return createErrorResult("משתמש עם אימייל או טלפון זה כבר קיים במערכת")
    }

    // Validate treatments if provided
    if (professionalData.treatments) {
      for (const treatment of professionalData.treatments) {
        const treatmentExists = await Treatment.findById(treatment.treatmentId)
        if (!treatmentExists) {
          return createErrorResult(`טיפול עם מזהה ${treatment.treatmentId} לא נמצא`)
        }
      }
    }

    // Create user
    const hashedPassword = validatedData.password ? await hash(validatedData.password, 12) : await hash("123456", 12)
    
    const user = new User({
      name: validatedData.name,
      email: validatedData.email,
      phone: validatedData.phone,
      gender: validatedData.gender,
      dateOfBirth: validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : undefined,
      password: hashedPassword,
      roles: ["professional"],
      isActive: true
    })

    await user.save()

    // Create professional profile
    const professionalProfile = new ProfessionalProfile({
      userId: user._id,
      status: "pending_admin_approval" as ProfessionalStatus,
      isActive: true,
      treatments: professionalData.treatments || [],
      workAreas: professionalData.workAreas || [],
      bankDetails: professionalData.bankDetails
    })

    await professionalProfile.save()
    revalidateAdminPath("/dashboard/admin/professional-management")

    // Fetch created professional with user details
    const result = await getProfessionalById(professionalProfile._id.toString())
    if (!result.success || !result.data) {
      return createErrorResult("שגיאה בשליפת נתוני המטפל שנוצר")
    }

    adminLogger.info("Successfully created professional", { professionalId: professionalProfile._id, userId: user._id })
    return createSuccessResult(result.data)
  } catch (error) {
    return handleAdminError(error, "createProfessional")
  }
}

/**
 * Update professional
 */
export async function updateProfessional(
  professionalId: string,
  professionalData: UpdateProfessionalData
): Promise<AdminActionResult<ProfessionalData>> {
  const adminLogger = new AdminLogger("updateProfessional")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(professionalId, "מזהה מטפל")
    
    adminLogger.info("Updating professional", { professionalId, updates: Object.keys(professionalData) })

    // Get professional and user
    const professional = await ProfessionalProfile.findById(professionalId)
    if (!professional) {
      adminLogger.warn("Professional not found for update", { professionalId })
      return createErrorResult("מטפל לא נמצא")
    }

    const user = await User.findById(professional.userId)
    if (!user) {
      adminLogger.warn("User not found for professional", { professionalId, userId: professional.userId })
      return createErrorResult("משתמש לא נמצא")
    }

    // Validate user data updates
    const userUpdates: any = {}
    if (professionalData.name) userUpdates.name = professionalData.name
    if (professionalData.email) userUpdates.email = professionalData.email
    if (professionalData.phone) userUpdates.phone = professionalData.phone
    if (professionalData.gender) userUpdates.gender = professionalData.gender
    if (professionalData.dateOfBirth) userUpdates.dateOfBirth = new Date(professionalData.dateOfBirth)

    if (Object.keys(userUpdates).length > 0) {
      const validatedUserData = UpdateProfessionalSchema.partial().parse(userUpdates)
      
      // Check for conflicts if email or phone is being changed
      if (validatedUserData.email && validatedUserData.email !== user.email) {
        const existingUser = await User.findOne({ email: validatedUserData.email, _id: { $ne: user._id } })
        if (existingUser) {
          return createErrorResult("אימייל זה כבר קיים במערכת")
        }
      }
      
      if (validatedUserData.phone && validatedUserData.phone !== user.phone) {
        const existingUser = await User.findOne({ phone: validatedUserData.phone, _id: { $ne: user._id } })
        if (existingUser) {
          return createErrorResult("מספר טלפון זה כבר קיים במערכת")
        }
      }

      // Update user
      Object.assign(user, validatedUserData)
      await user.save()
    }

    // Update professional profile
    const professionalUpdates: any = {}
    if (professionalData.status) professionalUpdates.status = professionalData.status
    if (typeof professionalData.isActive === "boolean") professionalUpdates.isActive = professionalData.isActive
    if (professionalData.treatments) professionalUpdates.treatments = professionalData.treatments
    if (professionalData.workAreas) professionalUpdates.workAreas = professionalData.workAreas
    if (professionalData.bankDetails) professionalUpdates.bankDetails = professionalData.bankDetails
    if (professionalData.adminNotes !== undefined) professionalUpdates.adminNotes = professionalData.adminNotes
    if (professionalData.rejectionReason !== undefined) professionalUpdates.rejectionReason = professionalData.rejectionReason

    if (Object.keys(professionalUpdates).length > 0) {
      Object.assign(professional, professionalUpdates)
      await professional.save()
    }

    revalidateAdminPath("/dashboard/admin/professional-management")

    // Fetch updated professional
    const result = await getProfessionalById(professionalId)
    if (!result.success || !result.data) {
      return createErrorResult("שגיאה בשליפת נתוני המטפל המעודכן")
    }

    adminLogger.info("Successfully updated professional", { professionalId })
    return createSuccessResult(result.data)
  } catch (error) {
    return handleAdminError(error, "updateProfessional")
  }
}

/**
 * Update professional status
 */
export async function updateProfessionalStatus(
  professionalId: string,
  status: ProfessionalStatus,
  adminNote?: string,
  rejectionReason?: string
): Promise<AdminActionResult<ProfessionalData>> {
  const adminLogger = new AdminLogger("updateProfessionalStatus")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(professionalId, "מזהה מטפל")
    
    adminLogger.info("Updating professional status", { professionalId, status, adminNote, rejectionReason })

    const professional = await ProfessionalProfile.findById(professionalId)
    if (!professional) {
      adminLogger.warn("Professional not found for status update", { professionalId })
      return createErrorResult("מטפל לא נמצא")
    }

    // Update status and related fields
    professional.status = status
    if (adminNote !== undefined) professional.adminNotes = adminNote
    if (rejectionReason !== undefined) professional.rejectionReason = rejectionReason

    await professional.save()
    revalidateAdminPath("/dashboard/admin/professional-management")

    // Fetch updated professional
    const result = await getProfessionalById(professionalId)
    if (!result.success || !result.data) {
      return createErrorResult("שגיאה בשליפת נתוני המטפל המעודכן")
    }

    adminLogger.info("Successfully updated professional status", { professionalId, newStatus: status })
    return createSuccessResult(result.data)
  } catch (error) {
    return handleAdminError(error, "updateProfessionalStatus")
  }
}

/**
 * Delete professional
 */
export async function deleteProfessional(professionalId: string): Promise<AdminActionResult<boolean>> {
  const adminLogger = new AdminLogger("deleteProfessional")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(professionalId, "מזהה מטפל")
    
    adminLogger.info("Deleting professional", { professionalId })

    const professional = await ProfessionalProfile.findById(professionalId)
    if (!professional) {
      adminLogger.warn("Professional not found for deletion", { professionalId })
      return createErrorResult("מטפל לא נמצא")
    }

    // Check if professional has active bookings
    const activeBookings = await Booking.countDocuments({
      professionalId: professionalId,
      status: { $in: ["confirmed", "in_progress"] }
    })

    if (activeBookings > 0) {
      adminLogger.warn("Cannot delete professional with active bookings", { professionalId, activeBookings })
      return createErrorResult("לא ניתן למחוק מטפל עם הזמנות פעילות")
    }

    // Delete professional profile
    await ProfessionalProfile.findByIdAndDelete(professionalId)

    // Optionally delete user (be careful with this)
    // await User.findByIdAndDelete(professional.userId)

    revalidateAdminPath("/dashboard/admin/professional-management")

    adminLogger.info("Successfully deleted professional", { professionalId })
    return createSuccessResult(true)
  } catch (error) {
    return handleAdminError(error, "deleteProfessional")
  }
}

/**
 * Get professional statistics
 */
export async function getProfessionalStatistics(): Promise<AdminActionResult<ProfessionalStatistics>> {
  const adminLogger = new AdminLogger("getProfessionalStatistics")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    adminLogger.info("Fetching professional statistics")

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Run all queries in parallel for better performance
    const [
      totalProfessionals,
      activeProfessionals,
      inactiveProfessionals,
      pendingApproval,
      rejectedProfessionals,
      suspendedProfessionals,
      professionalsWithBankDetails,
      professionalsWithWorkAreas,
      newProfessionalsThisMonth,
      treatmentStats
    ] = await Promise.all([
      ProfessionalProfile.countDocuments({}),
      ProfessionalProfile.countDocuments({ isActive: true }),
      ProfessionalProfile.countDocuments({ isActive: false }),
      ProfessionalProfile.countDocuments({ status: "pending_admin_approval" }),
      ProfessionalProfile.countDocuments({ status: "rejected" }),
      ProfessionalProfile.countDocuments({ status: "suspended" }),
      ProfessionalProfile.countDocuments({ bankDetails: { $exists: true, $ne: null } }),
      ProfessionalProfile.countDocuments({ workAreas: { $exists: true, $ne: [], $not: { $size: 0 } } }),
      ProfessionalProfile.countDocuments({ createdAt: { $gte: startOfMonth } }),
      ProfessionalProfile.aggregate([
        { $group: { _id: null, avgTreatments: { $avg: { $size: "$treatments" } } } }
      ])
    ])

    const averageTreatmentsPerProfessional = treatmentStats[0]?.avgTreatments || 0

    const statistics: ProfessionalStatistics = {
      totalProfessionals,
      activeProfessionals,
      inactiveProfessionals,
      pendingApproval,
      rejectedProfessionals,
      suspendedProfessionals,
      professionalsWithBankDetails,
      professionalsWithWorkAreas,
      newProfessionalsThisMonth,
      averageTreatmentsPerProfessional: Math.round(averageTreatmentsPerProfessional * 100) / 100
    }

    adminLogger.info("Successfully fetched professional statistics", statistics)
    return createSuccessResult(statistics)
  } catch (error) {
    return handleAdminError(error, "getProfessionalStatistics")
  }
}

// Legacy FormData-based functions for backward compatibility
export async function createProfessionalFromFormData(formData: FormData): Promise<AdminActionResult<ProfessionalData>> {
  const professionalData: CreateProfessionalData = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    phone: formData.get("phone") as string,
    gender: formData.get("gender") as "male" | "female" | "other",
    dateOfBirth: formData.get("dateOfBirth") as string,
    password: formData.get("password") as string
  }

  return createProfessional(professionalData)
}

export async function updateProfessionalFromFormData(
  professionalId: string,
  formData: FormData
): Promise<AdminActionResult<ProfessionalData>> {
  const professionalData: UpdateProfessionalData = {}

  if (formData.get("name")) professionalData.name = formData.get("name") as string
  if (formData.get("email")) professionalData.email = formData.get("email") as string
  if (formData.get("phone")) professionalData.phone = formData.get("phone") as string
  if (formData.get("gender")) professionalData.gender = formData.get("gender") as "male" | "female" | "other"
  if (formData.get("dateOfBirth")) professionalData.dateOfBirth = formData.get("dateOfBirth") as string
  if (formData.get("status")) professionalData.status = formData.get("status") as ProfessionalStatus
  if (formData.get("isActive")) professionalData.isActive = formData.get("isActive") === "true"
  if (formData.get("adminNotes")) professionalData.adminNotes = formData.get("adminNotes") as string
  if (formData.get("rejectionReason")) professionalData.rejectionReason = formData.get("rejectionReason") as string

  return updateProfessional(professionalId, professionalData)
}

/**
 * Update professional bank details
 */
export async function updateProfessionalBankDetails(
  professionalId: string,
  bankDetails: {
    bankName: string
    branchNumber: string
    accountNumber: string
  }
): Promise<AdminActionResult<ProfessionalData>> {
  const adminLogger = new AdminLogger("updateProfessionalBankDetails")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(professionalId, "מזהה מטפל")
    
    adminLogger.info("Updating professional bank details", { professionalId })

    // Validate bank details
    const validatedBankDetails = BankDetailsSchema.parse(bankDetails)

    const professional = await ProfessionalProfile.findById(professionalId)
    if (!professional) {
      adminLogger.warn("Professional not found for bank details update", { professionalId })
      return createErrorResult("מטפל לא נמצא")
    }

    professional.bankDetails = validatedBankDetails
    await professional.save()

    revalidateAdminPath("/dashboard/admin/professional-management")

    // Fetch updated professional
    const result = await getProfessionalById(professionalId)
    if (!result.success || !result.data) {
      return createErrorResult("שגיאה בשליפת נתוני המטפל המעודכן")
    }

    adminLogger.info("Successfully updated professional bank details", { professionalId })
    return createSuccessResult(result.data)
  } catch (error) {
    return handleAdminError(error, "updateProfessionalBankDetails")
  }
}

/**
 * Update professional treatments
 */
export async function updateProfessionalTreatments(
  professionalId: string,
  treatments: Array<{
    treatmentId: string
    durationId?: string
    professionalPrice: number
  }>
): Promise<AdminActionResult<ProfessionalData>> {
  const adminLogger = new AdminLogger("updateProfessionalTreatments")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(professionalId, "מזהה מטפל")
    
    adminLogger.info("Updating professional treatments", { professionalId, treatmentsCount: treatments.length })

    // Validate treatments
    const validatedTreatments = treatments.map(treatment => TreatmentPricingSchema.parse(treatment))

    const professional = await ProfessionalProfile.findById(professionalId)
    if (!professional) {
      adminLogger.warn("Professional not found for treatments update", { professionalId })
      return createErrorResult("מטפל לא נמצא")
    }

    // Validate that treatments exist
    const treatmentIds = [...new Set(validatedTreatments.map(t => t.treatmentId))]
    const existingTreatments = await Treatment.find({
      _id: { $in: treatmentIds },
      isActive: true
    })

    if (existingTreatments.length !== treatmentIds.length) {
      return createErrorResult("חלק מהטיפולים לא נמצאו או לא פעילים")
    }

    // Convert to proper format for MongoDB
    professional.treatments = validatedTreatments.map(t => ({
      treatmentId: new Types.ObjectId(t.treatmentId),
      durationId: t.durationId ? new Types.ObjectId(t.durationId) : undefined,
      professionalPrice: t.professionalPrice
    }))
    await professional.save()

    revalidateAdminPath("/dashboard/admin/professional-management")

    // Fetch updated professional
    const result = await getProfessionalById(professionalId)
    if (!result.success || !result.data) {
      return createErrorResult("שגיאה בשליפת נתוני המטפל המעודכן")
    }

    adminLogger.info("Successfully updated professional treatments", { professionalId })
    return createSuccessResult(result.data)
  } catch (error) {
    return handleAdminError(error, "updateProfessionalTreatments")
  }
}

/**
 * Update professional work areas
 */
export async function updateProfessionalWorkAreas(
  professionalId: string,
  workAreas: Array<{
    cityId: string
    maxDistanceKm: number
  }>
): Promise<AdminActionResult<ProfessionalData>> {
  const adminLogger = new AdminLogger("updateProfessionalWorkAreas")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(professionalId, "מזהה מטפל")
    
    adminLogger.info("Updating professional work areas", { professionalId, workAreasCount: workAreas.length })

    // Validate work areas
    const validatedWorkAreas = workAreas.map(workArea => WorkAreaSchema.parse(workArea))

    const professional = await ProfessionalProfile.findById(professionalId)
    if (!professional) {
      adminLogger.warn("Professional not found for work areas update", { professionalId })
      return createErrorResult("מטפל לא נמצא")
    }

    professional.workAreas = validatedWorkAreas
    await professional.save()

    revalidateAdminPath("/dashboard/admin/professional-management")

    // Fetch updated professional
    const result = await getProfessionalById(professionalId)
    if (!result.success || !result.data) {
      return createErrorResult("שגיאה בשליפת נתוני המטפל המעודכן")
    }

    adminLogger.info("Successfully updated professional work areas", { professionalId })
    return createSuccessResult(result.data)
  } catch (error) {
    return handleAdminError(error, "updateProfessionalWorkAreas")
  }
} 