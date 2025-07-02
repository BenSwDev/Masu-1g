"use server"

import { revalidatePath } from "next/cache"
import PartnerProfile, { type IPartnerProfile } from "../../../../../../lib/db/models/partner-profile"
import type { IUser } from "../../../../../../lib/db/models/user"
import { Types } from "mongoose"
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
import {
  createUser,
  updateUser,
  deleteUser,
  type CreateUserData,
  type UpdateUserData
} from "../users/actions"

// Types
export interface PartnerData {
  _id: string
  userId: string
  businessNumber?: string
  contactName?: string
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
  user?: {
    _id: string
    name: string
    email?: string
    phone: string
    gender: "male" | "female" | "other"
    roles: string[]
  }
}

export interface PartnerFilters extends AdminActionOptions {
  isActive?: boolean
  hasBusinessNumber?: boolean
}

export interface CreatePartnerData {
  name: string
  email?: string
  phone: string
  password?: string
  gender: "male" | "female" | "other"
  businessNumber?: string
  contactName?: string
  isActive?: boolean
}

export interface UpdatePartnerData {
  name?: string
  email?: string
  phone?: string
  gender?: "male" | "female" | "other"
  businessNumber?: string
  contactName?: string
  isActive?: boolean
}

export interface PartnerStatistics {
  totalPartners: number
  activePartners: number
  inactivePartners: number
  partnersWithBusinessNumber: number
  newPartnersThisMonth: number
}

/**
 * Gets all partners with filtering, sorting, and pagination
 */
export async function getPartners(
  filters: PartnerFilters = {}
): Promise<AdminActionResult<PaginatedResult<PartnerData>>> {
  const adminLogger = new AdminLogger("getPartners")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    const { page, limit, skip } = validatePaginationOptions(filters)
    const {
      isActive,
      hasBusinessNumber,
      search,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = filters

    adminLogger.info("Fetching partners", { filters, page, limit })

    // Build aggregation pipeline
    const pipeline: any[] = [
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      { $match: { "user.roles": "partner" } }
    ]

    // Build match conditions
    const matchConditions: any = {}

    // Active status filter
    if (typeof isActive === "boolean") {
      matchConditions.isActive = isActive
    }

    // Business number filter
    if (typeof hasBusinessNumber === "boolean") {
      if (hasBusinessNumber) {
        matchConditions.businessNumber = { $exists: true, $ne: null, $ne: "" }
      } else {
        matchConditions.$or = [
          { businessNumber: { $exists: false } },
          { businessNumber: null },
          { businessNumber: "" }
        ]
      }
    }

    // Search filter
    if (search) {
      const searchRegex = { $regex: search, $options: "i" }
      matchConditions.$or = [
        { "user.name": searchRegex },
        { "user.email": searchRegex },
        { "user.phone": searchRegex },
        { businessNumber: searchRegex },
        { contactName: searchRegex }
      ]
    }

    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions })
    }

    // Get total count
    const countPipeline = [...pipeline, { $count: "total" }]
    const countResult = await PartnerProfile.aggregate(countPipeline)
    const totalPartners = countResult[0]?.total || 0

    adminLogger.info("Found partners matching query", { totalPartners })

    // Add sorting, pagination
    const sortObj: any = {}
    if (sortBy === "name") {
      sortObj["user.name"] = sortOrder === "desc" ? -1 : 1
    } else if (sortBy === "email") {
      sortObj["user.email"] = sortOrder === "desc" ? -1 : 1
    } else {
      sortObj[sortBy] = sortOrder === "desc" ? -1 : 1
    }

    pipeline.push(
      { $sort: sortObj },
      { $skip: skip },
      { $limit: limit }
    )

    const partners = await PartnerProfile.aggregate(pipeline)

    // Process partners
    const partnersData: PartnerData[] = partners.map((partner: any) => {
      const serialized = serializeMongoObject<any>(partner)
      return {
        _id: serialized._id.toString(),
        userId: serialized.userId.toString(),
        businessNumber: serialized.businessNumber,
        contactName: serialized.contactName,
        isActive: serialized.isActive,
        createdAt: serialized.createdAt,
        updatedAt: serialized.updatedAt,
        user: serialized.user ? {
          _id: serialized.user._id.toString(),
          name: serialized.user.name,
          email: serialized.user.email,
          phone: serialized.user.phone,
          gender: serialized.user.gender,
          roles: serialized.user.roles
        } : undefined
      }
    })

    adminLogger.info("Successfully fetched partners", { count: partnersData.length })
    return createPaginatedResult(partnersData, totalPartners, page, limit)
  } catch (error) {
    return handleAdminError(error, "getPartners")
  }
}

/**
 * Get partner by ID
 */
export async function getPartnerById(partnerId: string): Promise<AdminActionResult<PartnerData>> {
  const adminLogger = new AdminLogger("getPartnerById")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(partnerId, "מזהה שותף")
    
    adminLogger.info("Fetching partner by ID", { partnerId })

    const partner = await PartnerProfile.findById(partnerId)
      .populate("userId", "name email phone roles gender")
      .lean()

    if (!partner) {
      adminLogger.warn("Partner not found", { partnerId })
      return createErrorResult("שותף לא נמצא")
    }

    const user = partner.userId as any
    if (!user?.roles?.includes("partner")) {
      adminLogger.warn("User is not a partner", { partnerId, userId: user?._id })
      return createErrorResult("המשתמש אינו שותף")
    }

    const serialized = serializeMongoObject<any>(partner)
    const partnerData: PartnerData = {
      _id: serialized._id.toString(),
      userId: serialized.userId._id.toString(),
      businessNumber: serialized.businessNumber,
      contactName: serialized.contactName,
      isActive: serialized.isActive,
      createdAt: serialized.createdAt,
      updatedAt: serialized.updatedAt,
      user: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        roles: user.roles
      }
    }

    adminLogger.info("Successfully fetched partner", { partnerId })
    return createSuccessResult(partnerData)
  } catch (error) {
    return handleAdminError(error, "getPartnerById")
  }
}

/**
 * Create new partner
 */
export async function createPartner(partnerData: CreatePartnerData): Promise<AdminActionResult<PartnerData>> {
  const adminLogger = new AdminLogger("createPartner")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    adminLogger.info("Creating new partner", { name: partnerData.name })

    // Validate required fields
    if (!partnerData.name?.trim()) {
      return createErrorResult("שם נדרש")
    }
    if (!partnerData.phone?.trim()) {
      return createErrorResult("טלפון נדרש")
    }

    // Create user first
    const userData: CreateUserData = {
      name: partnerData.name.trim(),
      email: partnerData.email?.trim(),
      phone: partnerData.phone.trim(),
      password: partnerData.password || "User123!",
      gender: partnerData.gender,
      roles: ["partner"]
    }

    const userResult = await createUser(userData)
    if (!userResult.success || !userResult.data) {
      adminLogger.warn("Failed to create user for partner", { error: userResult.error })
      return createErrorResult(userResult.error || "יצירת משתמש נכשלה")
    }

    // Create partner profile
    const profile = new PartnerProfile({
      userId: new Types.ObjectId(userResult.data._id),
      businessNumber: partnerData.businessNumber?.trim(),
      contactName: partnerData.contactName?.trim(),
      isActive: partnerData.isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    await profile.save()
    revalidateAdminPath("/dashboard/admin/partners")

    // Get created partner with populated user
    const createdPartner = await PartnerProfile.findById(profile._id)
      .populate("userId", "name email phone roles gender")
      .lean()

    const user = createdPartner!.userId as any
    const serialized = serializeMongoObject<any>(createdPartner!)
    const result: PartnerData = {
      _id: serialized._id.toString(),
      userId: user._id.toString(),
      businessNumber: serialized.businessNumber,
      contactName: serialized.contactName,
      isActive: serialized.isActive,
      createdAt: serialized.createdAt,
      updatedAt: serialized.updatedAt,
      user: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        roles: user.roles
      }
    }

    adminLogger.info("Successfully created partner", { partnerId: result._id })
    return createSuccessResult(result)
  } catch (error) {
    return handleAdminError(error, "createPartner")
  }
}

/**
 * Update partner
 */
export async function updatePartner(
  partnerId: string,
  partnerData: UpdatePartnerData
): Promise<AdminActionResult<PartnerData>> {
  const adminLogger = new AdminLogger("updatePartner")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(partnerId, "מזהה שותף")
    
    adminLogger.info("Updating partner", { partnerId, updates: Object.keys(partnerData) })

    const partner = await PartnerProfile.findById(partnerId)
    if (!partner) {
      adminLogger.warn("Partner not found for update", { partnerId })
      return createErrorResult("שותף לא נמצא")
    }

    // Update user data if provided
    const userUpdates: UpdateUserData = {}
    if (partnerData.name) userUpdates.name = partnerData.name.trim()
    if (partnerData.email) userUpdates.email = partnerData.email.trim()
    if (partnerData.phone) userUpdates.phone = partnerData.phone.trim()
    if (partnerData.gender) userUpdates.gender = partnerData.gender
    userUpdates.roles = ["partner"] // Ensure partner role

    if (Object.keys(userUpdates).length > 0) {
      const userResult = await updateUser(partner.userId.toString(), userUpdates)
      if (!userResult.success) {
        adminLogger.warn("Failed to update user for partner", { 
          partnerId, 
          userId: partner.userId.toString(), 
          error: userResult.error 
        })
        return createErrorResult(userResult.error || "עדכון משתמש נכשל")
      }
    }

    // Update partner profile
    if (partnerData.businessNumber !== undefined) {
      partner.businessNumber = partnerData.businessNumber?.trim()
    }
    if (partnerData.contactName !== undefined) {
      partner.contactName = partnerData.contactName?.trim()
    }
    if (typeof partnerData.isActive === "boolean") {
      partner.isActive = partnerData.isActive
    }

    partner.updatedAt = new Date()
    await partner.save()
    revalidateAdminPath("/dashboard/admin/partners")

    // Get updated partner with populated user
    const updatedPartner = await PartnerProfile.findById(partnerId)
      .populate("userId", "name email phone roles gender")
      .lean()

    const user = updatedPartner!.userId as any
    const serialized = serializeMongoObject<any>(updatedPartner!)
    const result: PartnerData = {
      _id: serialized._id.toString(),
      userId: user._id.toString(),
      businessNumber: serialized.businessNumber,
      contactName: serialized.contactName,
      isActive: serialized.isActive,
      createdAt: serialized.createdAt,
      updatedAt: serialized.updatedAt,
      user: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        roles: user.roles
      }
    }

    adminLogger.info("Successfully updated partner", { partnerId })
    return createSuccessResult(result)
  } catch (error) {
    return handleAdminError(error, "updatePartner")
  }
}

/**
 * Delete partner
 */
export async function deletePartner(partnerId: string): Promise<AdminActionResult<boolean>> {
  const adminLogger = new AdminLogger("deletePartner")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(partnerId, "מזהה שותף")
    
    adminLogger.info("Deleting partner", { partnerId })

    const partner = await PartnerProfile.findById(partnerId)
    if (!partner) {
      adminLogger.warn("Partner not found for deletion", { partnerId })
      return createErrorResult("שותף לא נמצא")
    }

    const userId = partner.userId.toString()

    // Check if partner has active business relationships
    // This is where you'd add business logic checks

    // Delete partner profile first
    await PartnerProfile.findByIdAndDelete(partnerId)

    // Delete associated user
    const userResult = await deleteUser(userId)
    if (!userResult.success) {
      adminLogger.warn("Failed to delete user for partner", { 
        partnerId, 
        userId, 
        error: userResult.error 
      })
      // Partner profile is already deleted, so we continue
    }

    revalidateAdminPath("/dashboard/admin/partners")

    adminLogger.info("Successfully deleted partner", { partnerId })
    return createSuccessResult(true)
  } catch (error) {
    return handleAdminError(error, "deletePartner")
  }
}

/**
 * Toggle partner status
 */
export async function togglePartnerStatus(partnerId: string): Promise<AdminActionResult<PartnerData>> {
  const adminLogger = new AdminLogger("togglePartnerStatus")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(partnerId, "מזהה שותף")
    
    adminLogger.info("Toggling partner status", { partnerId })

    const partner = await PartnerProfile.findById(partnerId)
    if (!partner) {
      adminLogger.warn("Partner not found for status toggle", { partnerId })
      return createErrorResult("שותף לא נמצא")
    }

    partner.isActive = !partner.isActive
    partner.updatedAt = new Date()
    await partner.save()

    revalidateAdminPath("/dashboard/admin/partners")

    // Get updated partner with populated user
    const updatedPartner = await PartnerProfile.findById(partnerId)
      .populate("userId", "name email phone roles gender")
      .lean()

    const user = updatedPartner!.userId as any
    const serialized = serializeMongoObject<any>(updatedPartner!)
    const result: PartnerData = {
      _id: serialized._id.toString(),
      userId: user._id.toString(),
      businessNumber: serialized.businessNumber,
      contactName: serialized.contactName,
      isActive: serialized.isActive,
      createdAt: serialized.createdAt,
      updatedAt: serialized.updatedAt,
      user: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        roles: user.roles
      }
    }

    adminLogger.info("Successfully toggled partner status", { partnerId, newStatus: partner.isActive })
    return createSuccessResult(result)
  } catch (error) {
    return handleAdminError(error, "togglePartnerStatus")
  }
}

/**
 * Get partner statistics
 */
export async function getPartnerStatistics(): Promise<AdminActionResult<PartnerStatistics>> {
  const adminLogger = new AdminLogger("getPartnerStatistics")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    adminLogger.info("Fetching partner statistics")

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Run all queries in parallel for better performance
    const [
      totalPartners,
      activePartners,
      inactivePartners,
      partnersWithBusinessNumber,
      newPartnersThisMonth
    ] = await Promise.all([
      PartnerProfile.countDocuments({}),
      PartnerProfile.countDocuments({ isActive: true }),
      PartnerProfile.countDocuments({ isActive: false }),
      PartnerProfile.countDocuments({ 
        businessNumber: { $exists: true, $ne: null, $ne: "" } 
      }),
      PartnerProfile.countDocuments({ createdAt: { $gte: startOfMonth } })
    ])

    const statistics: PartnerStatistics = {
      totalPartners,
      activePartners,
      inactivePartners,
      partnersWithBusinessNumber,
      newPartnersThisMonth
    }

    adminLogger.info("Successfully fetched partner statistics", statistics)
    return createSuccessResult(statistics)
  } catch (error) {
    return handleAdminError(error, "getPartnerStatistics")
  }
}

/**
 * Legacy form-based create partner (for backward compatibility)
 */
export async function createPartnerFromForm(formData: FormData): Promise<AdminActionResult<PartnerData>> {
  const partnerData: CreatePartnerData = {
    name: formData.get("name")?.toString()?.trim() || "",
    email: formData.get("email")?.toString()?.trim(),
    phone: formData.get("phone")?.toString()?.trim() || "",
    password: formData.get("password")?.toString() || "User123!",
    gender: (formData.get("gender") as "male" | "female" | "other") || "male",
    businessNumber: formData.get("businessNumber")?.toString()?.trim(),
    contactName: formData.get("contactName")?.toString()?.trim(),
    isActive: formData.get("isActive") !== "false"
  }

  return createPartner(partnerData)
}

/**
 * Legacy form-based update partner (for backward compatibility)
 */
export async function updatePartnerFromForm(
  partnerId: string, 
  formData: FormData
): Promise<AdminActionResult<PartnerData>> {
  const partnerData: UpdatePartnerData = {
    name: formData.get("name")?.toString()?.trim(),
    email: formData.get("email")?.toString()?.trim(),
    phone: formData.get("phone")?.toString()?.trim(),
    gender: formData.get("gender") as "male" | "female" | "other",
    businessNumber: formData.get("businessNumber")?.toString()?.trim(),
    contactName: formData.get("contactName")?.toString()?.trim(),
    isActive: formData.get("isActive") !== "false"
  }

  return updatePartner(partnerId, partnerData)
}

// Legacy function name alias for backward compatibility
export const removePartner = deletePartner