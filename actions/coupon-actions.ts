"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import mongoose from "mongoose"
import { authOptions } from "@/lib/auth/auth"
import { Coupon } from "@/lib/db/models/coupon"
import { connectToDatabase } from "@/lib/db/mongodb"
import { Treatment } from "@/lib/db/models/treatment"
import { User } from "@/lib/db/models/user"

// Types for coupon operations
export type CouponFormData = {
  code: string
  description: string
  discountType: "percentage" | "fixed"
  discountValue: number
  minPurchaseAmount: number
  maxDiscountAmount: number
  startDate: Date | string
  endDate: Date | string
  isActive: boolean
  usageLimit: number
  applicableTreatments: string[]
  partnerId?: string
}

export type CouponResponse = {
  success: boolean
  message: string
  coupon?: any
  coupons?: any[]
  error?: any
}

// Create a new coupon
export async function createCoupon(formData: CouponFormData): Promise<CouponResponse> {
  try {
    await connectToDatabase()

    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
      return {
        success: false,
        message: "Unauthorized access",
      }
    }

    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({ code: formData.code.toUpperCase() })
    if (existingCoupon) {
      return {
        success: false,
        message: "Coupon code already exists",
      }
    }

    // Create new coupon
    const coupon = new Coupon({
      ...formData,
      code: formData.code.toUpperCase(),
      startDate: new Date(formData.startDate),
      endDate: new Date(formData.endDate),
      usedCount: 0,
      createdBy: session.user.id,
      applicableTreatments: formData.applicableTreatments.map((id) => new mongoose.Types.ObjectId(id)),
      partnerId: formData.partnerId ? new mongoose.Types.ObjectId(formData.partnerId) : undefined,
    })

    await coupon.save()

    revalidatePath("/dashboard/admin/coupons")

    return {
      success: true,
      message: "Coupon created successfully",
      coupon: coupon.toObject(),
    }
  } catch (error: any) {
    console.error("Error creating coupon:", error)
    return {
      success: false,
      message: "Failed to create coupon",
      error: error.message,
    }
  }
}

// Update an existing coupon
export async function updateCoupon(couponId: string, formData: CouponFormData): Promise<CouponResponse> {
  try {
    await connectToDatabase()

    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
      return {
        success: false,
        message: "Unauthorized access",
      }
    }

    // Check if coupon exists
    const coupon = await Coupon.findById(couponId)
    if (!coupon) {
      return {
        success: false,
        message: "Coupon not found",
      }
    }

    // Check if updated code already exists (if code is changed)
    if (formData.code !== coupon.code) {
      const existingCoupon = await Coupon.findOne({ code: formData.code.toUpperCase(), _id: { $ne: couponId } })
      if (existingCoupon) {
        return {
          success: false,
          message: "Coupon code already exists",
        }
      }
    }

    // Update coupon
    const updatedCoupon = await Coupon.findByIdAndUpdate(
      couponId,
      {
        ...formData,
        code: formData.code.toUpperCase(),
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        applicableTreatments: formData.applicableTreatments.map((id) => new mongoose.Types.ObjectId(id)),
        partnerId: formData.partnerId ? new mongoose.Types.ObjectId(formData.partnerId) : undefined,
      },
      { new: true },
    )

    revalidatePath("/dashboard/admin/coupons")

    return {
      success: true,
      message: "Coupon updated successfully",
      coupon: updatedCoupon?.toObject(),
    }
  } catch (error: any) {
    console.error("Error updating coupon:", error)
    return {
      success: false,
      message: "Failed to update coupon",
      error: error.message,
    }
  }
}

// Delete a coupon
export async function deleteCoupon(couponId: string): Promise<CouponResponse> {
  try {
    await connectToDatabase()

    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
      return {
        success: false,
        message: "Unauthorized access",
      }
    }

    // Check if coupon exists
    const coupon = await Coupon.findById(couponId)
    if (!coupon) {
      return {
        success: false,
        message: "Coupon not found",
      }
    }

    // Delete coupon
    await Coupon.findByIdAndDelete(couponId)

    revalidatePath("/dashboard/admin/coupons")

    return {
      success: true,
      message: "Coupon deleted successfully",
    }
  } catch (error: any) {
    console.error("Error deleting coupon:", error)
    return {
      success: false,
      message: "Failed to delete coupon",
      error: error.message,
    }
  }
}

// Toggle coupon active status
export async function toggleCouponStatus(couponId: string): Promise<CouponResponse> {
  try {
    await connectToDatabase()

    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
      return {
        success: false,
        message: "Unauthorized access",
      }
    }

    // Check if coupon exists
    const coupon = await Coupon.findById(couponId)
    if (!coupon) {
      return {
        success: false,
        message: "Coupon not found",
      }
    }

    // Toggle status
    coupon.isActive = !coupon.isActive
    await coupon.save()

    revalidatePath("/dashboard/admin/coupons")

    return {
      success: true,
      message: coupon.isActive ? "Coupon activated successfully" : "Coupon deactivated successfully",
      coupon: coupon.toObject(),
    }
  } catch (error: any) {
    console.error("Error toggling coupon status:", error)
    return {
      success: false,
      message: "Failed to update coupon status",
      error: error.message,
    }
  }
}

// Get all coupons (admin)
export async function getAdminCoupons(
  searchQuery = "",
  sortField = "createdAt",
  sortDirection: "asc" | "desc" = "desc",
  page = 1,
  limit = 10,
  filterActive?: boolean,
): Promise<CouponResponse> {
  try {
    await connectToDatabase()

    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
      return {
        success: false,
        message: "Unauthorized access",
      }
    }

    // Build query
    const query: any = {}

    // Add search filter
    if (searchQuery) {
      query.$or = [
        { code: { $regex: searchQuery, $options: "i" } },
        { description: { $regex: searchQuery, $options: "i" } },
      ]
    }

    // Add active filter
    if (filterActive !== undefined) {
      query.isActive = filterActive
    }

    // Count total documents
    const totalCoupons = await Coupon.countDocuments(query)

    // Get coupons with pagination and sorting
    const coupons = await Coupon.find(query)
      .sort({ [sortField]: sortDirection === "asc" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("applicableTreatments", "name price")
      .populate("partnerId", "name email")
      .lean()

    return {
      success: true,
      message: "Coupons retrieved successfully",
      coupons,
      total: totalCoupons,
      page,
      limit,
      totalPages: Math.ceil(totalCoupons / limit),
    }
  } catch (error: any) {
    console.error("Error getting coupons:", error)
    return {
      success: false,
      message: "Failed to retrieve coupons",
      error: error.message,
    }
  }
}

// Get coupon by ID
export async function getCouponById(couponId: string): Promise<CouponResponse> {
  try {
    await connectToDatabase()

    const session = await getServerSession(authOptions)
    if (!session) {
      return {
        success: false,
        message: "Unauthorized access",
      }
    }

    // Get coupon
    const coupon = await Coupon.findById(couponId)
      .populate("applicableTreatments", "name price")
      .populate("partnerId", "name email")
      .lean()

    if (!coupon) {
      return {
        success: false,
        message: "Coupon not found",
      }
    }

    return {
      success: true,
      message: "Coupon retrieved successfully",
      coupon,
    }
  } catch (error: any) {
    console.error("Error getting coupon:", error)
    return {
      success: false,
      message: "Failed to retrieve coupon",
      error: error.message,
    }
  }
}

// Get partner coupons
export async function getPartnerCoupons(
  searchQuery = "",
  sortField = "createdAt",
  sortDirection: "asc" | "desc" = "desc",
  page = 1,
  limit = 10,
  filterActive?: boolean,
): Promise<CouponResponse> {
  try {
    await connectToDatabase()

    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "partner") {
      return {
        success: false,
        message: "Unauthorized access",
      }
    }

    // Build query
    const query: any = {
      partnerId: session.user.id,
    }

    // Add search filter
    if (searchQuery) {
      query.$or = [
        { code: { $regex: searchQuery, $options: "i" } },
        { description: { $regex: searchQuery, $options: "i" } },
      ]
    }

    // Add active filter
    if (filterActive !== undefined) {
      query.isActive = filterActive
    }

    // Count total documents
    const totalCoupons = await Coupon.countDocuments(query)

    // Get coupons with pagination and sorting
    const coupons = await Coupon.find(query)
      .sort({ [sortField]: sortDirection === "asc" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("applicableTreatments", "name price")
      .lean()

    return {
      success: true,
      message: "Coupons retrieved successfully",
      coupons,
      total: totalCoupons,
      page,
      limit,
      totalPages: Math.ceil(totalCoupons / limit),
    }
  } catch (error: any) {
    console.error("Error getting partner coupons:", error)
    return {
      success: false,
      message: "Failed to retrieve coupons",
      error: error.message,
    }
  }
}

// Get member coupons
export async function getMemberCoupons(
  searchQuery = "",
  sortField = "createdAt",
  sortDirection: "asc" | "desc" = "desc",
  page = 1,
  limit = 10,
): Promise<CouponResponse> {
  try {
    await connectToDatabase()

    const session = await getServerSession(authOptions)
    if (!session) {
      return {
        success: false,
        message: "Unauthorized access",
      }
    }

    // Build query for active coupons
    const now = new Date()
    const query: any = {
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
      $or: [
        { partnerId: { $exists: false } }, // General coupons
        { usageLimit: { $gt: "$usedCount" } }, // Coupons with remaining uses
        { usageLimit: 0 }, // Unlimited use coupons
      ],
    }

    // Add search filter
    if (searchQuery) {
      query.$and = [
        {
          $or: [
            { code: { $regex: searchQuery, $options: "i" } },
            { description: { $regex: searchQuery, $options: "i" } },
          ],
        },
      ]
    }

    // Count total documents
    const totalCoupons = await Coupon.countDocuments(query)

    // Get coupons with pagination and sorting
    const coupons = await Coupon.find(query)
      .sort({ [sortField]: sortDirection === "asc" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("applicableTreatments", "name price")
      .lean()

    return {
      success: true,
      message: "Coupons retrieved successfully",
      coupons,
      total: totalCoupons,
      page,
      limit,
      totalPages: Math.ceil(totalCoupons / limit),
    }
  } catch (error: any) {
    console.error("Error getting member coupons:", error)
    return {
      success: false,
      message: "Failed to retrieve coupons",
      error: error.message,
    }
  }
}

// Validate coupon code
export async function validateCoupon(code: string, treatmentIds: string[] = []): Promise<CouponResponse> {
  try {
    await connectToDatabase()

    const session = await getServerSession(authOptions)
    if (!session) {
      return {
        success: false,
        message: "Unauthorized access",
      }
    }

    // Find coupon by code
    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    }).populate("applicableTreatments", "name price")

    if (!coupon) {
      return {
        success: false,
        message: "Invalid or expired coupon code",
      }
    }

    // Check usage limit
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
      return {
        success: false,
        message: "Coupon usage limit reached",
      }
    }

    // Check if coupon is applicable to the treatments
    if (coupon.applicableTreatments.length > 0 && treatmentIds.length > 0) {
      const applicableTreatmentIds = coupon.applicableTreatments.map((t) => t._id.toString())
      const hasApplicableTreatment = treatmentIds.some((id) => applicableTreatmentIds.includes(id))

      if (!hasApplicableTreatment) {
        return {
          success: false,
          message: "Coupon is not applicable to selected treatments",
        }
      }
    }

    return {
      success: true,
      message: "Coupon is valid",
      coupon: coupon.toObject(),
    }
  } catch (error: any) {
    console.error("Error validating coupon:", error)
    return {
      success: false,
      message: "Failed to validate coupon",
      error: error.message,
    }
  }
}

// Apply coupon (increment used count)
export async function applyCoupon(code: string): Promise<CouponResponse> {
  try {
    await connectToDatabase()

    const session = await getServerSession(authOptions)
    if (!session) {
      return {
        success: false,
        message: "Unauthorized access",
      }
    }

    // Find and update coupon
    const coupon = await Coupon.findOneAndUpdate(
      { code: code.toUpperCase(), isActive: true },
      { $inc: { usedCount: 1 } },
      { new: true },
    )

    if (!coupon) {
      return {
        success: false,
        message: "Invalid or expired coupon code",
      }
    }

    return {
      success: true,
      message: "Coupon applied successfully",
      coupon: coupon.toObject(),
    }
  } catch (error: any) {
    console.error("Error applying coupon:", error)
    return {
      success: false,
      message: "Failed to apply coupon",
      error: error.message,
    }
  }
}

// Get all treatments for coupon form
export async function getTreatmentsForCouponForm(): Promise<any> {
  try {
    await connectToDatabase()

    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
      return {
        success: false,
        message: "Unauthorized access",
      }
    }

    const treatments = await Treatment.find({ isActive: true }).select("_id name price").sort({ name: 1 }).lean()

    return {
      success: true,
      treatments,
    }
  } catch (error: any) {
    console.error("Error getting treatments:", error)
    return {
      success: false,
      message: "Failed to retrieve treatments",
      error: error.message,
    }
  }
}

// Get all partners for coupon form
export async function getPartnersForCouponForm(): Promise<any> {
  try {
    await connectToDatabase()

    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
      return {
        success: false,
        message: "Unauthorized access",
      }
    }

    const partners = await User.find({ role: "partner", isActive: true })
      .select("_id name email")
      .sort({ name: 1 })
      .lean()

    return {
      success: true,
      partners,
    }
  } catch (error: any) {
    console.error("Error getting partners:", error)
    return {
      success: false,
      message: "Failed to retrieve partners",
      error: error.message,
    }
  }
}
