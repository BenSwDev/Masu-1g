"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import mongoose from "mongoose"
import { authOptions } from "@/lib/auth/auth"
import { GiftVoucher } from "@/lib/db/models/gift-voucher"
import { connectToDatabase } from "@/lib/db/mongodb"
import { NotificationManager } from "@/lib/notifications/notification-manager"
import { generateRandomCode } from "@/lib/utils/utils"

// Types for gift voucher operations
export type GiftVoucherFormData = {
  amount: number
  recipientName: string
  recipientEmail: string
  senderName: string
  senderEmail: string
  message: string
  expiryDate: Date | string
  paymentId?: string
}

export type GiftVoucherResponse = {
  success: boolean
  message: string
  voucher?: any
  vouchers?: any[]
  error?: any
}

// Create a new gift voucher
export async function createGiftVoucher(formData: GiftVoucherFormData): Promise<GiftVoucherResponse> {
  try {
    await connectToDatabase()

    const session = await getServerSession(authOptions)
    if (!session) {
      return {
        success: false,
        message: "Unauthorized access",
      }
    }

    // Generate unique code
    const code = generateRandomCode(8)

    // Create new gift voucher
    const voucher = new GiftVoucher({
      ...formData,
      code,
      expiryDate: new Date(formData.expiryDate),
      isRedeemed: false,
      purchasedBy: session.user.id,
    })

    await voucher.save()

    // Send notification to recipient
    try {
      const notificationManager = new NotificationManager()
      await notificationManager.sendGiftVoucherNotification({
        recipientEmail: formData.recipientEmail,
        recipientName: formData.recipientName,
        senderName: formData.senderName,
        code: code,
        amount: formData.amount,
        message: formData.message,
        expiryDate: new Date(formData.expiryDate),
      })
    } catch (notificationError) {
      console.error("Error sending gift voucher notification:", notificationError)
      // Continue even if notification fails
    }

    revalidatePath("/dashboard/member/gift-vouchers")

    return {
      success: true,
      message: "Gift voucher created and sent successfully",
      voucher: voucher.toObject(),
    }
  } catch (error: any) {
    console.error("Error creating gift voucher:", error)
    return {
      success: false,
      message: "Failed to create gift voucher",
      error: error.message,
    }
  }
}

// Redeem a gift voucher
export async function redeemGiftVoucher(code: string): Promise<GiftVoucherResponse> {
  try {
    await connectToDatabase()

    const session = await getServerSession(authOptions)
    if (!session) {
      return {
        success: false,
        message: "Unauthorized access",
      }
    }

    // Find voucher by code
    const voucher = await GiftVoucher.findOne({ code: code.toUpperCase() })

    if (!voucher) {
      return {
        success: false,
        message: "Invalid voucher code",
      }
    }

    // Check if voucher is already redeemed
    if (voucher.isRedeemed) {
      return {
        success: false,
        message: "Voucher has already been redeemed",
      }
    }

    // Check if voucher is expired
    if (new Date() > voucher.expiryDate) {
      return {
        success: false,
        message: "Voucher has expired",
      }
    }

    // Redeem voucher
    voucher.isRedeemed = true
    voucher.redeemedBy = new mongoose.Types.ObjectId(session.user.id)
    voucher.redeemedAt = new Date()

    await voucher.save()

    revalidatePath("/dashboard/member/gift-vouchers")

    return {
      success: true,
      message: "Voucher redeemed successfully",
      voucher: voucher.toObject(),
    }
  } catch (error: any) {
    console.error("Error redeeming gift voucher:", error)
    return {
      success: false,
      message: "Failed to redeem voucher",
      error: error.message,
    }
  }
}

// Get all gift vouchers (admin)
export async function getAdminGiftVouchers(
  searchQuery = "",
  sortField = "createdAt",
  sortDirection: "asc" | "desc" = "desc",
  page = 1,
  limit = 10,
  filterRedeemed?: boolean,
): Promise<GiftVoucherResponse> {
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
        { recipientName: { $regex: searchQuery, $options: "i" } },
        { recipientEmail: { $regex: searchQuery, $options: "i" } },
        { senderName: { $regex: searchQuery, $options: "i" } },
        { senderEmail: { $regex: searchQuery, $options: "i" } },
      ]
    }

    // Add redeemed filter
    if (filterRedeemed !== undefined) {
      query.isRedeemed = filterRedeemed
    }

    // Count total documents
    const totalVouchers = await GiftVoucher.countDocuments(query)

    // Get vouchers with pagination and sorting
    const vouchers = await GiftVoucher.find(query)
      .sort({ [sortField]: sortDirection === "asc" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("purchasedBy", "name email")
      .populate("redeemedBy", "name email")
      .lean()

    return {
      success: true,
      message: "Gift vouchers retrieved successfully",
      vouchers,
      total: totalVouchers,
      page,
      limit,
      totalPages: Math.ceil(totalVouchers / limit),
    }
  } catch (error: any) {
    console.error("Error getting gift vouchers:", error)
    return {
      success: false,
      message: "Failed to retrieve gift vouchers",
      error: error.message,
    }
  }
}

// Get gift voucher by ID
export async function getGiftVoucherById(voucherId: string): Promise<GiftVoucherResponse> {
  try {
    await connectToDatabase()

    const session = await getServerSession(authOptions)
    if (!session) {
      return {
        success: false,
        message: "Unauthorized access",
      }
    }

    // Get voucher
    const voucher = await GiftVoucher.findById(voucherId)
      .populate("purchasedBy", "name email")
      .populate("redeemedBy", "name email")
      .lean()

    if (!voucher) {
      return {
        success: false,
        message: "Gift voucher not found",
      }
    }

    // Check if user is authorized to view this voucher
    if (
      session.user.role !== "admin" &&
      voucher.purchasedBy._id.toString() !== session.user.id &&
      (!voucher.redeemedBy || voucher.redeemedBy._id.toString() !== session.user.id)
    ) {
      return {
        success: false,
        message: "Unauthorized access to this voucher",
      }
    }

    return {
      success: true,
      message: "Gift voucher retrieved successfully",
      voucher,
    }
  } catch (error: any) {
    console.error("Error getting gift voucher:", error)
    return {
      success: false,
      message: "Failed to retrieve gift voucher",
      error: error.message,
    }
  }
}

// Get member gift vouchers (purchased and received)
export async function getMemberGiftVouchers(
  searchQuery = "",
  sortField = "createdAt",
  sortDirection: "asc" | "desc" = "desc",
  page = 1,
  limit = 10,
  type: "purchased" | "received" | "all" = "all",
): Promise<GiftVoucherResponse> {
  try {
    await connectToDatabase()

    const session = await getServerSession(authOptions)
    if (!session) {
      return {
        success: false,
        message: "Unauthorized access",
      }
    }

    // Build query
    const query: any = {}

    if (type === "purchased") {
      // Vouchers purchased by the user
      query.purchasedBy = session.user.id
    } else if (type === "received") {
      // Vouchers received by the user (by email or redeemed)
      query.$or = [{ recipientEmail: session.user.email }, { redeemedBy: session.user.id }]
    } else {
      // All vouchers related to the user
      query.$or = [
        { purchasedBy: session.user.id },
        { recipientEmail: session.user.email },
        { redeemedBy: session.user.id },
      ]
    }

    // Add search filter
    if (searchQuery) {
      const searchConditions = [
        { code: { $regex: searchQuery, $options: "i" } },
        { recipientName: { $regex: searchQuery, $options: "i" } },
        { senderName: { $regex: searchQuery, $options: "i" } },
      ]

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }]
        delete query.$or
      } else {
        query.$or = searchConditions
      }
    }

    // Count total documents
    const totalVouchers = await GiftVoucher.countDocuments(query)

    // Get vouchers with pagination and sorting
    const vouchers = await GiftVoucher.find(query)
      .sort({ [sortField]: sortDirection === "asc" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("purchasedBy", "name email")
      .populate("redeemedBy", "name email")
      .lean()

    return {
      success: true,
      message: "Gift vouchers retrieved successfully",
      vouchers,
      total: totalVouchers,
      page,
      limit,
      totalPages: Math.ceil(totalVouchers / limit),
    }
  } catch (error: any) {
    console.error("Error getting member gift vouchers:", error)
    return {
      success: false,
      message: "Failed to retrieve gift vouchers",
      error: error.message,
    }
  }
}

// Resend gift voucher notification
export async function resendGiftVoucherNotification(voucherId: string): Promise<GiftVoucherResponse> {
  try {
    await connectToDatabase()

    const session = await getServerSession(authOptions)
    if (!session) {
      return {
        success: false,
        message: "Unauthorized access",
      }
    }

    // Get voucher
    const voucher = await GiftVoucher.findById(voucherId)

    if (!voucher) {
      return {
        success: false,
        message: "Gift voucher not found",
      }
    }

    // Check if user is authorized to resend this voucher
    if (session.user.role !== "admin" && voucher.purchasedBy.toString() !== session.user.id) {
      return {
        success: false,
        message: "Unauthorized access to resend this voucher",
      }
    }

    // Send notification to recipient
    try {
      const notificationManager = new NotificationManager()
      await notificationManager.sendGiftVoucherNotification({
        recipientEmail: voucher.recipientEmail,
        recipientName: voucher.recipientName,
        senderName: voucher.senderName,
        code: voucher.code,
        amount: voucher.amount,
        message: voucher.message,
        expiryDate: voucher.expiryDate,
      })
    } catch (notificationError) {
      console.error("Error resending gift voucher notification:", notificationError)
      return {
        success: false,
        message: "Failed to resend notification",
        error: notificationError,
      }
    }

    return {
      success: true,
      message: "Gift voucher notification resent successfully",
      voucher: voucher.toObject(),
    }
  } catch (error: any) {
    console.error("Error resending gift voucher notification:", error)
    return {
      success: false,
      message: "Failed to resend gift voucher notification",
      error: error.message,
    }
  }
}

// Validate gift voucher code
export async function validateGiftVoucher(code: string): Promise<GiftVoucherResponse> {
  try {
    await connectToDatabase()

    // Find voucher by code
    const voucher = await GiftVoucher.findOne({ code: code.toUpperCase() })

    if (!voucher) {
      return {
        success: false,
        message: "Invalid voucher code",
      }
    }

    // Check if voucher is already redeemed
    if (voucher.isRedeemed) {
      return {
        success: false,
        message: "Voucher has already been redeemed",
      }
    }

    // Check if voucher is expired
    if (new Date() > voucher.expiryDate) {
      return {
        success: false,
        message: "Voucher has expired",
      }
    }

    return {
      success: true,
      message: "Voucher is valid",
      voucher: {
        code: voucher.code,
        amount: voucher.amount,
        recipientName: voucher.recipientName,
        senderName: voucher.senderName,
        expiryDate: voucher.expiryDate,
      },
    }
  } catch (error: any) {
    console.error("Error validating gift voucher:", error)
    return {
      success: false,
      message: "Failed to validate voucher",
      error: error.message,
    }
  }
}
