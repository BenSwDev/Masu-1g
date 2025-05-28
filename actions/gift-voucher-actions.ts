"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import GiftVoucher from "@/lib/db/models/gift-voucher"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"

// יצירת שובר מתנה חדש
export async function createGiftVoucher(formData: FormData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    // Extract data from form
    const code = formData.get("code") as string
    const value = Number(formData.get("value"))
    const validFrom = new Date(formData.get("validFrom") as string)
    const validUntil = new Date(formData.get("validUntil") as string)
    const isActive = formData.get("isActive") === "true"
    const recipientName = formData.get("recipientName") as string
    const recipientEmail = formData.get("recipientEmail") as string
    const message = formData.get("message") as string

    // Create new gift voucher
    const giftVoucher = new GiftVoucher({
      code,
      value,
      validFrom,
      validUntil,
      isActive,
      recipientName,
      recipientEmail,
      message,
    })

    await giftVoucher.save()

    revalidatePath("/dashboard/admin/gift-vouchers")

    return { success: true, giftVoucher }
  } catch (error) {
    logger.error("Error creating gift voucher:", error)
    return { success: false, error: "Failed to create gift voucher" }
  }
}

// עדכון שובר מתנה קיים
export async function updateGiftVoucher(id: string, formData: FormData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    // Extract data from form
    const code = formData.get("code") as string
    const value = Number(formData.get("value"))
    const validFrom = new Date(formData.get("validFrom") as string)
    const validUntil = new Date(formData.get("validUntil") as string)
    const isActive = formData.get("isActive") === "true"
    const recipientName = formData.get("recipientName") as string
    const recipientEmail = formData.get("recipientEmail") as string
    const message = formData.get("message") as string

    // Update gift voucher
    const giftVoucher = await GiftVoucher.findByIdAndUpdate(
      id,
      {
        code,
        value,
        validFrom,
        validUntil,
        isActive,
        recipientName,
        recipientEmail,
        message,
      },
      { new: true },
    )

    if (!giftVoucher) {
      return { success: false, error: "Gift voucher not found" }
    }

    revalidatePath("/dashboard/admin/gift-vouchers")

    return { success: true, giftVoucher }
  } catch (error) {
    logger.error("Error updating gift voucher:", error)
    return { success: false, error: "Failed to update gift voucher" }
  }
}

// מחיקת שובר מתנה
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

    return { success: true }
  } catch (error) {
    logger.error("Error deleting gift voucher:", error)
    return { success: false, error: "Failed to delete gift voucher" }
  }
}

// קבלת רשימת שוברי מתנה
export async function getGiftVouchers() {
  try {
    await dbConnect()

    const giftVouchers = await GiftVoucher.find({}).sort({ createdAt: -1 }).lean()

    return { success: true, giftVouchers }
  } catch (error) {
    logger.error("Error fetching gift vouchers:", error)
    return { success: false, error: "Failed to fetch gift vouchers" }
  }
}

// קבלת שובר מתנה לפי מזהה
export async function getGiftVoucherById(id: string) {
  try {
    await dbConnect()

    const giftVoucher = await GiftVoucher.findById(id).lean()

    if (!giftVoucher) {
      return { success: false, error: "Gift voucher not found" }
    }

    return { success: true, giftVoucher }
  } catch (error) {
    logger.error("Error fetching gift voucher:", error)
    return { success: false, error: "Failed to fetch gift voucher" }
  }
}

// הפעלה/השבתה של שובר מתנה
export async function toggleGiftVoucherStatus(id: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const giftVoucher = await GiftVoucher.findById(id)

    if (!giftVoucher) {
      return { success: false, error: "Gift voucher not found" }
    }

    giftVoucher.isActive = !giftVoucher.isActive
    await giftVoucher.save()

    revalidatePath("/dashboard/admin/gift-vouchers")

    return { success: true, giftVoucher }
  } catch (error) {
    logger.error("Error toggling gift voucher status:", error)
    return { success: false, error: "Failed to toggle gift voucher status" }
  }
}
