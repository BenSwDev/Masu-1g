"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import GiftVoucher from "@/lib/db/models/gift-voucher"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"
import { GiftVoucherPlain } from "@/components/dashboard/admin/gift-vouchers/gift-voucher-form"

const toGiftVoucherPlain = (voucher: any): GiftVoucherPlain => ({
  _id: String(voucher._id),
  code: voucher.code,
  value: voucher.value,
  validFrom: new Date(voucher.validFrom),
  validUntil: new Date(voucher.validUntil),
  isActive: voucher.isActive,
  createdAt: voucher.createdAt ? new Date(voucher.createdAt) : undefined,
  updatedAt: voucher.updatedAt ? new Date(voucher.updatedAt) : undefined,
})

export async function createGiftVoucher(data: FormData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const voucher = new GiftVoucher({
      code: data.get("code"),
      value: Number(data.get("value")),
      validFrom: new Date(data.get("validFrom") as string),
      validUntil: new Date(data.get("validUntil") as string),
      isActive: data.get("isActive") === "true",
    })

    await voucher.save()

    revalidatePath("/dashboard/admin/gift-vouchers")

    return {
      success: true,
      giftVoucher: toGiftVoucherPlain(voucher),
    }
  } catch (error) {
    logger.error("Error creating gift voucher:", error)
    return { success: false, error: "Failed to create gift voucher" }
  }
}

export async function updateGiftVoucher(id: string, data: FormData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const voucher = await GiftVoucher.findByIdAndUpdate(
      id,
      {
        code: data.get("code"),
        value: Number(data.get("value")),
        validFrom: new Date(data.get("validFrom") as string),
        validUntil: new Date(data.get("validUntil") as string),
        isActive: data.get("isActive") === "true",
      },
      { new: true }
    )

    if (!voucher) {
      return { success: false, error: "Gift voucher not found" }
    }

    revalidatePath("/dashboard/admin/gift-vouchers")

    return {
      success: true,
      giftVoucher: toGiftVoucherPlain(voucher),
    }
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

    const voucher = await GiftVoucher.findByIdAndDelete(id)

    if (!voucher) {
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
    const serialized = giftVouchers.map(v => ({
      ...v,
      _id: v._id.toString(),
      validFrom: v.validFrom?.toISOString?.() ?? v.validFrom,
      validUntil: v.validUntil?.toISOString?.() ?? v.validUntil,
      createdAt: v.createdAt?.toISOString?.() ?? v.createdAt,
      updatedAt: v.updatedAt?.toISOString?.() ?? v.updatedAt,
    }))

    return { success: true, giftVouchers: serialized }
  } catch (error) {
    logger.error("Error fetching gift vouchers:", error)
    return { success: false, error: "Failed to fetch gift vouchers" }
  }
}

export async function getGiftVouchers(page = 1, search = "", isActive?: boolean) {
  try {
    await dbConnect()

    const query: any = {}
    if (search) {
      query.code = { $regex: search, $options: "i" }
    }
    if (isActive !== undefined) {
      query.isActive = isActive
    }

    const limit = 10
    const skip = (page - 1) * limit

    const [giftVouchers, total] = await Promise.all([
      GiftVoucher.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      GiftVoucher.countDocuments(query),
    ])

    return {
      success: true,
      giftVouchers: giftVouchers.map(toGiftVoucherPlain),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  } catch (error) {
    logger.error("Error fetching gift vouchers:", error)
    return {
      success: false,
      error: "Failed to fetch gift vouchers",
    }
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

    const serialized = giftVouchers.map(v => ({
      ...v,
      _id: v._id.toString(),
      validFrom: v.validFrom?.toISOString?.() ?? v.validFrom,
      validUntil: v.validUntil?.toISOString?.() ?? v.validUntil,
      createdAt: v.createdAt?.toISOString?.() ?? v.createdAt,
      updatedAt: v.updatedAt?.toISOString?.() ?? v.updatedAt,
    }))

    return {
      success: true,
      giftVouchers: serialized,
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
