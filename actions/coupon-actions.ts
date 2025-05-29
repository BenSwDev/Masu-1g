"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import Coupon from "@/lib/db/models/coupon"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"
import { CouponPlain } from "@/components/dashboard/admin/coupons/coupon-form"

export async function createCoupon(data: CouponPlain) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const coupon = new Coupon({
      code: data.code,
      discountType: data.discountType,
      discountValue: data.discountValue,
      validFrom: new Date(), // Optionally add a validFrom field if needed
      validUntil: new Date(data.expiryDate),
      isActive: data.isActive,
    })

    await coupon.save()

    revalidatePath("/dashboard/admin/coupons")

    return { success: true, coupon: {
      _id: coupon._id.toString(),
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      expiryDate: data.expiryDate,
      isActive: coupon.isActive,
      createdAt: coupon.createdAt?.toISOString?.() ?? undefined,
      updatedAt: coupon.updatedAt?.toISOString?.() ?? undefined,
    }}
  } catch (error) {
    logger.error("Error creating coupon:", error)
    return { success: false, error: "Failed to create coupon" }
  }
}

export async function updateCoupon(id: string, data: CouponPlain) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const coupon = await Coupon.findByIdAndUpdate(
      id,
      {
        code: data.code,
        discountType: data.discountType,
        discountValue: data.discountValue,
        validUntil: new Date(data.expiryDate),
        isActive: data.isActive,
      },
      { new: true },
    )

    if (!coupon) {
      return { success: false, error: "Coupon not found" }
    }

    revalidatePath("/dashboard/admin/coupons")

    return { success: true, coupon: {
      _id: coupon._id.toString(),
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      expiryDate: data.expiryDate,
      isActive: coupon.isActive,
      createdAt: coupon.createdAt?.toISOString?.() ?? undefined,
      updatedAt: coupon.updatedAt?.toISOString?.() ?? undefined,
    }}
  } catch (error) {
    logger.error("Error updating coupon:", error)
    return { success: false, error: "Failed to update coupon" }
  }
}

export async function deleteCoupon(id: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const coupon = await Coupon.findByIdAndDelete(id)

    if (!coupon) {
      return { success: false, error: "Coupon not found" }
    }

    revalidatePath("/dashboard/admin/coupons")

    return { success: true, message: "Coupon deleted successfully" }
  } catch (error) {
    logger.error("Error deleting coupon:", error)
    return { success: false, error: "Failed to delete coupon" }
  }
}

export async function getAllCoupons() {
  try {
    await dbConnect()

    const coupons = await Coupon.find().lean()

    return { success: true, coupons }
  } catch (error) {
    logger.error("Error fetching coupons:", error)
    return { success: false, error: "Failed to fetch coupons" }
  }
}

export async function getCoupons() {
  try {
    await dbConnect()

    const coupons = await Coupon.find().lean()
    const total = await Coupon.countDocuments()

    return {
      success: true,
      coupons,
      pagination: {
        total,
        page: 1,
        limit: 10,
        totalPages: Math.ceil(total / 10)
      }
    }
  } catch (error) {
    logger.error("Error fetching coupons:", error)
    return { success: false, error: "Failed to fetch coupons" }
  }
}

export async function getMemberCoupons() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const currentDate = new Date()
    const coupons = await Coupon.find({
      isActive: true,
      validFrom: { $lte: currentDate },
      validUntil: { $gte: currentDate },
    })
      .sort({ validUntil: 1 })
      .lean()

    const total = await Coupon.countDocuments({
      isActive: true,
      validFrom: { $lte: currentDate },
      validUntil: { $gte: currentDate },
    })

    return {
      success: true,
      coupons,
      pagination: {
        total,
        page: 1,
        limit: 10,
        totalPages: Math.ceil(total / 10)
      }
    }
  } catch (error) {
    logger.error("Error fetching member coupons:", error)
    return { success: false, error: "Failed to fetch coupons" }
  }
}

export async function getPartnerCoupons() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("partner")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const coupons = await Coupon.find({ isActive: true }).sort({ createdAt: -1 }).lean()
    const total = await Coupon.countDocuments({ isActive: true })

    return {
      success: true,
      coupons,
      pagination: {
        total,
        page: 1,
        limit: 10,
        totalPages: Math.ceil(total / 10)
      }
    }
  } catch (error) {
    logger.error("Error fetching partner coupons:", error)
    return { success: false, error: "Failed to fetch coupons" }
  }
}
