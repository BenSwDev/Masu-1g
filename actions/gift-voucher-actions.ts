"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import GiftVoucher from "@/lib/db/models/gift-voucher"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"

export async function createGiftVoucher(formData: FormData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const code = formData.get("code") as string
    const value = Number(formData.get("value"))
    const validFrom = new Date(formData.get("validFrom") as string)
    const validUntil = new Date(formData.get("validUntil") as string)
    const isActive = formData.get("isActive") === "on"

    const giftVoucher = new GiftVoucher({
      code,
      value,
      validFrom,
      validUntil,
      isActive,
    })

    await giftVoucher.save()

    revalidatePath("/dashboard/admin/gift-vouchers")

    return { success: true, message: "Gift voucher created successfully" }
  } catch (error) {
    logger.error("Error creating gift voucher:", error)
    return { success: false, error: "Failed to create gift voucher" }
  }
}

export async function updateGiftVoucher(id: string, formData: FormData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const code = formData.get("code") as string
    const value = Number(formData.get("value"))
    const validFrom = new Date(formData.get("validFrom") as string)
    const validUntil = new Date(formData.get("validUntil") as string)
    const isActive = formData.get("isActive") === "on"

    const giftVoucher = await GiftVoucher.findByIdAndUpdate(
      id,
      {
        code,
        value,
        validFrom,
        validUntil,
        isActive,
      },
      { new: true },
    )

    if (!giftVoucher) {
      return { success: false, error: "Gift voucher not found" }
    }

    revalidatePath("/dashboard/admin/gift-vouchers")

    return { success: true, message: "Gift voucher updated successfully" }
  } catch (error) {
    logger.error("Error updating gift voucher:", error)
    return { success: false, error: "Failed to update gift voucher" }
  }
}

export async function deleteGiftVoucher(id: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const giftVoucher = await GiftVoucher.findByIdAndDelete(id)

    if (!giftVoucher) {
      return { success: false, error: "Gift voucher not found" }
    }

    revalidatePath("/dashboard/admin/gift-vouchers")

    return { success: true, message: "Gift voucher deleted successfully" }
  } catch (error) {
    logger.error("Error deleting gift voucher:", error)
    return { success: false, error: "Failed to delete gift voucher" }
  }
}

export async function getAllGiftVouchers() {
  try {
    await dbConnect()

    const giftVouchers = await GiftVoucher.find().lean()

    return { success: true, giftVouchers }
  } catch (error) {
    logger.error("Error fetching gift vouchers:", error)
    return { success: false, error: "Failed to fetch gift vouchers" }
  }
}

export async function getGiftVouchers() {
  try {
    await dbConnect()

    const giftVouchers = await GiftVoucher.find().lean()
    const total = await GiftVoucher.countDocuments()

    return {
      success: true,
      giftVouchers,
      pagination: {
        total,
        page: 1,
        limit: 10,
        totalPages: Math.ceil(total / 10)
      }
    }
  } catch (error) {
    logger.error("Error fetching gift vouchers:", error)
    return { success: false, error: "Failed to fetch gift vouchers" }
  }
}

export async function getMemberGiftVouchers() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const currentDate = new Date()
    const giftVouchers = await GiftVoucher.find({
      isActive: true,
      validFrom: { $lte: currentDate },
      validUntil: { $gte: currentDate },
    })
      .sort({ validUntil: 1 })
      .lean()

    const total = await GiftVoucher.countDocuments({
      isActive: true,
      validFrom: { $lte: currentDate },
      validUntil: { $gte: currentDate },
    })

    return {
      success: true,
      giftVouchers,
      pagination: {
        total,
        page: 1,
        limit: 10,
        totalPages: Math.ceil(total / 10)
      }
    }
  } catch (error) {
    logger.error("Error fetching member gift vouchers:", error)
    return { success: false, error: "Failed to fetch gift vouchers" }
  }
}
