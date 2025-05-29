"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import GiftVoucher, {
  type IGiftVoucher,
  type GiftVoucherPlain as IGiftVoucherPlain,
} from "@/lib/db/models/gift-voucher"
import User from "@/lib/db/models/user"
import Treatment from "@/lib/db/models/treatment"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"
import { notificationManager } from "@/lib/notifications/notification-manager"
import type { FilterQuery } from "mongoose"
import mongoose from "mongoose"

// Extended GiftVoucherPlain for client-side use, including populated fields
export interface GiftVoucherPlain extends IGiftVoucherPlain {
  _id: string
  code: string
  voucherType: "treatment" | "monetary"
  treatmentId?: string
  treatmentName?: string // For display
  selectedDurationId?: string
  selectedDurationName?: string // For display
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
  sendDate?: Date | string // Allow string for form input
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
  usageHistory?: { date: Date; amountUsed: number; orderId?: string }[]
  isActive: boolean
  createdAt?: Date | string
  updatedAt?: Date | string
}

// Helper to convert Mongoose document to plain object for client
// Now includes population for purchaser and owner names, and treatment details
async function toGiftVoucherPlain(voucherDoc: IGiftVoucher): Promise<GiftVoucherPlain> {
  try {
    const voucher = voucherDoc.toObject({ virtuals: true }) as any

    let purchaserName, ownerName, treatmentName, selectedDurationName

    if (voucher.purchaserUserId) {
      const purchaser = await User.findById(voucher.purchaserUserId).select("name").lean()
      purchaserName = purchaser?.name
    }
    if (voucher.ownerUserId) {
      const owner = await User.findById(voucher.ownerUserId).select("name").lean()
      ownerName = owner?.name
    }
    if (voucher.voucherType === "treatment" && voucher.treatmentId) {
      const treatment = (await Treatment.findById(voucher.treatmentId).select("name durations").lean()) as any
      treatmentName = treatment?.name
      if (voucher.selectedDurationId && treatment?.durations) {
        const duration = treatment.durations.find(
          (d: any) => d._id.toString() === voucher.selectedDurationId.toString(),
        )
        selectedDurationName = duration?.name // Assuming duration object has a 'name' field
      }
    }

    return {
      _id: String(voucher._id),
      code: voucher.code,
      voucherType: voucher.voucherType,
      treatmentId: voucher.treatmentId?.toString(),
      treatmentName,
      selectedDurationId: voucher.selectedDurationId?.toString(),
      selectedDurationName,
      monetaryValue: voucher.monetaryValue,
      originalAmount: voucher.originalAmount,
      remainingAmount: voucher.remainingAmount,
      purchaserUserId: voucher.purchaserUserId.toString(),
      purchaserName,
      ownerUserId: voucher.ownerUserId.toString(),
      ownerName,
      isGift: voucher.isGift,
      recipientName: voucher.recipientName,
      recipientPhone: voucher.recipientPhone,
      greetingMessage: voucher.greetingMessage,
      sendDate: voucher.sendDate ? new Date(voucher.sendDate).toISOString() : undefined,
      status: voucher.status,
      purchaseDate: new Date(voucher.purchaseDate).toISOString(),
      validFrom: new Date(voucher.validFrom).toISOString(),
      validUntil: new Date(voucher.validUntil).toISOString(),
      paymentId: voucher.paymentId,
      usageHistory: voucher.usageHistory?.map((h: any) => ({
        ...h,
        date: new Date(h.date).toISOString(),
        orderId: h.orderId?.toString(),
      })),
      isActive: voucher.isActive,
      createdAt: voucher.createdAt ? new Date(voucher.createdAt).toISOString() : undefined,
      updatedAt: voucher.updatedAt ? new Date(voucher.updatedAt).toISOString() : undefined,
    }
  } catch (error) {
    logger.error("Error in toGiftVoucherPlain:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      voucherId: voucherDoc._id.toString(),
    })
    // Return a basic version if population fails
    const voucher = voucherDoc.toObject({ virtuals: true }) as any
    return {
      _id: String(voucher._id),
      code: voucher.code,
      voucherType: voucher.voucherType,
      treatmentId: voucher.treatmentId?.toString(),
      purchaserUserId: voucher.purchaserUserId.toString(),
      ownerUserId: voucher.ownerUserId.toString(),
      isGift: voucher.isGift,
      status: voucher.status,
      purchaseDate: new Date(voucher.purchaseDate).toISOString(),
      validFrom: new Date(voucher.validFrom).toISOString(),
      validUntil: new Date(voucher.validUntil).toISOString(),
      isActive: voucher.isActive,
    } as GiftVoucherPlain
  }
}

export interface AdminGiftVoucherFormData {
  code: string
  voucherType: "treatment" | "monetary"
  treatmentId?: string
  selectedDurationId?: string
  monetaryValue?: string // Comes as string from form
  ownerUserId: string
  validFrom: string // Comes as string (date) from form
  validUntil: string // Comes as string (date) from form
  isActive: boolean
  status?: GiftVoucherPlain["status"] // Optional, admin might set it
}

export async function createGiftVoucherByAdmin(data: AdminGiftVoucherFormData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    // --- Begin Input Validation ---
    if (!data.code || typeof data.code !== "string" || data.code.trim() === "") {
      return { success: false, error: "Code is required." }
    }
    if (!data.voucherType || (data.voucherType !== "monetary" && data.voucherType !== "treatment")) {
      return { success: false, error: "Valid voucher type is required." }
    }
    if (!data.ownerUserId || typeof data.ownerUserId !== "string" || data.ownerUserId.trim() === "") {
      return { success: false, error: "Owner User ID is required." }
    }
    if (!data.validFrom || typeof data.validFrom !== "string" || isNaN(new Date(data.validFrom).getTime())) {
      return { success: false, error: "Valid 'valid from' date is required." }
    }
    if (!data.validUntil || typeof data.validUntil !== "string" || isNaN(new Date(data.validUntil).getTime())) {
      return { success: false, error: "Valid 'valid until' date is required." }
    }
    if (new Date(data.validFrom) >= new Date(data.validUntil)) {
      return { success: false, error: "'Valid from' date must be before 'valid until' date." }
    }

    if (data.voucherType === "monetary") {
      if (data.monetaryValue === undefined || data.monetaryValue === null || data.monetaryValue.trim() === "") {
        return { success: false, error: "Monetary value is required for monetary voucher." }
      }
      const val = Number(data.monetaryValue)
      if (isNaN(val) || val <= 0) {
        return { success: false, error: "Invalid monetary value. Must be a positive number." }
      }
    } else if (data.voucherType === "treatment") {
      if (!data.treatmentId || typeof data.treatmentId !== "string" || data.treatmentId.trim() === "") {
        return { success: false, error: "Treatment ID is required for treatment voucher." }
      }
    }
    // --- End Input Validation ---

    const {
      code,
      voucherType,
      treatmentId,
      selectedDurationId,
      monetaryValue,
      ownerUserId,
      validFrom,
      validUntil,
      isActive,
      status,
    } = data

    const owner = await User.findById(ownerUserId)
    if (!owner) {
      return { success: false, error: "Owner user not found." }
    }

    const giftVoucherData: Partial<IGiftVoucher> = {
      code,
      voucherType,
      purchaserUserId: new mongoose.Types.ObjectId(session.user.id), // Admin is the purchaser
      ownerUserId: new mongoose.Types.ObjectId(ownerUserId),
      validFrom: new Date(validFrom),
      validUntil: new Date(validUntil),
      isActive,
      isGift: false, // Admin created vouchers are not gifts by default unless specified
      status: status || "active", // Default to active if not specified
      purchaseDate: new Date(),
    }

    if (voucherType === "monetary") {
      const val = Number(monetaryValue)
      if (isNaN(val) || val <= 0) {
        return { success: false, error: "Invalid monetary value." }
      }
      giftVoucherData.monetaryValue = val
      giftVoucherData.originalAmount = val
      giftVoucherData.remainingAmount = val
    } else if (voucherType === "treatment") {
      if (!treatmentId) {
        return { success: false, error: "Treatment ID is required for treatment voucher." }
      }
      const treatment = (await Treatment.findById(treatmentId).lean()) as any
      if (!treatment) {
        return { success: false, error: "Treatment not found." }
      }
      giftVoucherData.treatmentId = new mongoose.Types.ObjectId(treatmentId)
      // Assuming price comes from treatment or duration
      // For simplicity, let's say treatment has a base price or duration has a price
      // This part needs to be adapted based on your Treatment/Duration model structure
      let price = treatment.price || 0
      if (selectedDurationId && treatment.durations) {
        const duration = treatment.durations.find((d: any) => d._id.toString() === selectedDurationId)
        if (duration && typeof duration.price === "number") {
          price = duration.price
        }
        giftVoucherData.selectedDurationId = new mongoose.Types.ObjectId(selectedDurationId)
      }
      giftVoucherData.monetaryValue = price // Store the "value" of the treatment
    } else {
      return { success: false, error: "Invalid voucher type." }
    }

    const newVoucher = new GiftVoucher(giftVoucherData)
    await newVoucher.save()

    revalidatePath("/dashboard/admin/gift-vouchers")

    return {
      success: true,
      giftVoucher: await toGiftVoucherPlain(newVoucher),
    }
  } catch (error) {
    logger.error("Error creating gift voucher by admin:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      details: error,
    })
    const errorMessage = error instanceof Error ? error.message : "Failed to create gift voucher"
    if (errorMessage.includes("duplicate key error")) {
      return { success: false, error: "Gift voucher code already exists." }
    }
    return { success: false, error: errorMessage }
  }
}

export async function updateGiftVoucherByAdmin(id: string, data: Partial<AdminGiftVoucherFormData>) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    // --- Begin Input Validation for Update ---
    if (data.validFrom && (typeof data.validFrom !== "string" || isNaN(new Date(data.validFrom).getTime()))) {
      return { success: false, error: "Invalid 'valid from' date." }
    }
    if (data.validUntil && (typeof data.validUntil !== "string" || isNaN(new Date(data.validUntil).getTime()))) {
      return { success: false, error: "Invalid 'valid until' date." }
    }

    const existingVoucher = await GiftVoucher.findById(id).lean() // Fetch existing to compare dates if one is not provided
    if (!existingVoucher) {
      return { success: false, error: "Gift voucher not found" }
    }

    const checkValidFrom = data.validFrom ? new Date(data.validFrom) : existingVoucher.validFrom
    const checkValidUntil = data.validUntil ? new Date(data.validUntil) : existingVoucher.validUntil

    if (checkValidFrom >= checkValidUntil) {
      return { success: false, error: "'Valid from' date must be before 'valid until' date." }
    }

    if (data.monetaryValue !== undefined) {
      const val = Number(data.monetaryValue)
      if (String(data.monetaryValue).trim() === "" || isNaN(val) || val < 0) {
        return { success: false, error: "Invalid monetary value. Must be a non-negative number." }
      }
    }
    // --- End Input Validation for Update ---

    const updateData: any = { ...data }
    if (data.validFrom) updateData.validFrom = new Date(data.validFrom)
    if (data.validUntil) updateData.validUntil = new Date(data.validUntil)
    if (data.monetaryValue) {
      const val = Number(data.monetaryValue)
      if (isNaN(val) || val < 0) return { success: false, error: "Invalid monetary value." }
      updateData.monetaryValue = val
      // If admin changes monetary value, should it reset original/remaining?
      // For now, let's assume it updates the current value if monetary, or the treatment's effective value.
      // If it's a monetary voucher, and it's being updated, we might need to adjust remainingAmount.
      // This logic can be complex depending on business rules.
      // For simplicity, if monetaryValue is updated for a monetary voucher, let's update original and remaining if it's a new value.
      // This needs careful consideration based on how edits are intended to work.
    }
    if (data.ownerUserId) updateData.ownerUserId = new mongoose.Types.ObjectId(data.ownerUserId)
    if (data.treatmentId) updateData.treatmentId = new mongoose.Types.ObjectId(data.treatmentId)
    if (data.selectedDurationId) updateData.selectedDurationId = new mongoose.Types.ObjectId(data.selectedDurationId)

    const voucher = await GiftVoucher.findByIdAndUpdate(id, updateData, { new: true })

    if (!voucher) {
      return { success: false, error: "Gift voucher not found" }
    }

    revalidatePath("/dashboard/admin/gift-vouchers")

    return {
      success: true,
      giftVoucher: await toGiftVoucherPlain(voucher),
    }
  } catch (error) {
    logger.error("Error updating gift voucher by admin:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      details: error,
    })
    const errorMessage = error instanceof Error ? error.message : "Failed to update gift voucher"
    if (errorMessage.includes("duplicate key error")) {
      return { success: false, error: "Gift voucher code already exists." }
    }
    return { success: false, error: errorMessage }
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
    logger.error("Error deleting gift voucher:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      details: error,
    })
    return { success: false, error: "Failed to delete gift voucher" }
  }
}

export async function getGiftVouchers(
  page = 1,
  limit = 10,
  search = "",
  filters: {
    voucherType?: "treatment" | "monetary"
    status?: GiftVoucherPlain["status"]
    isActive?: boolean
    dateRange?: { from?: string; to?: string } // For validUntil or purchaseDate
  } = {},
) {
  try {
    await dbConnect()

    const query: FilterQuery<IGiftVoucher> = {}

    if (search) {
      const searchRegex = { $regex: search, $options: "i" }
      query.$or = [
        { code: searchRegex },
        // Add search by purchaser/owner name if IDs are provided or if we can join efficiently
        // This might require populating user details first or a more complex aggregation.
        // For now, searching by code.
      ]
    }

    if (filters.voucherType) {
      query.voucherType = filters.voucherType
    }
    if (filters.status) {
      query.status = filters.status
    }
    if (typeof filters.isActive === "boolean") {
      query.isActive = filters.isActive
    }
    if (filters.dateRange?.from && filters.dateRange?.to) {
      query.validUntil = { $gte: new Date(filters.dateRange.from), $lte: new Date(filters.dateRange.to) }
    } else if (filters.dateRange?.from) {
      query.validUntil = { $gte: new Date(filters.dateRange.from) }
    } else if (filters.dateRange?.to) {
      query.validUntil = { $lte: new Date(filters.dateRange.to) }
    }

    const skip = (page - 1) * limit

    const giftVoucherDocs = await GiftVoucher.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean() // Using lean for performance, but toGiftVoucherPlain will handle population

    const total = await GiftVoucher.countDocuments(query)

    const giftVouchers = await Promise.all(
      giftVoucherDocs.map((doc) => toGiftVoucherPlain(doc as any as IGiftVoucher)),
    ).catch((error) => {
      logger.error("Error transforming gift vouchers:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      return []
    })

    return {
      success: true,
      giftVouchers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  } catch (error) {
    logger.error("Error fetching gift vouchers:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      details: error,
    })
    return {
      success: false,
      error: "Failed to fetch gift vouchers",
      giftVouchers: [],
      pagination: { total: 0, page: 1, limit, totalPages: 0 },
    }
  }
}

// Placeholder for fetching treatments - adapt to your actual treatment actions
export async function getTreatmentsForSelection() {
  try {
    await dbConnect()
    // Assuming Treatment model has name and durations array
    // durations: [{ _id, name, price, durationInMinutes }]
    const treatments = await Treatment.find().select("name price durations").lean()
    return {
      success: true,
      treatments: treatments.map((t) => ({
        _id: t._id.toString(),
        name: t.name,
        price: (t as any).price, // if treatments have a base price
        durations:
          (t as any).durations?.map((d: any) => ({
            _id: d._id.toString(),
            name: d.name, // e.g., "30 minutes", "60 minutes"
            price: d.price,
          })) || [],
      })),
    }
  } catch (error) {
    logger.error("Error fetching treatments for selection:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      details: error,
    })
    return { success: false, error: "Failed to fetch treatments", treatments: [] }
  }
}

// Placeholder for fetching users (members) for admin assignment
export async function getUsersForAdminSelection() {
  try {
    await dbConnect()
    const users = await User.find({ roles: "member" }).select("_id name email").lean()
    return {
      success: true,
      users: users.map((u) => ({
        _id: u._id.toString(),
        name: u.name || u.email, // Fallback to email if name is not present
        email: u.email,
      })),
    }
  } catch (error) {
    logger.error("Error fetching users for admin selection:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      details: error,
    })
    return { success: false, error: "Failed to fetch users", users: [] }
  }
}

// --- Member facing actions ---

export interface PurchaseInitiationData {
  voucherType: "treatment" | "monetary"
  treatmentId?: string
  selectedDurationId?: string
  monetaryValue?: number
  isGift: boolean
}

export interface GiftDetailsPayload {
  recipientName: string
  recipientPhone: string
  greetingMessage?: string
  sendDate?: string // ISO string or "immediate"
}

export interface PaymentResultData {
  voucherId: string
  paymentId: string
  success: boolean
  amount: number
}

export async function initiatePurchaseGiftVoucher(data: PurchaseInitiationData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const { voucherType, treatmentId, selectedDurationId, monetaryValue, isGift } = data

    // Generate unique code
    const code = `GV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    const giftVoucherData: Partial<IGiftVoucher> = {
      code,
      voucherType,
      purchaserUserId: new mongoose.Types.ObjectId(session.user.id),
      ownerUserId: new mongoose.Types.ObjectId(session.user.id), // Initially, purchaser is owner
      isGift,
      status: "pending_payment",
      purchaseDate: new Date(),
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year validity
      isActive: true,
    }

    let calculatedPrice = 0

    if (voucherType === "monetary") {
      if (!monetaryValue || monetaryValue < 150) {
        return { success: false, error: "Minimum monetary value is 150 ILS" }
      }
      giftVoucherData.monetaryValue = monetaryValue
      giftVoucherData.originalAmount = monetaryValue
      giftVoucherData.remainingAmount = monetaryValue
      calculatedPrice = monetaryValue
    } else if (voucherType === "treatment") {
      if (!treatmentId) {
        return { success: false, error: "Treatment ID is required for treatment voucher" }
      }
      const treatment = (await Treatment.findById(treatmentId).lean()) as any
      if (!treatment) {
        return { success: false, error: "Treatment not found" }
      }
      giftVoucherData.treatmentId = new mongoose.Types.ObjectId(treatmentId)

      let price = treatment.price || 0
      if (selectedDurationId && treatment.durations) {
        const duration = treatment.durations.find((d: any) => d._id.toString() === selectedDurationId)
        if (duration && typeof duration.price === "number") {
          price = duration.price
        }
        giftVoucherData.selectedDurationId = new mongoose.Types.ObjectId(selectedDurationId)
      }
      giftVoucherData.monetaryValue = price
      calculatedPrice = price
    }

    const newVoucher = new GiftVoucher(giftVoucherData)
    await newVoucher.save()

    // In a real implementation, you would integrate with a payment provider here
    // For now, we'll return a mock payment URL
    const paymentUrl = `/dashboard/member/gift-vouchers/payment?voucherId=${newVoucher._id}&amount=${calculatedPrice}`

    return {
      success: true,
      voucherId: newVoucher._id.toString(),
      paymentUrl,
      amount: calculatedPrice,
    }
  } catch (error) {
    logger.error("Error initiating gift voucher purchase:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      details: error,
    })
    return { success: false, error: "Failed to initiate purchase" }
  }
}

export async function confirmGiftVoucherPurchase(data: PaymentResultData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const { voucherId, paymentId, success: paymentSuccess } = data

    const voucher = await GiftVoucher.findById(voucherId)
    if (!voucher) {
      return { success: false, error: "Voucher not found" }
    }

    if (voucher.purchaserUserId.toString() !== session.user.id) {
      return { success: false, error: "Unauthorized" }
    }

    if (paymentSuccess) {
      voucher.status = "active"
      voucher.paymentId = paymentId
      await voucher.save()

      revalidatePath("/dashboard/member/gift-vouchers")

      return {
        success: true,
        voucher: await toGiftVoucherPlain(voucher),
      }
    } else {
      voucher.status = "cancelled"
      await voucher.save()
      return { success: false, error: "Payment failed" }
    }
  } catch (error) {
    logger.error("Error confirming gift voucher purchase:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      details: error,
    })
    return { success: false, error: "Failed to confirm purchase" }
  }
}

export async function setGiftDetails(voucherId: string, details: GiftDetailsPayload) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const voucher = await GiftVoucher.findById(voucherId)
    if (!voucher) {
      return { success: false, error: "Voucher not found" }
    }

    if (voucher.purchaserUserId.toString() !== session.user.id) {
      return { success: false, error: "Unauthorized" }
    }

    const { recipientName, recipientPhone, greetingMessage, sendDate } = details

    voucher.recipientName = recipientName
    voucher.recipientPhone = recipientPhone
    voucher.greetingMessage = greetingMessage
    voucher.isGift = true

    if (sendDate === "immediate" || !sendDate) {
      voucher.sendDate = new Date()
      voucher.status = "sent"
      // In a real implementation, you would send SMS/email notification here
      try {
        // Send notification to recipient
        if (recipientPhone) {
          await notificationManager.sendNotification(
            "sms",
            { value: recipientPhone, name: recipientName },
            {
              type: "custom",
              message: `Hello ${recipientName}, you have received a gift voucher from ${session.user.name || "someone special"}! Your voucher code is: ${voucher.code}. ${greetingMessage || ""}`,
            },
          )
          logger.info(`Gift voucher SMS notification sent to ${recipientPhone} for voucher ${voucher.code}`)
        }
      } catch (notificationError) {
        logger.error("Failed to send gift voucher notification", {
          error: notificationError,
          voucherId: voucher._id.toString(),
          recipientPhone,
        })
        // Continue with the process even if notification fails
      }
    } else {
      voucher.sendDate = new Date(sendDate)
      voucher.status = "pending_send"
    }

    await voucher.save()

    revalidatePath("/dashboard/member/gift-vouchers")

    return {
      success: true,
      voucher: await toGiftVoucherPlain(voucher),
    }
  } catch (error) {
    logger.error("Error setting gift details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      details: error,
    })
    return { success: false, error: "Failed to set gift details" }
  }
}

export async function getMemberPurchasedVouchers() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const vouchers = await GiftVoucher.find({
      purchaserUserId: new mongoose.Types.ObjectId(session.user.id),
    })
      .sort({ createdAt: -1 })
      .lean()

    const vouchersPlain = await Promise.all(
      vouchers.map((doc) => toGiftVoucherPlain(doc as any as IGiftVoucher)),
    ).catch((error) => {
      logger.error("Error transforming purchased vouchers:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      return []
    })

    return {
      success: true,
      giftVouchers: vouchersPlain,
    }
  } catch (error) {
    logger.error("Error fetching member purchased vouchers:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      details: error,
    })
    return { success: false, error: "Failed to fetch purchased vouchers" }
  }
}

export async function getMemberOwnedVouchers() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const currentDate = new Date()
    const vouchers = await GiftVoucher.find({
      ownerUserId: new mongoose.Types.ObjectId(session.user.id),
      status: { $in: ["active", "partially_used"] },
      validFrom: { $lte: currentDate },
      validUntil: { $gte: currentDate },
      isActive: true,
    })
      .sort({ validUntil: 1 })
      .lean()

    const vouchersPlain = await Promise.all(
      vouchers.map((doc) => toGiftVoucherPlain(doc as any as IGiftVoucher)),
    ).catch((error) => {
      logger.error("Error transforming owned vouchers:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      return []
    })

    return {
      success: true,
      giftVouchers: vouchersPlain,
    }
  } catch (error) {
    logger.error("Error fetching member owned vouchers:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      details: error,
    })
    return { success: false, error: "Failed to fetch owned vouchers" }
  }
}

export interface OrderDetailsForRedemption {
  orderId?: string
  totalAmount: number
  items: { name: string; price: number }[]
}

export async function redeemGiftVoucher(code: string, orderDetails: OrderDetailsForRedemption) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const voucher = await GiftVoucher.findOne({ code })
    if (!voucher) {
      return { success: false, error: "Voucher not found" }
    }

    if (voucher.ownerUserId.toString() !== session.user.id) {
      return { success: false, error: "This voucher does not belong to you" }
    }

    const currentDate = new Date()
    if (voucher.validUntil < currentDate) {
      return { success: false, error: "Voucher has expired" }
    }

    if (!["active", "partially_used"].includes(voucher.status)) {
      return { success: false, error: "Voucher is not available for use" }
    }

    let amountApplied = 0

    if (voucher.voucherType === "treatment") {
      // For treatment vouchers, mark as fully used
      voucher.status = "fully_used"
      amountApplied = voucher.monetaryValue || 0
    } else if (voucher.voucherType === "monetary") {
      // For monetary vouchers, apply amount up to remaining balance
      const requestedAmount = orderDetails.totalAmount
      amountApplied = Math.min(requestedAmount, voucher.remainingAmount || 0)

      voucher.remainingAmount = (voucher.remainingAmount || 0) - amountApplied

      // Add to usage history
      if (!voucher.usageHistory) voucher.usageHistory = []
      voucher.usageHistory.push({
        date: new Date(),
        amountUsed: amountApplied,
        orderId: orderDetails.orderId ? new mongoose.Types.ObjectId(orderDetails.orderId) : undefined,
      } as any)

      // Update status based on remaining amount
      if (voucher.remainingAmount <= 0) {
        voucher.status = "fully_used"
      } else {
        voucher.status = "partially_used"
      }
    }

    await voucher.save()

    revalidatePath("/dashboard/member/gift-vouchers")

    return {
      success: true,
      updatedVoucher: await toGiftVoucherPlain(voucher),
      amountApplied,
    }
  } catch (error) {
    logger.error("Error redeeming gift voucher:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      details: error,
    })
    return { success: false, error: "Failed to redeem voucher" }
  }
}
