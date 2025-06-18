"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { revalidatePath } from "next/cache"
import dbConnect from "@/lib/db/mongoose"
import Coupon, { type ICoupon } from "@/lib/db/models/coupon"
import { logger } from "@/lib/logs/logger"

/**
 * Get all coupons for admin
 */
export async function getAllCoupons(
  page = 1,
  limit = 10,
  filters: {
    search?: string
    status?: string
    discountType?: string
  } = {}
): Promise<{
  success: boolean
  coupons?: any[]
  totalPages?: number
  totalCoupons?: number
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const query: any = {}

    if (filters.search) {
      query.$or = [
        { code: { $regex: filters.search, $options: "i" } },
        { description: { $regex: filters.search, $options: "i" } },
      ]
    }

    if (filters.status === "active") {
      query.isActive = true
      query.validUntil = { $gte: new Date() }
    } else if (filters.status === "expired") {
      query.$or = [
        { isActive: false },
        { validUntil: { $lt: new Date() } },
      ]
    }

    if (filters.discountType) {
      query.discountType = filters.discountType
    }

    const totalCoupons = await Coupon.countDocuments(query)
    const totalPages = Math.ceil(totalCoupons / limit)

    const coupons = await Coupon.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    const serializedCoupons = coupons.map((coupon) => ({
      ...coupon,
      _id: coupon._id.toString(),
    }))

    return {
      success: true,
      coupons: serializedCoupons,
      totalPages,
      totalCoupons,
    }
  } catch (error) {
    logger.error("Error fetching coupons:", error)
    return { success: false, error: "Failed to fetch coupons" }
  }
}

/**
 * Create new coupon
 */
export async function createCoupon(data: any): Promise<{
  success: boolean
  data?: any
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({ code: data.code })
    if (existingCoupon) {
      return { success: false, error: "Coupon code already exists" }
    }

    const couponData = {
      code: data.code,
      description: data.description || "",
      discountType: data.discountType,
      discountValue: Number(data.discountValue),
      validFrom: new Date(data.validFrom),
      validUntil: new Date(data.validUntil),
      usageLimit: Number(data.usageLimit || 0),
      isActive: Boolean(data.isActive),
      timesUsed: 0,
    }

    const coupon = new Coupon(couponData)
    await coupon.save()

    revalidatePath("/dashboard/admin/coupons")

    const now = new Date()
    const effectiveStatus = !coupon.isActive ? "inactive" :
      new Date(coupon.validUntil) < now ? "expired" :
      new Date(coupon.validFrom) > now ? "pending" :
      coupon.usageLimit > 0 && coupon.timesUsed >= coupon.usageLimit ? "exhausted" :
      "active"

    return {
      success: true,
      data: {
        ...coupon.toObject(),
        _id: (coupon._id as any).toString(),
        effectiveStatus,
      },
    }
  } catch (error) {
    logger.error("Error creating coupon:", error)
    return { success: false, error: "Failed to create coupon" }
  }
}

/**
 * Update coupon
 */
export async function updateCoupon(updateData: any): Promise<{
  success: boolean
  data?: any
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const { id, ...data } = updateData

    // If updating code, check if it already exists
    if (data.code) {
      const existingCoupon = await Coupon.findOne({ 
        code: data.code,
        _id: { $ne: id }
      })
      if (existingCoupon) {
        return { success: false, error: "Coupon code already exists" }
      }
    }

    const updateFields: any = {}
    if (data.code) updateFields.code = data.code
    if (data.description !== undefined) updateFields.description = data.description
    if (data.discountType) updateFields.discountType = data.discountType
    if (data.discountValue !== undefined) updateFields.discountValue = Number(data.discountValue)
    if (data.validFrom) updateFields.validFrom = new Date(data.validFrom)
    if (data.validUntil) updateFields.validUntil = new Date(data.validUntil)
    if (data.usageLimit !== undefined) updateFields.usageLimit = Number(data.usageLimit)
    if (data.isActive !== undefined) updateFields.isActive = Boolean(data.isActive)

    const coupon = await Coupon.findByIdAndUpdate(
      id,
      updateFields,
      { new: true, runValidators: true }
    )

    if (!coupon) {
      return { success: false, error: "Coupon not found" }
    }

    revalidatePath("/dashboard/admin/coupons")

    const now = new Date()
    const effectiveStatus = !coupon.isActive ? "inactive" :
      new Date(coupon.validUntil) < now ? "expired" :
      new Date(coupon.validFrom) > now ? "pending" :
      coupon.usageLimit > 0 && coupon.timesUsed >= coupon.usageLimit ? "exhausted" :
      "active"

    return {
      success: true,
      data: {
        ...coupon.toObject(),
        _id: (coupon._id as any).toString(),
        effectiveStatus,
      },
    }
  } catch (error) {
    logger.error("Error updating coupon:", error)
    return { success: false, error: "Failed to update coupon" }
  }
}

/**
 * Delete coupon
 */
export async function deleteCoupon(id: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const coupon = await Coupon.findByIdAndDelete(id)

    if (!coupon) {
      return { success: false, error: "Coupon not found" }
    }

    revalidatePath("/dashboard/admin/coupons")

    return { success: true }
  } catch (error) {
    logger.error("Error deleting coupon:", error)
    return { success: false, error: "Failed to delete coupon" }
  }
}

/**
 * Validate coupon code
 */
export async function validateCouponCode(code: string): Promise<{
  success: boolean
  coupon?: any
  error?: string
}> {
  try {
    await dbConnect()

    const coupon = await Coupon.findOne({ code }).lean()

    if (!coupon) {
      return { success: false, error: "Coupon not found" }
    }

    const now = new Date()

    if (!coupon.isActive) {
      return { success: false, error: "Coupon is not active" }
    }

    if (new Date(coupon.validFrom) > now) {
      return { success: false, error: "Coupon is not yet valid" }
    }

    if (new Date(coupon.validUntil) < now) {
      return { success: false, error: "Coupon has expired" }
    }

    if (coupon.usageLimit > 0 && coupon.timesUsed >= coupon.usageLimit) {
      return { success: false, error: "Coupon usage limit reached" }
    }

    return {
      success: true,
      coupon: {
        ...coupon,
        _id: coupon._id.toString(),
      },
    }
  } catch (error) {
    logger.error("Error validating coupon:", error)
    return { success: false, error: "Failed to validate coupon" }
  }
}

/**
 * Get partner assigned coupons (for partner dashboard)
 */
export async function getPartnerAssignedCoupons(): Promise<{
  success: boolean
  coupons?: any[]
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("partner")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    // For now, return empty array as partner coupon assignment is not implemented
    // This would need proper implementation based on partner-coupon relationship
    return {
      success: true,
      coupons: [],
    }
  } catch (error) {
    logger.error("Error fetching partner assigned coupons:", error)
    return { success: false, error: "Failed to fetch assigned coupons" }
  }
}

/**
 * Get assigned partner coupons (alias for partner dashboard)
 */
export async function getAssignedPartnerCoupons(
  page = 1,
  limit = 10,
  filters: {
    code?: string
    isActive?: boolean
  } = {}
): Promise<{
  success: boolean
  coupons?: any[]
  error?: string
}> {
  return getPartnerAssignedCoupons()
}

/**
 * Get coupon by ID
 */
export async function getCouponById(id: string): Promise<{
  success: boolean
  coupon?: any
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const coupon = await Coupon.findById(id).lean()

    if (!coupon) {
      return { success: false, error: "Coupon not found" }
    }

    const serializedCoupon = {
      ...coupon,
      _id: coupon._id.toString(),
    }

    return { success: true, coupon: serializedCoupon }
  } catch (error) {
    logger.error("Error fetching coupon:", error)
    return { success: false, error: "Failed to fetch coupon" }
  }
} 