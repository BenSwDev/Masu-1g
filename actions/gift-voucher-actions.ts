import dbConnect from "@/lib/db/mongodb"
import GiftVoucher from "@/lib/db/models/gift-voucher"
import User from "@/lib/db/models/user"
import Treatment from "@/lib/db/models/treatment"
import { logger } from "@/lib/logs/logger"
import mongoose from "mongoose"
import type {
  GiftVoucher as GiftVoucherPlain,
  GiftVoucherCreateForm,
  GiftVoucherUpdateForm,
  GiftVoucherResponse,
  GiftVoucherListResponse,
  GiftVoucherRedemption,
} from "@/types/core/gift-voucher"

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

async function generateUniqueVoucherCode(): Promise<string> {
  await dbConnect()
  let code: string
  let isUnique = false
  let attempts = 0
  const maxAttempts = 10

  while (!isUnique && attempts < maxAttempts) {
    code = generateVoucherCode()
    const existingVoucher = await GiftVoucher.findOne({ code }).lean()
    if (!existingVoucher) {
      isUnique = true
      return code
    }
    attempts++
  }

  throw new Error("Unable to generate unique voucher code after multiple attempts")
}

function generateVoucherCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = "GV-"
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// ============================================================================
// TRANSFORMATION FUNCTIONS
// ============================================================================

async function toGiftVoucherPlain(voucherDocOrPlain: any): Promise<GiftVoucherPlain> {
  if (!voucherDocOrPlain) {
    logger.warn("toGiftVoucherPlain called with null or undefined input.")
    throw new Error("toGiftVoucherPlain received null or undefined input.")
  }

  let voucher: Record<string, any>
  if (typeof voucherDocOrPlain.toObject === "function") {
    voucher = voucherDocOrPlain.toObject({ virtuals: true }) as any
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
    } else if (voucher.guestInfo) {
      purchaserName = voucher.guestInfo.name
    }

    if (ownerUserIdStr) {
      const owner = await User.findById(ownerUserIdStr).select("name").lean()
      ownerName = owner?.name
    } else if (voucher.guestInfo) {
      ownerName = voucher.guestInfo.name
    }

    if (voucher.voucherType === "treatment" && treatmentIdStr) {
      const treatmentDoc = (await Treatment.findById(treatmentIdStr)
        .select("name durations fixedPrice pricingType")
        .lean()) as any
      treatmentName = treatmentDoc?.name
      if (selectedDurationIdStr && treatmentDoc?.durations) {
        const duration = treatmentDoc.durations.find(
          (d: any) => d._id?.toString() === selectedDurationIdStr
        )
        selectedDurationName = duration?.minutes
          ? `${duration.minutes} min`
          : duration?.name || "Selected Duration"
      }
    }

    const formatDate = (date: any) => (date ? new Date(date).toISOString() : undefined)

    return {
      _id: String(voucher._id),
      code: voucher.code,
      voucherType: voucher.voucherType,
      amount: voucher.amount,
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
      guestInfo: voucher.guestInfo,
      isGift: voucher.isGift,
      recipientName: voucher.recipientName,
      recipientPhone: voucher.recipientPhone,
      recipientEmail: voucher.recipientEmail,
      greetingMessage: voucher.greetingMessage,
      sendDate: formatDate(voucher.sendDate),
      status: voucher.status,
      purchaseDate: formatDate(voucher.purchaseDate)!,
      validFrom: formatDate(voucher.validFrom)!,
      validUntil: formatDate(voucher.validUntil)!,
      paymentId: voucher.paymentId,
      paymentAmount: voucher.paymentAmount,
      paymentMethodId: voucher.paymentMethodId,
      transactionId: voucher.transactionId,
      notes: voucher.notes,
      usageHistory:
        voucher.usageHistory?.map((h: any) => ({
          date: formatDate(h.date)!,
          amountUsed: h.amountUsed,
          orderId: h.orderId?.toString(),
          description: h.description,
        })) || [],
      isActive: voucher.isActive,
      createdAt: formatDate(voucher.createdAt),
      updatedAt: formatDate(voucher.updatedAt),
    } as GiftVoucherPlain
  } catch (error) {
    logger.error("Error during population/transformation in toGiftVoucherPlain:", {
      message: error instanceof Error ? error.message : String(error),
      voucherId: voucher._id?.toString(),
    })

    // Fallback to a minimal representation
    const minimalVoucher: GiftVoucherPlain = {
      _id: String(voucher._id),
      code: voucher.code,
      voucherType: voucher.voucherType,
      amount: voucher.amount,
      monetaryValue: voucher.monetaryValue,
      originalAmount: voucher.originalAmount,
      remainingAmount: voucher.remainingAmount,
      purchaserUserId: voucher.purchaserUserId?.toString(),
      ownerUserId: voucher.ownerUserId?.toString(),
      guestInfo: voucher.guestInfo,
      isGift: voucher.isGift,
      recipientName: voucher.recipientName,
      recipientPhone: voucher.recipientPhone,
      recipientEmail: voucher.recipientEmail,
      greetingMessage: voucher.greetingMessage,
      status: voucher.status,
      purchaseDate: new Date(voucher.purchaseDate).toISOString(),
      validFrom: new Date(voucher.validFrom).toISOString(),
      validUntil: new Date(voucher.validUntil).toISOString(),
      paymentId: voucher.paymentId,
      paymentAmount: voucher.paymentAmount,
      paymentMethodId: voucher.paymentMethodId,
      transactionId: voucher.transactionId,
      notes: voucher.notes,
      usageHistory: [],
      isActive: voucher.isActive,
      createdAt: voucher.createdAt ? new Date(voucher.createdAt).toISOString() : undefined,
      updatedAt: voucher.updatedAt ? new Date(voucher.updatedAt).toISOString() : undefined,
    }
    return minimalVoucher
  }
}

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

export async function createGiftVoucher(
  formData: GiftVoucherCreateForm
): Promise<GiftVoucherResponse> {
  try {
    await dbConnect()

    const code = await generateUniqueVoucherCode()

    const voucherData = {
      code,
      voucherType: formData.voucherType,
      amount: formData.amount || formData.monetaryValue || 0,
      treatmentId: formData.treatmentId
        ? new mongoose.Types.ObjectId(formData.treatmentId)
        : undefined,
      selectedDurationId: formData.selectedDurationId
        ? new mongoose.Types.ObjectId(formData.selectedDurationId)
        : undefined,
      monetaryValue: formData.monetaryValue,
      ownerUserId: formData.ownerUserId
        ? new mongoose.Types.ObjectId(formData.ownerUserId)
        : undefined,
      isGift: true,
      recipientName: formData.recipientName,
      recipientPhone: formData.recipientPhone,
      recipientEmail: formData.recipientEmail,
      greetingMessage: formData.greetingMessage,
      status: "pending_payment",
      validFrom: new Date(formData.validFrom),
      validUntil: new Date(formData.validUntil),
      notes: formData.notes,
      usageHistory: [],
      isActive: true,
    }

    const voucher = new GiftVoucher(voucherData)
    await voucher.save()

    const plainVoucher = await toGiftVoucherPlain(voucher)

    return { success: true, voucher: plainVoucher }
  } catch (error) {
    logger.error("Error creating gift voucher:", error)
    return { success: false, error: "Failed to create gift voucher" }
  }
}

export async function updateGiftVoucher(
  id: string,
  updateData: GiftVoucherUpdateForm
): Promise<GiftVoucherResponse> {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid voucher ID format" }
    }

    await dbConnect()

    const updateFields: any = {}

    if (updateData.status) updateFields.status = updateData.status
    if (updateData.notes !== undefined) updateFields.notes = updateData.notes
    if (updateData.greetingMessage !== undefined)
      updateFields.greetingMessage = updateData.greetingMessage
    if (updateData.validFrom) updateFields.validFrom = new Date(updateData.validFrom)
    if (updateData.validUntil) updateFields.validUntil = new Date(updateData.validUntil)

    const voucher = await GiftVoucher.findByIdAndUpdate(id, updateFields, { new: true })

    if (!voucher) {
      return { success: false, error: "Voucher not found" }
    }

    const plainVoucher = await toGiftVoucherPlain(voucher)

    return { success: true, voucher: plainVoucher }
  } catch (error) {
    logger.error("Error updating gift voucher:", { id, error })
    return { success: false, error: "Failed to update voucher" }
  }
}

export async function getGiftVoucherById(id: string): Promise<GiftVoucherResponse> {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid voucher ID format" }
    }

    await dbConnect()
    const voucherDoc = await GiftVoucher.findById(id).lean()

    if (!voucherDoc) {
      return { success: false, error: "Voucher not found" }
    }

    const voucher = await toGiftVoucherPlain(voucherDoc)

    return { success: true, voucher }
  } catch (error) {
    logger.error("Error fetching gift voucher by ID:", { id, error })
    return { success: false, error: "Failed to fetch voucher" }
  }
}

export async function getGiftVoucherByCode(code: string): Promise<GiftVoucherResponse> {
  try {
    await dbConnect()
    const voucherDoc = await GiftVoucher.findOne({ code }).lean()

    if (!voucherDoc) {
      return { success: false, error: "Voucher not found" }
    }

    const voucher = await toGiftVoucherPlain(voucherDoc)

    return { success: true, voucher }
  } catch (error) {
    logger.error("Error fetching gift voucher by code:", { code, error })
    return { success: false, error: "Failed to fetch voucher" }
  }
}

export async function redeemGiftVoucher(
  redemptionData: GiftVoucherRedemption
): Promise<GiftVoucherResponse> {
  try {
    await dbConnect()

    const voucher = await GiftVoucher.findOne({ code: redemptionData.code })

    if (!voucher) {
      return { success: false, error: "Voucher not found" }
    }

    // Check if voucher is valid for use
    if (!voucher.isActive || voucher.status === "fully_used") {
      return { success: false, error: "Voucher is not valid for use" }
    }

    // Use the voucher
    if (voucher.voucherType === "treatment") {
      voucher.status = "fully_used"
      voucher.remainingAmount = 0
      voucher.isActive = false
    } else if (voucher.voucherType === "monetary") {
      const amountToUse = Math.min(
        redemptionData.orderDetails.totalAmount,
        voucher.remainingAmount || voucher.amount
      )
      voucher.remainingAmount = (voucher.remainingAmount || voucher.amount) - amountToUse
      voucher.status = voucher.remainingAmount <= 0 ? "fully_used" : "partially_used"
      if (voucher.remainingAmount <= 0) voucher.isActive = false
    }

    voucher.usageHistory = voucher.usageHistory || []
    voucher.usageHistory.push({
      date: new Date(),
      amountUsed: redemptionData.orderDetails.totalAmount,
      orderId: redemptionData.orderDetails.orderId
        ? new mongoose.Types.ObjectId(redemptionData.orderDetails.orderId)
        : undefined,
      description: `Redeemed for order: ${redemptionData.orderDetails.items?.map(i => i.name).join(", ") || "Order items"}`,
    })

    await voucher.save()

    const plainVoucher = await toGiftVoucherPlain(voucher)

    return { success: true, voucher: plainVoucher }
  } catch (error) {
    logger.error("Error redeeming gift voucher:", { code: redemptionData.code, error })
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to redeem voucher",
    }
  }
}

// ============================================================================
// LIST OPERATIONS
// ============================================================================

export async function getGiftVouchersList(
  options: {
    page?: number
    limit?: number
    status?: string[]
    ownerUserId?: string
    search?: string
  } = {}
): Promise<GiftVoucherListResponse> {
  try {
    await dbConnect()

    const { page = 1, limit = 20, status, ownerUserId, search } = options
    const skip = (page - 1) * limit

    // Build query
    const query: any = {}

    if (status && status.length > 0) {
      query.status = { $in: status }
    }

    if (ownerUserId) {
      query.ownerUserId = new mongoose.Types.ObjectId(ownerUserId)
    }

    if (search) {
      query.$or = [
        { code: { $regex: search, $options: "i" } },
        { recipientName: { $regex: search, $options: "i" } },
        { recipientEmail: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } },
      ]
    }

    const [voucherDocs, total] = await Promise.all([
      GiftVoucher.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      GiftVoucher.countDocuments(query),
    ])

    const vouchers = await Promise.all(voucherDocs.map(doc => toGiftVoucherPlain(doc)))

    return {
      success: true,
      vouchers,
      total,
      page,
      limit,
    }
  } catch (error) {
    logger.error("Error fetching gift vouchers list:", error)
    return { success: false, error: "Failed to fetch vouchers" }
  }
}

// Legacy exports for backward compatibility
export { generateUniqueVoucherCode, toGiftVoucherPlain }
export type { GiftVoucherPlain }

// Admin-specific aliases for consistency (ROLE OF ONE: single source of truth)
export const createGiftVoucherByAdmin = createGiftVoucher
export const updateGiftVoucherByAdmin = updateGiftVoucher
export const getGiftVouchers = getGiftVouchersList

// Admin form data type alias
export type AdminGiftVoucherFormData = GiftVoucherCreateForm

// Selection helper functions for admin forms
export async function getTreatmentsForSelection(): Promise<any> {
  try {
    await dbConnect()
    const treatments = await Treatment.find({ isActive: true })
      .select("name category durations fixedPrice pricingType")
      .lean()
    
    return { success: true, treatments }
  } catch (error) {
    logger.error("Error fetching treatments for selection:", error)
    return { success: false, error: "Failed to fetch treatments" }
  }
}

export async function getUsersForAdminSelection(): Promise<any> {
  try {
    await dbConnect()
    const users = await User.find({ isActive: true })
      .select("name email phone")
      .lean()
    
    return { success: true, users }
  } catch (error) {
    logger.error("Error fetching users for admin selection:", error)
    return { success: false, error: "Failed to fetch users" }
  }
}

// Export GiftVoucher type alias for backward compatibility
export type GiftVoucher = GiftVoucherPlain

// Member-specific functions
export async function getMemberOwnedVouchers(userId: string): Promise<GiftVoucherListResponse> {
  return getGiftVouchersList({ ownerUserId: userId })
}

export async function getMemberPurchasedVouchers(userId: string): Promise<GiftVoucherListResponse> {
  return getGiftVouchersList({
    ownerUserId: userId,
    status: ["active", "partially_used", "sent"],
  })
}

// Guest purchase functions (placeholders for now)
export async function initiateGuestPurchaseGiftVoucher(data: any): Promise<any> {
  // TODO: Implement guest purchase initiation
  return { success: false, error: "Not implemented yet" }
}

export async function confirmGuestGiftVoucherPurchase(data: any): Promise<any> {
  // TODO: Implement guest gift voucher purchase confirmation
  return { success: false, error: "Not implemented" }
}

export async function saveAbandonedGiftVoucherPurchase(data: any): Promise<any> {
  // TODO: Implement abandoned gift voucher purchase saving
  return { success: false, error: "Not implemented" }
}

/**
 * Delete a gift voucher (admin only)
 */
export async function deleteGiftVoucher(
  voucherId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await dbConnect()

    const voucher = await GiftVoucher.findById(voucherId)
    if (!voucher) {
      return { success: false, error: "Gift voucher not found" }
    }

    // Check if voucher has been used
    if (voucher.status === "fully_used" || voucher.status === "partially_used") {
      return { success: false, error: "Cannot delete a voucher that has been used" }
    }

    await GiftVoucher.findByIdAndDelete(voucherId)

    logger.info("Gift voucher deleted", { voucherId, code: voucher.code })
    return { success: true }
  } catch (error) {
    logger.error("Error deleting gift voucher:", { error, voucherId })
    return { success: false, error: "Failed to delete gift voucher" }
  }
}

// Export GiftVoucher type alias for backward compatibility

