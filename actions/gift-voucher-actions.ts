"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import mongoose, { type FilterQuery } from "mongoose"

import { authOptions } from "@/lib/auth/auth"
import GiftVoucher, { type IGiftVoucher } from "@/lib/db/models/gift-voucher"
import GiftVoucherPurchase from "@/lib/db/models/gift-voucher-purchase"
import User from "@/lib/db/models/user"
import Treatment from "@/lib/db/models/treatment"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"
import { unifiedNotificationService } from "@/lib/notifications/unified-notification-service"
import type { GiftVoucherPlain as IGiftVoucherPlainFile } from "@/lib/db/models/gift-voucher"
import type {
  EmailRecipient,
  PhoneRecipient,
} from "@/lib/notifications/notification-types"
async function generateUniqueVoucherCode(): Promise<string> {
  await dbConnect()
  for (let attempt = 0; attempt < 5; attempt++) {
    // Generate GV + 6 random alphanumeric characters
    const code = 'GV' + Array.from({ length: 6 }, () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      return chars.charAt(Math.floor(Math.random() * chars.length))
    }).join('')
    
    const exists = await GiftVoucher.exists({ code })
    if (!exists) return code
  }
  throw new Error("Failed to generate unique voucher code")
}

// Extended GiftVoucherPlain for client-side use
export interface GiftVoucherPlain extends IGiftVoucherPlainFile {
  _id: string
  amount: number // Ensure this is always present as it's the primary value
  treatmentName?: string
  selectedDurationName?: string
  purchaserName?: string
  ownerName?: string
  giftMessage?: string // Alternative field name for greetingMessage
  paymentAmount?: number // Payment amount for admin display
  paymentMethodId?: string // Payment method ID for admin display
  transactionId?: string // Transaction ID for admin display
  notes?: string // Admin notes
}

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
    } else if (voucher.guestInfo) {
      // Use guest info if no purchaser user ID
      purchaserName = voucher.guestInfo.name
    }
    
    if (ownerUserIdStr) {
      const owner = await User.findById(ownerUserIdStr).select("name").lean()
      ownerName = owner?.name
    } else if (voucher.guestInfo) {
      // Use guest info if no owner user ID
      ownerName = voucher.guestInfo.name
    }
    if (voucher.voucherType === "treatment" && treatmentIdStr) {
      const treatmentDoc = (await Treatment.findById(treatmentIdStr)
        .select("name durations fixedPrice pricingType")
        .lean()) as any
      treatmentName = treatmentDoc?.name
      if (selectedDurationIdStr && treatmentDoc?.durations) {
        const duration = treatmentDoc.durations.find((d: any) => d._id?.toString() === selectedDurationIdStr)
        selectedDurationName = duration?.minutes ? `${duration.minutes} min` : duration?.name || "Selected Duration"
      }
    }

    const formatDate = (date: any) => (date ? new Date(date).toISOString() : undefined)

    return {
      _id: String(voucher._id),
      code: voucher.code,
      voucherType: voucher.voucherType,
      amount: voucher.amount, // Crucial: ensure this reflects the actual voucher value
      treatmentId: treatmentIdStr,
      treatmentName,
      selectedDurationId: selectedDurationIdStr,
      selectedDurationName,
      monetaryValue: voucher.monetaryValue, // This can be same as amount or specific
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
      giftMessage: voucher.giftMessage || voucher.greetingMessage, // Support both field names
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
      usageHistory: voucher.usageHistory?.map((h: any) => ({
        ...h,
        date: formatDate(h.date)!,
        orderId: h.orderId?.toString(),
        description: h.description,
      })),
      isActive:
        (voucher.status === "active" || voucher.status === "partially_used" || voucher.status === "sent") &&
        new Date(voucher.validUntil) >= new Date() &&
        new Date(voucher.validFrom) <= new Date(),
      createdAt: formatDate(voucher.createdAt),
      updatedAt: formatDate(voucher.updatedAt),
    } as GiftVoucherPlain
  } catch (error) {
    logger.error("Error during population/transformation in toGiftVoucherPlain:", {
      message: error instanceof Error ? error.message : String(error),
      voucherId: voucher._id?.toString(),
    })
    // Fallback to a minimal representation, ensuring 'amount' is present
    const minimalVoucher: GiftVoucherPlain = {
      _id: String(voucher._id),
      code: voucher.code,
      voucherType: voucher.voucherType,
      amount: voucher.amount, // Ensure amount is here
      monetaryValue: voucher.monetaryValue,
      originalAmount: voucher.originalAmount,
      remainingAmount: voucher.remainingAmount,
      purchaserUserId: voucher.purchaserUserId?.toString() || "",
      ownerUserId: voucher.ownerUserId?.toString() || "",
      guestInfo: voucher.guestInfo,
      isGift: voucher.isGift,
      recipientName: voucher.recipientName,
      recipientPhone: voucher.recipientPhone,
      recipientEmail: voucher.recipientEmail,
      greetingMessage: voucher.greetingMessage,
      giftMessage: voucher.giftMessage || voucher.greetingMessage,
      status: voucher.status,
      purchaseDate: new Date(voucher.purchaseDate).toISOString(),
      validFrom: new Date(voucher.validFrom).toISOString(),
      validUntil: new Date(voucher.validUntil).toISOString(),
      paymentId: voucher.paymentId,
      paymentAmount: voucher.paymentAmount,
      paymentMethodId: voucher.paymentMethodId,
      transactionId: voucher.transactionId,
      notes: voucher.notes,
      isActive:
        (voucher.status === "active" || voucher.status === "partially_used" || voucher.status === "sent") &&
        new Date(voucher.validUntil) >= new Date() &&
        new Date(voucher.validFrom) <= new Date(),
      createdAt: voucher.createdAt ? new Date(voucher.createdAt).toISOString() : undefined,
      updatedAt: voucher.updatedAt ? new Date(voucher.updatedAt).toISOString() : undefined,
    }
    return minimalVoucher
  }
}

export interface AdminGiftVoucherFormData {
  code: string
  voucherType: "treatment" | "monetary"
  treatmentId?: string
  selectedDurationId?: string
  amount?: string
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

    // Generate unique voucher code automatically
    const generatedCode = await generateUniqueVoucherCode()

    // Basic validations (ownerUserId, dates)
    // ... (keep existing validations)
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

    let effectiveAmount = 0
    const amountInput = data.amount ?? data.monetaryValue
    if (
      amountInput === undefined ||
      String(amountInput).trim() === "" ||
      isNaN(Number(amountInput)) ||
      Number(amountInput) <= 0
    ) {
      return { success: false, error: "Valid positive amount is required." }
    }
    effectiveAmount = Number(amountInput)

    // If treatment type, ensure treatmentId is valid and potentially selectedDurationId
    // The 'amount' provided in the admin form for a treatment voucher should ideally match the treatment's price.
    // Admin form could fetch treatment price to pre-fill or validate against.
    // For now, we trust the admin-entered 'amount'.
    if (data.voucherType === "treatment") {
      if (!data.treatmentId || !mongoose.Types.ObjectId.isValid(data.treatmentId)) {
        return { success: false, error: "Valid Treatment ID is required for treatment voucher." }
      }
      if (data.selectedDurationId && !mongoose.Types.ObjectId.isValid(data.selectedDurationId)) {
        return { success: false, error: "Invalid Selected Duration ID." }
      }
    }

    const owner = await User.findById(data.ownerUserId).lean()
    if (!owner) return { success: false, error: "Owner user not found." }

    const giftVoucherData: Partial<IGiftVoucher> = {
      code: generatedCode,
      voucherType: data.voucherType,
      amount: effectiveAmount,
      monetaryValue: effectiveAmount, // For consistency or if schema differentiates
      originalAmount: effectiveAmount,
      remainingAmount: effectiveAmount,
      purchaserUserId: new mongoose.Types.ObjectId(session.user.id),
      ownerUserId: new mongoose.Types.ObjectId(data.ownerUserId),
      validFrom: new Date(data.validFrom),
      validUntil: new Date(data.validUntil),
      status: data.status,
      isActive: ["active", "partially_used", "sent"].includes(data.status),
      isGift: true, // ALL vouchers are gifts by definition
      purchaseDate: new Date(),
    }

    if (data.voucherType === "treatment") {
      giftVoucherData.treatmentId = new mongoose.Types.ObjectId(data.treatmentId!)
      if (data.selectedDurationId) {
        giftVoucherData.selectedDurationId = new mongoose.Types.ObjectId(data.selectedDurationId)
      }
    }

    const newVoucher = new GiftVoucher(giftVoucherData)
    await newVoucher.save()
    revalidatePath("/dashboard/admin/gift-vouchers")
    revalidatePath("/dashboard/member/gift-vouchers")
    return { success: true, giftVoucher: await toGiftVoucherPlain(newVoucher) }
  } catch (error) {
    logger.error("Error creating gift voucher by admin:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      details: error,
    })
    // ... (error handling)
    const errorMessage = error instanceof Error ? error.message : "Failed to create gift voucher"
    if (error instanceof mongoose.Error.ValidationError) {
      return { success: false, error: error.message }
    }
    if ((error as any).code === 11000 && (error as any).keyPattern?.code) {
      return { success: false, error: "Gift voucher code already exists. Please use a unique code." }
    }
    return { success: false, error: errorMessage }
  }
}

export async function updateGiftVoucherByAdmin(
  id: string,
  data: Partial<AdminGiftVoucherFormData>, // Admin form should use 'amount'
) {
  // ... (similar logic as create, ensuring 'amount' is primary,
  // and if treatment details change, 'amount' might need re-evaluation or admin confirmation)
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid Gift Voucher ID format." }
    }
    await dbConnect()
    const existingVoucher = await GiftVoucher.findById(id)
    if (!existingVoucher) return { success: false, error: "Gift voucher not found" }

    // ... (validations for dates, ownerUserId, etc.)
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

    const checkValidFrom = data.validFrom ? new Date(data.validFrom) : existingVoucher.validFrom
    const checkValidUntil = data.validUntil ? new Date(data.validUntil) : existingVoucher.validUntil
    if (checkValidFrom >= checkValidUntil) {
      return { success: false, error: "'Valid from' date must be before 'valid until' date." }
    }

    const updateData: any = { ...data }

    const amountUpdateInput = data.amount ?? data.monetaryValue
    if (amountUpdateInput !== undefined) {
      const newAmount = Number(amountUpdateInput)
      if (isNaN(newAmount) || newAmount <= 0) {
        return { success: false, error: "Valid positive amount is required." }
      }
      updateData.amount = newAmount
      updateData.monetaryValue = newAmount
      updateData.originalAmount = newAmount
      // Be cautious with remainingAmount if voucher is partially used
      if (existingVoucher.status !== "partially_used" || existingVoucher.amount !== newAmount) {
        updateData.remainingAmount = newAmount
      }
    }

    // Handle voucherType change and treatment/duration specifics
    const newVoucherType = data.voucherType || existingVoucher.voucherType
    updateData.voucherType = newVoucherType

    if (newVoucherType === "treatment") {
      updateData.treatmentId = data.treatmentId
        ? new mongoose.Types.ObjectId(data.treatmentId)
        : existingVoucher.treatmentId
      updateData.selectedDurationId = data.selectedDurationId
        ? new mongoose.Types.ObjectId(data.selectedDurationId)
        : existingVoucher.selectedDurationId

      if (!updateData.treatmentId) return { success: false, error: "Treatment ID is required for treatment voucher." }
      // If treatment details change, and 'amount' was not explicitly provided in the update,
      // it might be desirable to recalculate 'amount' based on the new treatment/duration.
      // For simplicity, if 'amount' is not in `data`, existing 'amount' is kept unless type changes.
      if (
        data.amount === undefined &&
        (existingVoucher.treatmentId?.toString() !== updateData.treatmentId?.toString() ||
          existingVoucher.selectedDurationId?.toString() !== updateData.selectedDurationId?.toString())
      ) {
        // Logic to re-calculate amount based on new treatment/duration if admin didn't specify new amount
        const treatmentDoc = (await Treatment.findById(updateData.treatmentId)
          .select("fixedPrice pricingType durations")
          .lean()) as any
        if (treatmentDoc) {
          let price = 0
          if (treatmentDoc.pricingType === "fixed") price = treatmentDoc.fixedPrice || 0
          else if (
            treatmentDoc.pricingType === "duration_based" &&
            updateData.selectedDurationId &&
            treatmentDoc.durations
          ) {
            const duration = treatmentDoc.durations.find(
              (d: any) => d._id.toString() === updateData.selectedDurationId.toString(),
            )
            if (duration && typeof duration.price === "number") price = duration.price
          }
          if (price > 0) {
            updateData.amount = price
            updateData.monetaryValue = price
            updateData.originalAmount = price
            if (existingVoucher.status !== "partially_used") updateData.remainingAmount = price
          } else {
            logger.warn(
              `Could not auto-update amount for treatment voucher ${id} during update as price was zero or indeterminable.`,
            )
          }
        }
      }
      // Nullify monetaryValue if switching to treatment and it's not set by treatment logic
      // This is now handled by setting effectiveAmount from treatment price if not user-provided.
    } else if (newVoucherType === "monetary") {
      if (
        data.amount === undefined &&
        data.monetaryValue === undefined &&
        existingVoucher.voucherType !== "monetary"
      ) {
        return { success: false, error: "Amount is required when changing to monetary voucher type." }
      }
      updateData.treatmentId = null
      updateData.selectedDurationId = null
    }

    if (data.status) {
      updateData.isActive = ["active", "partially_used", "sent"].includes(data.status)
    } else if (
      updateData.amount !== undefined &&
      updateData.amount > 0 &&
      existingVoucher.status === "pending_payment"
    ) {
      // If amount is updated and it was pending, consider making it active if status not otherwise set
      // This is a nuanced case, usually status is set explicitly.
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
    logger.error("Error updating gift voucher by admin:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      details: error,
    })
    // ... (error handling)
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

// ... (deleteGiftVoucher, getGiftVouchers, getTreatmentsForSelection, getUsersForAdminSelection remain largely the same)
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
      const usersByNameOrEmail = await User.find({
        $or: [{ name: searchRegex }, { email: searchRegex }],
      })
        .select("_id")
        .lean()
      const userIds = usersByNameOrEmail.map((u) => u._id)

      query.$or = [
        { code: searchRegex }, 
        { recipientName: searchRegex },
        // Add search for guest info
        { 'guestInfo.name': searchRegex },
        { 'guestInfo.email': searchRegex },
        { 'guestInfo.phone': searchRegex }
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
    const giftVoucherDocs = await GiftVoucher.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
    const total = await GiftVoucher.countDocuments(query)

    const giftVouchersResults = await Promise.allSettled(giftVoucherDocs.map((doc) => toGiftVoucherPlain(doc)))
    const giftVouchers = giftVouchersResults
      .filter((result) => result.status === "fulfilled")
      .map((result) => (result as PromiseFulfilledResult<GiftVoucherPlain>).value)

    if (giftVouchersResults.some((result) => result.status === "rejected")) {
      logger.warn("Some gift vouchers failed to transform in getGiftVouchers.")
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

export async function getTreatmentsForSelection() {
  try {
    await dbConnect()
    const treatmentsFromDB = (await Treatment.find({ isActive: true })
      .select("name category pricingType fixedPrice durations")
      .lean()) as any[]

    const treatments = treatmentsFromDB.map((t) => {
      let displayPrice: number | undefined
      if (t.pricingType === "fixed") {
        displayPrice = t.fixedPrice
      }
      return {
        _id: t._id.toString(),
        name: t.name,
        category: t.category,
        price: displayPrice,
        fixedPrice: t.fixedPrice,
        durations:
          t.durations?.map((d: any) => ({
            _id: d._id.toString(),
            price: d.price,
            minutes: d.minutes,
          })) || [],
      }
    })
    return { success: true, treatments }
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
    logger.error("Error fetching users for admin selection:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      details: error,
    })
    return { success: false, error: "Failed to fetch users", users: [] }
  }
}

interface PurchaseInitiationData {
  voucherType: "treatment" | "monetary"
  treatmentId?: string
  selectedDurationId?: string
  monetaryValue?: number // This is the value from the monetary input field
  isGift: boolean
  recipientName?: string
  recipientPhone?: string
  recipientEmail?: string
  greetingMessage?: string
  sendDate?: string
}

interface GiftDetailsPayload {
  recipientName: string
  recipientPhone: string
  recipientEmail?: string
  greetingMessage?: string
  sendDate?: string
}

interface PaymentResultData {
  voucherId: string
  paymentId: string
  success: boolean
  amount: number
}

async function initiatePurchaseGiftVoucher(data: PurchaseInitiationData) {
  const requestId = `voucher_init_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
  const startTime = Date.now()
  
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return { success: false, error: "Unauthorized" }
    }

    logger.info(`[${requestId}] Starting gift voucher purchase initiation`, {
      userId: session.user.id,
      voucherType: data.voucherType,
      treatmentId: data.treatmentId,
      hasSelectedDuration: !!data.selectedDurationId,
      monetaryValue: data.monetaryValue,
      hasRecipientInfo: !!data.recipientName && !!data.recipientPhone
    })

    const dbConnectStart = Date.now()
    await dbConnect()
    const dbConnectTime = Date.now() - dbConnectStart
    
    logger.info(`[${requestId}] Database connected`, { 
      dbConnectTime: `${dbConnectTime}ms`,
      userId: session.user.id
    })

    const { voucherType, treatmentId, selectedDurationId, monetaryValue: inputMonetaryValue } = data

    // For gift vouchers, recipient information is REQUIRED
    if (!data.recipientName || !data.recipientPhone) {
      logger.warn(`[${requestId}] Missing recipient info for gift voucher`, { 
        hasRecipientName: !!data.recipientName,
        hasRecipientPhone: !!data.recipientPhone
      })
      return { success: false, error: "Recipient name and phone are required for gift vouchers." }
    }

    let determinedPrice = 0 // This will be the final price for the voucher

    if (voucherType === "monetary") {
      const monetaryValidationStart = Date.now()
      if (typeof inputMonetaryValue !== "number" || inputMonetaryValue < 150) {
        logger.warn(`[${requestId}] Invalid monetary value`, { 
          inputMonetaryValue,
          isNumber: typeof inputMonetaryValue === "number"
        })
        return { success: false, error: "Minimum monetary value is 150 ILS and must be a number." }
      }
      determinedPrice = inputMonetaryValue
      const monetaryValidationTime = Date.now() - monetaryValidationStart
      logger.info(`[${requestId}] Monetary voucher selected`, { 
        monetaryValidationTime: `${monetaryValidationTime}ms`,
        determinedPrice 
      })
    } else {
      // For treatment vouchers, inputMonetaryValue is IGNORED. Price is derived from treatment.
      const treatmentValidationStart = Date.now()
      
      if (!treatmentId || !mongoose.Types.ObjectId.isValid(treatmentId)) {
        logger.warn(`[${requestId}] Invalid treatment ID for treatment voucher`, { treatmentId })
        return { success: false, error: "Valid Treatment ID is required for treatment voucher." }
      }
      
      const treatmentDoc = (await Treatment.findById(treatmentId)
        .select("name fixedPrice pricingType durations") // Select name for logging
        .lean()) as any
        
      const treatmentLoadTime = Date.now() - treatmentValidationStart
      
      if (!treatmentDoc) {
        logger.warn(`[${requestId}] Treatment not found for voucher purchase`, { 
          treatmentId,
          treatmentLoadTime: `${treatmentLoadTime}ms`
        })
        return { success: false, error: "Treatment not found." }
      }

      logger.info(`[${requestId}] Treatment loaded for voucher`, {
        treatmentLoadTime: `${treatmentLoadTime}ms`,
        treatmentName: treatmentDoc.name,
        pricingType: treatmentDoc.pricingType,
        hasFixedPrice: typeof treatmentDoc.fixedPrice === "number",
        durationsCount: treatmentDoc.durations?.length || 0
      })

      let priceFromTreatment: number | undefined
      if (treatmentDoc.pricingType === "fixed") {
        if (typeof treatmentDoc.fixedPrice === "number") {
          priceFromTreatment = treatmentDoc.fixedPrice
        }
        logger.info(`[${requestId}] Treatment voucher: Fixed price`, {
          treatmentName: treatmentDoc.name,
          fixedPrice: treatmentDoc.fixedPrice,
          derivedPrice: priceFromTreatment
        })
      } else if (
        treatmentDoc.pricingType === "duration_based" &&
        treatmentDoc.durations &&
        treatmentDoc.durations.length > 0
      ) {
        if (!selectedDurationId || !mongoose.Types.ObjectId.isValid(selectedDurationId)) {
          logger.warn(`[${requestId}] Treatment voucher: Duration-based, but no/invalid duration selected`, {
            treatmentName: treatmentDoc.name,
            selectedDurationId,
            availableDurations: treatmentDoc.durations.map((d: any) => ({ id: d._id, price: d.price }))
          })
          return { success: false, error: "A valid duration must be selected for this treatment type." }
        }
        const duration = treatmentDoc.durations.find((d: any) => d._id.toString() === selectedDurationId)
        if (duration && typeof duration.price === "number") {
          priceFromTreatment = duration.price
          logger.info(`[${requestId}] Treatment voucher: Duration-based`, {
            treatmentName: treatmentDoc.name,
            selectedDurationId,
            durationPrice: duration.price,
            derivedPrice: priceFromTreatment
          })
        } else {
          logger.warn(`[${requestId}] Treatment voucher: Duration not found or no price`, {
            treatmentName: treatmentDoc.name,
            selectedDurationId,
            foundDuration: !!duration,
            durationPrice: duration?.price
          })
        }
      } else if (
        treatmentDoc.pricingType === "duration_based" &&
        (!treatmentDoc.durations || treatmentDoc.durations.length === 0)
      ) {
        logger.warn(`[${requestId}] Treatment voucher: Duration-based, but no durations defined`, {
          treatmentName: treatmentDoc.name
        })
        // Fallback to fixedPrice if it exists and is positive, otherwise it's an issue
        if (typeof treatmentDoc.fixedPrice === "number" && treatmentDoc.fixedPrice > 0) {
          priceFromTreatment = treatmentDoc.fixedPrice
          logger.info(`[${requestId}] Treatment voucher: Duration-based with no durations, falling back to fixedPrice`, {
            treatmentName: treatmentDoc.name,
            fixedPrice: treatmentDoc.fixedPrice,
            derivedPrice: priceFromTreatment
          })
        }
      }

      if (typeof priceFromTreatment === "number" && priceFromTreatment > 0) {
        determinedPrice = priceFromTreatment
      } else {
        logger.error(`[${requestId}] Could not determine a valid positive price for treatment`, {
          treatmentName: treatmentDoc.name,
          treatmentId,
          pricingType: treatmentDoc.pricingType,
          fixedPrice: treatmentDoc.fixedPrice,
          selectedDurationId,
          derivedPriceFromTreatment: priceFromTreatment
        })
        return {
          success: false,
          error: `Could not determine a valid price for the selected treatment '${treatmentDoc.name}'. Please check treatment configuration or select a valid duration.`,
        }
      }
    }

    // Final check on determinedPrice
    if (determinedPrice <= 0) {
      logger.error(`[${requestId}] Attempted to create voucher with non-positive price`, {
        determinedPrice,
        voucherType
      })
      return { success: false, error: "Voucher price must be positive." }
    }

    // Find or create the recipient user as the owner
    const { findOrCreateUserByPhone } = await import("@/actions/auth-actions")
    const recipientResult = await findOrCreateUserByPhone(data.recipientPhone, {
      name: data.recipientName || "מקבל מתנה",
      email: data.recipientEmail || undefined,
    })

    if (!recipientResult.success || !recipientResult.userId) {
      logger.error(`[${requestId}] Failed to find or create recipient user`, { error: recipientResult.error })
      return { success: false, error: recipientResult.error || "Failed to create recipient user" }
    }

    const recipientUserId = recipientResult.userId
    logger.info(`[${requestId}] Recipient user ${recipientResult.isNewUser ? 'created' : 'found'}`, { 
      recipientUserId, 
      userType: recipientResult.userType 
    })

    const code = await generateUniqueVoucherCode()

    const voucherCreationStart = Date.now()
    const giftVoucherData: Partial<IGiftVoucher> = {
      code,
      voucherType,
      amount: determinedPrice,
      monetaryValue: determinedPrice,
      originalAmount: determinedPrice,
      remainingAmount: determinedPrice,
      purchaserUserId: new mongoose.Types.ObjectId(session.user.id),
      ownerUserId: new mongoose.Types.ObjectId(recipientUserId), // Owner is ALWAYS the recipient
      isGift: true, // All gift vouchers are gifts by definition
      status: "pending_payment",
      purchaseDate: new Date(),
      validFrom: new Date(),
      validUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      isActive: false,
      // Always set recipient info for gift vouchers
      recipientName: data.recipientName,
      recipientPhone: data.recipientPhone,
      recipientEmail: data.recipientEmail || undefined,
      greetingMessage: data.greetingMessage || undefined,
      sendDate: data.sendDate === "immediate" ? new Date() : (data.sendDate ? new Date(data.sendDate) : new Date()),
    }

    if (voucherType === "treatment") {
      giftVoucherData.treatmentId = new mongoose.Types.ObjectId(treatmentId!)
      if (selectedDurationId) {
        giftVoucherData.selectedDurationId = new mongoose.Types.ObjectId(selectedDurationId)
      }
    }

    const newVoucher = new GiftVoucher(giftVoucherData)
    await newVoucher.save()
    const voucherCreationTime = Date.now() - voucherCreationStart
    
    const totalTime = Date.now() - startTime
    logger.info(`[${requestId}] Successfully created gift voucher`, {
      totalTime: `${totalTime}ms`,
      voucherCreationTime: `${voucherCreationTime}ms`,
      voucherId: newVoucher._id,
      voucherCode: code,
      amount: determinedPrice,
      voucherType,
      isGift: true,
      purchaserUserId: session.user.id,
      ownerUserId: recipientUserId,
      recipientUserId,
      recipientName: data.recipientName,
      recipientPhone: data.recipientPhone,
      recipientEmail: data.recipientEmail,
      greetingMessage: data.greetingMessage,
      sendDate: data.sendDate === "immediate" ? new Date() : (data.sendDate ? new Date(data.sendDate) : new Date()),
    })

    return {
      success: true,
      voucherId: newVoucher._id.toString(),
      amount: determinedPrice, // Return the actual amount used for the voucher
    }
  } catch (error) {
    const totalTime = Date.now() - startTime
    logger.error(`[${requestId}] Error initiating gift voucher purchase`, {
      totalTime: `${totalTime}ms`,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5)
      } : String(error),
      voucherType: data.voucherType,
      treatmentId: data.treatmentId,
      recipientName: data.recipientName,
      recipientPhone: data.recipientPhone,
      recipientEmail: data.recipientEmail,
      greetingMessage: data.greetingMessage,
      sendDate: data.sendDate
    })
    
    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors)
        .map((err: any) => err.message)
        .join(", ")
      return { success: false, error: `Validation failed: ${messages}` }
    }
    return { success: false, error: "Failed to initiate purchase. Please try again." }
  }
}

async function confirmGiftVoucherPurchase(_data: PaymentResultData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return { success: false, error: "Unauthorized" }
    }
    if (!mongoose.Types.ObjectId.isValid(_data.voucherId)) {
      return { success: false, error: "Invalid Voucher ID format." }
    }

    await dbConnect()
    const { voucherId, paymentId, success: paymentSuccess } = _data

    const voucher = await GiftVoucher.findById(voucherId)
    if (!voucher) {
      return { success: false, error: "Voucher not found" }
    }
    // Allow confirmation if user is the purchaser OR an admin (admin might confirm manually)
    if (voucher.purchaserUserId?.toString() !== session.user.id && !session.user.roles.includes("admin")) {
      logger.warn("Voucher purchaser mismatch during confirmation by non-admin.", {
        voucherId,
        userId: session.user.id,
      })
      // return { success: false, error: "Purchase record mismatch." }; // Keep this commented if admin can confirm for others
    }
    if (voucher.status !== "pending_payment") {
      // If already active/sent, it might be a duplicate callback, still return success with current voucher state.
      if (voucher.status === "active" || voucher.status === "sent" || voucher.status === "partially_used") {
        logger.info(`Voucher ${voucherId} already processed. Status: ${voucher.status}`)
        return { success: true, voucher: await toGiftVoucherPlain(voucher) }
      }
      return {
        success: false,
        error: "Voucher not awaiting payment or already processed with a non-successful status.",
      }
    }

    if (paymentSuccess) {
      voucher.paymentId = paymentId
      
      // All gift vouchers are gifts with recipients - set status based on send date
      const sendDate = voucher.sendDate ? new Date(voucher.sendDate) : new Date()
      if (!voucher.sendDate) voucher.sendDate = sendDate
      
      if (sendDate <= new Date()) {
        voucher.status = "sent"
        voucher.isActive = true
      } else {
        voucher.status = "pending_send"
        voucher.isActive = false
      }
      
      await voucher.save()

      // --- Send purchase success notification to purchaser ---
      try {
        const purchaser = await User.findById(voucher.purchaserUserId)
          .select("name email phone notificationPreferences")
          .lean()

        if (purchaser) {
          const lang = purchaser.notificationPreferences?.language || "he"
          const methods = purchaser.notificationPreferences?.methods || ["sms", "email"]
          const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://v0-masu-lo.vercel.app"

          let messageContent: string
          
                    if (!voucher.isGift) {
            // Regular purchase for self - include voucher code only
            const summaryLink = `${appBaseUrl}/dashboard/member/purchase-history`
            messageContent = lang === "he" 
              ? `שלום ${purchaser.name}, תודה על רכישתך! קוד השובר שלך: ${voucher.code}\nלמימוש השובר השתמש בקוד זה.`
              : `Hello ${purchaser.name}, thank you for your purchase! Your voucher code: ${voucher.code}\nUse this code to redeem your voucher.`
          } else {
            // Gift purchase - message about gift being sent
            const summaryLink = `${appBaseUrl}/dashboard/member/purchase-history`
            if (voucher.recipientName && voucher.recipientPhone) {
              messageContent = lang === "he" 
                ? `שלום ${purchaser.name}, תודה על רכישת שובר המתנה! המתנה נשלחה ל${voucher.recipientName}.\n\nקוד השובר: ${voucher.code}\nסכום: ₪${voucher.amount}`
                : `Hello ${purchaser.name}, thank you for purchasing a gift voucher! The gift has been sent to ${voucher.recipientName}.\n\nVoucher code: ${voucher.code}\nAmount: ₪${voucher.amount}`
            } else {
              messageContent = lang === "he" 
                ? `שלום ${purchaser.name}, תודה על רכישת שובר המתנה! השובר נוצר בהצלחה.\n\nקוד השובר: ${voucher.code}\nסכום: ₪${voucher.amount}`
                : `Hello ${purchaser.name}, thank you for purchasing a gift voucher! The voucher has been created successfully.\n\nVoucher code: ${voucher.code}\nAmount: ₪${voucher.amount}`
            }
          }

          const recipients = []
          if (methods.includes("email") && purchaser.email) {
            recipients.push({ type: "email" as const, value: purchaser.email, name: purchaser.name, language: lang as any })
          }
          if (methods.includes("sms") && purchaser.phone) {
            recipients.push({ type: "phone" as const, value: purchaser.phone, language: lang as any })
          }
          
          if (recipients.length > 0) {
            await unifiedNotificationService.sendPurchaseSuccess(recipients, messageContent)
          }
        } else {
          logger.warn(
            `Purchaser not found for notification after gift voucher purchase confirmation: ${voucher.purchaserUserId?.toString()}`,
          )
        }
      } catch (notificationError) {
        logger.error("Failed to send purchase success notification for gift voucher (purchaser):", {
          userId: voucher.purchaserUserId?.toString(),
          voucherId: voucher._id.toString(),
          error: notificationError instanceof Error ? notificationError.message : String(notificationError),
        })
      }
      // --- End notification sending to purchaser ---

      revalidatePath("/dashboard/member/gift-vouchers")
      if (voucher.purchaserUserId?.toString() !== voucher.ownerUserId?.toString()) {
        revalidatePath(`/dashboard/user/${voucher.ownerUserId?.toString()}/gift-vouchers`) // This path might not exist
      }
      return {
        success: true,
        voucher: await toGiftVoucherPlain(voucher),
      }
    } else {
      voucher.status = "cancelled" // Or 'payment_failed'
      voucher.isActive = false
      await voucher.save()
      // Optionally send a payment failed notification
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

async function setGiftDetails(voucherId: string, details: GiftDetailsPayload) {
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
    if (voucher.purchaserUserId?.toString() !== session.user.id) {
      return { success: false, error: "You are not authorized to modify this voucher." }
    }
    
    // For the new system, gift details are already set during creation
    // This function is kept for backward compatibility but does minimal updates
    if (details.greetingMessage !== undefined) {
      voucher.greetingMessage = details.greetingMessage
    }
    
    const now = new Date()
    const sendDate = details.sendDate === "immediate" ? now : (details.sendDate ? new Date(details.sendDate) : now)
    
    if (sendDate !== voucher.sendDate) {
      voucher.sendDate = sendDate
      
      // Update status based on new send date
      if (voucher.status === "active" || voucher.status === "sent" || voucher.status === "pending_send") {
        if (sendDate <= now) {
          voucher.status = "sent"
          voucher.isActive = true
        } else {
          voucher.status = "pending_send"
          voucher.isActive = false
        }
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
      .lean()

    const giftVouchers = await Promise.all(voucherDocs.map((doc) => toGiftVoucherPlain(doc))).catch((err) => {
      logger.error("Error transforming purchased vouchers in getMemberPurchasedVouchers", err)
      return []
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
    // This should fetch vouchers where the current user is the ownerUserId
    // AND the voucher is in a state where they can use it (e.g., active, sent, partially_used)
    const voucherDocs = await GiftVoucher.find({
      ownerUserId: new mongoose.Types.ObjectId(session.user.id),
      // status: { $in: ['active', 'sent', 'partially_used'] } // Consider if only active/usable ones should show here
    })
      .sort({ validUntil: 1, purchaseDate: -1 })
      .lean()

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

interface OrderDetailsForRedemption {
  orderId?: string
  totalAmount: number // Amount to be covered by voucher
  items?: { name: string; price: number }[] // For description purposes
}

async function redeemGiftVoucher(code: string, orderDetails: OrderDetailsForRedemption) {
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


    // New logic for voucher redemption based on the new requirements:
    // 1. If the voucher is NOT a gift: only the purchaser can redeem
    // 2. If the voucher IS a gift: only the recipient can redeem (by matching phone number)
    
    const currentUser = await User.findById(session.user.id)
    if (!currentUser) {
      return { success: false, error: "User not found." }
    }

    // Unified ownership check - only the owner can redeem
    if (voucher.ownerUserId && voucher.ownerUserId.toString() !== session.user.id) {
      return { success: false, error: "רק מי שהשובר נרכש עבורו יכול לממש אותו." }
    }
    
    // Additional validation for gift vouchers using phone number as backup
    if (voucher.recipientPhone && currentUser.phone) {
      // Normalize both phone numbers for comparison as additional validation
      const normalizePhone = (phone: string) => {
        let cleaned = phone.replace(/[^\d+]/g, "")
        if (!cleaned.startsWith("+")) {
          if (cleaned.startsWith("0")) {
            cleaned = "+972" + cleaned.substring(1)
          } else if (cleaned.length === 9 && /^[5-9]/.test(cleaned)) {
            cleaned = "+972" + cleaned
          } else if (cleaned.length === 10 && cleaned.startsWith("972")) {
            cleaned = "+" + cleaned
          } else {
            cleaned = "+972" + cleaned
          }
        }
        if (cleaned.startsWith("+9720")) {
          cleaned = "+972" + cleaned.substring(5)
        }
        return cleaned
      }

      const normalizedRecipientPhone = normalizePhone(voucher.recipientPhone)
      const normalizedUserPhone = normalizePhone(currentUser.phone)
      
      if (normalizedRecipientPhone !== normalizedUserPhone) {
        return { success: false, error: "השובר לא שייך למספר הטלפון שלך." }
      }
    }

    const currentDate = new Date()
    if (voucher.validFrom > currentDate) {
      return { success: false, error: "Voucher is not yet valid." }
    }
    if (voucher.validUntil < currentDate && voucher.status !== "expired") {
      voucher.status = "expired"
      voucher.isActive = false
      await voucher.save()
      return { success: false, error: "Voucher has expired." }
    }
    if (voucher.status === "expired") {
      return { success: false, error: "Voucher has expired." }
    }

    if (!voucher.isActive) {
      // This check might be redundant if status checks cover it, but good for explicit isActive flag.
      return { success: false, error: "Voucher is currently inactive." }
    }
    // Valid statuses for redemption: 'active', 'partially_used', 'sent' (if sent to self or if owner is redeeming)
    if (!["active", "partially_used", "sent"].includes(voucher.status)) {
      return {
        success: false,
        error: `Voucher is not available for use (status: ${voucher.status}).`,
      }
    }

    let amountApplied = 0
    const usageEntry: any = {
      date: new Date(),
      orderId: orderDetails.orderId ? new mongoose.Types.ObjectId(orderDetails.orderId) : undefined,
      userId: new mongoose.Types.ObjectId(session.user.id), // Track who redeemed it
    }

    if (voucher.voucherType === "treatment") {
      if (voucher.status === "fully_used") {
        // Should be caught by isActive or status check above
        return { success: false, error: "Treatment voucher already used." }
      }
      // For treatment voucher, it's typically one-time use for the specific treatment.
      // The 'amount' field of the voucher represents its value if used for that treatment.
      amountApplied = voucher.amount
      voucher.status = "fully_used"
      voucher.remainingAmount = 0 // Explicitly set remaining to 0
      usageEntry.amountUsed = amountApplied
      const treatmentName = orderDetails.items?.[0]?.name || voucher.treatmentId?.toString() || "Treatment"
      usageEntry.description = `Redeemed for treatment: ${treatmentName}`
    } else if (voucher.voucherType === "monetary") {
      if ((voucher.remainingAmount || 0) <= 0) {
        // Should be caught by isActive or status check
        return { success: false, error: "Voucher has no remaining balance." }
      }
      const redemptionAmount = orderDetails.totalAmount // This is how much the user WANTS to redeem
      amountApplied = Math.min(redemptionAmount, voucher.remainingAmount || 0)

      if (amountApplied <= 0) {
        // Should not happen if remainingAmount > 0
        return { success: false, error: "No amount could be applied from voucher." }
      }
      voucher.remainingAmount = (voucher.remainingAmount || 0) - amountApplied
      usageEntry.amountUsed = amountApplied
      usageEntry.description = `Redeemed against order/service. Order total: ${orderDetails.totalAmount}. Applied: ${amountApplied}`

      if (voucher.remainingAmount <= 0) {
        voucher.status = "fully_used"
        voucher.remainingAmount = 0
      } else {
        voucher.status = "partially_used"
      }
    } else {
      return { success: false, error: "Unknown voucher type." }
    }

    if (!voucher.usageHistory) voucher.usageHistory = []
    voucher.usageHistory.push(usageEntry)
    // Update isActive based on new status
    const activeStatuses = ["active", "partially_used", "sent"]
    const inactiveStatuses = ["fully_used", "expired", "cancelled"]
    
    if (inactiveStatuses.includes(voucher.status)) {
      voucher.isActive = false
    } else if (activeStatuses.includes(voucher.status)) {
      voucher.isActive = true
    }

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
      voucherCode: code,
      details: error,
    })
    return { success: false, error: "Failed to redeem voucher. Please try again or contact support." }
  }
}

export async function initiateGuestPurchaseGiftVoucher(_data: PurchaseInitiationData & {
  guestInfo: {
    name: string
    email?: string
    phone: string
  }
}) {
  const requestId = `guest_voucher_init_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
  const startTime = Date.now()
  
  try {
    logger.info(`[${requestId}] Starting guest gift voucher purchase initiation`, {
      voucherType: _data.voucherType,
      treatmentId: _data.treatmentId,
      hasSelectedDuration: !!_data.selectedDurationId,
      monetaryValue: _data.monetaryValue,
      hasRecipientInfo: !!_data.recipientName && !!_data.recipientPhone,
      guestEmail: _data.guestInfo.email
    })

    const dbConnectStart = Date.now()
    await dbConnect()
    const dbConnectTime = Date.now() - dbConnectStart
    
    logger.info(`[${requestId}] Database connected`, { 
      dbConnectTime: `${dbConnectTime}ms`,
      guestEmail: _data.guestInfo.email
    })

    const { voucherType, treatmentId, selectedDurationId, monetaryValue: inputMonetaryValue, guestInfo } = _data

    // Validate guest info (purchaser)
    if (!guestInfo || !guestInfo.name || !guestInfo.phone) {
      logger.warn(`[${requestId}] Invalid guest info provided`, { 
        hasGuestInfo: !!guestInfo,
        hasName: !!guestInfo?.name,
        hasEmail: !!guestInfo?.email,
        hasPhone: !!guestInfo?.phone
      })
      return { success: false, error: "Guest information (name, phone) is required." }
    }

    // Validate email format if provided (email is now optional)
    if (guestInfo.email && guestInfo.email.trim() !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(guestInfo.email)) {
        logger.warn(`[${requestId}] Invalid email format`, { email: guestInfo.email })
        return { success: false, error: "Valid email address format is required when email is provided." }
      }
    }

    // Validate phone format (basic check for non-empty)
    if (guestInfo.phone.trim().length < 10) {
      logger.warn(`[${requestId}] Invalid phone format`, { phone: guestInfo.phone })
      return { success: false, error: "Valid phone number is required." }
    }

    // For gift vouchers, recipient information is REQUIRED
    if (!_data.recipientName || !_data.recipientPhone) {
      logger.warn(`[${requestId}] Missing recipient info for gift voucher`, { 
        hasRecipientName: !!_data.recipientName,
        hasRecipientPhone: !!_data.recipientPhone
      })
      return { success: false, error: "Recipient name and phone are required for gift vouchers." }
    }
    
    // Validate recipient phone format
    if (_data.recipientPhone.trim().length < 10) {
      logger.warn(`[${requestId}] Invalid recipient phone format`, { recipientPhone: _data.recipientPhone })
      return { success: false, error: "Valid recipient phone number is required." }
    }

    let determinedPrice = 0

    if (voucherType === "monetary") {
      const monetaryValidationStart = Date.now()
      if (typeof inputMonetaryValue !== "number" || inputMonetaryValue < 150) {
        logger.warn(`[${requestId}] Invalid monetary value`, { 
          inputMonetaryValue,
          isNumber: typeof inputMonetaryValue === "number"
        })
        return { success: false, error: "Minimum monetary value is 150 ILS and must be a number." }
      }
      determinedPrice = inputMonetaryValue
      const monetaryValidationTime = Date.now() - monetaryValidationStart
      logger.info(`[${requestId}] Monetary voucher selected`, { 
        monetaryValidationTime: `${monetaryValidationTime}ms`,
        determinedPrice 
      })
    } else {
      const treatmentValidationStart = Date.now()
      
      if (!treatmentId || !mongoose.Types.ObjectId.isValid(treatmentId)) {
        logger.warn(`[${requestId}] Invalid treatment ID for treatment voucher`, { treatmentId })
        return { success: false, error: "Valid Treatment ID is required for treatment voucher." }
      }
      
      const treatmentDoc = (await Treatment.findById(treatmentId)
        .select("name fixedPrice pricingType durations")
        .lean()) as any
        
      const treatmentLoadTime = Date.now() - treatmentValidationStart
      
      if (!treatmentDoc) {
        logger.warn(`[${requestId}] Treatment not found for voucher purchase`, { 
          treatmentId,
          treatmentLoadTime: `${treatmentLoadTime}ms`
        })
        return { success: false, error: "Treatment not found." }
      }
      
      if (treatmentDoc.pricingType === "fixed") {
        determinedPrice = treatmentDoc.fixedPrice || 0
      } else if (treatmentDoc.pricingType === "duration_based") {
        if (!selectedDurationId) {
          return { success: false, error: "Duration must be selected for duration-based treatments." }
        }
        
        const durationDoc = treatmentDoc.durations?.find(
          (d: any) => d._id.toString() === selectedDurationId
        )
        
        if (!durationDoc || !durationDoc.isActive) {
          return { success: false, error: "Selected duration not found or inactive." }
        }
        
        determinedPrice = durationDoc.price || 0
      }
      
      if (determinedPrice <= 0) {
        return { success: false, error: "Invalid treatment price." }
      }
    }

    // Find or create purchaser user by phone
    const { findOrCreateUserByPhone } = await import("@/actions/auth-actions")
    const purchaserResult = await findOrCreateUserByPhone(guestInfo.phone, {
      name: guestInfo.name,
      email: guestInfo.email,
    })

    if (!purchaserResult.success || !purchaserResult.userId) {
      logger.error(`[${requestId}] Failed to find or create purchaser user`, { error: purchaserResult.error })
      return { success: false, error: purchaserResult.error || "Failed to create purchaser user" }
    }

    const purchaserUserId = purchaserResult.userId
    logger.info(`[${requestId}] Purchaser user ${purchaserResult.isNewUser ? 'created' : 'found'}`, { 
      purchaserUserId, 
      userType: purchaserResult.userType 
    })

    // For gift vouchers, ALWAYS find or create the recipient user as the owner
    const recipientResult = await findOrCreateUserByPhone(_data.recipientPhone, {
      name: _data.recipientName || "מקבל מתנה",
      email: _data.recipientEmail || undefined,
    })

    if (!recipientResult.success || !recipientResult.userId) {
      logger.error(`[${requestId}] Failed to find or create recipient user`, { error: recipientResult.error })
      return { success: false, error: recipientResult.error || "Failed to create recipient user" }
    }

    const recipientUserId = recipientResult.userId
    logger.info(`[${requestId}] Recipient user ${recipientResult.isNewUser ? 'created' : 'found'}`, { 
      recipientUserId, 
      userType: recipientResult.userType 
    })

    const code = await generateUniqueVoucherCode()

    const voucherCreationStart = Date.now()
    const giftVoucherData: Partial<IGiftVoucher> = {
      code,
      voucherType,
      amount: determinedPrice,
      monetaryValue: determinedPrice,
      originalAmount: determinedPrice,
      remainingAmount: determinedPrice,
      purchaserUserId: new mongoose.Types.ObjectId(purchaserUserId),
      ownerUserId: new mongoose.Types.ObjectId(recipientUserId), // Owner is ALWAYS the recipient for gift vouchers
      isGift: true, // All gift vouchers are gifts by definition
      status: "pending_payment",
      purchaseDate: new Date(),
      validFrom: new Date(),
      validUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      isActive: false,
      guestInfo: {
        name: guestInfo.name,
        email: guestInfo.email || "",
        phone: guestInfo.phone
      },
      // Always set recipient info for gift vouchers
      recipientName: _data.recipientName,
      recipientPhone: _data.recipientPhone,
      recipientEmail: _data.recipientEmail || undefined,
      greetingMessage: _data.greetingMessage || undefined,
      sendDate: _data.sendDate === "immediate" ? new Date() : (_data.sendDate ? new Date(_data.sendDate) : new Date()),
    }

    if (voucherType === "treatment") {
      giftVoucherData.treatmentId = new mongoose.Types.ObjectId(treatmentId!)
      if (selectedDurationId) {
        giftVoucherData.selectedDurationId = new mongoose.Types.ObjectId(selectedDurationId)
      }
    }

    const newVoucher = new GiftVoucher(giftVoucherData)
    await newVoucher.save()
    const voucherCreationTime = Date.now() - voucherCreationStart
    
    const totalTime = Date.now() - startTime
    logger.info(`[${requestId}] Successfully created guest gift voucher`, {
      totalTime: `${totalTime}ms`,
      voucherCreationTime: `${voucherCreationTime}ms`,
      voucherId: newVoucher._id,
      voucherCode: code,
      amount: determinedPrice,
      voucherType,
      isGift: true,
      purchaserUserId,
      ownerUserId: recipientUserId,
      guestEmail: guestInfo.email
    })

    return {
      success: true,
      voucherId: newVoucher._id.toString(),
      amount: determinedPrice,
    }
  } catch (error) {
    const totalTime = Date.now() - startTime
    logger.error(`[${requestId}] Error initiating guest gift voucher purchase`, {
      totalTime: `${totalTime}ms`,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5)
      } : String(error),
      voucherType: _data.voucherType,
      treatmentId: _data.treatmentId,
      guestEmail: _data.guestInfo.email
    })
    
    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors)
        .map((err: any) => err.message)
        .join(", ")
      return { success: false, error: `Validation failed: ${messages}` }
    }
    return { success: false, error: "Failed to initiate purchase. Please try again." }
  }
}

export async function confirmGuestGiftVoucherPurchase(data: PaymentResultData & {
  guestInfo: {
    name: string
    email?: string
    phone: string
  }
}) {
  try {
    if (!mongoose.Types.ObjectId.isValid(data.voucherId)) {
      return { success: false, error: "Invalid Voucher ID format." }
    }

    await dbConnect()
    const { voucherId, paymentId, success: paymentSuccess, guestInfo } = data

    const voucher = await GiftVoucher.findById(voucherId)
    if (!voucher) {
      return { success: false, error: "Voucher not found" }
    }

    if (voucher.status !== "pending_payment") {
      if (voucher.status === "active" || voucher.status === "sent" || voucher.status === "partially_used") {
        logger.info(`Guest voucher ${voucherId} already processed. Status: ${voucher.status}`)
        return { success: true, voucher: await toGiftVoucherPlain(voucher) }
      }
      return {
        success: false,
        error: "Voucher not awaiting payment or already processed with a non-successful status.",
      }
    }

    if (paymentSuccess) {
      voucher.paymentId = paymentId
      
      // All gift vouchers are gifts with recipients - set status based on send date
      const sendDate = voucher.sendDate ? new Date(voucher.sendDate) : new Date()
      if (!voucher.sendDate) voucher.sendDate = sendDate
      
      if (sendDate <= new Date()) {
        voucher.status = "sent"
        voucher.isActive = true
      } else {
        voucher.status = "pending_send"
        voucher.isActive = false
      }
      
      await voucher.save()

      // Send notifications
      try {
        const lang = "he" // Default to Hebrew for guests
        
        if (voucher.isGift && voucher.recipientName && voucher.recipientPhone) {
          // Send gift voucher to recipient with voucher code only
          const voucherTypeText = voucher.voucherType === "monetary" ? 
            `שובר כספי בסכום ₪${voucher.amount}` :
            `שובר טיפול: ${voucher.treatmentName || "טיפול"}${voucher.selectedDurationName ? ` - ${voucher.selectedDurationName}` : ""}`
          
          const giftMessage = voucher.greetingMessage 
            ? `🎁 קיבלת שובר מתנה מ${guestInfo.name}!\n\n"${voucher.greetingMessage}"\n\nקוד השובר: ${voucher.code}\n${voucherTypeText}\n\nלמימוש השובר השתמש בקוד זה.`
            : `🎁 קיבלת שובר מתנה מ${guestInfo.name}!\n\nקוד השובר: ${voucher.code}\n${voucherTypeText}\n\nלמימוש השובר השתמש בקוד זה.`
          
          const recipientRecipients = []
          if (voucher.recipientPhone) {
            recipientRecipients.push({ type: "phone" as const, value: voucher.recipientPhone, language: lang as any })
          }
          
          if (recipientRecipients.length > 0) {
            await unifiedNotificationService.sendPurchaseSuccess(recipientRecipients, giftMessage)
          }

          // Send confirmation to purchaser with voucher code only
          const purchaserMessage = `שלום ${guestInfo.name}, ✅ השובר נשלח בהצלחה ל${voucher.recipientName}!\n\nקוד השובר: ${voucher.code}\n${voucherTypeText}`
          
          const purchaserRecipients = []
          if (guestInfo.email) {
            purchaserRecipients.push({ type: "email" as const, value: guestInfo.email, name: guestInfo.name, language: lang as any })
          }
          if (guestInfo.phone) {
            purchaserRecipients.push({ type: "phone" as const, value: guestInfo.phone, language: lang as any })
          }
          
          if (purchaserRecipients.length > 0) {
            await unifiedNotificationService.sendPurchaseSuccess(purchaserRecipients, purchaserMessage)
          }
        } else {
          // Regular voucher (not a gift) - send to purchaser with voucher code only
          const voucherTypeText = voucher.voucherType === "monetary" ? 
            `שובר כספי בסכום ₪${voucher.amount}` :
            `שובר טיפול: ${voucher.treatmentName || "טיפול"}${voucher.selectedDurationName ? ` - ${voucher.selectedDurationName}` : ""}`
          
          const message = `שלום ${guestInfo.name}, תודה על רכישתך!\n\nקוד השובר: ${voucher.code}\n${voucherTypeText}\n\nלמימוש השובר השתמש בקוד זה.`

          const recipients = []
          if (guestInfo.email) {
            recipients.push({ type: "email" as const, value: guestInfo.email, name: guestInfo.name, language: lang as any })
          }
          if (guestInfo.phone) {
            recipients.push({ type: "phone" as const, value: guestInfo.phone, language: lang as any })
          }
          
          if (recipients.length > 0) {
            await unifiedNotificationService.sendPurchaseSuccess(recipients, message)
          }
        }
      } catch (notificationError) {
        logger.error("Failed to send notification for guest gift voucher:", {
          guestEmail: guestInfo.email,
          voucherId: voucher._id.toString(),
          isGift: voucher.isGift,
          hasRecipientPhone: !!voucher.recipientPhone,
          error: notificationError instanceof Error ? notificationError.message : String(notificationError),
        })
      }

      revalidatePath("/dashboard/admin/gift-vouchers")
      return {
        success: true,
        voucher: await toGiftVoucherPlain(voucher),
      }
    } else {
      voucher.status = "cancelled"
      voucher.isActive = false
      await voucher.save()
      return { success: false, error: "Payment failed. Voucher not activated." }
    }
  } catch (error) {
    logger.error("Error confirming guest gift voucher purchase:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      details: error,
    })
    return { success: false, error: "Failed to confirm purchase. Please contact support." }
  }
}

export async function saveAbandonedGiftVoucherPurchase(
  userId: string,
  formData: {
    guestInfo?: any
    purchaseOptions?: any
    currentStep: number
  },
): Promise<{ success: boolean; purchaseId?: string; error?: string }> {
  try {
    await dbConnect()
    const existing = await GiftVoucherPurchase.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      status: "abandoned_pending_payment",
    }).sort({ createdAt: -1 })

    if (existing) {
      existing.formState = {
        currentStep: formData.currentStep,
        guestInfo: formData.guestInfo,
        purchaseOptions: formData.purchaseOptions,
        savedAt: new Date(),
      }
      await existing.save()
      return { success: true, purchaseId: existing.id.toString() }
    }

    const purchase = new GiftVoucherPurchase({
      userId: new mongoose.Types.ObjectId(userId),
      status: "abandoned_pending_payment",
      formState: {
        currentStep: formData.currentStep,
        guestInfo: formData.guestInfo,
        purchaseOptions: formData.purchaseOptions,
        savedAt: new Date(),
      },
    })
    await purchase.save()
    return { success: true, purchaseId: purchase.id.toString() }
  } catch (error) {
    return { success: false, error: "Failed to save abandoned purchase" }
  }
}

async function getAbandonedGiftVoucherPurchase(
  userId: string,
): Promise<{ success: boolean; purchase?: any; error?: string }> {
  try {
    await dbConnect()
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const purchase = await GiftVoucherPurchase.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      status: "abandoned_pending_payment",
      createdAt: { $gte: twentyFourHoursAgo },
    })
      .sort({ createdAt: -1 })
      .lean()

    if (!purchase) {
      return { success: false, error: "No recent abandoned purchase" }
    }
    return { success: true, purchase }
  } catch (error) {
    return { success: false, error: "Failed to get abandoned purchase" }
  }
}

export async function getGiftVoucherById(id: string) {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid voucher ID format" }
    }
    await dbConnect()
    const voucherDoc = await GiftVoucher.findById(id).lean()
    if (!voucherDoc) {
      return { success: false, error: "Voucher not found" }
    }
    const voucher = await toGiftVoucherPlain(voucherDoc as IGiftVoucher)
    return { success: true, voucher }
  } catch (error) {
    logger.error("Error fetching gift voucher by ID:", { id, error })
    return { success: false, error: "Failed to fetch voucher" }
  }
}

export async function getGiftVoucherByCode(code: string) {
  try {
    await dbConnect()
    const voucherDoc = await GiftVoucher.findOne({ code: code.trim() }).lean()
    if (!voucherDoc) {
      return { success: false, error: "Voucher not found" }
    }
    const voucher = await toGiftVoucherPlain(voucherDoc as IGiftVoucher)
    return { success: true, voucher }
  } catch (error) {
    logger.error("Error fetching gift voucher by code:", { code, error })
    return { success: false, error: "Failed to fetch voucher" }
  }
}
