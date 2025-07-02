"use server"

import { revalidatePath } from "next/cache"
import Coupon, { type ICoupon } from "../../../../../../lib/db/models/coupon"
import User from "../../../../../../lib/db/models/user"
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
export interface CouponFilters extends AdminActionOptions {
  code?: string
  isActive?: boolean
  partnerId?: string
  status?: string
  expiryStatus?: string
}

export interface CouponWithStatus extends ICoupon {
  effectiveStatus: string
  _id: string
}

export interface PartnerOption {
  value: string
  label: string
}

export interface CreateCouponData {
  code: string
  description?: string
  discountType: "percentage" | "fixed"
  discountValue: number
  minimumOrderValue?: number
  usageLimit?: number
  validFrom?: Date
  validUntil?: Date
  isActive: boolean
  assignedPartnerId?: string
  isPartnerCoupon?: boolean
  partnerCommissionPercentage?: number
}

export interface UpdateCouponData {
  code?: string
  description?: string
  discountType?: "percentage" | "fixed"
  discountValue?: number
  minimumOrderValue?: number
  usageLimit?: number
  validFrom?: Date
  validUntil?: Date
  isActive?: boolean
  assignedPartnerId?: string
  isPartnerCoupon?: boolean
  partnerCommissionPercentage?: number
}

/**
 * Gets a list of coupons with filtering and pagination
 */
export async function getAdminCoupons(
  filters: CouponFilters = {}
): Promise<AdminActionResult<PaginatedResult<CouponWithStatus>>> {
  const adminLogger = new AdminLogger("getAdminCoupons")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    const { page, limit, skip } = validatePaginationOptions(filters)
    const {
      code,
      isActive,
      partnerId,
      status,
      expiryStatus,
      search,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = filters

    adminLogger.info("Fetching coupons", { filters, page, limit })

    // Build query
    const query: Record<string, any> = {}

    // Search filter
    if (search) {
      const searchQuery = buildSearchQuery(search, ["code", "description"])
      Object.assign(query, searchQuery)
    }

    // Code filter
    if (code) {
      query.code = { $regex: code, $options: "i" }
    }

    // Active filter
    if (typeof isActive === "boolean") {
      query.isActive = isActive
    }

    // Partner filter
    if (partnerId) {
      validateObjectId(partnerId, "מזהה שותף")
      query.assignedPartnerId = new Types.ObjectId(partnerId)
    }

    // Status-based filters
    const now = new Date()
    if (status === "active") {
      query.isActive = true
      query.$and = [
        { $or: [{ validFrom: { $exists: false } }, { validFrom: { $lte: now } }] },
        { $or: [{ validUntil: { $exists: false } }, { validUntil: { $gte: now } }] }
      ]
    } else if (status === "expired") {
      query.validUntil = { $lt: now }
    } else if (status === "pending") {
      query.validFrom = { $gt: now }
    }

    // Get total count
    const totalCoupons = await Coupon.countDocuments(query)

    adminLogger.info("Found coupons matching query", { totalCoupons, query })

    // Get coupons with pagination and sorting
    const sortQuery = buildSortQuery(sortBy, sortOrder)
    const coupons = await Coupon.find(query)
      .populate("assignedPartnerId", "name email")
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .lean()

    // Process coupons and add effective status
    const couponsWithStatus = coupons.map(coupon => {
      const serialized = serializeMongoObject<any>(coupon)
      return {
        ...serialized,
        _id: serialized._id.toString(),
        effectiveStatus: calculateCouponEffectiveStatus(serialized),
        assignedPartnerId: serialized.assignedPartnerId ? {
          ...serialized.assignedPartnerId,
          _id: serialized.assignedPartnerId._id?.toString()
        } : null
      }
    }) as CouponWithStatus[]

    adminLogger.info("Successfully fetched coupons", { count: couponsWithStatus.length })
    return createPaginatedResult(couponsWithStatus, totalCoupons, page, limit)
  } catch (error) {
    return handleAdminError(error, "getAdminCoupons")
  }
}

/**
 * Get coupon by ID
 */
export async function getCouponById(couponId: string): Promise<AdminActionResult<CouponWithStatus>> {
  const adminLogger = new AdminLogger("getCouponById")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(couponId, "מזהה קופון")
    
    adminLogger.info("Fetching coupon by ID", { couponId })

    const coupon = await Coupon.findById(couponId)
      .populate("assignedPartnerId", "name email")
      .lean()

    if (!coupon) {
      adminLogger.warn("Coupon not found", { couponId })
      return createErrorResult("קופון לא נמצא")
    }

    const serialized = serializeMongoObject<any>(coupon)
    const result = {
      ...serialized,
      _id: serialized._id.toString(),
      effectiveStatus: calculateCouponEffectiveStatus(serialized),
      assignedPartnerId: serialized.assignedPartnerId ? {
        ...serialized.assignedPartnerId,
        _id: serialized.assignedPartnerId._id?.toString()
      } : null
    } as CouponWithStatus

    adminLogger.info("Successfully fetched coupon", { couponId })
    return createSuccessResult(result)
  } catch (error) {
    return handleAdminError(error, "getCouponById")
  }
}

/**
 * Create new coupon
 */
export async function createCoupon(couponData: CreateCouponData): Promise<AdminActionResult<CouponWithStatus>> {
  const adminLogger = new AdminLogger("createCoupon")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    adminLogger.info("Creating new coupon", { code: couponData.code })

    // Validate required fields
    if (!couponData.code?.trim()) {
      return createErrorResult("קוד קופון נדרש")
    }
    if (!couponData.discountType) {
      return createErrorResult("סוג הנחה נדרש")
    }
    if (!couponData.discountValue || couponData.discountValue <= 0) {
      return createErrorResult("ערך הנחה חייב להיות גדול מ-0")
    }

    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({ code: couponData.code })
    if (existingCoupon) {
      adminLogger.warn("Coupon code already exists", { code: couponData.code })
      return createErrorResult("קוד קופון זה כבר קיים")
    }

    // Validate partner if provided
    if (couponData.assignedPartnerId) {
      validateObjectId(couponData.assignedPartnerId, "מזהה שותף")
      const partner = await User.findById(couponData.assignedPartnerId)
      if (!partner || !partner.roles.includes("partner")) {
        return createErrorResult("שותף לא נמצא")
      }
    }

    // Create coupon
    const newCoupon = new Coupon({
      ...couponData,
      assignedPartnerId: couponData.assignedPartnerId ? new Types.ObjectId(couponData.assignedPartnerId) : undefined,
      timesUsed: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    await newCoupon.save()
    revalidateAdminPath("/dashboard/admin/coupons")

    // Populate and serialize
    const populatedCoupon = await Coupon.findById(newCoupon._id)
      .populate("assignedPartnerId", "name email")
      .lean()

    const serialized = serializeMongoObject<any>(populatedCoupon)
    const result = {
      ...serialized,
      _id: serialized._id.toString(),
      effectiveStatus: calculateCouponEffectiveStatus(serialized),
      assignedPartnerId: serialized.assignedPartnerId ? {
        ...serialized.assignedPartnerId,
        _id: serialized.assignedPartnerId._id?.toString()
      } : null
    } as CouponWithStatus

    adminLogger.info("Successfully created coupon", { couponId: result._id })
    return createSuccessResult(result)
  } catch (error) {
    return handleAdminError(error, "createCoupon")
  }
}

/**
 * Update coupon
 */
export async function updateCoupon(
  couponId: string,
  couponData: UpdateCouponData
): Promise<AdminActionResult<CouponWithStatus>> {
  const adminLogger = new AdminLogger("updateCoupon")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(couponId, "מזהה קופון")
    
    adminLogger.info("Updating coupon", { couponId, updates: Object.keys(couponData) })

    const coupon = await Coupon.findById(couponId)
    if (!coupon) {
      adminLogger.warn("Coupon not found for update", { couponId })
      return createErrorResult("קופון לא נמצא")
    }

    // Check if code is being changed and already exists
    if (couponData.code && couponData.code !== coupon.code) {
      const existingCoupon = await Coupon.findOne({ code: couponData.code, _id: { $ne: couponId } })
      if (existingCoupon) {
        adminLogger.warn("Coupon code already exists for another coupon", { code: couponData.code })
        return createErrorResult("קוד קופון זה כבר קיים במערכת")
      }
    }

    // Validate partner if provided
    if (couponData.assignedPartnerId) {
      validateObjectId(couponData.assignedPartnerId, "מזהה שותף")
      const partner = await User.findById(couponData.assignedPartnerId)
      if (!partner || !partner.roles.includes("partner")) {
        return createErrorResult("שותף לא נמצא")
      }
    }

    // Update coupon fields
    Object.keys(couponData).forEach(key => {
      if (couponData[key as keyof UpdateCouponData] !== undefined) {
        if (key === "assignedPartnerId" && couponData.assignedPartnerId) {
          (coupon as any)[key] = new Types.ObjectId(couponData.assignedPartnerId)
        } else {
          (coupon as any)[key] = couponData[key as keyof UpdateCouponData]
        }
      }
    })

    coupon.updatedAt = new Date()
    await coupon.save()
    revalidateAdminPath("/dashboard/admin/coupons")

    // Populate and serialize
    const populatedCoupon = await Coupon.findById(coupon._id)
      .populate("assignedPartnerId", "name email")
      .lean()

    const serialized = serializeMongoObject<any>(populatedCoupon)
    const result = {
      ...serialized,
      _id: serialized._id.toString(),
      effectiveStatus: calculateCouponEffectiveStatus(serialized),
      assignedPartnerId: serialized.assignedPartnerId ? {
        ...serialized.assignedPartnerId,
        _id: serialized.assignedPartnerId._id?.toString()
      } : null
    } as CouponWithStatus

    adminLogger.info("Successfully updated coupon", { couponId })
    return createSuccessResult(result)
  } catch (error) {
    return handleAdminError(error, "updateCoupon")
  }
}

/**
 * Delete coupon
 */
export async function deleteCoupon(couponId: string): Promise<AdminActionResult<boolean>> {
  const adminLogger = new AdminLogger("deleteCoupon")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(couponId, "מזהה קופון")
    
    adminLogger.info("Deleting coupon", { couponId })

    const coupon = await Coupon.findById(couponId)
    if (!coupon) {
      adminLogger.warn("Coupon not found for deletion", { couponId })
      return createErrorResult("קופון לא נמצא")
    }

    // Check if coupon has been used
    if (coupon.timesUsed > 0) {
      adminLogger.warn("Cannot delete used coupon", { couponId, timesUsed: coupon.timesUsed })
      return createErrorResult("לא ניתן למחוק קופון שכבר נוצל")
    }

    await Coupon.findByIdAndDelete(couponId)
    revalidateAdminPath("/dashboard/admin/coupons")

    adminLogger.info("Successfully deleted coupon", { couponId })
    return createSuccessResult(true)
  } catch (error) {
    return handleAdminError(error, "deleteCoupon")
  }
}

/**
 * Gets a list of partners for selection in forms
 */
export async function getPartnersForSelection(): Promise<AdminActionResult<PartnerOption[]>> {
  const adminLogger = new AdminLogger("getPartnersForSelection")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    adminLogger.info("Fetching partners for selection")

    const partners = await User.find({ roles: "partner", isActive: true })
      .select("_id name email")
      .sort({ name: 1 })
      .lean()

    const partnerOptions = partners.map(partner => ({
      value: partner._id.toString(),
      label: partner.name || partner.email || `Partner ${partner._id.toString().slice(-6)}`
    }))

    adminLogger.info("Successfully fetched partners", { count: partnerOptions.length })
    return createSuccessResult(partnerOptions)
  } catch (error) {
    return handleAdminError(error, "getPartnersForSelection")
  }
}

/**
 * Get assigned partner coupons
 */
export async function getAssignedPartnerCoupons(
  partnerId: string,
  filters: CouponFilters = {}
): Promise<AdminActionResult<PaginatedResult<CouponWithStatus>>> {
  const adminLogger = new AdminLogger("getAssignedPartnerCoupons")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(partnerId, "מזהה שותף")
    
    const { page, limit, skip } = validatePaginationOptions(filters)
    
    adminLogger.info("Fetching assigned partner coupons", { partnerId, filters })

    // Build query for partner coupons
    const query: Record<string, any> = {
      assignedPartnerId: new Types.ObjectId(partnerId)
    }

    // Add additional filters
    if (filters.code) {
      query.code = { $regex: filters.code, $options: "i" }
    }
    if (typeof filters.isActive === "boolean") {
      query.isActive = filters.isActive
    }

    const totalCoupons = await Coupon.countDocuments(query)
    const sortQuery = buildSortQuery(filters.sortBy || "createdAt", filters.sortOrder || "desc")
    
    const coupons = await Coupon.find(query)
      .populate("assignedPartnerId", "name email")
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .lean()

    const couponsWithStatus = coupons.map(coupon => {
      const serialized = serializeMongoObject<any>(coupon)
      return {
        ...serialized,
        _id: serialized._id.toString(),
        effectiveStatus: calculateCouponEffectiveStatus(serialized)
      }
    }) as CouponWithStatus[]

    adminLogger.info("Successfully fetched partner coupons", { count: couponsWithStatus.length })
    return createPaginatedResult(couponsWithStatus, totalCoupons, page, limit)
  } catch (error) {
    return handleAdminError(error, "getAssignedPartnerCoupons")
  }
}

// Helper function to calculate coupon effective status
function calculateCouponEffectiveStatus(coupon: ICoupon): string {
  const now = new Date()
  
  if (!coupon.isActive) return "inactive"
  if (coupon.validUntil && new Date(coupon.validUntil) < now) return "expired"
  if (coupon.validFrom && new Date(coupon.validFrom) > now) return "pending"
  if (coupon.usageLimit && coupon.usageLimit > 0 && coupon.timesUsed >= coupon.usageLimit) return "exhausted"
  
  return "active"
} 