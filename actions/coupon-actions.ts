"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import Coupon from "@/lib/db/models/coupon"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"

export async function createCoupon(formData: FormData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const code = formData.get("code") as string
    const discountType = formData.get("discountType") as string
    const discountValue = Number(formData.get("discountValue"))
    const validFrom = new Date(formData.get("validFrom") as string)
    const validUntil = new Date(formData.get("validUntil") as string)
    const isActive = formData.get("isActive") === "on"

    const coupon = new Coupon({
      code,
      discountType,
      discountValue,
      validFrom,
      validUntil,
      isActive,
    })

    await coupon.save()

    revalidatePath("/dashboard/admin/coupons")

    return { success: true, message: "Coupon created successfully" }
  } catch (error) {
    logger.error("Error creating coupon:", error)
    return { success: false, error: "Failed to create coupon" }
  }
}

export async function updateCoupon(id: string, formData: FormData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const code = formData.get("code") as string
    const discountType = formData.get("discountType") as string
    const discountValue = Number(formData.get("discountValue"))
    const validFrom = new Date(formData.get("validFrom") as string)
    const validUntil = new Date(formData.get("validUntil") as string)
    const isActive = formData.get("isActive") === "on"

    const coupon = await Coupon.findByIdAndUpdate(
      id,
      {
        code,
        discountType,
        discountValue,
        validFrom,
        validUntil,
        isActive,
      },
      { new: true },
    )

    if (!coupon) {
      return { success: false, error: "Coupon not found" }
    }

    revalidatePath("/dashboard/admin/coupons")

    return { success: true, message: "Coupon updated successfully" }
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
