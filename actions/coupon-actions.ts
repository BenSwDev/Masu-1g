"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { Coupon } from "@/lib/db/models/coupon"
import { connectToDatabase } from "@/lib/db/mongodb"
import { logger } from "@/lib/logs/logger"
import { UserRole } from "@/lib/db/models/user"

// Create a new coupon
export async function createCoupon(formData: FormData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return { success: false, message: "unauthorized" }
    }

    // Check if user has admin role
    if (!session.user.roles.includes(UserRole.ADMIN)) {
      return { success: false, message: "forbidden" }
    }

    await connectToDatabase()

    const code = (formData.get("code") as string).toUpperCase()
    const description = formData.get("description") as string
    const discountType = formData.get("discountType") as "percentage" | "fixed"
    const discountValue = Number.parseFloat(formData.get("discountValue") as string)
    const startDate = new Date(formData.get("startDate") as string)
    const endDate = new Date(formData.get("endDate") as string)
    const isActive = formData.get("isActive") === "true"
    const maxUses = Number.parseInt(formData.get("maxUses") as string, 10)
    const minPurchaseAmount = formData.get("minPurchaseAmount")
      ? Number.parseFloat(formData.get("minPurchaseAmount") as string)
      : undefined
    const maxDiscountAmount = formData.get("maxDiscountAmount")
      ? Number.parseFloat(formData.get("maxDiscountAmount") as string)
      : undefined

    // Check if applicableServices is provided
    const applicableServicesString = formData.get("applicableServices") as string
    const applicableServices = applicableServicesString ? JSON.parse(applicableServicesString) : []

    // Check if applicableUsers is provided
    const applicableUsersString = formData.get("applicableUsers") as string
    const applicableUsers = applicableUsersString ? JSON.parse(applicableUsersString) : []

    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({ code })
    if (existingCoupon) {
      return { success: false, message: "coupon_code_exists" }
    }

    // Create new coupon
    const coupon = new Coupon({
      code,
      description,
      discountType,
      discountValue,
      startDate,
      endDate,
      isActive,
      maxUses,
      currentUses: 0,
      minPurchaseAmount,
      maxDiscountAmount,
      applicableServices,
      applicableUsers,
      createdBy: session.user.id,
      usageHistory: [],
    })

    await coupon.save()

    revalidatePath("/dashboard/admin/coupons")
    return { success: true, coupon }
  } catch (error) {
    logger.error("Error creating coupon:", error)
    return { success: false, message: "server_error" }
  }
}

// Update an existing coupon
export async function updateCoupon(couponId: string, formData: FormData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return { success: false, message: "unauthorized" }
    }

    // Check if user has admin role
    if (!session.user.roles.includes(UserRole.ADMIN)) {
      return { success: false, message: "forbidden" }
    }

    await connectToDatabase()

    const coupon = await Coupon.findById(couponId)
    if (!coupon) {
      return { success: false, message: "coupon_not_found" }
    }

    const code = (formData.get("code") as string).toUpperCase()

    // Check if the updated code already exists for another coupon
    if (code !== coupon.code) {
      const existingCoupon = await Coupon.findOne({ code })
      if (existingCoupon) {
        return { success: false, message: "coupon_code_exists" }
      }
    }

    // Update coupon fields
    coupon.code = code
    coupon.description = formData.get("description") as string
    coupon.discountType = formData.get("discountType") as "percentage" | "fixed"
    coupon.discountValue = Number.parseFloat(formData.get("discountValue") as string)
    coupon.startDate = new Date(formData.get("startDate") as string)
    coupon.endDate = new Date(formData.get("endDate") as string)
    coupon.isActive = formData.get("isActive") === "true"
    coupon.maxUses = Number.parseInt(formData.get("maxUses") as string, 10)

    if (formData.get("minPurchaseAmount")) {
      coupon.minPurchaseAmount = Number.parseFloat(formData.get("minPurchaseAmount") as string)
    } else {
      coupon.minPurchaseAmount = undefined
    }

    if (formData.get("maxDiscountAmount")) {
      coupon.maxDiscountAmount = Number.parseFloat(formData.get("maxDiscountAmount") as string)
    } else {
      coupon.maxDiscountAmount = undefined
    }

    // Update applicableServices if provided
    const applicableServicesString = formData.get("applicableServices") as string
    if (applicableServicesString) {
      coupon.applicableServices = JSON.parse(applicableServicesString)
    }

    // Update applicableUsers if provided
    const applicableUsersString = formData.get("applicableUsers") as string
    if (applicableUsersString) {
      coupon.applicableUsers = JSON.parse(applicableUsersString)
    }

    await coupon.save()

    revalidatePath("/dashboard/admin/coupons")
    return { success: true, coupon }
  } catch (error) {
    logger.error("Error updating coupon:", error)
    return { success: false, message: "server_error" }
  }
}

// Delete a coupon
export async function deleteCoupon(couponId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return { success: false, message: "unauthorized" }
    }

    // Check if user has admin role
    if (!session.user.roles.includes(UserRole.ADMIN)) {
      return { success: false, message: "forbidden" }
    }

    await connectToDatabase()

    const coupon = await Coupon.findById(couponId)
    if (!coupon) {
      return { success: false, message: "coupon_not_found" }
    }

    // If coupon has been used, deactivate instead of deleting
    if (coupon.currentUses > 0) {
      coupon.isActive = false
      await coupon.save()
    } else {
      await Coupon.findByIdAndDelete(couponId)
    }

    revalidatePath("/dashboard/admin/coupons")
    return { success: true }
  } catch (error) {
    logger.error("Error deleting coupon:", error)
    return { success: false, message: "server_error" }
  }
}

// Get all coupons (admin)
export async function getAllCoupons() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return { success: false, message: "unauthorized" }
    }

    // Check if user has admin role
    if (!session.user.roles.includes(UserRole.ADMIN)) {
      return { success: false, message: "forbidden" }
    }

    await connectToDatabase()

    const coupons = await Coupon.find()
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email")
      .populate("applicableServices", "name")
      .populate("applicableUsers", "name email")

    return { success: true, coupons }
  } catch (error) {
    logger.error("Error getting all coupons:", error)
    return { success: false, message: "server_error" }
  }
}

// Get coupon by ID
export async function getCouponById(couponId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return { success: false, message: "unauthorized" }
    }

    await connectToDatabase()

    const coupon = await Coupon.findById(couponId)
      .populate("createdBy", "name email")
      .populate("applicableServices", "name")
      .populate("applicableUsers", "name email")
      .populate("usageHistory.userId", "name email")

    if (!coupon) {
      return { success: false, message: "coupon_not_found" }
    }

    return { success: true, coupon }
  } catch (error) {
    logger.error("Error getting coupon by ID:", error)
    return { success: false, message: "server_error" }
  }
}

// Get coupons for a specific user
export async function getUserCoupons() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return { success: false, message: "unauthorized" }
    }

    await connectToDatabase()

    // Get coupons applicable to all users or specifically to this user
    const coupons = await Coupon.find({
      $or: [
        { applicableUsers: { $size: 0 } }, // Coupons for all users
        { applicableUsers: session.user.id }, // Coupons specifically for this user
      ],
      isActive: true,
      endDate: { $gte: new Date() },
    }).sort({ createdAt: -1 })

    // Filter out coupons that have reached max uses
    const validCoupons = coupons.filter((coupon) => {
      return !(coupon.maxUses > 0 && coupon.currentUses >= coupon.maxUses)
    })

    // Filter out coupons already used by this user
    const unusedCoupons = validCoupons.filter((coupon) => {
      const userUsage = coupon.usageHistory.find((usage) => usage.userId.toString() === session.user.id)
      return !userUsage
    })

    return { success: true, coupons: unusedCoupons }
  } catch (error) {
    logger.error("Error getting user coupons:", error)
    return { success: false, message: "server_error" }
  }
}

// Validate a coupon code
export async function validateCoupon(code: string, amount: number) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return { success: false, message: "unauthorized" }
    }

    await connectToDatabase()

    const coupon = await Coupon.findOne({ code: code.toUpperCase() })
    if (!coupon) {
      return { success: false, message: "coupon_not_found" }
    }

    const validation = coupon.validateUse(session.user.id, amount)
    if (!validation.valid) {
      return { success: false, message: validation.message }
    }

    const discountAmount = coupon.calculateDiscount(amount)

    return {
      success: true,
      coupon: {
        _id: coupon._id,
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
      },
    }
  } catch (error) {
    logger.error("Error validating coupon:", error)
    return { success: false, message: "server_error" }
  }
}

// Apply a coupon to an order
export async function applyCoupon(code: string, amount: number, orderId?: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return { success: false, message: "unauthorized" }
    }

    await connectToDatabase()

    const coupon = await Coupon.findOne({ code: code.toUpperCase() })
    if (!coupon) {
      return { success: false, message: "coupon_not_found" }
    }

    const result = await coupon.apply(session.user.id, amount, orderId)

    revalidatePath("/dashboard/member/coupons")
    return result
  } catch (error) {
    logger.error("Error applying coupon:", error)
    return { success: false, message: "server_error" }
  }
}

// Get coupons for partner
export async function getPartnerCoupons() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return { success: false, message: "unauthorized" }
    }

    // Check if user has partner role
    if (!session.user.roles.includes(UserRole.PARTNER)) {
      return { success: false, message: "forbidden" }
    }

    await connectToDatabase()

    // Get coupons specifically assigned to this partner
    const coupons = await Coupon.find({
      applicableUsers: session.user.id,
      isActive: true,
      endDate: { $gte: new Date() },
    }).sort({ createdAt: -1 })

    return { success: true, coupons }
  } catch (error) {
    logger.error("Error getting partner coupons:", error)
    return { success: false, message: "server_error" }
  }
}
