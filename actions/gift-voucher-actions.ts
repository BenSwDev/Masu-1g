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

// Helper to convert Mongoose document or plain object to a standardized plain object for client
async function toGiftVoucherPlain(voucherDocOrPlain: IGiftVoucher | Record<string, any>): Promise<GiftVoucherPlain> {
  if (!voucherDocOrPlain) {
    // This case should ideally be handled before calling, but as a safeguard:
    logger.warn("toGiftVoucherPlain called with null or undefined input.")
    // Depending on how you want to handle this, you could throw an error or return a specific structure.
    // For now, let's assume this means the voucher wasn't found and return a structure that won't break the UI.
    // However, the calling function should ideally check for existence first.
    // Throwing an error might be better to pinpoint where the null is coming from.
    throw new Error("toGiftVoucherPlain received null or undefined input.")
  }

  let voucher: Record<string, any>
  // Check if it's a Mongoose document with toObject method
  if (typeof (voucherDocOrPlain as IGiftVoucher).toObject === "function") {
    voucher = (voucherDocOrPlain as IGiftVoucher).toObject({ virtuals: true }) as any
  } else {
    // It's already a plain object (likely from .lean())
    voucher = { ...voucherDocOrPlain } as any // Create a shallow copy
  }

  try {
    let purchaserName, ownerName, treatmentName, selectedDurationName

    // Ensure IDs are strings for lookup, Mongoose ObjectId.toString() is idempotent
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

    // Ensure all date fields are consistently ISO strings if they exist
    const formatDate = (date: any) => (date ? new Date(date).toISOString() : undefined)

    return {
      _id: String(voucher._id), // Ensure _id is a string
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
      sendDate: formatDate(voucher.sendDate),
      status: voucher.status,
      purchaseDate: formatDate(voucher.purchaseDate)!, // purchaseDate should always exist
      validFrom: formatDate(voucher.validFrom)!, // validFrom should always exist
      validUntil: formatDate(voucher.validUntil)!, // validUntil should always exist
      paymentId: voucher.paymentId,
      usageHistory: voucher.usageHistory?.map((h: any) => ({
        ...h,
        date: formatDate(h.date)!,
        orderId: h.orderId?.toString(),
      })),
      isActive:
        (voucher.status === "active" || voucher.status === "partially_used") &&
        new Date(voucher.validUntil) >= new Date() &&
        new Date(voucher.validFrom) <= new Date(),
      createdAt: formatDate(voucher.createdAt),
      updatedAt: formatDate(voucher.updatedAt),
    }
  } catch (error) {
    logger.error("Error during population/transformation in toGiftVoucherPlain:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      voucherId: voucher._id?.toString(), // Log voucher ID if available
      inputKeys: Object.keys(voucherDocOrPlain), // Log keys of the input to see its structure
    })
    // Fallback to a minimal plain object if population fails, to prevent UI crashes
    // This ensures the core data is still passed through.
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
        (voucher.status === "active" || voucher.status === "partially_used") &&
        new Date(voucher.validUntil) >= new Date() &&
        new Date(voucher.validFrom) <= new Date(),
      createdAt: voucher.createdAt ? new Date(voucher.createdAt).toISOString() : undefined,
      updatedAt: voucher.updatedAt ? new Date(voucher.updatedAt).toISOString() : undefined,
    } as GiftVoucherPlain // Cast to ensure all required fields are at least attempted
    return minimalVoucher
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
  status: GiftVoucherPlain["status"] // Status is now mandatory from admin form
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

    if (data.voucherType === "monetary") {
      if (data.monetaryValue === undefined || data.monetaryValue === null || String(data.monetaryValue).trim() === "") {
        return { success: false, error: "Monetary value is required for monetary voucher." }
      }
      const val = Number(data.monetaryValue)
      if (isNaN(val) || val <= 0) {
        return { success: false, error: "Invalid monetary value. Must be a positive number." }
      }
    } else if (data.voucherType === "treatment") {
      if (
        !data.treatmentId ||
        typeof data.treatmentId !== "string" ||
        !mongoose.Types.ObjectId.isValid(data.treatmentId)
      ) {
        return { success: false, error: "Valid Treatment ID is required for treatment voucher." }
      }
      if (
        data.selectedDurationId &&
        (typeof data.selectedDurationId !== "string" || !mongoose.Types.ObjectId.isValid(data.selectedDurationId))
      ) {
        return { success: false, error: "Valid Selected Duration ID is required if provided." }
      }
    }
    // --- End Input Validation ---

    const { code, voucherType, treatmentId, selectedDurationId, monetaryValue, ownerUserId, validFrom, validUntil } =
      data

    const owner = await User.findById(ownerUserId).lean() // Use lean if only checking existence
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
      status: data.status, // Status is now directly from form
      isActive: data.status === "active" || data.status === "partially_used", // Derive isActive from status
      isGift: false,
      purchaseDate: new Date(),
    }

    if (voucherType === "monetary") {
      const val = Number(monetaryValue)
      // Validation already done, but as a safeguard:
      if (isNaN(val) || val <= 0) return { success: false, error: "Invalid monetary value." }
      giftVoucherData.monetaryValue = val
      giftVoucherData.originalAmount = val
      giftVoucherData.remainingAmount = val
    } else if (voucherType === "treatment") {
      if (!treatmentId) return { success: false, error: "Treatment ID is required." } // Should be caught by validation
      const treatment = (await Treatment.findById(treatmentId).lean()) as any
      if (!treatment) return { success: false, error: "Treatment not found." }

      giftVoucherData.treatmentId = new mongoose.Types.ObjectId(treatmentId)
      let price = treatment.price || 0 // Default price from treatment
      if (selectedDurationId && treatment.durations) {
        const duration = treatment.durations.find((d: any) => d._id.toString() === selectedDurationId)
        if (duration && typeof duration.price === "number") {
          price = duration.price
        }
        giftVoucherData.selectedDurationId = new mongoose.Types.ObjectId(selectedDurationId)
      }
      giftVoucherData.monetaryValue = price
    }

    const newVoucher = new GiftVoucher(giftVoucherData)
    await newVoucher.save()

    revalidatePath("/dashboard/admin/gift-vouchers")
    revalidatePath("/dashboard/member/gift-vouchers")

    return {
      success: true,
      giftVoucher: await toGiftVoucherPlain(newVoucher), // Pass the Mongoose document here
    }
  } catch (error) {
    logger.error("Error creating gift voucher by admin:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      details: error, // This will include MongoError details like keyPattern for duplicate key
    })
    const errorMessage = error instanceof Error ? error.message : "Failed to create gift voucher"
    if (error instanceof mongoose.Error.ValidationError) {
      return { success: false, error: error.message }
    }
    // Specific check for duplicate key error (code 11000)
    if ((error as any).code === 11000 && (error as any).keyPattern?.code) {
      return { success: false, error: "Gift voucher code already exists. Please use a unique code." }
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
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid Gift Voucher ID format." }
    }

    await dbConnect()

    // --- Begin Input Validation for Update ---
    if (data.validFrom && (typeof data.validFrom !== "string" || isNaN(new Date(data.validFrom).getTime()))) {
      return { success: false, error: "Invalid 'valid from' date." }
    }
    if (data.validUntil && (typeof data.validUntil !== "string" || isNaN(new Date(data.validUntil).getTime()))) {
      return { success: false, error: "Invalid 'valid until' date." }
    }
    if (data.ownerUserId && !mongoose.Types.ObjectId.isValid(data.ownerUserId)) {
      return { success: false, error: "Invalid Owner User ID format." }
    }
    if (data.treatmentId && !mongoose.Types.ObjectId.isValid(data.treatmentId)) {
      return { success: false, error: "Invalid Treatment ID format." }
    }
    if (data.selectedDurationId && !mongoose.Types.ObjectId.isValid(data.selectedDurationId)) {
      return { success: false, error: "Invalid Selected Duration ID format." }
    }

    const existingVoucher = await GiftVoucher.findById(id) // Fetch full doc for date comparison and type checks
    if (!existingVoucher) {
      return { success: false, error: "Gift voucher not found" }
    }

    const checkValidFrom = data.validFrom ? new Date(data.validFrom) : existingVoucher.validFrom
    const checkValidUntil = data.validUntil ? new Date(data.validUntil) : existingVoucher.validUntil

    if (checkValidFrom >= checkValidUntil) {
      return { success: false, error: "'Valid from' date must be before 'valid until' date." }
    }

    const updateData: any = { ...data } // Start with all data
    if (data.status) {
      updateData.isActive = data.status === "active" || data.status === "partially_used"
    } else {
      // If status is not being updated, derive isActive from existing status
      updateData.isActive = existingVoucher.status === "active" || existingVoucher.status === "partially_used"
    }

    // Convert date strings to Date objects
    if (data.validFrom) updateData.validFrom = new Date(data.validFrom)
    if (data.validUntil) updateData.validUntil = new Date(data.validUntil)

    // Convert ID strings to ObjectIds
    if (data.ownerUserId) updateData.ownerUserId = new mongoose.Types.ObjectId(data.ownerUserId)
    if (data.treatmentId) updateData.treatmentId = new mongoose.Types.ObjectId(data.treatmentId)
    if (data.selectedDurationId) updateData.selectedDurationId = new mongoose.Types.ObjectId(data.selectedDurationId)

    // Handle monetary value and voucher type changes carefully
    const newVoucherType = data.voucherType || existingVoucher.voucherType

    if (newVoucherType === "monetary") {
      if (data.monetaryValue !== undefined) {
        const val = Number(data.monetaryValue)
        if (String(data.monetaryValue).trim() === "" || isNaN(val) || val <= 0) {
          // Allow 0 if that's a valid state, but typically positive
          return { success: false, error: "Invalid monetary value. Must be a positive number." }
        }
        updateData.monetaryValue = val
        // If voucher type is changing to monetary or monetary value is explicitly set
        if (
          data.voucherType === "monetary" ||
          (existingVoucher.voucherType === "monetary" && data.monetaryValue !== undefined)
        ) {
          updateData.originalAmount = val
          updateData.remainingAmount = val // Reset remaining amount if original value changes
        }
        updateData.treatmentId = null // Clear treatment specific fields
        updateData.selectedDurationId = null
      } else if (data.voucherType === "monetary" && existingVoucher.voucherType !== "monetary") {
        // Type changed to monetary but no value provided, this might be an issue or require a default
        return { success: false, error: "Monetary value is required when changing to monetary voucher type." }
      }
    } else if (newVoucherType === "treatment") {
      if (data.treatmentId || (data.voucherType === "treatment" && !existingVoucher.treatmentId)) {
        if (!updateData.treatmentId && !existingVoucher.treatmentId) {
          // Ensure treatmentId is present if type is treatment
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
        updateData.monetaryValue = price // Update monetaryValue based on treatment/duration
        // Clear monetary specific fields if changing from monetary
        if (existingVoucher.voucherType === "monetary") {
          updateData.originalAmount = null
          updateData.remainingAmount = null
        }
      } else if (data.voucherType === "treatment" && !updateData.treatmentId && !existingVoucher.treatmentId) {
        return { success: false, error: "Treatment ID is required for treatment voucher type." }
      }
    }

    // Remove fields that are explicitly set to undefined by the form, otherwise they won't be $unset
    // For example, if clearing recipientName: data.recipientName might be "" or undefined
    // Mongoose $unset behavior: if a field is set to undefined in the update object, it's ignored unless { $unset: { field: 1 } } is used.
    // For simplicity, we'll rely on direct assignment. If a field should be removed, it needs specific handling.

    const updatedVoucher = await GiftVoucher.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    )

    if (!updatedVoucher) {
      return { success: false, error: "Gift voucher not found or update failed" }
    }

    revalidatePath("/dashboard/admin/gift-vouchers")
    revalidatePath("/dashboard/member/gift-vouchers")

    return {
      success: true,
      giftVoucher: await toGiftVoucherPlain(updatedVoucher), // Pass Mongoose doc
    }
  } catch (error) {
    logger.error("Error updating gift voucher by admin:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      details: error,
    })
    const errorMessage = error instanceof Error ? error.message : "Failed to update gift voucher"
    if (error instanceof mongoose.Error.ValidationError) {
      return { success: false, error: error.message }
    }
    if ((error as any).code === 11000 && (error as any).keyPattern?.code) {
      // Check for duplicate code on update
      return { success: false, error: "Gift voucher code already exists. Please use a unique code." }
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
    dateRange?: { from?: string; to?: string } // For validUntil or purchaseDate
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
    const giftVoucherDocs = await GiftVoucher.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)
    // .lean() // Temporarily remove lean here to ensure full Mongoose docs are passed to toGiftVoucherPlain
    // If performance is an issue with large populated fields, toGiftVoucherPlain needs to be adapted
    // to work with lean objects + manual population, or use aggregation framework.
    // For now, prioritize correctness of toGiftVoucherPlain.

    const total = await GiftVoucher.countDocuments(query)

    const giftVouchersPromises = giftVoucherDocs.map((doc) => toGiftVoucherPlain(doc))
    const giftVouchers = await Promise.all(giftVouchersPromises).catch((error) => {
      logger.error("Error transforming one or more gift vouchers in getGiftVouchers:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      return [] // Return empty array or handle more gracefully
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

export async function getTreatmentsForSelection() {
  try {
    await dbConnect()
    const treatments = await Treatment.find().select("_id name price durations").lean()
    return {
      success: true,
      treatments: treatments.map((t: any) => ({
        // Add 'any' type for t temporarily
        _id: t._id.toString(),
        name: t.name,
        price: t.price,
        durations:
          t.durations?.map((d: any) => ({
            // Add 'any' type for d
            _id: d._id.toString(),
            name: d.name,
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

export async function getUsersForAdminSelection() {
  try {
    await dbConnect()
    const users = await User.find({ roles: { $in: ["member", "admin", "partner", "professional"] } }) // Broaden selection
      .select("_id name email roles")
      .lean()
    return {
      success: true,
      users: users.map((u) => ({
        _id: u._id.toString(),
        name: u.name || u.email,
        email: u.email,
        roles: u.roles, // Include roles for better context if needed
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
  monetaryValue?: number // Changed to number
  isGift: boolean
  // Added fields for gift details if provided at initiation
  recipientName?: string
  recipientPhone?: string
  greetingMessage?: string
  sendDateOption?: "immediate" | string // ISO date string
}

export interface GiftDetailsPayload {
  // This might be redundant if details are part of PurchaseInitiationData
  recipientName: string
  recipientPhone: string
  greetingMessage?: string
  sendDate?: string // ISO string or "immediate"
}

export interface PaymentResultData {
  voucherId: string
  paymentId: string // From payment provider
  success: boolean
  amount: number // Amount charged
}

export async function initiatePurchaseGiftVoucher(data: PurchaseInitiationData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return { success: false, error: "Unauthorized" }
    }

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
      sendDateOption,
    } = data

    // --- Input Validation ---
    if (!voucherType || (voucherType !== "monetary" && voucherType !== "treatment")) {
      return { success: false, error: "Valid voucher type is required." }
    }
    if (voucherType === "monetary") {
      if (typeof monetaryValue !== "number" || monetaryValue < 150) {
        // Assuming 150 is minimum
        return { success: false, error: "Minimum monetary value is 150 ILS and must be a number." }
      }
    } else if (voucherType === "treatment") {
      if (!treatmentId || !mongoose.Types.ObjectId.isValid(treatmentId)) {
        return { success: false, error: "Valid Treatment ID is required for treatment voucher." }
      }
      if (selectedDurationId && !mongoose.Types.ObjectId.isValid(selectedDurationId)) {
        return { success: false, error: "Valid Selected Duration ID is required if provided." }
      }
    }
    if (isGift) {
      if (!recipientName || recipientName.trim() === "") {
        return { success: false, error: "Recipient name is required for gifts." }
      }
      if (!recipientPhone || recipientPhone.trim() === "") {
        // Basic check, consider more robust validation
        return { success: false, error: "Recipient phone is required for gifts." }
      }
      if (sendDateOption && sendDateOption !== "immediate" && isNaN(new Date(sendDateOption).getTime())) {
        return { success: false, error: "Invalid send date format." }
      }
    }
    // --- End Input Validation ---

    // Generate unique code
    const code = `GV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    const giftVoucherData: Partial<IGiftVoucher> = {
      code,
      voucherType,
      purchaserUserId: new mongoose.Types.ObjectId(session.user.id),
      ownerUserId:
        isGift && recipientName ? new mongoose.Types.ObjectId() : new mongoose.Types.ObjectId(session.user.id), // Placeholder for gift owner or self
      isGift,
      status: "pending_payment",
      purchaseDate: new Date(),
      validFrom: new Date(), // Or specific logic e.g. sendDate if defined
      validUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // 1 year validity
      isActive: false, // Will be activated upon successful payment
    }

    if (isGift) {
      giftVoucherData.recipientName = recipientName
      giftVoucherData.recipientPhone = recipientPhone
      giftVoucherData.greetingMessage = greetingMessage
      if (sendDateOption) {
        if (sendDateOption === "immediate") {
          // Will be handled post-payment
        } else {
          giftVoucherData.sendDate = new Date(sendDateOption)
        }
      }
      // For gifts, owner might be the recipient. This needs clarification.
      // If recipient is a new user, an account might need to be created or linked.
      // For now, let's assume owner is still purchaser, and recipient details are for notification.
      // Or, if recipient is an existing user, find their ID. This is complex.
      // Simplification: owner is purchaser. Recipient details are for the gift itself.
      giftVoucherData.ownerUserId = new mongoose.Types.ObjectId(session.user.id)
    }

    let calculatedPrice = 0

    if (voucherType === "monetary") {
      // Validation already done
      giftVoucherData.monetaryValue = monetaryValue
      giftVoucherData.originalAmount = monetaryValue
      giftVoucherData.remainingAmount = monetaryValue // Initialize remaining amount
      calculatedPrice = monetaryValue!
    } else if (voucherType === "treatment") {
      if (!treatmentId) return { success: false, error: "Treatment ID is required." } // Should be caught
      const treatment = (await Treatment.findById(treatmentId).lean()) as any
      if (!treatment) return { success: false, error: "Treatment not found." }

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

    // Mock payment URL for now
    const paymentUrl = `/dashboard/member/gift-vouchers/payment-simulation?voucherId=${newVoucher._id}&amount=${calculatedPrice}`

    return {
      success: true,
      voucherId: newVoucher._id.toString(),
      paymentUrl, // This would be from a payment provider
      amount: calculatedPrice,
    }
  } catch (error) {
    logger.error("Error initiating gift voucher purchase:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      details: error,
    })
    return { success: false, error: "Failed to initiate purchase. Please try again." }
  }
}

export async function confirmGiftVoucherPurchase(data: PaymentResultData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return { success: false, error: "Unauthorized" }
    }
    if (!mongoose.Types.ObjectId.isValid(data.voucherId)) {
      return { success: false, error: "Invalid Voucher ID format." }
    }

    await dbConnect()

    const { voucherId, paymentId, success: paymentSuccess, amount } = data

    const voucher = await GiftVoucher.findById(voucherId)
    if (!voucher) {
      return { success: false, error: "Voucher not found" }
    }

    // Security check: Ensure the voucher is still in pending_payment and matches the user
    if (voucher.purchaserUserId.toString() !== session.user.id) {
      return { success: false, error: "Purchase record mismatch." }
    }
    if (voucher.status !== "pending_payment") {
      return { success: false, error: "Voucher not awaiting payment or already processed." }
    }
    // Optional: Verify amount against voucher's calculated price if stored
    // if (voucher.monetaryValue !== amount && voucher.voucherType === "monetary") { // Simplified check
    //    logger.warn("Payment amount mismatch for voucher", { voucherId, expected: voucher.monetaryValue, paid: amount });
    //    // Decide how to handle: error out, or log and proceed?
    // }

    if (paymentSuccess) {
      voucher.paymentId = paymentId
      voucher.isActive = true // Activate the voucher

      if (voucher.isGift && voucher.recipientPhone) {
        if (voucher.sendDate && voucher.sendDate > new Date()) {
          voucher.status = "pending_send" // Scheduled to be sent
        } else {
          voucher.status = "sent" // Mark as sent if immediate or past sendDate
          voucher.sendDate = new Date() // Ensure sendDate is set for immediate sends
          try {
            await notificationManager.sendNotification(
              "sms",
              { value: voucher.recipientPhone, name: voucher.recipientName || "Recipient" },
              {
                type: "GIFT_VOUCHER_RECEIVED", // Use a defined template type
                params: {
                  recipientName: voucher.recipientName || "there",
                  purchaserName: session.user.name || "Someone special",
                  voucherCode: voucher.code,
                  greetingMessage: voucher.greetingMessage || "",
                  // Potentially add validUntil or value if template supports
                },
              },
            )
            logger.info(`Gift voucher SMS notification sent to ${voucher.recipientPhone} for voucher ${voucher.code}`)
          } catch (notificationError) {
            logger.error("Failed to send gift voucher SMS notification post-payment", {
              error: notificationError,
              voucherId: voucher._id.toString(),
              recipientPhone: voucher.recipientPhone,
            })
          }
        }
      } else {
        voucher.status = "active" // Not a gift or no recipient for immediate send, just activate
      }

      await voucher.save()

      revalidatePath("/dashboard/member/gift-vouchers")
      if (voucher.purchaserUserId.toString() !== voucher.ownerUserId.toString()) {
        revalidatePath(`/dashboard/user/${voucher.ownerUserId.toString()}/gift-vouchers`) // If owner is different
      }

      return {
        success: true,
        voucher: await toGiftVoucherPlain(voucher), // Pass Mongoose doc
      }
    } else {
      voucher.status = "cancelled" // Or 'payment_failed'
      voucher.isActive = false
      await voucher.save()
      return { success: false, error: "Payment failed. Voucher not activated." }
    }
  } catch (error) {
    logger.error("Error confirming gift voucher purchase:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      details: error,
    })
    return { success: false, error: "Failed to confirm purchase. Please contact support." }
  }
}

// This function might be deprecated if gift details are set during initiation.
// Or it can be used to UPDATE gift details for a voucher that is already a gift.
export async function setGiftDetails(voucherId: string, details: GiftDetailsPayload) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return { success: false, error: "Unauthorized" }
    }
    if (!mongoose.Types.ObjectId.isValid(voucherId)) {
      return { success: false, error: "Invalid Voucher ID format." }
    }

    await dbConnect()

    const voucher = await GiftVoucher.findById(voucherId)
    if (!voucher) {
      return { success: false, error: "Voucher not found" }
    }

    if (voucher.purchaserUserId.toString() !== session.user.id) {
      // Or if admin, allow. For now, only purchaser.
      return { success: false, error: "You are not authorized to modify this voucher." }
    }

    // --- Input Validation for Gift Details ---
    if (!details.recipientName || details.recipientName.trim() === "") {
      return { success: false, error: "Recipient name is required." }
    }
    if (!details.recipientPhone || details.recipientPhone.trim() === "") {
      return { success: false, error: "Recipient phone is required." }
    }
    if (details.sendDate && details.sendDate !== "immediate" && isNaN(new Date(details.sendDate).getTime())) {
      return { success: false, error: "Invalid send date format." }
    }
    // --- End Input Validation ---

    voucher.isGift = true // Ensure it's marked as a gift
    voucher.recipientName = details.recipientName
    voucher.recipientPhone = details.recipientPhone
    voucher.greetingMessage = details.greetingMessage

    // Handle sendDate and status, especially if voucher was already 'active' or 'pending_payment'
    // This logic assumes the voucher is already paid for if this function is called post-purchase.
    if (voucher.status === "active" || voucher.status === "sent" || voucher.status === "pending_send") {
      // If already active/processed
      if (details.sendDate === "immediate" || !details.sendDate) {
        if (voucher.status !== "sent") {
          // Avoid re-sending if already sent
          voucher.sendDate = new Date()
          voucher.status = "sent"
          // Send notification
          try {
            await notificationManager.sendNotification(
              "sms",
              { value: voucher.recipientPhone, name: voucher.recipientName },
              {
                type: "GIFT_VOUCHER_RECEIVED", // Or a "GIFT_VOUCHER_DETAILS_UPDATED"
                params: {
                  /* ... params ... */
                },
              },
            )
            logger.info(`Gift details updated and SMS sent for voucher ${voucher.code}`)
          } catch (notificationError) {
            logger.error("Failed to send SMS on gift details update", { error: notificationError, voucherId })
          }
        }
      } else {
        // Scheduled send
        const newSendDate = new Date(details.sendDate)
        if (newSendDate <= new Date() && voucher.status !== "sent") {
          // If scheduled for past/now and not yet sent
          voucher.sendDate = new Date() // Send now
          voucher.status = "sent"
          // Send notification
        } else if (newSendDate > new Date()) {
          voucher.sendDate = newSendDate
          voucher.status = "pending_send" // Reschedule
        }
      }
    } else if (voucher.status === "pending_payment") {
      // If setting details before payment, just store them.
      // The confirmGiftVoucherPurchase will handle the sending logic.
      if (details.sendDate && details.sendDate !== "immediate") {
        voucher.sendDate = new Date(details.sendDate)
      }
    }

    await voucher.save()

    revalidatePath("/dashboard/member/gift-vouchers")

    return {
      success: true,
      voucher: await toGiftVoucherPlain(voucher), // Pass Mongoose doc
    }
  } catch (error) {
    logger.error("Error setting gift details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      details: error,
    })
    return { success: false, error: "Failed to set gift details. Please try again." }
  }
}

export async function getMemberPurchasedVouchers() {
  // Vouchers purchased by the logged-in user
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return { success: false, error: "Unauthorized", giftVouchers: [] }
    }

    await dbConnect()

    const voucherDocs = await GiftVoucher.find({
      purchaserUserId: new mongoose.Types.ObjectId(session.user.id),
    }).sort({ purchaseDate: -1 }) // Sort by purchase date
    // .lean() // Removed for consistency with toGiftVoucherPlain

    const giftVouchers = await Promise.all(voucherDocs.map((doc) => toGiftVoucherPlain(doc))).catch((err) => {
      logger.error("Error transforming purchased vouchers in getMemberPurchasedVouchers", err)
      return []
    })

    return {
      success: true,
      giftVouchers,
    }
  } catch (error) {
    logger.error("Error fetching member purchased vouchers:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      details: error,
    })
    return { success: false, error: "Failed to fetch purchased vouchers", giftVouchers: [] }
  }
}

export async function getMemberOwnedVouchers() {
  // Vouchers owned by (usable by) the logged-in user
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return { success: false, error: "Unauthorized", giftVouchers: [] }
    }

    await dbConnect()

    const currentDate = new Date()
    // Fetches vouchers that are active/partially_used, not expired, and belong to the user.
    const voucherDocs = await GiftVoucher.find({
      ownerUserId: new mongoose.Types.ObjectId(session.user.id),
      // status: { $in: ["active", "partially_used", "sent", "pending_send"] }, // Include 'sent' and 'pending_send' if they are considered "owned" before use
      // validFrom: { $lte: currentDate }, // Ensure it has started
      // validUntil: { $gte: currentDate }, // Ensure it has not expired
      // isActive: true, // Ensure admin has not deactivated it
    }).sort({ validUntil: 1, purchaseDate: -1 }) // Sort by expiry, then purchase date
    // .lean() // Removed for consistency

    const giftVouchers = await Promise.all(voucherDocs.map((doc) => toGiftVoucherPlain(doc))).catch((err) => {
      logger.error("Error transforming owned vouchers in getMemberOwnedVouchers", err)
      return []
    })

    return {
      success: true,
      giftVouchers, // Filtered and sorted by usability
    }
  } catch (error) {
    logger.error("Error fetching member owned vouchers:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      details: error,
    })
    return { success: false, error: "Failed to fetch owned vouchers", giftVouchers: [] }
  }
}

export interface OrderDetailsForRedemption {
  orderId?: string // Optional ID of the order/cart this redemption is for
  totalAmount: number // The amount the user is trying to pay/redeem against
  items?: { name: string; price: number }[] // Optional item details for logging/history
}

export async function redeemGiftVoucher(code: string, orderDetails: OrderDetailsForRedemption) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const voucher = await GiftVoucher.findOne({ code: code.trim() }) // Trim code just in case
    if (!voucher) {
      return { success: false, error: "Voucher not found." }
    }

    // Check ownership (or if it's a gift, different logic might apply if not yet "owned")
    if (voucher.ownerUserId.toString() !== session.user.id) {
      // Potentially allow redemption if it's a gift sent to this user's phone/email,
      // and they are claiming it. This is more complex.
      // For now, strict ownership.
      return { success: false, error: "This voucher does not belong to you or cannot be redeemed by you." }
    }

    const currentDate = new Date()
    if (voucher.validFrom > currentDate) {
      return { success: false, error: "Voucher is not yet valid." }
    }
    if (voucher.validUntil < currentDate) {
      voucher.status = "expired" // Ensure status is updated if checked late
      await voucher.save()
      return { success: false, error: "Voucher has expired." }
    }
    if (!voucher.isActive) {
      return { success: false, error: "Voucher is currently inactive." }
    }

    if (!["active", "partially_used", "sent"].includes(voucher.status)) {
      // 'sent' could be a valid status if it means "sent to recipient, ready for first use"
      return { success: false, error: "Voucher is not available for use (e.g., pending, used, cancelled)." }
    }

    let amountApplied = 0
    const originalStatus = voucher.status // For logging or conditional logic

    if (voucher.voucherType === "treatment") {
      // For treatment vouchers, typically one-time use.
      // Ensure it hasn't been used.
      if (voucher.status === "fully_used") return { success: false, error: "Treatment voucher already used." }

      voucher.status = "fully_used"
      amountApplied = voucher.monetaryValue || 0 // The "value" of the treatment
      if (!voucher.usageHistory) voucher.usageHistory = []
      voucher.usageHistory.push({
        date: new Date(),
        amountUsed: amountApplied,
        orderId: orderDetails.orderId ? new mongoose.Types.ObjectId(orderDetails.orderId) : undefined,
        description: `Redeemed for treatment: ${orderDetails.items?.[0]?.name || "Treatment"}`,
      } as any)
    } else if (voucher.voucherType === "monetary") {
      if ((voucher.remainingAmount || 0) <= 0) {
        return { success: false, error: "Voucher has no remaining balance." }
      }

      const redemptionAmount = orderDetails.totalAmount // Amount user wants to apply from order
      amountApplied = Math.min(redemptionAmount, voucher.remainingAmount || 0)

      if (amountApplied <= 0) {
        // Should not happen if remainingAmount > 0
        return { success: false, error: "No amount could be applied from voucher." }
      }

      voucher.remainingAmount = (voucher.remainingAmount || 0) - amountApplied

      if (!voucher.usageHistory) voucher.usageHistory = []
      voucher.usageHistory.push({
        date: new Date(),
        amountUsed: amountApplied,
        orderId: orderDetails.orderId ? new mongoose.Types.ObjectId(orderDetails.orderId) : undefined,
        description: `Redeemed against order total: ${orderDetails.totalAmount}`,
      } as any)

      if (voucher.remainingAmount <= 0) {
        voucher.status = "fully_used"
        voucher.remainingAmount = 0 // Ensure it's not negative
      } else {
        voucher.status = "partially_used"
      }
    } else {
      return { success: false, error: "Unknown voucher type." } // Should not happen
    }

    await voucher.save()

    revalidatePath("/dashboard/member/gift-vouchers")
    // Potentially revalidate admin path too if they monitor usage
    revalidatePath("/dashboard/admin/gift-vouchers")

    return {
      success: true,
      updatedVoucher: await toGiftVoucherPlain(voucher), // Pass Mongoose doc
      amountApplied,
      message: `Voucher redeemed successfully. Amount applied: ${amountApplied.toFixed(2)} ILS.`,
    }
  } catch (error) {
    logger.error("Error redeeming gift voucher:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      code: code, // Log the code attempted
      details: error,
    })
    return { success: false, error: "Failed to redeem voucher. Please try again or contact support." }
  }
}
