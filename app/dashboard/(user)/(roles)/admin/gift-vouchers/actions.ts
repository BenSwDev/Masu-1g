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
  purchaserUserId?: string | null
  purchaserName?: string
  ownerUserId?: string | null
  ownerName?: string
  guestInfo?: {
    name: string
    email: string
    phone: string
  }
  isGift: boolean
  recipientName?: string
  recipientPhone?: string
  recipientEmail?: string
  greetingMessage?: string
  giftMessage?: string
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
  paymentAmount?: number
  paymentMethodId?: string
  transactionId?: string
  notes?: string
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
    guestInfo: doc.guestInfo,
    isGift: doc.isGift,
    recipientName: doc.recipientName,
    recipientPhone: doc.recipientPhone,
    recipientEmail: doc.recipientEmail,
    greetingMessage: doc.greetingMessage,
    giftMessage: doc.giftMessage,
    sendDate: doc.sendDate,
    status: doc.status,
    purchaseDate: doc.purchaseDate,
    validFrom: doc.validFrom,
    validUntil: doc.validUntil,
    paymentId: doc.paymentId,
    paymentAmount: doc.paymentAmount,
    paymentMethodId: doc.paymentMethodId,
    transactionId: doc.transactionId,
    notes: doc.notes,
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

    let giftVoucherDocs: any[]
    let total: number

    if (search) {
      // Use aggregation pipeline for complex search across populated fields and guest info
      const searchRegex = new RegExp(search, 'i')
      
      const pipeline: any[] = [
        {
          $lookup: {
            from: "users",
            localField: "purchaserUserId",
            foreignField: "_id",
            as: "purchaser"
          }
        },
        {
          $lookup: {
            from: "users",
            localField: "ownerUserId",
            foreignField: "_id",
            as: "owner"
          }
        },
        {
          $lookup: {
            from: "treatments",
            localField: "treatmentId",
            foreignField: "_id",
            as: "treatment"
          }
        },
        {
          $match: {
            $or: [
              { "purchaser.name": searchRegex },
              { "purchaser.email": searchRegex },
              { "owner.name": searchRegex },
              { "owner.email": searchRegex },
              { "guestInfo.name": searchRegex },
              { "guestInfo.email": searchRegex },
              { "guestInfo.phone": searchRegex },
              { "treatment.name": searchRegex },
              { "code": searchRegex },
              { "recipientName": searchRegex }
            ]
          }
        },
        {
          $addFields: {
            purchaserUserId: { $arrayElemAt: ["$purchaser", 0] },
            ownerUserId: { $arrayElemAt: ["$owner", 0] },
            treatmentId: { $arrayElemAt: ["$treatment", 0] }
          }
        },
        {
          $unset: ["purchaser", "owner", "treatment"]
        },
        { $sort: { purchaseDate: -1 } }
      ]

      // Apply filters to the pipeline
      const matchStage: any = {}
      if (filters?.voucherType) {
        matchStage.voucherType = filters.voucherType
      }
      if (filters?.status) {
        matchStage.status = filters.status
      }
      if (filters?.dateRange) {
        if (filters.dateRange.from) {
          matchStage.purchaseDate = { ...matchStage.purchaseDate, $gte: new Date(filters.dateRange.from) }
        }
        if (filters.dateRange.to) {
          matchStage.purchaseDate = { ...matchStage.purchaseDate, $lte: new Date(filters.dateRange.to) }
        }
      }
      
      if (Object.keys(matchStage).length > 0) {
        pipeline.splice(pipeline.length - 1, 0, { $match: matchStage })
      }

      // Get total count
      const countPipeline = [...pipeline, { $count: "total" }]
      const countResult = await mongoose.model("GiftVoucher").aggregate(countPipeline)
      total = countResult[0]?.total || 0

      // Get paginated results
      const dataPipeline = [...pipeline, { $skip: (page - 1) * limit }, { $limit: limit }]
      giftVoucherDocs = await mongoose.model("GiftVoucher").aggregate(dataPipeline)
    } else {
      // Use regular query when no search term
      const query: any = {}

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

      total = await mongoose.model("GiftVoucher").countDocuments(query)
      const skip = (page - 1) * limit

      giftVoucherDocs = await mongoose.model("GiftVoucher").find(query)
        .sort({ purchaseDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    }

    // Transform documents to plain objects
    const giftVouchers = await Promise.all(
      giftVoucherDocs.map(async (doc: any) => {
        try {
          // Enhanced transformation with guest info support
          let purchaserName, ownerName, treatmentName, selectedDurationName

          // Handle purchaser name (user or guest)
          if (doc.purchaserUserId) {
            const purchaser = await mongoose.model("User").findById(doc.purchaserUserId).select("name").lean() as any
            purchaserName = purchaser?.name
          } else if (doc.guestInfo) {
            purchaserName = doc.guestInfo.name
          }

          // Handle owner name (user or guest)
          if (doc.ownerUserId) {
            const owner = await mongoose.model("User").findById(doc.ownerUserId).select("name").lean() as any
            ownerName = owner?.name
          } else if (doc.guestInfo) {
            ownerName = doc.guestInfo.name
          }

          // Handle treatment details
          if (doc.voucherType === "treatment" && doc.treatmentId) {
            const treatment = await mongoose.model("Treatment").findById(doc.treatmentId)
              .select("name durations")
              .lean() as any
            treatmentName = treatment?.name
            
            if (doc.selectedDurationId && treatment?.durations) {
              const duration = treatment.durations.find((d: any) => 
                d._id.toString() === doc.selectedDurationId.toString()
              )
              selectedDurationName = duration?.minutes ? `${duration.minutes} min` : undefined
            }
          }

          return {
            ...toGiftVoucherPlain(doc),
            purchaserName,
            ownerName,
            treatmentName,
            selectedDurationName,
            guestInfo: doc.guestInfo // Include guest info in response
          }
        } catch (error) {
          logger.warn("Error transforming gift voucher", { voucherId: doc._id, error })
          return toGiftVoucherPlain(doc)
        }
      })
    )

    const totalPages = Math.ceil(total / limit)

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