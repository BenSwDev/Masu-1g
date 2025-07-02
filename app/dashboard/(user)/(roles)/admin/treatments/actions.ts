"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import Treatment, { type ITreatment, type ITreatmentDuration } from "@/lib/db/models/treatment"
import { logger } from "@/lib/logs/logger"
import { Types } from "mongoose"

// Types for treatment management
export interface TreatmentData {
  _id: string
  name: string
  description?: string
  category: string
  pricingType: "fixed" | "duration_based"
  fixedPrice?: number
  fixedProfessionalPrice?: number
  defaultDurationMinutes?: number
  durations: Array<{
    _id: string
    minutes: number
    price: number
    professionalPrice: number
    isActive: boolean
  }>
  isActive: boolean
  allowTherapistGenderSelection?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateTreatmentData {
  name: string
  description?: string
  category: string
  pricingType: "fixed" | "duration_based"
  fixedPrice?: number
  fixedProfessionalPrice?: number
  defaultDurationMinutes?: number
  durations?: Array<{
    minutes: number
    price: number
    professionalPrice: number
    isActive: boolean
  }>
  isActive?: boolean
  allowTherapistGenderSelection?: boolean
}

export interface UpdateTreatmentData {
  name?: string
  description?: string
  category?: string
  pricingType?: "fixed" | "duration_based"
  fixedPrice?: number
  fixedProfessionalPrice?: number
  defaultDurationMinutes?: number
  durations?: Array<{
    _id?: string
    minutes: number
    price: number
    professionalPrice: number
    isActive: boolean
  }>
  isActive?: boolean
  allowTherapistGenderSelection?: boolean
}

export interface TreatmentFilters {
  search?: string
  category?: string
  pricingType?: string
  isActive?: boolean
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

export interface GetTreatmentsResult {
  treatments: TreatmentData[]
  totalTreatments: number
  totalPages: number
  currentPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface ActionResult {
  success: boolean
  error?: string
  data?: any
}

export interface TreatmentStats {
  totalTreatments: number
  activeTreatments: number
  inactiveTreatments: number
  categoryStats: {
    massages: number
    facial_treatments: number
    other: number
  }
  pricingTypeStats: {
    fixed: number
    duration_based: number
  }
  averagePrice: number
  priceRange: {
    min: number
    max: number
  }
  recentlyAdded: number // Last 30 days
}

// Authentication helper
async function requireAdminAuth() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.roles?.includes("admin")) {
    throw new Error("Unauthorized: Admin access required")
  }
  return session
}

/**
 * Get all treatments with filtering and pagination
 */
export async function getAllTreatments(filters: TreatmentFilters = {}): Promise<GetTreatmentsResult> {
  try {
    await requireAdminAuth()
    await dbConnect()

    const {
      search = "",
      category = "",
      pricingType = "",
      isActive,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = filters

    // Build query
    const query: any = {}
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ]
    }
    
    if (category) {
      query.category = category
    }
    
    if (pricingType) {
      query.pricingType = pricingType
    }
    
    if (typeof isActive === "boolean") {
      query.isActive = isActive
    }

    // Build sort
    const sort: any = {}
    sort[sortBy] = sortOrder === "asc" ? 1 : -1

    // Execute queries
    const [treatments, totalTreatments] = await Promise.all([
      Treatment.find(query)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Treatment.countDocuments(query)
    ])

    // Transform data
    const transformedTreatments: TreatmentData[] = treatments.map(treatment => ({
      ...treatment,
      _id: treatment._id.toString(),
      durations: treatment.durations?.map(d => ({
        ...d,
        _id: d._id?.toString() || ""
      })) || []
    }))

    const totalPages = Math.ceil(totalTreatments / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    return {
      treatments: transformedTreatments,
      totalTreatments,
      totalPages,
      currentPage: page,
      hasNextPage,
      hasPrevPage
    }
  } catch (error) {
    console.error("Error getting treatments:", error)
    return {
      treatments: [],
      totalTreatments: 0,
      totalPages: 0,
      currentPage: 1,
      hasNextPage: false,
      hasPrevPage: false
    }
  }
}

/**
 * Get treatment by ID
 */
export async function getTreatmentById(treatmentId: string): Promise<ActionResult> {
  try {
    await requireAdminAuth()
    await dbConnect()

    if (!Types.ObjectId.isValid(treatmentId)) {
      return { success: false, error: "Invalid treatment ID" }
    }

    const treatment = await Treatment.findById(treatmentId).lean()
    
    if (!treatment) {
      return { success: false, error: "Treatment not found" }
    }

    return {
      success: true,
      data: {
        ...treatment,
        _id: treatment._id.toString(),
        durations: treatment.durations?.map(d => ({
          ...d,
          _id: d._id?.toString() || ""
        })) || []
      } as TreatmentData
    }
  } catch (error) {
    console.error("Error getting treatment:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to get treatment" }
  }
}

/**
 * Create new treatment
 */
export async function createTreatment(treatmentData: CreateTreatmentData): Promise<ActionResult> {
  try {
    await requireAdminAuth()
    await dbConnect()

    // Validate required fields
    if (!treatmentData.name || !treatmentData.category || !treatmentData.pricingType) {
      return { success: false, error: "Missing required fields" }
    }

    // Check if treatment name already exists
    const existingTreatment = await Treatment.findOne({ 
      name: { $regex: new RegExp(`^${treatmentData.name}$`, 'i') }
    })
    if (existingTreatment) {
      return { success: false, error: "טיפול עם שם זה כבר קיים במערכת" }
    }

    // Validate pricing data
    if (treatmentData.pricingType === "fixed") {
      if (!treatmentData.fixedPrice || treatmentData.fixedPrice <= 0) {
        return { success: false, error: "Fixed price must be greater than 0" }
      }
      if (!treatmentData.defaultDurationMinutes || treatmentData.defaultDurationMinutes <= 0) {
        return { success: false, error: "Default duration must be greater than 0" }
      }
    } else if (treatmentData.pricingType === "duration_based") {
      if (!treatmentData.durations || treatmentData.durations.length === 0) {
        return { success: false, error: "Duration-based treatments must have at least one duration option" }
      }
      for (const duration of treatmentData.durations) {
        if (duration.minutes <= 0 || duration.price <= 0) {
          return { success: false, error: "All duration options must have positive minutes and price" }
        }
      }
    }

    // Create treatment
    const treatment = new Treatment({
      ...treatmentData,
      isActive: treatmentData.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    await treatment.save()

    revalidatePath("/dashboard/admin/treatments")

         return {
       success: true,
       data: {
         ...treatment.toObject(),
         _id: (treatment._id as any).toString(),
         durations: treatment.durations?.map(d => ({
           ...d,
           _id: d._id?.toString() || ""
         })) || []
       }
     }
  } catch (error) {
    console.error("Error creating treatment:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to create treatment" }
  }
}

/**
 * Update treatment
 */
export async function updateTreatment(treatmentId: string, treatmentData: UpdateTreatmentData): Promise<ActionResult> {
  try {
    await requireAdminAuth()
    await dbConnect()

    if (!Types.ObjectId.isValid(treatmentId)) {
      return { success: false, error: "Invalid treatment ID" }
    }

    const treatment = await Treatment.findById(treatmentId)
    if (!treatment) {
      return { success: false, error: "Treatment not found" }
    }

    // Check if name is being changed and already exists
    if (treatmentData.name && treatmentData.name !== treatment.name) {
      const existingTreatment = await Treatment.findOne({ 
        name: { $regex: new RegExp(`^${treatmentData.name}$`, 'i') },
        _id: { $ne: treatmentId }
      })
      if (existingTreatment) {
        return { success: false, error: "טיפול עם שם זה כבר קיים במערכת" }
      }
    }

    // Validate pricing data if being updated
    if (treatmentData.pricingType === "fixed") {
      if (treatmentData.fixedPrice !== undefined && treatmentData.fixedPrice <= 0) {
        return { success: false, error: "Fixed price must be greater than 0" }
      }
      if (treatmentData.defaultDurationMinutes !== undefined && treatmentData.defaultDurationMinutes <= 0) {
        return { success: false, error: "Default duration must be greater than 0" }
      }
    } else if (treatmentData.pricingType === "duration_based") {
      if (treatmentData.durations && treatmentData.durations.length === 0) {
        return { success: false, error: "Duration-based treatments must have at least one duration option" }
      }
      if (treatmentData.durations) {
        for (const duration of treatmentData.durations) {
          if (duration.minutes <= 0 || duration.price <= 0) {
            return { success: false, error: "All duration options must have positive minutes and price" }
          }
        }
      }
    }

    // Update treatment
    const updatedTreatment = await Treatment.findByIdAndUpdate(
      treatmentId,
      {
        ...treatmentData,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).lean()

    revalidatePath("/dashboard/admin/treatments")

    return {
      success: true,
      data: {
        ...updatedTreatment,
        _id: updatedTreatment?._id.toString(),
        durations: updatedTreatment?.durations?.map(d => ({
          ...d,
          _id: d._id?.toString() || ""
        })) || []
      }
    }
  } catch (error) {
    console.error("Error updating treatment:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to update treatment" }
  }
}

/**
 * Delete treatment
 */
export async function deleteTreatment(treatmentId: string): Promise<ActionResult> {
  try {
    await requireAdminAuth()
    await dbConnect()

    if (!Types.ObjectId.isValid(treatmentId)) {
      return { success: false, error: "Invalid treatment ID" }
    }

    const treatment = await Treatment.findById(treatmentId)
    if (!treatment) {
      return { success: false, error: "Treatment not found" }
    }

    // Check if treatment is used in any active bookings or subscriptions
    // This would require checking related collections
    // For now, we'll just delete it

    await Treatment.findByIdAndDelete(treatmentId)

    revalidatePath("/dashboard/admin/treatments")

    return { success: true }
  } catch (error) {
    console.error("Error deleting treatment:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete treatment" }
  }
}

/**
 * Toggle treatment status
 */
export async function toggleTreatmentStatus(treatmentId: string): Promise<ActionResult> {
  try {
    await requireAdminAuth()
    await dbConnect()

    if (!Types.ObjectId.isValid(treatmentId)) {
      return { success: false, error: "Invalid treatment ID" }
    }

    const treatment = await Treatment.findById(treatmentId)
    if (!treatment) {
      return { success: false, error: "Treatment not found" }
    }

    const newStatus = !treatment.isActive
    
    await Treatment.findByIdAndUpdate(treatmentId, { 
      isActive: newStatus,
      updatedAt: new Date()
    })

    revalidatePath("/dashboard/admin/treatments")

    return { 
      success: true, 
      data: { 
        isActive: newStatus,
        message: newStatus ? "הטיפול הופעל בהצלחה" : "הטיפול בוטל בהצלחה"
      } 
    }
  } catch (error) {
    console.error("Error toggling treatment status:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to toggle treatment status" }
  }
}

/**
 * Duplicate treatment
 */
export async function duplicateTreatment(treatmentId: string): Promise<ActionResult> {
  try {
    await requireAdminAuth()
    await dbConnect()

    if (!Types.ObjectId.isValid(treatmentId)) {
      return { success: false, error: "Invalid treatment ID" }
    }

    const originalTreatment = await Treatment.findById(treatmentId).lean()
    if (!originalTreatment) {
      return { success: false, error: "Treatment not found" }
    }

    // Create new treatment with "Copy" suffix
    const newName = `${originalTreatment.name} - עותק`
    
    // Check if name already exists and add number if needed
    let finalName = newName
    let counter = 1
    while (await Treatment.findOne({ name: { $regex: new RegExp(`^${finalName}$`, 'i') } })) {
      finalName = `${newName} ${counter}`
      counter++
    }

    const duplicatedTreatment = new Treatment({
      ...originalTreatment,
      _id: undefined,
      name: finalName,
      isActive: false, // Start as inactive
      createdAt: new Date(),
      updatedAt: new Date()
    })

    await duplicatedTreatment.save()

    revalidatePath("/dashboard/admin/treatments")

         return {
       success: true,
       data: {
         ...duplicatedTreatment.toObject(),
         _id: (duplicatedTreatment._id as any).toString(),
         durations: duplicatedTreatment.durations?.map(d => ({
           ...d,
           _id: d._id?.toString() || ""
         })) || []
       }
     }
  } catch (error) {
    console.error("Error duplicating treatment:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to duplicate treatment" }
  }
}

/**
 * Get treatment statistics
 */
export async function getTreatmentStats(): Promise<ActionResult> {
  try {
    await requireAdminAuth()
    await dbConnect()

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [
      totalTreatments,
      activeTreatments,
      recentTreatments,
      categoryStats,
      pricingTypeStats,
      priceStats
    ] = await Promise.all([
      Treatment.countDocuments({}),
      Treatment.countDocuments({ isActive: true }),
      Treatment.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Treatment.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } }
      ]),
      Treatment.aggregate([
        { $group: { _id: "$pricingType", count: { $sum: 1 } } }
      ]),
      Treatment.aggregate([
        {
          $group: {
            _id: null,
            avgFixed: { $avg: "$fixedPrice" },
            minFixed: { $min: "$fixedPrice" },
            maxFixed: { $max: "$fixedPrice" },
            avgDuration: { $avg: "$durations.price" },
            minDuration: { $min: "$durations.price" },
            maxDuration: { $max: "$durations.price" }
          }
        }
      ])
    ])

    // Process category stats
    const categoryStatsMap = {
      massages: 0,
      facial_treatments: 0,
      other: 0
    }
    categoryStats.forEach((stat: any) => {
      if (stat._id in categoryStatsMap) {
        categoryStatsMap[stat._id as keyof typeof categoryStatsMap] = stat.count
      } else {
        categoryStatsMap.other += stat.count
      }
    })

    // Process pricing type stats
    const pricingTypeStatsMap = {
      fixed: 0,
      duration_based: 0
    }
    pricingTypeStats.forEach((stat: any) => {
      if (stat._id in pricingTypeStatsMap) {
        pricingTypeStatsMap[stat._id as keyof typeof pricingTypeStatsMap] = stat.count
      }
    })

    // Process price stats
    const priceStatsData = priceStats[0] || {}
    const averagePrice = Math.round(((priceStatsData.avgFixed || 0) + (priceStatsData.avgDuration || 0)) / 2)
    const minPrice = Math.min(priceStatsData.minFixed || Infinity, priceStatsData.minDuration || Infinity)
    const maxPrice = Math.max(priceStatsData.maxFixed || 0, priceStatsData.maxDuration || 0)

    const stats: TreatmentStats = {
      totalTreatments,
      activeTreatments,
      inactiveTreatments: totalTreatments - activeTreatments,
      categoryStats: categoryStatsMap,
      pricingTypeStats: pricingTypeStatsMap,
      averagePrice: isFinite(averagePrice) ? averagePrice : 0,
      priceRange: {
        min: isFinite(minPrice) ? minPrice : 0,
        max: isFinite(maxPrice) ? maxPrice : 0
      },
      recentlyAdded: recentTreatments
    }

    return { success: true, data: stats }
  } catch (error) {
    console.error("Error getting treatment stats:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to get treatment stats" }
  }
} 