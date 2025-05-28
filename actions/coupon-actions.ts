"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import Coupon from "@/lib/db/models/coupon"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"

// יצירת קופון חדש
export async function createCoupon(formData: FormData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    // Extract data from form
    const code = formData.get("code") as string
    const discountType = formData.get("discountType") as string
    const discountValue = Number(formData.get("discountValue"))
    const validFrom = new Date(formData.get("validFrom") as string)
    const validUntil = new Date(formData.get("validUntil") as string)
    const isActive = formData.get("isActive") === "true"
    const usageLimit = Number(formData.get("usageLimit"))

    // Create new coupon
    const coupon = new Coupon({
      code,
      discountType,
      discountValue,
      validFrom,
      validUntil,
      isActive,
      usageLimit,
    })

    await coupon.save()

    revalidatePath("/dashboard/admin/coupons")

    return { success: true, coupon }
  } catch (error) {
    logger.error("Error creating coupon:", error)
    return { success: false, error: "Failed to create coupon" }
  }
}

// עדכון קופון קיים
export async function updateCoupon(id: string, formData: FormData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    // Extract data from form
    const code = formData.get("code") as string
    const discountType = formData.get("discountType") as string
    const discountValue = Number(formData.get("discountValue"))
    const validFrom = new Date(formData.get("validFrom") as string)
    const validUntil = new Date(formData.get("validUntil") as string)
    const isActive = formData.get("isActive") === "true"
    const usageLimit = Number(formData.get("usageLimit"))

    // Update coupon
    const coupon = await Coupon.findByIdAndUpdate(
      id,
      {
        code,
        discountType,
        discountValue,
        validFrom,
        validUntil,
        isActive,
        usageLimit,
      },
      { new: true },
    )

    if (!coupon) {
      return { success: false, error: "Coupon not found" }
    }

    revalidatePath("/dashboard/admin/coupons")

    return { success: true, coupon }
  } catch (error) {
    logger.error("Error updating coupon:", error)
    return { success: false, error: "Failed to update coupon" }
  }
}

// מחיקת קופון
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

    return { success: true }
  } catch (error) {
    logger.error("Error deleting coupon:", error)
    return { success: false, error: "Failed to delete coupon" }
  }
}

// קבלת רשימת קופונים
export async function getCoupons() {
  try {
    await dbConnect()

    const coupons = await Coupon.find({}).sort({ createdAt: -1 }).lean()

    return { success: true, coupons }
  } catch (error) {
    logger.error("Error fetching coupons:", error)
    return { success: false, error: "Failed to fetch coupons" }
  }
}

// קבלת קופון לפי מזהה
export async function getCouponById(id: string) {
  try {
    await dbConnect()

    const coupon = await Coupon.findById(id).lean()

    if (!coupon) {
      return { success: false, error: "Coupon not found" }
    }

    return { success: true, coupon }
  } catch (error) {
    logger.error("Error fetching coupon:", error)
    return { success: false, error: "Failed to fetch coupon" }
  }
}

// הפעלה/השבתה של קופון
export async function toggleCouponStatus(id: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const coupon = await Coupon.findById(id)

    if (!coupon) {
      return { success: false, error: "Coupon not found" }
    }

    coupon.isActive = !coupon.isActive
    await coupon.save()

    revalidatePath("/dashboard/admin/coupons")

    return { success: true, coupon }
  } catch (error) {
    logger.error("Error toggling coupon status:", error)
    return { success: false, error: "Failed to toggle coupon status" }
  }
}
