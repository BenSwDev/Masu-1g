"use server"

import { revalidatePath } from "next/cache"
import Treatment, { type ITreatment, type ITreatmentDuration } from "../../../../../../lib/db/models/treatment"
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

// Types
export interface TreatmentData {
  _id: string
  name: string
  description?: string
  category: "massages" | "facial_treatments"
  isActive: boolean
  pricingType: "fixed" | "duration_based"
  fixedPrice?: number
  fixedProfessionalPrice?: number
  defaultDurationMinutes?: number
  durations?: Array<{
    _id: string
    minutes: number
    price: number
    professionalPrice: number
    isActive: boolean
  }>
  allowTherapistGenderSelection?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface TreatmentFilters extends AdminActionOptions {
  category?: "massages" | "facial_treatments"
  isActive?: boolean
  pricingType?: "fixed" | "duration_based"
  minPrice?: number
  maxPrice?: number
}

export interface CreateTreatmentData {
  name: string
  description?: string
  category: "massages" | "facial_treatments"
  isActive?: boolean
  pricingType: "fixed" | "duration_based"
  fixedPrice?: number
  fixedProfessionalPrice?: number
  defaultDurationMinutes?: number
  durations?: Array<{
    minutes: number
    price: number
    professionalPrice: number
    isActive?: boolean
  }>
  allowTherapistGenderSelection?: boolean
}

export interface UpdateTreatmentData {
  name?: string
  description?: string
  category?: "massages" | "facial_treatments"
  isActive?: boolean
  pricingType?: "fixed" | "duration_based"
  fixedPrice?: number
  fixedProfessionalPrice?: number
  defaultDurationMinutes?: number
  durations?: Array<{
    _id?: string
    minutes: number
    price: number
    professionalPrice: number
    isActive?: boolean
  }>
  allowTherapistGenderSelection?: boolean
}

export interface TreatmentStatistics {
  totalTreatments: number
  activeTreatments: number
  inactiveTreatments: number
  massageTreatments: number
  facialTreatments: number
  fixedPricingTreatments: number
  durationBasedTreatments: number
  averageFixedPrice: number
  newTreatmentsThisMonth: number
}

export interface TreatmentCategory {
  name: string
  count: number
}

/**
 * Gets all treatments with filtering, sorting, and pagination
 */
export async function getTreatments(
  filters: TreatmentFilters = {}
): Promise<AdminActionResult<PaginatedResult<TreatmentData>>> {
  const adminLogger = new AdminLogger("getTreatments")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    const { page, limit, skip } = validatePaginationOptions(filters)
    const {
      category,
      isActive,
      pricingType,
      minPrice,
      maxPrice,
      search,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = filters

    adminLogger.info("Fetching treatments", { filters, page, limit })

    // Build query
    const query: Record<string, any> = {}

    // Search filter
    if (search) {
      const searchQuery = buildSearchQuery(search, ["name", "description", "category"])
      Object.assign(query, searchQuery)
    }

    // Category filter
    if (category) {
      query.category = category
    }

    // Active status filter
    if (typeof isActive === "boolean") {
      query.isActive = isActive
    }

    // Pricing type filter
    if (pricingType) {
      query.pricingType = pricingType
    }

    // Price range filters
    if (minPrice !== undefined || maxPrice !== undefined) {
      query.$or = [
        // For fixed pricing
        {},
        // For duration-based pricing
        { "durations.price": {} }
      ]
      
      if (minPrice !== undefined) {
        query.$or[0].fixedPrice = { $gte: minPrice }
        query.$or[1]["durations.price"].$gte = minPrice
      }
      if (maxPrice !== undefined) {
        query.$or[0].fixedPrice = { ...query.$or[0].fixedPrice, $lte: maxPrice }
        query.$or[1]["durations.price"] = { ...query.$or[1]["durations.price"], $lte: maxPrice }
      }
    }

    // Get total count
    const totalTreatments = await Treatment.countDocuments(query)

    adminLogger.info("Found treatments matching query", { totalTreatments, query })

    // Get treatments with pagination and sorting
    const sortQuery = buildSortQuery(sortBy, sortOrder)
    const treatments = await Treatment.find(query)
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .lean()

    // Process treatments
    const treatmentsData: TreatmentData[] = treatments.map((treatment: any) => {
      const serialized = serializeMongoObject<any>(treatment)
      return {
        _id: serialized._id.toString(),
        name: serialized.name,
        description: serialized.description,
        category: serialized.category,
        isActive: serialized.isActive,
        pricingType: serialized.pricingType,
        fixedPrice: serialized.fixedPrice,
        fixedProfessionalPrice: serialized.fixedProfessionalPrice,
        defaultDurationMinutes: serialized.defaultDurationMinutes,
        durations: serialized.durations?.map((d: any) => ({
          _id: d._id?.toString() || new Types.ObjectId().toString(),
          minutes: d.minutes,
          price: d.price,
          professionalPrice: d.professionalPrice,
          isActive: d.isActive
        })),
        allowTherapistGenderSelection: serialized.allowTherapistGenderSelection,
        createdAt: serialized.createdAt,
        updatedAt: serialized.updatedAt
      }
    })

    adminLogger.info("Successfully fetched treatments", { count: treatmentsData.length })
    return createPaginatedResult(treatmentsData, totalTreatments, page, limit)
  } catch (error) {
    return handleAdminError(error, "getTreatments")
  }
}

/**
 * Get treatment by ID
 */
export async function getTreatmentById(treatmentId: string): Promise<AdminActionResult<TreatmentData>> {
  const adminLogger = new AdminLogger("getTreatmentById")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(treatmentId, "מזהה טיפול")
    
    adminLogger.info("Fetching treatment by ID", { treatmentId })

    const treatment = await Treatment.findById(treatmentId).lean()

    if (!treatment) {
      adminLogger.warn("Treatment not found", { treatmentId })
      return createErrorResult("טיפול לא נמצא")
    }

    const serialized = serializeMongoObject<any>(treatment)
    const treatmentData: TreatmentData = {
      _id: serialized._id.toString(),
      name: serialized.name,
      description: serialized.description,
      category: serialized.category,
      isActive: serialized.isActive,
      pricingType: serialized.pricingType,
      fixedPrice: serialized.fixedPrice,
      fixedProfessionalPrice: serialized.fixedProfessionalPrice,
      defaultDurationMinutes: serialized.defaultDurationMinutes,
      durations: serialized.durations?.map((d: any) => ({
        _id: d._id?.toString() || new Types.ObjectId().toString(),
        minutes: d.minutes,
        price: d.price,
        professionalPrice: d.professionalPrice,
        isActive: d.isActive
      })),
      allowTherapistGenderSelection: serialized.allowTherapistGenderSelection,
      createdAt: serialized.createdAt,
      updatedAt: serialized.updatedAt
    }

    adminLogger.info("Successfully fetched treatment", { treatmentId })
    return createSuccessResult(treatmentData)
  } catch (error) {
    return handleAdminError(error, "getTreatmentById")
  }
}

/**
 * Create new treatment
 */
export async function createTreatment(treatmentData: CreateTreatmentData): Promise<AdminActionResult<TreatmentData>> {
  const adminLogger = new AdminLogger("createTreatment")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    adminLogger.info("Creating new treatment", { name: treatmentData.name })

    // Validate required fields
    if (!treatmentData.name?.trim()) {
      return createErrorResult("שם הטיפול נדרש")
    }
    if (!treatmentData.category) {
      return createErrorResult("קטגוריה נדרשת")
    }
    if (!treatmentData.pricingType) {
      return createErrorResult("סוג תמחור נדרש")
    }

    // Validate based on pricing type
    if (treatmentData.pricingType === "fixed") {
      if (!treatmentData.fixedPrice || treatmentData.fixedPrice <= 0) {
        return createErrorResult("מחיר קבוע נדרש ויחייב להיות חיובי")
      }
      if (!treatmentData.fixedProfessionalPrice || treatmentData.fixedProfessionalPrice <= 0) {
        return createErrorResult("מחיר מטפל נדרש ויחייב להיות חיובי")
      }
    } else if (treatmentData.pricingType === "duration_based") {
      if (!treatmentData.durations || treatmentData.durations.length === 0) {
        return createErrorResult("לפחות משך זמן אחד נדרש עבור תמחור לפי זמן")
      }
      
      // Validate durations
      for (const duration of treatmentData.durations) {
        if (!duration.minutes || duration.minutes <= 0) {
          return createErrorResult("משך זמן חייב להיות חיובי")
        }
        if (!duration.price || duration.price <= 0) {
          return createErrorResult("מחיר חייב להיות חיובי")
        }
        if (!duration.professionalPrice || duration.professionalPrice <= 0) {
          return createErrorResult("מחיר מטפל חייב להיות חיובי")
        }
      }
    }

    // Check if treatment name already exists
    const existingTreatment = await Treatment.findOne({ 
      name: { $regex: new RegExp(`^${treatmentData.name.trim()}$`, "i") }
    })

    if (existingTreatment) {
      adminLogger.warn("Treatment name already exists", { name: treatmentData.name })
      return createErrorResult("טיפול עם שם זה כבר קיים")
    }

    // Create treatment
    const treatment = new Treatment({
      name: treatmentData.name.trim(),
      description: treatmentData.description?.trim(),
      category: treatmentData.category,
      isActive: treatmentData.isActive !== false,
      pricingType: treatmentData.pricingType,
      fixedPrice: treatmentData.fixedPrice,
      fixedProfessionalPrice: treatmentData.fixedProfessionalPrice,
      defaultDurationMinutes: treatmentData.defaultDurationMinutes,
      durations: treatmentData.durations?.map(d => ({
        _id: new Types.ObjectId(),
        minutes: d.minutes,
        price: d.price,
        professionalPrice: d.professionalPrice,
        isActive: d.isActive !== false
      })),
      allowTherapistGenderSelection: treatmentData.allowTherapistGenderSelection || false
    })

    await treatment.save()
    revalidateAdminPath("/dashboard/admin/treatments")
    revalidateAdminPath("/our-treatments")

    const serialized = serializeMongoObject<any>(treatment.toObject())
    const result: TreatmentData = {
      _id: serialized._id.toString(),
      name: serialized.name,
      description: serialized.description,
      category: serialized.category,
      isActive: serialized.isActive,
      pricingType: serialized.pricingType,
      fixedPrice: serialized.fixedPrice,
      fixedProfessionalPrice: serialized.fixedProfessionalPrice,
      defaultDurationMinutes: serialized.defaultDurationMinutes,
      durations: serialized.durations?.map((d: any) => ({
        _id: d._id.toString(),
        minutes: d.minutes,
        price: d.price,
        professionalPrice: d.professionalPrice,
        isActive: d.isActive
      })),
      allowTherapistGenderSelection: serialized.allowTherapistGenderSelection,
      createdAt: serialized.createdAt,
      updatedAt: serialized.updatedAt
    }

    adminLogger.info("Successfully created treatment", { treatmentId: result._id })
    return createSuccessResult(result)
  } catch (error) {
    return handleAdminError(error, "createTreatment")
  }
}

/**
 * Update treatment
 */
export async function updateTreatment(
  treatmentId: string,
  treatmentData: UpdateTreatmentData
): Promise<AdminActionResult<TreatmentData>> {
  const adminLogger = new AdminLogger("updateTreatment")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(treatmentId, "מזהה טיפול")
    
    adminLogger.info("Updating treatment", { treatmentId, updates: Object.keys(treatmentData) })

    const treatment = await Treatment.findById(treatmentId)
    if (!treatment) {
      adminLogger.warn("Treatment not found for update", { treatmentId })
      return createErrorResult("טיפול לא נמצא")
    }

    // Check if name is being changed and already exists
    if (treatmentData.name && treatmentData.name !== treatment.name) {
      const existingTreatment = await Treatment.findOne({ 
        name: { $regex: new RegExp(`^${treatmentData.name.trim()}$`, "i") },
        _id: { $ne: treatmentId }
      })
      if (existingTreatment) {
        adminLogger.warn("Treatment name already exists for another treatment", { name: treatmentData.name })
        return createErrorResult("שם טיפול זה כבר קיים במערכת")
      }
    }

    // Validate based on pricing type changes
    const newPricingType = treatmentData.pricingType || treatment.pricingType
    
    if (newPricingType === "fixed") {
      const newFixedPrice = treatmentData.fixedPrice !== undefined ? treatmentData.fixedPrice : treatment.fixedPrice
      const newFixedProfessionalPrice = treatmentData.fixedProfessionalPrice !== undefined ? treatmentData.fixedProfessionalPrice : treatment.fixedProfessionalPrice
      
      if (!newFixedPrice || newFixedPrice <= 0) {
        return createErrorResult("מחיר קבוע נדרש ויחייב להיות חיובי")
      }
      if (!newFixedProfessionalPrice || newFixedProfessionalPrice <= 0) {
        return createErrorResult("מחיר מטפל נדרש ויחייב להיות חיובי")
      }
    } else if (newPricingType === "duration_based") {
      const newDurations = treatmentData.durations || treatment.durations
      
      if (!newDurations || newDurations.length === 0) {
        return createErrorResult("לפחות משך זמן אחד נדרש עבור תמחור לפי זמן")
      }
      
      // Validate durations if provided
      if (treatmentData.durations) {
        for (const duration of treatmentData.durations) {
          if (!duration.minutes || duration.minutes <= 0) {
            return createErrorResult("משך זמן חייב להיות חיובי")
          }
          if (!duration.price || duration.price <= 0) {
            return createErrorResult("מחיר חייב להיות חיובי")
          }
          if (!duration.professionalPrice || duration.professionalPrice <= 0) {
            return createErrorResult("מחיר מטפל חייב להיות חיובי")
          }
        }
      }
    }

    // Update treatment fields
    if (treatmentData.name) {
      treatment.name = treatmentData.name.trim()
    }
    if (treatmentData.description !== undefined) {
      treatment.description = treatmentData.description?.trim()
    }
    if (treatmentData.category) {
      treatment.category = treatmentData.category
    }
    if (typeof treatmentData.isActive === "boolean") {
      treatment.isActive = treatmentData.isActive
    }
    if (treatmentData.pricingType) {
      treatment.pricingType = treatmentData.pricingType
    }
    if (treatmentData.fixedPrice !== undefined) {
      treatment.fixedPrice = treatmentData.fixedPrice
    }
    if (treatmentData.fixedProfessionalPrice !== undefined) {
      treatment.fixedProfessionalPrice = treatmentData.fixedProfessionalPrice
    }
    if (treatmentData.defaultDurationMinutes !== undefined) {
      treatment.defaultDurationMinutes = treatmentData.defaultDurationMinutes
    }
    if (treatmentData.durations) {
      treatment.durations = treatmentData.durations.map(d => ({
        _id: d._id ? new Types.ObjectId(d._id) : new Types.ObjectId(),
        minutes: d.minutes,
        price: d.price,
        professionalPrice: d.professionalPrice,
        isActive: d.isActive !== false
      })) as ITreatmentDuration[]
    }
    if (typeof treatmentData.allowTherapistGenderSelection === "boolean") {
      treatment.allowTherapistGenderSelection = treatmentData.allowTherapistGenderSelection
    }

    await treatment.save()

    revalidateAdminPath("/dashboard/admin/treatments")
    revalidateAdminPath("/our-treatments")

    const serialized = serializeMongoObject<any>(treatment.toObject())
    const result: TreatmentData = {
      _id: serialized._id.toString(),
      name: serialized.name,
      description: serialized.description,
      category: serialized.category,
      isActive: serialized.isActive,
      pricingType: serialized.pricingType,
      fixedPrice: serialized.fixedPrice,
      fixedProfessionalPrice: serialized.fixedProfessionalPrice,
      defaultDurationMinutes: serialized.defaultDurationMinutes,
      durations: serialized.durations?.map((d: any) => ({
        _id: d._id.toString(),
        minutes: d.minutes,
        price: d.price,
        professionalPrice: d.professionalPrice,
        isActive: d.isActive
      })),
      allowTherapistGenderSelection: serialized.allowTherapistGenderSelection,
      createdAt: serialized.createdAt,
      updatedAt: serialized.updatedAt
    }

    adminLogger.info("Successfully updated treatment", { treatmentId })
    return createSuccessResult(result)
  } catch (error) {
    return handleAdminError(error, "updateTreatment")
  }
}

/**
 * Delete treatment
 */
export async function deleteTreatment(treatmentId: string): Promise<AdminActionResult<boolean>> {
  const adminLogger = new AdminLogger("deleteTreatment")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(treatmentId, "מזהה טיפול")
    
    adminLogger.info("Deleting treatment", { treatmentId })

    const treatment = await Treatment.findById(treatmentId)
    if (!treatment) {
      adminLogger.warn("Treatment not found for deletion", { treatmentId })
      return createErrorResult("טיפול לא נמצא")
    }

    // Check if treatment is being used in active bookings
    // This is where you'd add business logic checks

    await Treatment.findByIdAndDelete(treatmentId)
    revalidateAdminPath("/dashboard/admin/treatments")
    revalidateAdminPath("/our-treatments")

    adminLogger.info("Successfully deleted treatment", { treatmentId })
    return createSuccessResult(true)
  } catch (error) {
    return handleAdminError(error, "deleteTreatment")
  }
}

/**
 * Toggle treatment status
 */
export async function toggleTreatmentStatus(treatmentId: string): Promise<AdminActionResult<TreatmentData>> {
  const adminLogger = new AdminLogger("toggleTreatmentStatus")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(treatmentId, "מזהה טיפול")
    
    adminLogger.info("Toggling treatment status", { treatmentId })

    const treatment = await Treatment.findById(treatmentId)
    if (!treatment) {
      adminLogger.warn("Treatment not found for status toggle", { treatmentId })
      return createErrorResult("טיפול לא נמצא")
    }

    treatment.isActive = !treatment.isActive
    await treatment.save()

    revalidateAdminPath("/dashboard/admin/treatments")
    revalidateAdminPath("/our-treatments")

    const serialized = serializeMongoObject<any>(treatment.toObject())
    const result: TreatmentData = {
      _id: serialized._id.toString(),
      name: serialized.name,
      description: serialized.description,
      category: serialized.category,
      isActive: serialized.isActive,
      pricingType: serialized.pricingType,
      fixedPrice: serialized.fixedPrice,
      fixedProfessionalPrice: serialized.fixedProfessionalPrice,
      defaultDurationMinutes: serialized.defaultDurationMinutes,
      durations: serialized.durations?.map((d: any) => ({
        _id: d._id.toString(),
        minutes: d.minutes,
        price: d.price,
        professionalPrice: d.professionalPrice,
        isActive: d.isActive
      })),
      allowTherapistGenderSelection: serialized.allowTherapistGenderSelection,
      createdAt: serialized.createdAt,
      updatedAt: serialized.updatedAt
    }

    adminLogger.info("Successfully toggled treatment status", { treatmentId, newStatus: treatment.isActive })
    return createSuccessResult(result)
  } catch (error) {
    return handleAdminError(error, "toggleTreatmentStatus")
  }
}

/**
 * Get treatment statistics
 */
export async function getTreatmentStatistics(): Promise<AdminActionResult<TreatmentStatistics>> {
  const adminLogger = new AdminLogger("getTreatmentStatistics")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    adminLogger.info("Fetching treatment statistics")

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Run all queries in parallel for better performance
    const [
      totalTreatments,
      activeTreatments,
      inactiveTreatments,
      massageTreatments,
      facialTreatments,
      fixedPricingTreatments,
      durationBasedTreatments,
      averageFixedPriceResult,
      newTreatmentsThisMonth
    ] = await Promise.all([
      Treatment.countDocuments({}),
      Treatment.countDocuments({ isActive: true }),
      Treatment.countDocuments({ isActive: false }),
      Treatment.countDocuments({ category: "massages" }),
      Treatment.countDocuments({ category: "facial_treatments" }),
      Treatment.countDocuments({ pricingType: "fixed" }),
      Treatment.countDocuments({ pricingType: "duration_based" }),
      Treatment.aggregate([
        { $match: { pricingType: "fixed" } },
        { $group: { _id: null, averagePrice: { $avg: "$fixedPrice" } } }
      ]),
      Treatment.countDocuments({ createdAt: { $gte: startOfMonth } })
    ])

    const avgFixedPrice = averageFixedPriceResult[0]?.averagePrice || 0
    const averageFixedPrice = Math.round(avgFixedPrice * 100) / 100

    const statistics: TreatmentStatistics = {
      totalTreatments,
      activeTreatments,
      inactiveTreatments,
      massageTreatments,
      facialTreatments,
      fixedPricingTreatments,
      durationBasedTreatments,
      averageFixedPrice,
      newTreatmentsThisMonth
    }

    adminLogger.info("Successfully fetched treatment statistics", statistics)
    return createSuccessResult(statistics)
  } catch (error) {
    return handleAdminError(error, "getTreatmentStatistics")
  }
}

/**
 * Get treatment categories
 */
export async function getTreatmentCategories(): Promise<AdminActionResult<TreatmentCategory[]>> {
  const adminLogger = new AdminLogger("getTreatmentCategories")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    adminLogger.info("Fetching treatment categories")

    const categories = await Treatment.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])

    const result: TreatmentCategory[] = categories.map((cat: any) => ({
      name: cat._id,
      count: cat.count
    }))

    adminLogger.info("Successfully fetched treatment categories", { categoriesCount: result.length })
    return createSuccessResult(result)
  } catch (error) {
    return handleAdminError(error, "getTreatmentCategories")
  }
}

// Legacy function name alias for backward compatibility
export const getAllTreatments = getTreatments 