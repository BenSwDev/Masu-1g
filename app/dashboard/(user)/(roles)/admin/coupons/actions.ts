"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import Coupon, { type ICoupon } from "@/lib/db/models/coupon"
import User from "@/lib/db/models/user"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"
import { Types } from "mongoose"
import {
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getCouponById,
  getAssignedPartnerCoupons,
} from "@/actions/coupon-actions"

// Types
export interface GetCouponsOptions {
  page?: number
  limit?: number
  code?: string
  isActive?: boolean
  partnerId?: string
}

type CouponWithStatus = ICoupon & { effectiveStatus: string }

export interface GetCouponsResult {
  success: boolean
  coupons?: CouponWithStatus[]
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
  error?: string
}

export interface GetPartnersForSelectionResult {
  success: boolean
  partners?: Array<{
    value: string
    label: string
  }>
  error?: string
}

/**
 * Gets a list of coupons with filtering and pagination
 * @param options Filtering and pagination options
 * @returns GetCouponsResult
 */
export async function getAdminCoupons(
  page = 1,
  limit = 10,
  filters: { code?: string; isActive?: boolean; partnerId?: string } = {}
): Promise<GetCouponsResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const query: Record<string, unknown> = {}
    if (filters.code) {
      query.code = { $regex: filters.code, $options: "i" }
    }
    if (typeof filters.isActive === "boolean") {
      query.isActive = filters.isActive
    }
    if (filters.partnerId) {
      query.assignedPartnerId = filters.partnerId
    }

    const coupons = await Coupon.find(query)
      .populate("assignedPartnerId", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    const total = await Coupon.countDocuments(query)

    const couponsWithStatus = coupons.map(coupon => ({
      ...coupon,
      _id: String(coupon._id),
      effectiveStatus: calculateCouponEffectiveStatus(coupon as ICoupon),
    })) as unknown as CouponWithStatus[]

    return {
      success: true,
      coupons: couponsWithStatus,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  } catch (error) {
    logger.error("Error fetching coupons:", error)
    return { success: false, error: "Failed to fetch coupons" }
  }
}

/**
 * Gets a list of partners for selection in forms
 * @returns GetPartnersForSelectionResult
 */
export async function getPartnersForSelection(): Promise<GetPartnersForSelectionResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const partners = await User.find({ roles: "partner" })
      .select("_id name email")
      .sort({ name: 1 })
      .lean()

    return {
      success: true,
      partners: partners.map(partner => ({
        value: partner._id?.toString() || '',
        label: partner.name || partner.email || 'Unknown Partner',
      })),
    }
  } catch (error) {
    logger.error("Error fetching partners for selection:", error)
    return { success: false, error: "Failed to fetch partners" }
  }
}

// Helper function to calculate coupon effective status
function calculateCouponEffectiveStatus(coupon: ICoupon): string {
  const now = new Date()
  if (!coupon.isActive) return "inactive"
  if (coupon.validUntil && new Date(coupon.validUntil) < now) return "expired"
  if (coupon.validFrom && new Date(coupon.validFrom) > now) return "pending"
  if (coupon.usageLimit > 0 && coupon.timesUsed >= coupon.usageLimit) return "exhausted"
  return "active"
}

export {
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getCouponById,
  getAssignedPartnerCoupons,
}
