"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import mongoose, { type FilterQuery } from "mongoose"

import { authOptions } from "@/lib/auth/auth"
import GiftVoucher, {
  type IGiftVoucher,
  type GiftVoucherPlain as IGiftVoucherPlainFile, // Renamed to avoid conflict with local interface
} from "@/lib/db/models/gift-voucher"
import User from "@/lib/db/models/user"
import Treatment from "@/lib/db/models/treatment" // Corrected import
import dbConnect from "@/lib/db/mongoose" // Corrected import
import { logger } from "@/lib/logs/logger" // Corrected import
import { notificationManager } from "@/lib/notifications/notification-manager"

// Extended GiftVoucherPlain for client-side use, including populated fields
export interface GiftVoucherPlain extends IGiftVoucherPlainFile {
  _id: string
  code: string
  voucherType: "treatment" | "monetary"
  treatmentId?: string
  treatmentName?: string // For display
  selectedDurationId?: string
  selectedDurationName?: string // For display. Consider using minutes for clarity.
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
  usageHistory?: { date: Date; amountUsed: number; orderId?: string; description?: string }[]
  isActive: boolean
  createdAt?: Date | string
  updatedAt?: Date | string
}

// Helper to convert Mongoose document or plain object to a standardized plain object for client
async function toGiftVoucherPlain(voucherDocOrPlain: IGiftVoucher | Record<string, any>): Promise<GiftVoucherPlain> {
  if (!voucherDocOrPlain) {
    logger.warn("toGiftVoucherPlain called with null or undefined input.")
    // Instead of throwing, let's return a structure that indicates an error or an empty/default state
    // This depends on how consumers of this function expect to handle such cases.
    // For now, let's throw to make it explicit that this is an unexpected state.
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
      const treatmentDoc = (await Treatment.findById(treatmentIdStr)
        .select("name durations fixedPrice pricingType")
        .lean()) as any
      treatmentName = treatmentDoc?.name
      if (selectedDurationIdStr && treatmentDoc?.durations) {
        const duration = treatmentDoc.durations.find((d: any) => d._id?.toString() === selectedDurationIdStr)
        // Assuming duration might have 'minutes' or a specific 'name'
        selectedDurationName = duration?.minutes ? `${duration.minutes} min` : duration?.name || "Selected Duration"
      }
    }

    const formatDate = (date: any) => (date ? new Date(date).toISOString() : undefined)

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
      sendDate: formatDate(voucher.sendDate),
      status: voucher.status,
      purchaseDate: formatDate(voucher.purchaseDate)!,
      validFrom: formatDate(voucher.validFrom)!,
      validUntil: formatDate(voucher.validUntil)!,
      paymentId: voucher.paymentId,
      usageHistory: voucher.usageHistory?.map((h: any) => ({
        ...h,
        date: formatDate(h.date)!,
        orderId: h.orderId?.toString(),
      })),
      isActive:
        (voucher.status === "active" || voucher.status === "partially_used" || voucher.status === "sent") &&
        new Date(voucher.validUntil) >= new Date() &&
        new Date(voucher.validFrom) <= new Date(),
      createdAt: formatDate(voucher.createdAt),
      updatedAt: formatDate(voucher.updatedAt),
    }
  } catch (error) {
    logger.error("Error during population/transformation in toGiftVoucherPlain:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      voucherId: voucher._id?.toString(),
      inputKeys: Object.keys(voucherDocOrPlain),
    })
    // Fallback to a minimal representation if population fails
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
  monetaryValue?: string // Keep as string for form input, convert to number in action
  ownerUserId: string
  validFrom: string // ISO Date string
  validUntil: string // ISO Date string
  status: GiftVoucherPlain["status"]
}

export async function createGiftVoucherByAdmin(data: AdminGiftVoucherFormData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    // Basic validations
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

    // Type-specific validations
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
      // selectedDurationId is optional, but if provided, must be valid
      if (
        data.selectedDurationId &&
        (typeof data.selectedDurationId !== "string" || !mongoose.Types.ObjectId.isValid(data.selectedDurationId))
      ) {
        return { success: false, error: "Valid Selected Duration ID is required if provided." }
      }
    }

    const { code, voucherType, treatmentId, selectedDurationId, monetaryValue, ownerUserId, validFrom, validUntil } =
      data

    const owner = await User.findById(ownerUserId).lean()
    if (!owner) {
      return { success: false, error: "Owner user not found." }
    }

    const giftVoucherData: Partial<IGiftVoucher> = {
      code,
      voucherType,
      purchaserUserId: new mongoose.Types.ObjectId(session.user.id), // Admin is the purchaser in this case
      ownerUserId: new mongoose.Types.ObjectId(ownerUserId),
      validFrom: new Date(validFrom),
      validUntil: new Date(validUntil),
      status: data.status, // Use status from form
      isActive: data.status === "active" || data.status === "partially_used" || data.status === "sent", // Determine isActive based on status
      isGift: false, // By default, admin-created vouchers are not gifts unless specified
      purchaseDate: new Date(), // Set purchase date to now
    }

    if (voucherType === "monetary") {
      const val = Number(monetaryValue) // Already validated above
      giftVoucherData.monetaryValue = val
      giftVoucherData.originalAmount = val
      giftVoucherData.remainingAmount = val
    } else if (voucherType === "treatment") {
      const treatmentDoc = (await Treatment.findById(treatmentId)
        .select("fixedPrice pricingType durations")
        .lean()) as any
      if (!treatmentDoc) return { success: false, error: "Treatment not found." }

      giftVoucherData.treatmentId = new mongoose.Types.ObjectId(treatmentId)
      let price = 0
      if (treatmentDoc.pricingType === "fixed") {
        price = treatmentDoc.fixedPrice || 0
      } else if (treatmentDoc.pricingType === "duration_based" && selectedDurationId && treatmentDoc.durations) {
        const duration = treatmentDoc.durations.find((d: any) => d._id.toString() === selectedDurationId)
        if (duration && typeof duration.price === "number") {
          price = duration.price
        }
        giftVoucherData.selectedDurationId = new mongoose.Types.ObjectId(selectedDurationId)
      }
      giftVoucherData.monetaryValue = price // The effective value of the treatment voucher
      // originalAmount and remainingAmount might not be directly applicable or could be set to monetaryValue
      giftVoucherData.originalAmount = price
      giftVoucherData.remainingAmount = price // For treatment vouchers, this might represent 1 use
    }

    const newVoucher = new GiftVoucher(giftVoucherData)
    await newVoucher.save()

    revalidatePath("/dashboard/admin/gift-vouchers")
    revalidatePath("/dashboard/member/gift-vouchers") // Revalidate member page too

    return {
      success: true,
      giftVoucher: await toGiftVoucherPlain(newVoucher),
    }
  } catch (error) {
    logger.error("Error creating gift voucher by admin:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      details: error, // Log the full error object for more details
    })
    const errorMessage = error instanceof Error ? error.message : "Failed to create gift voucher"
    if (error instanceof mongoose.Error.ValidationError) {
      return { success: false, error: error.message }
    }
    // Handle duplicate key error for 'code'
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

    // Validate incoming data fields if they exist
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

    const existingVoucher = await GiftVoucher.findById(id)
    if (!existingVoucher) {
      return { success: false, error: "Gift voucher not found" }
    }

    // Date validation: validFrom must be before validUntil
    const checkValidFrom = data.validFrom ? new Date(data.validFrom) : existingVoucher.validFrom
    const checkValidUntil = data.validUntil ? new Date(data.validUntil) : existingVoucher.validUntil

    if (checkValidFrom >= checkValidUntil) {
      return { success: false, error: "'Valid from' date must be before 'valid until' date." }
    }

    const updateData: any = { ...data } // Clone data to modify

    // Update isActive based on new status or existing status
    if (data.status) {
      updateData.isActive = data.status === "active" || data.status === "partially_used" || data.status === "sent"
    } else {
      // If status is not being updated, maintain isActive based on existing status
      updateData.isActive =
        existingVoucher.status === "active" ||
        existingVoucher.status === "partially_used" ||
        existingVoucher.status === "sent"
    }

    // Convert date strings to Date objects if provided
    if (data.validFrom) updateData.validFrom = new Date(data.validFrom)
    if (data.validUntil) updateData.validUntil = new Date(data.validUntil)

    // Convert ID strings to ObjectId if provided
    if (data.ownerUserId) updateData.ownerUserId = new mongoose.Types.ObjectId(data.ownerUserId)
    if (data.treatmentId) updateData.treatmentId = new mongoose.Types.ObjectId(data.treatmentId)
    if (data.selectedDurationId) updateData.selectedDurationId = new mongoose.Types.ObjectId(data.selectedDurationId)

    const newVoucherType = data.voucherType || existingVoucher.voucherType
    updateData.voucherType = newVoucherType // Ensure voucherType is part of updateData if changed

    if (newVoucherType === "monetary") {
      if (data.monetaryValue !== undefined) {
        // Check if monetaryValue is explicitly being set/changed
        const val = Number(data.monetaryValue)
        if (String(data.monetaryValue).trim() === "" || isNaN(val) || val <= 0) {
          return { success: false, error: "Invalid monetary value. Must be a positive number." }
        }
        updateData.monetaryValue = val
        // If changing to monetary or updating monetary value, reset original/remaining amounts
        updateData.originalAmount = val
        updateData.remainingAmount = val
        // Nullify treatment specific fields if switching to monetary
        updateData.treatmentId = null
        updateData.selectedDurationId = null
      } else if (data.voucherType === "monetary" && existingVoucher.voucherType !== "monetary") {
        // If switching to monetary type but no monetaryValue is provided in the update
        return { success: false, error: "Monetary value is required when changing to monetary voucher type." }
      }
    } else if (newVoucherType === "treatment") {
      // If voucherType is treatment (either existing or new)
      const treatmentIdToUse = updateData.treatmentId || existingVoucher.treatmentId
      if (!treatmentIdToUse) {
        return { success: false, error: "Treatment ID is required for treatment voucher." }
      }
      const treatmentDoc = (await Treatment.findById(treatmentIdToUse)
        .select("fixedPrice pricingType durations")
        .lean()) as any
      if (!treatmentDoc) return { success: false, error: "Treatment not found." }

      let price = 0
      if (treatmentDoc.pricingType === "fixed") {
        price = treatmentDoc.fixedPrice || 0
      } else if (treatmentDoc.pricingType === "duration_based") {
        const durationIdToUse = updateData.selectedDurationId || existingVoucher.selectedDurationId
        if (durationIdToUse && treatmentDoc.durations) {
          const duration = treatmentDoc.durations.find((d: any) => d._id.toString() === durationIdToUse.toString())
          if (duration && typeof duration.price === "number") price = duration.price
        } else if (!durationIdToUse && treatmentDoc.durations && treatmentDoc.durations.length > 0) {
          // If no specific duration is selected for an update, and it's duration-based,
          // it's ambiguous. Could default or require selection. For now, price might be 0 or based on a default.
          // This part might need refinement based on business logic for updates.
        }
      }
      updateData.monetaryValue = price
      // If switching from monetary to treatment, nullify monetary-specific original/remaining if they don't apply
      if (existingVoucher.voucherType === "monetary" && data.voucherType === "treatment") {
        updateData.originalAmount = price // Or null if not applicable
        updateData.remainingAmount = price // Or null
      }
      // Nullify monetaryValue if switching to treatment and it's not set by treatment logic
      if (data.voucherType === "treatment") {
        updateData.monetaryValue = price // ensure monetaryValue is set from treatment
      }
    }

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
      giftVoucher: await toGiftVoucherPlain(updatedVoucher),
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
    dateRange?: { from?: string; to?: string }
  } = {},
) {
  try {
    await dbConnect()
    const query: FilterQuery<IGiftVoucher> = {}
    if (search) {
      const searchRegex = { $regex: search, $options: "i" }
      // Attempt to find users by name or email to search by their IDs
      const usersByNameOrEmail = await User.find({
        $or: [{ name: searchRegex }, { email: searchRegex }],
      })
        .select("_id")
        .lean()
      const userIds = usersByNameOrEmail.map((u) => u._id)

      query.$or = [
        { code: searchRegex },
        { recipientName: searchRegex }, // Search by recipient name
      ]
      if (userIds.length > 0) {
        query.$or.push({ purchaserUserId: { $in: userIds } })
        query.$or.push({ ownerUserId: { $in: userIds } })
      }
    }
    if (filters.voucherType) query.voucherType = filters.voucherType
    if (filters.status) query.status = filters.status
    if (filters.dateRange?.from && filters.dateRange?.to) {
      query.validUntil = { $gte: new Date(filters.dateRange.from), $lte: new Date(filters.dateRange.to) }
    } else if (filters.dateRange?.from) {
      query.validUntil = { $gte: new Date(filters.dateRange.from) }
    } else if (filters.dateRange?.to) {
      query.validUntil = { $lte: new Date(filters.dateRange.to) }
    }
    const skip = (page - 1) * limit
    const giftVoucherDocs = await GiftVoucher.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean() // Use .lean()
    const total = await GiftVoucher.countDocuments(query)

    // Use Promise.allSettled to handle potential errors in toGiftVoucherPlain for individual vouchers
    const giftVouchersResults = await Promise.allSettled(giftVoucherDocs.map((doc) => toGiftVoucherPlain(doc)))
    const giftVouchers = giftVouchersResults
      .filter((result) => result.status === "fulfilled")
      .map((result) => (result as PromiseFulfilledResult<GiftVoucherPlain>).value)

    if (giftVouchersResults.some((result) => result.status === "rejected")) {
      logger.warn("Some gift vouchers failed to transform in getGiftVouchers.")
      // Optionally log rejected reasons:
      // giftVouchersResults.forEach(result => {
      //   if (result.status === 'rejected') logger.error('Voucher transformation error:', result.reason);
      // });
    }

    return {
      success: true,
      giftVouchers,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
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

// Updated getTreatmentsForSelection function
export async function getTreatmentsForSelection() {
  try {
    await dbConnect()
    const treatmentsFromDB = (await Treatment.find({ isActive: true })
      .select("name category pricingType fixedPrice durations") // Ensure all needed fields are selected
      .lean()) as any[] // Cast to any[] for easier mapping if ITreatment is complex

    const treatments = treatmentsFromDB.map((t) => {
      let displayPrice: number | undefined
      if (t.pricingType === "fixed") {
        displayPrice = t.fixedPrice
      }
      // For duration-based, price is per duration, so base 'price' might be undefined here.
      // The client will handle price display based on selected duration.

      return {
        _id: t._id.toString(),
        name: t.name,
        category: t.category,
        price: displayPrice, // This is the fixed price if applicable
        fixedPrice: t.fixedPrice, // Explicitly pass fixedPrice
        durations:
          t.durations?.map((d: any) => ({
            _id: d._id.toString(),
            // name: d.name, // If duration has a specific name (e.g., "60 min session")
            price: d.price,
            minutes: d.minutes,
          })) || [],
      }
    })

    return {
      success: true,
      treatments,
    }
  } catch (error) {
    logger.error("Error fetching treatments for selection:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return { success: false, error: "Failed to fetch treatments", treatments: [] }
  }
}

export async function getUsersForAdminSelection() {
  try {
    await dbConnect()
    // Fetch users who can own a gift voucher (e.g., members, or any user type)
    const users = await User.find({ roles: { $in: ["member", "admin", "partner", "professional"] } }) // Adjust roles as needed
      .select("_id name email roles")
      .lean()
    return {
      success: true,
      users: users.map((u) => ({
        _id: u._id.toString(),
        name: u.name || u.email, // Fallback to email if name is not set
        email: u.email,
        roles: u.roles,
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

export interface PurchaseInitiationData {
  voucherType: "treatment" | "monetary"
  treatmentId?: string
  selectedDurationId?: string
  monetaryValue?: number // For monetary type
  isGift: boolean
  // Removed giftDetails from here, will be a separate step
}

export interface GiftDetailsPayload {
  recipientName: string
  recipientPhone: string
  greetingMessage?: string
  sendDate?: string // ISO string or "immediate"
}

export interface PaymentResultData {
  voucherId: string
  paymentId: string // From payment gateway
  success: boolean // Payment status
  amount: number // Amount charged
}

export async function initiatePurchaseGiftVoucher(data: PurchaseInitiationData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return { success: false, error: "Unauthorized" }
    }
    await dbConnect()
    const { voucherType, treatmentId, selectedDurationId, monetaryValue, isGift } = data

    // Validation
    if (!voucherType || (voucherType !== "monetary" && voucherType !== "treatment")) {
      return { success: false, error: "Valid voucher type is required." }
    }
    if (voucherType === "monetary") {
      if (typeof monetaryValue !== "number" || monetaryValue < 150) {
        // Assuming 150 is min value
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

    // Generate a unique code
    const code = `GV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    const giftVoucherData: Partial<IGiftVoucher> = {
      code,
      voucherType,
      purchaserUserId: new mongoose.Types.ObjectId(session.user.id),
      ownerUserId: new mongoose.Types.ObjectId(session.user.id), // Owner is purchaser by default, can be changed if it's a gift later
      isGift,
      status: "pending_payment", // Initial status
      purchaseDate: new Date(),
      validFrom: new Date(), // Valid from today
      validUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // Valid for 1 year
      isActive: false, // Not active until payment is confirmed
    }

    let calculatedPrice = 0
    if (voucherType === "monetary") {
      giftVoucherData.monetaryValue = monetaryValue
      giftVoucherData.originalAmount = monetaryValue
      giftVoucherData.remainingAmount = monetaryValue
      calculatedPrice = monetaryValue!
    } else if (voucherType === "treatment") {
      const treatmentDoc = (await Treatment.findById(treatmentId)
        .select("fixedPrice pricingType durations")
        .lean()) as any
      if (!treatmentDoc) return { success: false, error: "Treatment not found." }
      giftVoucherData.treatmentId = new mongoose.Types.ObjectId(treatmentId)

      if (treatmentDoc.pricingType === "fixed") {
        calculatedPrice = treatmentDoc.fixedPrice || 0
      } else if (treatmentDoc.pricingType === "duration_based" && selectedDurationId && treatmentDoc.durations) {
        const duration = treatmentDoc.durations.find((d: any) => d._id.toString() === selectedDurationId)
        if (duration && typeof duration.price === "number") {
          calculatedPrice = duration.price
        }
        giftVoucherData.selectedDurationId = new mongoose.Types.ObjectId(selectedDurationId)
      } else {
        // Fallback or error if price cannot be determined
        return { success: false, error: "Could not determine price for the selected treatment/duration." }
      }
      giftVoucherData.monetaryValue = calculatedPrice // Effective value of the treatment
      giftVoucherData.originalAmount = calculatedPrice
      giftVoucherData.remainingAmount = calculatedPrice // For treatment, this might mean 1 use
    }

    const newVoucher = new GiftVoucher(giftVoucherData)
    await newVoucher.save()

    return {
      success: true,
      voucherId: newVoucher._id.toString(),
      amount: calculatedPrice, // Amount to be charged by payment gateway
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
    const { voucherId, paymentId, success: paymentSuccess /* amount */ } = data // amount from payment gateway can be used for verification

    const voucher = await GiftVoucher.findById(voucherId)
    if (!voucher) {
      return { success: false, error: "Voucher not found" }
    }
    // Security check: ensure the voucher belongs to the user initiating confirmation (optional, depends on flow)
    if (voucher.purchaserUserId.toString() !== session.user.id) {
      // This check might be too strict if admin can confirm, or if payment callback is server-to-server
      // For user-driven confirmation, it's good.
      // logger.warn("Voucher purchaser mismatch during confirmation.", { voucherId, userId: session.user.id });
      // return { success: false, error: "Purchase record mismatch." };
    }
    if (voucher.status !== "pending_payment") {
      return { success: false, error: "Voucher not awaiting payment or already processed." }
    }

    if (paymentSuccess) {
      voucher.paymentId = paymentId
      // Status and isActive will be updated by setGiftDetails or directly if not a gift.
      // If it's not a gift, or if it's a gift to be sent immediately (handled by setGiftDetails),
      // status becomes 'active' or 'sent'.
      // For scheduled gifts, status becomes 'pending_send'.
      // isActive becomes true once payment is confirmed AND it's not pending_send for a future date.

      if (!voucher.isGift) {
        voucher.status = "active"
        voucher.isActive = true // Active immediately if not a gift
      } else {
        // If it's a gift, status will be 'pending_send' or 'sent' based on setGiftDetails.
        // isActive will also be set accordingly. For now, payment is confirmed.
        // The actual activation/sending logic is in setGiftDetails.
      }

      await voucher.save()

      revalidatePath("/dashboard/member/gift-vouchers")
      // If owner is different from purchaser (e.g. admin created for user, or gift scenario)
      if (voucher.purchaserUserId.toString() !== voucher.ownerUserId.toString()) {
        revalidatePath(`/dashboard/user/${voucher.ownerUserId.toString()}/gift-vouchers`) // Hypothetical path
      }

      return {
        success: true,
        voucher: await toGiftVoucherPlain(voucher), // Return the updated voucher
      }
    } else {
      // Payment failed
      voucher.status = "cancelled" // Or some other failed status
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
    // Ensure the current user is the purchaser to set gift details
    if (voucher.purchaserUserId.toString() !== session.user.id) {
      return { success: false, error: "You are not authorized to modify this voucher." }
    }
    // Validate gift details
    if (!details.recipientName || details.recipientName.trim() === "") {
      return { success: false, error: "Recipient name is required." }
    }
    if (!details.recipientPhone || details.recipientPhone.trim() === "") {
      // Add phone validation if needed
      return { success: false, error: "Recipient phone is required." }
    }
    if (details.sendDate && details.sendDate !== "immediate" && isNaN(new Date(details.sendDate).getTime())) {
      return { success: false, error: "Invalid send date format." }
    }

    voucher.isGift = true // Mark as gift
    voucher.recipientName = details.recipientName
    voucher.recipientPhone = details.recipientPhone
    voucher.greetingMessage = details.greetingMessage

    // Determine owner: if it's a gift, the recipient effectively becomes the owner.
    // This part needs clarification: Does the recipient get a user account? Or is owner still purchaser?
    // For simplicity, let's assume owner remains the purchaser unless a specific user account for recipient is created/linked.
    // If recipientPhone is used to find/create a user, then ownerUserId could be updated.
    // For now, ownerUserId remains session.user.id (purchaser).

    const now = new Date()
    if (details.sendDate === "immediate" || !details.sendDate) {
      voucher.sendDate = now
      voucher.status = "sent" // Gift sent
      voucher.isActive = true // Active as it's sent
      // TODO: Send notification immediately
      try {
        await notificationManager.sendNotification(
          "sms", // Assuming SMS channel
          { value: voucher.recipientPhone, name: voucher.recipientName }, // Recipient details
          {
            type: "GIFT_VOUCHER_RECEIVED", // Notification type
            params: {
              // Parameters for the template
              recipientName: voucher.recipientName || "there",
              purchaserName: session.user.name || "Someone special",
              voucherCode: voucher.code,
              greetingMessage: voucher.greetingMessage || "",
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
        // Don't fail the whole operation due to notification error, but log it.
      }
    } else {
      const scheduledSendDate = new Date(details.sendDate)
      voucher.sendDate = scheduledSendDate
      if (scheduledSendDate <= now) {
        // If scheduled for past/now, treat as immediate
        voucher.status = "sent"
        voucher.isActive = true
        // TODO: Send notification immediately
        try {
          await notificationManager.sendNotification(
            "sms",
            { value: voucher.recipientPhone, name: voucher.recipientName },
            {
              type: "GIFT_VOUCHER_RECEIVED",
              params: {
                recipientName: voucher.recipientName || "there",
                purchaserName: session.user.name || "Someone special",
                voucherCode: voucher.code,
                greetingMessage: voucher.greetingMessage || "",
              },
            },
          )
          logger.info(
            `Scheduled gift voucher (past/now) SMS notification sent to ${voucher.recipientPhone} for voucher ${voucher.code}`,
          )
        } catch (notificationError) {
          logger.error("Failed to send scheduled (past/now) gift voucher SMS notification", {
            error: notificationError,
            voucherId: voucher._id.toString(),
            recipientPhone: voucher.recipientPhone,
          })
        }
      } else {
        // Scheduled for future
        voucher.status = "pending_send"
        voucher.isActive = false // Not active until send date
        // TODO: Schedule notification for future sendDate (requires a job scheduler)
      }
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
    return { success: false, error: "Failed to set gift details. Please try again." }
  }
}

export async function getMemberPurchasedVouchers() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return { success: false, error: "Unauthorized", giftVouchers: [] }
    }
    await dbConnect()
    const voucherDocs = await GiftVoucher.find({ purchaserUserId: new mongoose.Types.ObjectId(session.user.id) })
      .sort({ purchaseDate: -1 })
      .lean() // Use .lean()

    const giftVouchers = await Promise.all(voucherDocs.map((doc) => toGiftVoucherPlain(doc))).catch((err) => {
      logger.error("Error transforming purchased vouchers in getMemberPurchasedVouchers", err)
      return [] // Return empty array on transformation error for one or more vouchers
    })

    return { success: true, giftVouchers }
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
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return { success: false, error: "Unauthorized", giftVouchers: [] }
    }
    await dbConnect()
    // Vouchers where the current user is the owner
    const voucherDocs = await GiftVoucher.find({ ownerUserId: new mongoose.Types.ObjectId(session.user.id) })
      .sort({ validUntil: 1, purchaseDate: -1 }) // Sort by expiry, then purchase date
      .lean() // Use .lean()

    const giftVouchers = await Promise.all(voucherDocs.map((doc) => toGiftVoucherPlain(doc))).catch((err) => {
      logger.error("Error transforming owned vouchers in getMemberOwnedVouchers", err)
      return []
    })

    return { success: true, giftVouchers }
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
  orderId?: string // Optional order ID for tracking
  totalAmount: number // Total amount of the order being paid for
  items?: { name: string; price: number }[] // Optional list of items for description
}

export async function redeemGiftVoucher(code: string, orderDetails: OrderDetailsForRedemption) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return { success: false, error: "Unauthorized" }
    }
    await dbConnect()
    const voucher = await GiftVoucher.findOne({ code: code.trim() })
    if (!voucher) {
      return { success: false, error: "Voucher not found." }
    }

    // Check ownership or if voucher is transferable/usable by current user
    // This logic might need adjustment based on business rules (e.g., if admin can redeem for user)
    if (voucher.ownerUserId.toString() !== session.user.id) {
      // Potentially allow admin or professional roles to redeem?
      // For now, strict ownership.
      return { success: false, error: "This voucher does not belong to you or cannot be redeemed by you." }
    }

    const currentDate = new Date()
    if (voucher.validFrom > currentDate) {
      return { success: false, error: "Voucher is not yet valid." }
    }
    if (voucher.validUntil < currentDate) {
      voucher.status = "expired" // Mark as expired if not already
      await voucher.save()
      return { success: false, error: "Voucher has expired." }
    }
    if (!voucher.isActive) {
      // isActive should reflect usability based on status and dates
      return { success: false, error: "Voucher is currently inactive." }
    }
    // Check specific statuses that allow redemption
    if (!["active", "partially_used", "sent"].includes(voucher.status)) {
      // 'sent' implies it's active for the recipient
      return {
        success: false,
        error: "Voucher is not available for use (e.g., pending payment, fully used, cancelled).",
      }
    }

    let amountApplied = 0
    const usageEntry: any = {
      // Define usage entry structure
      date: new Date(),
      orderId: orderDetails.orderId ? new mongoose.Types.ObjectId(orderDetails.orderId) : undefined,
    }

    if (voucher.voucherType === "treatment") {
      if (voucher.status === "fully_used") {
        // Should ideally be caught by isActive or status check above
        return { success: false, error: "Treatment voucher already used." }
      }
      voucher.status = "fully_used"
      amountApplied = voucher.monetaryValue || 0 // Value of the treatment
      usageEntry.amountUsed = amountApplied
      usageEntry.description = `Redeemed for treatment: ${orderDetails.items?.[0]?.name || voucher.treatmentId?.toString() || "Treatment"}`
    } else if (voucher.voucherType === "monetary") {
      if ((voucher.remainingAmount || 0) <= 0) {
        return { success: false, error: "Voucher has no remaining balance." }
      }
      const redemptionAmount = orderDetails.totalAmount // Amount to redeem from order
      amountApplied = Math.min(redemptionAmount, voucher.remainingAmount || 0)

      if (amountApplied <= 0) {
        // Should not happen if remainingAmount > 0
        return { success: false, error: "No amount could be applied from voucher." }
      }
      voucher.remainingAmount = (voucher.remainingAmount || 0) - amountApplied
      usageEntry.amountUsed = amountApplied
      usageEntry.description = `Redeemed against order total: ${orderDetails.totalAmount}. Applied: ${amountApplied}`

      if (voucher.remainingAmount <= 0) {
        voucher.status = "fully_used"
        voucher.remainingAmount = 0 // Ensure it's not negative
      } else {
        voucher.status = "partially_used"
      }
    } else {
      return { success: false, error: "Unknown voucher type." }
    }

    if (!voucher.usageHistory) voucher.usageHistory = []
    voucher.usageHistory.push(usageEntry)

    // Update isActive based on new status
    voucher.isActive = voucher.status === "active" || voucher.status === "partially_used" || voucher.status === "sent"

    await voucher.save()

    revalidatePath("/dashboard/member/gift-vouchers")
    revalidatePath("/dashboard/admin/gift-vouchers") // Admin might want to see updated status

    return {
      success: true,
      updatedVoucher: await toGiftVoucherPlain(voucher),
      amountApplied,
      message: `Voucher redeemed successfully. Amount applied: ${amountApplied.toFixed(2)} ILS.`,
    }
  } catch (error) {
    logger.error("Error redeeming gift voucher:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      code: code, // 'code' is not defined in this scope, should be voucher.code or passed param
      details: error,
    })
    return { success: false, error: "Failed to redeem voucher. Please try again or contact support." }
  }
}
