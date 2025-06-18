"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { type IGiftVoucher } from "@/lib/db/models/gift-voucher"
import { type IUser } from "@/lib/db/models/user"
import { type ITreatment } from "@/lib/db/models/treatment"
import { dbConnect } from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"
import mongoose from "mongoose"

// Types
export interface GiftVoucherPlain {
  _id: string
  code: string
  voucherType: "treatment" | "monetary"
  amount: number
  treatmentId?: string
  treatmentName?: string
  selectedDurationId?: string
  selectedDurationName?: string
  monetaryValue?: number
  originalAmount?: number
  remainingAmount?: number
  purchaserUserId: string
  purchaserName?: string
  ownerUserId: string
  ownerName?: string
  isGift: boolean
  recipientName?: string
  recipientPhone?: string
  greetingMessage?: string
  sendDate?: Date | string
  status:
    | "pending_payment"
    | "active"
    | "partially_used"
    | "fully_used"
    | "expired"
    | "pending_send"
    | "sent"
    | "cancelled"
  purchaseDate: Date | string
  validFrom: Date | string
  validUntil: Date | string
  paymentId?: string
  usageHistory?: { date: Date | string; amountUsed: number; orderId?: string; description?: string }[]
  isActive: boolean
  createdAt?: Date | string
  updatedAt?: Date | string
}

export interface GetGiftVouchersOptions {
  page?: number
  limit?: number
  search?: string
  filters?: {
    voucherType?: "treatment" | "monetary"
    status?: IGiftVoucher["status"]
    dateRange?: { from?: string; to?: string }
  }
}

export interface GetGiftVouchersResult {
  success: boolean
  giftVouchers?: GiftVoucherPlain[]
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
  error?: string
}

export interface GetTreatmentsForSelectionResult {
  success: boolean
  treatments?: Array<{
    _id: string
    name: string
    durations: Array<{
      _id: string
      minutes: number
      price: number
    }>
  }>
  error?: string
}

export interface GetUsersForAdminSelectionResult {
  success: boolean
  users?: Array<{
    _id: string
    name: string
    email: string
  }>
  error?: string
}

/**
 * Transforms a MongoDB gift voucher document into a plain object
 */
function toGiftVoucherPlain(doc: any): GiftVoucherPlain {
  return {
    _id: doc._id.toString(),
    code: doc.code,
    voucherType: doc.voucherType,
    amount: doc.amount,
    treatmentId: doc.treatmentId?.toString(),
    treatmentName: doc.treatmentName,
    selectedDurationId: doc.selectedDurationId?.toString(),
    selectedDurationName: doc.selectedDurationName,
    monetaryValue: doc.monetaryValue,
    originalAmount: doc.originalAmount,
    remainingAmount: doc.remainingAmount,
    purchaserUserId: doc.purchaserUserId?.toString() || "",
    purchaserName: doc.purchaserName,
    ownerUserId: doc.ownerUserId?.toString() || "",
    ownerName: doc.ownerName,
    isGift: doc.isGift,
    recipientName: doc.recipientName,
    recipientPhone: doc.recipientPhone,
    greetingMessage: doc.greetingMessage,
    sendDate: doc.sendDate,
    status: doc.status,
    purchaseDate: doc.purchaseDate,
    validFrom: doc.validFrom,
    validUntil: doc.validUntil,
    paymentId: doc.paymentId,
    usageHistory: doc.usageHistory?.map((usage: any) => ({
      date: usage.date,
      amountUsed: usage.amountUsed,
      orderId: usage.orderId?.toString(),
      description: usage.description,
    })),
    isActive: doc.isActive,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

/**
 * Fetches a list of gift vouchers with pagination and filtering options
 */
export async function getGiftVouchers(
  page = 1,
  limit = 10,
  search = "",
  filters: GetGiftVouchersOptions["filters"] = {},
): Promise<GetGiftVouchersResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const query: any = {}

    // Search by user name or email
    if (search) {
      const users = await mongoose.model("User").find({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }).select("_id")
      const userIds = users.map((user: any) => user._id)
      query.$or = [
        { purchaserUserId: { $in: userIds } },
        { ownerUserId: { $in: userIds } },
        { code: { $regex: search, $options: "i" } },
      ]
    }

    // Apply filters
    if (filters?.voucherType) {
      query.voucherType = filters.voucherType
    }
    if (filters?.status) {
      query.status = filters.status
    }
    if (filters?.dateRange) {
      if (filters.dateRange.from) {
        query.purchaseDate = { ...query.purchaseDate, $gte: new Date(filters.dateRange.from) }
      }
      if (filters.dateRange.to) {
        query.purchaseDate = { ...query.purchaseDate, $lte: new Date(filters.dateRange.to) }
      }
    }

    const total = await mongoose.model("GiftVoucher").countDocuments(query)
    const totalPages = Math.ceil(total / limit)
    const skip = (page - 1) * limit

    const giftVoucherDocs = await mongoose.model("GiftVoucher").find(query)
      .sort({ purchaseDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const giftVouchers = giftVoucherDocs.map((doc: any) => toGiftVoucherPlain(doc))

    return {
      success: true,
      giftVouchers,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    }
  } catch (error) {
    logger.error("Error in getGiftVouchers:", error)
    return { success: false, error: "Failed to fetch gift vouchers" }
  }
}

/**
 * Fetches a list of active treatments for selection in forms
 */
export async function getTreatmentsForSelection(): Promise<GetTreatmentsForSelectionResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const treatments = await mongoose.model("Treatment").find({ isActive: true })
      .select("name durations")
      .lean()

    return {
      success: true,
      treatments: treatments.map((treatment: any) => ({
        _id: treatment._id.toString(),
        name: treatment.name,
        durations: treatment.durations?.map((duration: any) => ({
          _id: duration._id.toString(),
          minutes: duration.minutes,
          price: duration.price,
        })) || [],
      })),
    }
  } catch (error) {
    logger.error("Error in getTreatmentsForSelection:", error)
    return { success: false, error: "Failed to fetch treatments" }
  }
}

/**
 * Fetches a list of users for selection in forms
 */
export async function getUsersForAdminSelection(): Promise<GetUsersForAdminSelectionResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const users = await mongoose.model("User").find()
      .select("name email")
      .sort({ name: 1 })
      .lean()

    return {
      success: true,
      users: users.map((user: any) => ({
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
      })),
    }
  } catch (error) {
    logger.error("Error in getUsersForAdminSelection:", error)
    return { success: false, error: "Failed to fetch users" }
  }
} 