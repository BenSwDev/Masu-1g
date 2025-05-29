"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import GiftVoucher, {
  type IGiftVoucher,
  type GiftVoucherPlain as IGiftVoucherPlainExternal,
} from "@/lib/db/models/gift-voucher"
import User from "@/lib/db/models/user"
import Treatment from "@/lib/db/models/treatment"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"
import { notificationManager } from "@/lib/notifications/notification-manager"
import type { FilterQuery } from "mongoose"
import mongoose from "mongoose"

// Extended GiftVoucherPlain for client-side use, including populated fields
export interface GiftVoucherPlain extends IGiftVoucherPlainExternal {
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
  sendDate?: Date | string // Allow string for form input, Date for internal
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
  paymentMethodId?: string // Added to track payment method used
  usageHistory?: { date: Date; amountUsed: number; orderId?: string; description?: string }[]
  isActive: boolean
  createdAt?: Date | string
  updatedAt?: Date | string
}

// Helper to convert Mongoose document or plain object to a standardized plain object for client
async function toGiftVoucherPlain(voucherDocOrPlain: IGiftVoucher | Record<string, any>): Promise<GiftVoucherPlain> {
  if (!voucherDocOrPlain) {
    logger.warn("toGiftVoucherPlain called with null or undefined input.")
    throw new Error("toGiftVoucherPlain received null or undefined input.")
  }

  let voucher: Record<string, any>
  if (typeof (voucherDocOrPlain as IGiftVoucher).toObject === "function") {
    voucher = (voucherDocOrPlain as IGiftVoucher).toObject({ virtuals: true }) as any
  } else {
    voucher = { ...voucherDocOrPlain } as any
  }

  try {
    let purchaserName, ownerName, treatmentName, selectedDurationName

    const purchaserUserIdStr = voucher.purchaserUserId?.toString()
    const ownerUserIdStr = voucher.ownerUserId?.toString()
    const treatmentIdStr = voucher.treatmentId?.toString()
    const selectedDurationIdStr = voucher.selectedDurationId?.toString()

    if (purchaserUserIdStr) {
      const purchaser = await User.findById(purchaserUserIdStr).select("name").lean()
      purchaserName = purchaser?.name
    }
    if (ownerUserIdStr) {
      const owner = await User.findById(ownerUserIdStr).select("name").lean()
      ownerName = owner?.name
    }
    if (voucher.voucherType === "treatment" && treatmentIdStr) {
      const treatment = (await Treatment.findById(treatmentIdStr).select("name durations").lean()) as any
      treatmentName = treatment?.name
      if (selectedDurationIdStr && treatment?.durations) {
        const duration = treatment.durations.find((d: any) => d._id?.toString() === selectedDurationIdStr)
        selectedDurationName = duration?.name
      }
    }

    const formatDateToISO = (date: any): string | undefined => (date ? new Date(date).toISOString() : undefined)

    return {
      _id: String(voucher._id),
      code: voucher.code,
      voucherType: voucher.voucherType,
      treatmentId: treatmentIdStr,
      treatmentName,
      selectedDurationId: selectedDurationIdStr,
      selectedDurationName,
      monetaryValue: voucher.monetaryValue,
      originalAmount: voucher.originalAmount,
      remainingAmount: voucher.remainingAmount,
      purchaserUserId: purchaserUserIdStr,
      purchaserName,
      ownerUserId: ownerUserIdStr,
      ownerName,
      isGift: voucher.isGift,
      recipientName: voucher.recipientName,
      recipientPhone: voucher.recipientPhone,
      greetingMessage: voucher.greetingMessage,
      sendDate: formatDateToISO(voucher.sendDate),
      status: voucher.status,
      purchaseDate: formatDateToISO(voucher.purchaseDate)!,
      validFrom: formatDateToISO(voucher.validFrom)!,
      validUntil: formatDateToISO(voucher.validUntil)!,
      paymentId: voucher.paymentId,
      paymentMethodId: voucher.paymentMethodId?.toString(),
      usageHistory: voucher.usageHistory?.map((h: any) => ({
        ...h,
        date: formatDateToISO(h.date)!,
        orderId: h.orderId?.toString(),
      })),
      isActive:
        (voucher.status === "active" || voucher.status === "partially_used" || voucher.status === "sent") &&
        new Date(voucher.validUntil) >= new Date() &&
        new Date(voucher.validFrom) <= new Date(),
      createdAt: formatDateToISO(voucher.createdAt),
      updatedAt: formatDateToISO(voucher.updatedAt),
    }
  } catch (error) {
    logger.error("Error during population/transformation in toGiftVoucherPlain:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      voucherId: voucher._id?.toString(),
      inputKeys: Object.keys(voucherDocOrPlain),
    })
    const minimalVoucher = {
      _id: String(voucher._id),
      code: voucher.code,
      voucherType: voucher.voucherType,
      treatmentId: voucher.treatmentId?.toString(),
      monetaryValue: voucher.monetaryValue,
      originalAmount: voucher.originalAmount,
      remainingAmount: voucher.remainingAmount,
      purchaserUserId: voucher.purchaserUserId?.toString(),
      ownerUserId: voucher.ownerUserId?.toString(),
      isGift: voucher.isGift,
      status: voucher.status,
      purchaseDate: new Date(voucher.purchaseDate).toISOString(),
      validFrom: new Date(voucher.validFrom).toISOString(),
      validUntil: new Date(voucher.validUntil).toISOString(),
      isActive:
        (voucher.status === "active" || voucher.status === "partially_used" || voucher.status === "sent") &&
        new Date(voucher.validUntil) >= new Date() &&
        new Date(voucher.validFrom) <= new Date(),
      createdAt: voucher.createdAt ? new Date(voucher.createdAt).toISOString() : undefined,
      updatedAt: voucher.updatedAt ? new Date(voucher.updatedAt).toISOString() : undefined,
    } as GiftVoucherPlain
    return minimalVoucher
  }
}

export interface AdminGiftVoucherFormData {
  code: string
  voucherType: "treatment" | "monetary"
  treatmentId?: string
  selectedDurationId?: string
  monetaryValue?: string
  ownerUserId: string
  validFrom: string
  validUntil: string
  status: GiftVoucherPlain["status"]
}

export async function createGiftVoucherByAdmin(data: AdminGiftVoucherFormData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }
    await dbConnect()

    // --- Input Validation ---
    if (!data.code || typeof data.code !== "string" || data.code.trim() === "") {
      return { success: false, error: "Code is required." }
    }
    if (!data.voucherType || (data.voucherType !== "monetary" && data.voucherType !== "treatment")) {
      return { success: false, error: "Valid voucher type is required." }
    }
    if (
      !data.ownerUserId ||
      typeof data.ownerUserId !== "string" ||
      !mongoose.Types.ObjectId.isValid(data.ownerUserId)
    ) {
      return { success: false, error: "Valid Owner User ID is required." }
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

    const { code, voucherType, treatmentId, selectedDurationId, monetaryValue, ownerUserId, validFrom, validUntil } =
      data
    const owner = await User.findById(ownerUserId).lean()
    if (!owner) return { success: false, error: "Owner user not found." }

    const giftVoucherData: Partial<IGiftVoucher> = {
      code,
      voucherType,
      purchaserUserId: new mongoose.Types.ObjectId(session.user.id),
      ownerUserId: new mongoose.Types.ObjectId(ownerUserId),
      validFrom: new Date(validFrom),
      validUntil: new Date(validUntil),
      status: data.status,
      isActive: data.status === "active" || data.status === "partially_used" || data.status === "sent",
      isGift: false, // Admin created vouchers are not gifts by default in this flow
      purchaseDate: new Date(),
    }

    if (voucherType === "monetary") {
      const val = Number(monetaryValue)
      if (isNaN(val) || val <= 0) return { success: false, error: "Invalid monetary value." }
      giftVoucherData.monetaryValue = val
      giftVoucherData.originalAmount = val
      giftVoucherData.remainingAmount = val
    } else if (voucherType === "treatment") {
      if (!treatmentId) return { success: false, error: "Treatment ID is required." }
      const treatment = (await Treatment.findById(treatmentId).lean()) as any
      if (!treatment) return { success: false, error: "Treatment not found." }
      giftVoucherData.treatmentId = new mongoose.Types.ObjectId(treatmentId)
      let price = treatment.price || 0
      if (selectedDurationId && treatment.durations) {
        const duration = treatment.durations.find((d: any) => d._id.toString() === selectedDurationId)
        if (duration && typeof duration.price === "number") price = duration.price
        giftVoucherData.selectedDurationId = new mongoose.Types.ObjectId(selectedDurationId)
      }
      giftVoucherData.monetaryValue = price
    }

    const newVoucher = new GiftVoucher(giftVoucherData)
    await newVoucher.save()
    revalidatePath("/dashboard/admin/gift-vouchers")
    revalidatePath("/dashboard/member/gift-vouchers")
    return { success: true, giftVoucher: await toGiftVoucherPlain(newVoucher) }
  } catch (error) {
    logger.error("Error creating gift voucher by admin:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to create gift voucher"
    if (error instanceof mongoose.Error.ValidationError) return { success: false, error: error.message }
    if ((error as any).code === 11000 && (error as any).keyPattern?.code) {
      return { success: false, error: "Gift voucher code already exists." }
    }
    return { success: false, error: errorMessage }
  }
}

export async function updateGiftVoucherByAdmin(id: string, data: Partial<AdminGiftVoucherFormData>) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) return { success: false, error: "Unauthorized" }
    if (!mongoose.Types.ObjectId.isValid(id)) return { success: false, error: "Invalid Gift Voucher ID." }
    await dbConnect()

    // --- Input Validation for Update ---
    // ... (similar to create, but check against existing if not provided)
    const existingVoucher = await GiftVoucher.findById(id)
    if (!existingVoucher) return { success: false, error: "Gift voucher not found" }

    const checkValidFrom = data.validFrom ? new Date(data.validFrom) : existingVoucher.validFrom
    const checkValidUntil = data.validUntil ? new Date(data.validUntil) : existingVoucher.validUntil
    if (checkValidFrom >= checkValidUntil) {
      return { success: false, error: "'Valid from' date must be before 'valid until' date." }
    }

    const updateData: any = { ...data }
    if (data.status) {
      updateData.isActive = data.status === "active" || data.status === "partially_used" || data.status === "sent"
    } else {
      updateData.isActive =
        existingVoucher.status === "active" ||
        existingVoucher.status === "partially_used" ||
        existingVoucher.status === "sent"
    }

    if (data.validFrom) updateData.validFrom = new Date(data.validFrom)
    if (data.validUntil) updateData.validUntil = new Date(data.validUntil)
    if (data.ownerUserId) updateData.ownerUserId = new mongoose.Types.ObjectId(data.ownerUserId)
    if (data.treatmentId) updateData.treatmentId = new mongoose.Types.ObjectId(data.treatmentId)
    if (data.selectedDurationId) updateData.selectedDurationId = new mongoose.Types.ObjectId(data.selectedDurationId)

    const newVoucherType = data.voucherType || existingVoucher.voucherType
    if (newVoucherType === "monetary") {
      // ... (logic as before, ensure originalAmount/remainingAmount are handled)
      if (data.monetaryValue !== undefined) {
        const val = Number(data.monetaryValue)
        if (String(data.monetaryValue).trim() === "" || isNaN(val) || val <= 0) {
          return { success: false, error: "Invalid monetary value. Must be a positive number." }
        }
        updateData.monetaryValue = val
        if (
          data.voucherType === "monetary" ||
          (existingVoucher.voucherType === "monetary" && data.monetaryValue !== undefined)
        ) {
          updateData.originalAmount = val
          updateData.remainingAmount = val
        }
        updateData.treatmentId = null
        updateData.selectedDurationId = null
      }
    } else if (newVoucherType === "treatment") {
      // ... (logic as before, ensure monetaryValue is updated based on treatment/duration)
      if (data.treatmentId || (data.voucherType === "treatment" && !existingVoucher.treatmentId)) {
        if (!updateData.treatmentId && !existingVoucher.treatmentId) {
          return { success: false, error: "Treatment ID is required for treatment voucher." }
        }
        const treatment = (await Treatment.findById(
          updateData.treatmentId || existingVoucher.treatmentId,
        ).lean()) as any
        if (!treatment) return { success: false, error: "Treatment not found." }
        let price = treatment.price || 0
        const durationIdToUse = updateData.selectedDurationId || existingVoucher.selectedDurationId
        if (durationIdToUse && treatment.durations) {
          const duration = treatment.durations.find((d: any) => d._id.toString() === durationIdToUse.toString())
          if (duration && typeof duration.price === "number") price = duration.price
        }
        updateData.monetaryValue = price
        if (existingVoucher.voucherType === "monetary") {
          updateData.originalAmount = null
          updateData.remainingAmount = null
        }
      }
    }

    const updatedVoucher = await GiftVoucher.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    )
    if (!updatedVoucher) return { success: false, error: "Gift voucher not found or update failed" }
    revalidatePath("/dashboard/admin/gift-vouchers")
    revalidatePath("/dashboard/member/gift-vouchers")
    return { success: true, giftVoucher: await toGiftVoucherPlain(updatedVoucher) }
  } catch (error) {
    logger.error("Error updating gift voucher by admin:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to update gift voucher"
    if (error instanceof mongoose.Error.ValidationError) return { success: false, error: error.message }
    if ((error as any).code === 11000 && (error as any).keyPattern?.code) {
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
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid Gift Voucher ID format." }
    }

    await dbConnect()
    const voucher = await GiftVoucher.findByIdAndDelete(id)

    if (!voucher) {
      return { success: false, error: "Gift voucher not found" }
    }

    revalidatePath("/dashboard/admin/gift-vouchers")
    revalidatePath("/dashboard/member/gift-vouchers")

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
    dateRange?: { from?: string; to?: string }
  } = {},
) {
  try {
    await dbConnect()
    const query: FilterQuery<IGiftVoucher> = {}

    if (search) {
      const searchRegex = { $regex: search, $options: "i" }
      // Attempt to find users by name/email and then search vouchers by their IDs
      // This is a simplified version. A more robust solution might involve a separate search endpoint for users.
      const usersByName = await User.find({ name: searchRegex }).select("_id").lean()
      const userIds = usersByName.map((u) => u._id)

      query.$or = [
        { code: searchRegex },
        { purchaserUserId: { $in: userIds } },
        { ownerUserId: { $in: userIds } },
        { recipientName: searchRegex }, // if searching by recipient name directly
      ]
      // If search could be an email for purchaser/owner
      const userByEmail = await User.findOne({ email: search }).select("_id").lean()
      if (userByEmail) {
        query.$or.push({ purchaserUserId: userByEmail._id })
        query.$or.push({ ownerUserId: userByEmail._id })
      }
    }

    if (filters.voucherType) {
      query.voucherType = filters.voucherType
    }
    if (filters.status) {
      query.status = filters.status
    }
    if (filters.dateRange?.from && filters.dateRange?.to) {
      query.validUntil = { $gte: new Date(filters.dateRange.from), $lte: new Date(filters.dateRange.to) }
    } else if (filters.dateRange?.from) {
      query.validUntil = { $gte: new Date(filters.dateRange.from) }
    } else if (filters.dateRange?.to) {
      query.validUntil = { $lte: new Date(filters.dateRange.to) }
    }

    const skip = (page - 1) * limit

    // Fetch Mongoose documents first to ensure toGiftVoucherPlain works as expected with population
    const giftVoucherDocs = await GiftVoucher.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
    const total = await GiftVoucher.countDocuments(query)
    const giftVouchersPromises = giftVoucherDocs.map((doc) => toGiftVoucherPlain(doc))
    const giftVouchers = await Promise.all(giftVouchersPromises)
    return {
      success: true,
      giftVouchers,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }
  } catch (error) {
    logger.error("Error fetching gift vouchers:", error)
    return {
      success: false,
      error: "Failed to fetch gift vouchers",
      giftVouchers: [],
      pagination: { total: 0, page: 1, limit, totalPages: 0 },
    }
  }
}

export async function getTreatmentsForSelection() {
  try {
    await dbConnect()
    const treatments = await Treatment.find().select("_id name price durations").lean()
    return {
      success: true,
      treatments: treatments.map((t: any) => ({
        _id: t._id.toString(),
        name: t.name,
        price: t.price,
        durations:
          t.durations?.map((d: any) => ({
            _id: d._id.toString(),
            name: d.name,
            price: d.price,
          })) || [],
      })),
    }
  } catch (error) {
    logger.error("Error fetching treatments for selection:", error)
    return { success: false, error: "Failed to fetch treatments", treatments: [] }
  }
}

export async function getUsersForAdminSelection() {
  try {
    await dbConnect()
    const users = await User.find({ roles: { $in: ["member", "admin", "partner", "professional"] } })
      .select("_id name email roles")
      .lean()
    return {
      success: true,
      users: users.map((u) => ({
        _id: u._id.toString(),
        name: u.name || u.email,
        email: u.email,
        roles: u.roles,
      })),
    }
  } catch (error) {
    logger.error("Error fetching users for admin selection:", error)
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
  recipientName?: string
  recipientPhone?: string
  greetingMessage?: string
  sendDate?: Date | "immediate" // Use Date object or "immediate"
}

export interface PaymentResultData {
  voucherId: string
  paymentId: string
  success: boolean
  amount: number
  paymentMethodId: string // Added to store which payment method was used
}

export async function initiatePurchaseGiftVoucher(data: PurchaseInitiationData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return { success: false, error: "Unauthorized" }
    await dbConnect()

    const {
      voucherType,
      treatmentId,
      selectedDurationId,
      monetaryValue,
      isGift,
      recipientName,
      recipientPhone,
      greetingMessage,
      sendDate,
    } = data

    // --- Input Validation ---
    if (!voucherType || (voucherType !== "monetary" && voucherType !== "treatment")) {
      return { success: false, error: "Valid voucher type is required." }
    }
    if (voucherType === "monetary") {
      if (typeof monetaryValue !== "number" || monetaryValue < 150) {
        return { success: false, error: "Minimum monetary value is 150 ILS and must be a number." }
      }
    } else if (voucherType === "treatment") {
      if (!treatmentId || !mongoose.Types.ObjectId.isValid(treatmentId)) {
        return { success: false, error: "Valid Treatment ID is required." }
      }
      if (selectedDurationId && !mongoose.Types.ObjectId.isValid(selectedDurationId)) {
        return { success: false, error: "Valid Selected Duration ID." }
      }
    }
    if (isGift) {
      if (!recipientName || recipientName.trim() === "") return { success: false, error: "Recipient name is required." }
      if (!recipientPhone || recipientPhone.trim() === "")
        return { success: false, error: "Recipient phone is required." }
      if (sendDate && sendDate !== "immediate" && !(sendDate instanceof Date && !isNaN(sendDate.getTime()))) {
        return { success: false, error: "Invalid send date format." }
      }
    }
    // --- End Input Validation ---

    const code = `GV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    const giftVoucherData: Partial<IGiftVoucher> = {
      code,
      voucherType,
      purchaserUserId: new mongoose.Types.ObjectId(session.user.id),
      ownerUserId:
        isGift && recipientName ? new mongoose.Types.ObjectId() : new mongoose.Types.ObjectId(session.user.id), // Placeholder or self
      isGift,
      status: "pending_payment",
      purchaseDate: new Date(),
      validFrom: new Date(),
      validUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      isActive: false,
    }

    if (isGift) {
      giftVoucherData.recipientName = recipientName
      giftVoucherData.recipientPhone = recipientPhone
      giftVoucherData.greetingMessage = greetingMessage
      // Actual sendDate (Date object) will be set here if not "immediate"
      if (sendDate && sendDate !== "immediate") {
        giftVoucherData.sendDate = sendDate
      }
      // Owner is still purchaser for simplicity, recipient details are for notification/delivery
      giftVoucherData.ownerUserId = new mongoose.Types.ObjectId(session.user.id)
    }

    let calculatedPrice = 0
    if (voucherType === "monetary") {
      giftVoucherData.monetaryValue = monetaryValue
      giftVoucherData.originalAmount = monetaryValue
      giftVoucherData.remainingAmount = monetaryValue
      calculatedPrice = monetaryValue!
    } else if (voucherType === "treatment") {
      if (!treatmentId) return { success: false, error: "Treatment ID is required." }
      const treatment = (await Treatment.findById(treatmentId).lean()) as any
      if (!treatment) return { success: false, error: "Treatment not found." }
      giftVoucherData.treatmentId = new mongoose.Types.ObjectId(treatmentId)
      let price = treatment.price || 0
      if (selectedDurationId && treatment.durations) {
        const duration = treatment.durations.find((d: any) => d._id.toString() === selectedDurationId)
        if (duration && typeof duration.price === "number") price = duration.price
        giftVoucherData.selectedDurationId = new mongoose.Types.ObjectId(selectedDurationId)
      }
      giftVoucherData.monetaryValue = price
      calculatedPrice = price
    }

    const newVoucher = new GiftVoucher(giftVoucherData)
    await newVoucher.save()

    return {
      success: true,
      voucherId: newVoucher._id.toString(),
      amount: calculatedPrice,
    }
  } catch (error) {
    logger.error("Error initiating gift voucher purchase:", error)
    return { success: false, error: "Failed to initiate purchase." }
  }
}

export async function confirmGiftVoucherPurchase(data: PaymentResultData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return { success: false, error: "Unauthorized" }
    if (!mongoose.Types.ObjectId.isValid(data.voucherId)) return { success: false, error: "Invalid Voucher ID." }
    if (!mongoose.Types.ObjectId.isValid(data.paymentMethodId))
      return { success: false, error: "Invalid Payment Method ID." }

    await dbConnect()
    const { voucherId, paymentId, success: paymentSuccess, amount, paymentMethodId } = data
    const voucher = await GiftVoucher.findById(voucherId)
    if (!voucher) return { success: false, error: "Voucher not found" }

    if (voucher.purchaserUserId.toString() !== session.user.id)
      return { success: false, error: "Purchase record mismatch." }
    if (voucher.status !== "pending_payment") return { success: false, error: "Voucher not awaiting payment." }

    if (paymentSuccess) {
      voucher.paymentId = paymentId
      voucher.paymentMethodId = new mongoose.Types.ObjectId(paymentMethodId)
      voucher.isActive = true

      // Handle sendDate logic based on what was stored during initiation
      const sendDateToUse = voucher.sendDate // This is already a Date object if set, or undefined
      const isImmediateSend = !sendDateToUse || (voucher.isGift && !voucher.sendDate) // If sendDate was not set (implies immediate for gift)

      if (voucher.isGift && voucher.recipientPhone) {
        if (isImmediateSend || (sendDateToUse && sendDateToUse <= new Date())) {
          voucher.status = "sent"
          voucher.sendDate = new Date() // Mark as sent now
          try {
            await notificationManager.sendNotification(
              "sms",
              { value: voucher.recipientPhone, name: voucher.recipientName || "Recipient" },
              {
                type: "GIFT_VOUCHER_RECEIVED",
                params: {
                  /* ... params ... */
                },
              },
            )
            logger.info(`Gift voucher SMS sent to ${voucher.recipientPhone} for ${voucher.code}`)
          } catch (e) {
            logger.error("Failed to send gift SMS post-payment", e)
          }
        } else if (sendDateToUse && sendDateToUse > new Date()) {
          voucher.status = "pending_send" // Scheduled
        }
      } else {
        voucher.status = "active"
      }
      await voucher.save()
      revalidatePath("/dashboard/member/gift-vouchers")
      if (voucher.purchaserUserId.toString() !== voucher.ownerUserId.toString()) {
        revalidatePath(`/dashboard/user/${voucher.ownerUserId.toString()}/gift-vouchers`)
      }
      return { success: true, voucher: await toGiftVoucherPlain(voucher) }
    } else {
      voucher.status = "cancelled"
      voucher.isActive = false
      await voucher.save()
      return { success: false, error: "Payment failed. Voucher not activated." }
    }
  } catch (error) {
    logger.error("Error confirming gift voucher purchase:", error)
    return { success: false, error: "Failed to confirm purchase." }
  }
}

// This function is now primarily for admin or if user wants to update details AFTER purchase.
// The main gift details are collected during the purchase flow.
export interface GiftDetailsPayload {
  recipientName: string
  recipientPhone: string
  greetingMessage?: string
  sendDate?: Date | "immediate" // Date object or "immediate"
}
export async function setGiftDetails(voucherId: string, details: GiftDetailsPayload) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return { success: false, error: "Unauthorized" }
    if (!mongoose.Types.ObjectId.isValid(voucherId)) return { success: false, error: "Invalid Voucher ID." }
    await dbConnect()
    const voucher = await GiftVoucher.findById(voucherId)
    if (!voucher) return { success: false, error: "Voucher not found" }
    if (voucher.purchaserUserId.toString() !== session.user.id) return { success: false, error: "Not authorized." }

    // --- Input Validation ---
    if (!details.recipientName || details.recipientName.trim() === "")
      return { success: false, error: "Recipient name required." }
    if (!details.recipientPhone || details.recipientPhone.trim() === "")
      return { success: false, error: "Recipient phone required." }
    if (
      details.sendDate &&
      details.sendDate !== "immediate" &&
      !(details.sendDate instanceof Date && !isNaN(details.sendDate.getTime()))
    ) {
      return { success: false, error: "Invalid send date format." }
    }
    // --- End Input Validation ---

    voucher.isGift = true
    voucher.recipientName = details.recipientName
    voucher.recipientPhone = details.recipientPhone

    voucher.recipientName = details.recipientName
    voucher.recipientPhone = details.recipientPhone
    voucher.greetingMessage = details.greetingMessage

    const sendDateToUse = details.sendDate
    const isImmediateSend = !sendDateToUse || sendDateToUse === "immediate"

    // Only adjust status and send notification if voucher is already paid and active/sent/pending_send"].includes(voucher.status)) {
    if (["active", "partially_used", "sent"].includes(voucher.status)) {
      if (isImmediateSend || (sendDateToUse instanceof Date && sendDateToUse <= new Date())) {
        if (voucher.status !== "sent") {
          // Avoid re-sending if already marked sent
          voucher.sendDate = new Date()
          voucher.status = "sent"
          try {
            await notificationManager.sendNotification(
              "sms",
              { value: voucher.recipientPhone, name: voucher.recipientName },
              { type: "GIFT_VOUCHER_RECEIVED", params: {} },
            )
            logger.info(`Gift details updated, SMS sent for ${voucher.code}`)
          } catch (e) {
            logger.error("Failed to send SMS on gift details update", e)
          }
        }
      } else if (sendDateToUse instanceof Date && sendDateToUse > new Date()) {
        voucher.sendDate = sendDateToUse
        voucher.status = "pending_send"
      }
    } else if (voucher.status === "pending_payment") {
      // If details are set before payment, just store them. confirmGiftVoucherPurchase handles sending.
      if (sendDateToUse instanceof Date) {
        voucher.sendDate = sendDateToUse
      } else {
        voucher.sendDate = undefined // For immediate send, confirmGiftVoucherPurchase will set it to new Date()
      }
    }

    await voucher.save()
    revalidatePath("/dashboard/member/gift-vouchers")
    return { success: true, voucher: await toGiftVoucherPlain(voucher) }
  } catch (error) {
    logger.error("Error setting gift details:", error)
    return { success: false, error: "Failed to set gift details." }
  }
}

export async function getMemberPurchasedVouchers() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return { success: false, error: "Unauthorized", giftVouchers: [] }
    }
    await dbConnect()
    const voucherDocs = await GiftVoucher.find({ purchaserUserId: new mongoose.Types.ObjectId(session.user.id) }).sort({
      purchaseDate: -1,
    })
    const giftVouchers = await Promise.all(voucherDocs.map((doc) => toGiftVoucherPlain(doc)))
    return { success: true, giftVouchers }
  } catch (error) {
    logger.error("Error fetching member purchased vouchers:", error)
    return { success: false, error: "Failed to fetch purchased vouchers", giftVouchers: [] }
  }
}

export async function getMemberOwnedVouchers() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return { success: false, error: "Unauthorized", giftVouchers: [] }
    }
    await dbConnect()
    const voucherDocs = await GiftVoucher.find({ ownerUserId: new mongoose.Types.ObjectId(session.user.id) }).sort({
      validUntil: 1,
      purchaseDate: -1,
    })
    const giftVouchers = await Promise.all(voucherDocs.map((doc) => toGiftVoucherPlain(doc)))
    return { success: true, giftVouchers }
  } catch (error) {
    logger.error("Error fetching member owned vouchers:", error)
    return { success: false, error: "Failed to fetch owned vouchers", giftVouchers: [] }
  }
}

export interface OrderDetailsForRedemption {
  orderId?: string
  totalAmount: number
  items?: { name: string; price: number }[]
}

export async function redeemGiftVoucher(code: string, orderDetails: OrderDetailsForRedemption) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return { success: false, error: "Unauthorized" }
    await dbConnect()
    const voucher = await GiftVoucher.findOne({ code: code.trim() })
    if (!voucher) return { success: false, error: "Voucher not found." }
    if (voucher.ownerUserId.toString() !== session.user.id)
      return { success: false, error: "Voucher does not belong to you." }

    const currentDate = new Date()
    if (voucher.validFrom > currentDate) return { success: false, error: "Voucher not yet valid." }
    if (voucher.validUntil < currentDate) {
      voucher.status = "expired"
      await voucher.save()
      return { success: false, error: "Voucher has expired." }
    }
    if (!voucher.isActive) return { success: false, error: "Voucher is inactive." }
    if (!["active", "partially_used", "sent"].includes(voucher.status))
      return { success: false, error: "Voucher not available for use." }

    let amountApplied = 0
    if (voucher.voucherType === "treatment") {
      if (voucher.status === "fully_used") return { success: false, error: "Treatment voucher already used." }
      voucher.status = "fully_used"
      amountApplied = voucher.monetaryValue || 0
      if (!voucher.usageHistory) voucher.usageHistory = []
      voucher.usageHistory.push({
        date: new Date(),
        amountUsed: amountApplied,
        orderId: orderDetails.orderId ? new mongoose.Types.ObjectId(orderDetails.orderId) : undefined,
        description: `Redeemed for treatment: ${orderDetails.items?.[0]?.name || "Treatment"}`,
      } as any)
    } else if (voucher.voucherType === "monetary") {
      if ((voucher.remainingAmount || 0) <= 0) return { success: false, error: "Voucher has no remaining balance." }
      const redemptionAmount = orderDetails.totalAmount
      amountApplied = Math.min(redemptionAmount, voucher.remainingAmount || 0)
      if (amountApplied <= 0) return { success: false, error: "No amount could be applied." }
      voucher.remainingAmount = (voucher.remainingAmount || 0) - amountApplied
      if (!voucher.usageHistory) voucher.usageHistory = []
      voucher.usageHistory.push({
        date: new Date(),
        amountUsed: amountApplied,
        orderId: orderDetails.orderId ? new mongoose.Types.ObjectId(orderDetails.orderId) : undefined,
        description: `Redeemed against order total: ${orderDetails.totalAmount}`,
      } as any)
      voucher.status = (voucher.remainingAmount || 0) <= 0 ? "fully_used" : "partially_used"
      if (voucher.remainingAmount && voucher.remainingAmount < 0) voucher.remainingAmount = 0
    } else {
      return { success: false, error: "Unknown voucher type." }
    }
    await voucher.save()
    revalidatePath("/dashboard/member/gift-vouchers")
    revalidatePath("/dashboard/admin/gift-vouchers")
    return {
      success: true,
      updatedVoucher: await toGiftVoucherPlain(voucher),
      amountApplied,
      message: `Voucher redeemed. Amount applied: ${amountApplied.toFixed(2)} ILS.`,
    }
  } catch (error) {
    logger.error("Error redeeming gift voucher:", error)
    return { success: false, error: "Failed to redeem voucher." }
  }
}
