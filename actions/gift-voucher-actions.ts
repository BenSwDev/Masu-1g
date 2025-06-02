"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import mongoose, { type FilterQuery } from "mongoose"

import { authOptions } from "@/lib/auth/auth"
import GiftVoucher, { type IGiftVoucher } from "@/lib/db/models/gift-voucher"
import User from "@/lib/db/models/user"
import Treatment from "@/lib/db/models/treatment"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"
import { notificationManager } from "@/lib/notifications/notification-manager"
import type { GiftVoucherPlain as IGiftVoucherPlainFile } from "@/lib/db/models/gift-voucher"

// Extended GiftVoucherPlain for client-side use
export interface GiftVoucherPlain extends IGiftVoucherPlainFile {
  _id: string
  amount: number // Ensure this is always present as it's the primary value
  treatmentName?: string
  selectedDurationName?: string
  purchaserName?: string
  ownerName?: string
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
    }
    return minimalVoucher
  }
}

export interface AdminGiftVoucherFormData {
  code: string
  voucherType: "treatment" | "monetary"
  treatmentId?: string
  selectedDurationId?: string
  amount: string // Use 'amount' as the primary value input for admin form
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

    // Basic validations (code, ownerUserId, dates)
    // ... (keep existing validations)
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

    let effectiveAmount = 0
    if (String(data.amount).trim() === "" || isNaN(Number(data.amount)) || Number(data.amount) <= 0) {
      return { success: false, error: "Valid positive amount is required." }
    }
    effectiveAmount = Number(data.amount)

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
      code: data.code,
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
      isGift: false, // Admin created are not gifts by default
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

    if (data.amount !== undefined) {
      const newAmount = Number(data.amount)
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
      if (data.amount === undefined && existingVoucher.voucherType !== "monetary") {
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

      query.$or = [{ code: searchRegex }, { recipientName: searchRegex }]
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

export interface PurchaseInitiationData {
  voucherType: "treatment" | "monetary"
  treatmentId?: string
  selectedDurationId?: string
  monetaryValue?: number // This is the value from the monetary input field
  isGift: boolean
}

export interface GiftDetailsPayload {
  recipientName: string
  recipientPhone: string
  greetingMessage?: string
  sendDate?: string
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

    // Destructure monetaryValue as inputMonetaryValue to differentiate from internal variables
    const { voucherType, treatmentId, selectedDurationId, monetaryValue: inputMonetaryValue, isGift } = data

    let determinedPrice = 0 // This will be the final price for the voucher

    if (voucherType === "monetary") {
      if (typeof inputMonetaryValue !== "number" || inputMonetaryValue < 150) {
        return { success: false, error: "Minimum monetary value is 150 ILS and must be a number." }
      }
      determinedPrice = inputMonetaryValue
      logger.info(`Monetary voucher selected. Price determined from input: ${determinedPrice}`)
    } else if (voucherType === "treatment") {
      // For treatment vouchers, inputMonetaryValue is IGNORED. Price is derived from treatment.
      if (!treatmentId || !mongoose.Types.ObjectId.isValid(treatmentId)) {
        return { success: false, error: "Valid Treatment ID is required for treatment voucher." }
      }
      const treatmentDoc = (await Treatment.findById(treatmentId)
        .select("name fixedPrice pricingType durations") // Select name for logging
        .lean()) as any
      if (!treatmentDoc) {
        logger.warn(`Treatment not found for ID: ${treatmentId} during voucher purchase.`)
        return { success: false, error: "Treatment not found." }
      }

      let priceFromTreatment: number | undefined
      if (treatmentDoc.pricingType === "fixed") {
        if (typeof treatmentDoc.fixedPrice === "number") {
          priceFromTreatment = treatmentDoc.fixedPrice
        }
        logger.info(
          `Treatment voucher: Fixed price. Treatment: ${treatmentDoc.name}, FixedPrice: ${treatmentDoc.fixedPrice}, DerivedPrice: ${priceFromTreatment}`,
        )
      } else if (
        treatmentDoc.pricingType === "duration_based" &&
        treatmentDoc.durations &&
        treatmentDoc.durations.length > 0
      ) {
        if (!selectedDurationId || !mongoose.Types.ObjectId.isValid(selectedDurationId)) {
          logger.warn(
            `Treatment voucher: Duration-based, but no/invalid duration selected. Treatment: ${treatmentDoc.name}`,
          )
          return { success: false, error: "A valid duration must be selected for this treatment type." }
        }
        const duration = treatmentDoc.durations.find((d: any) => d._id.toString() === selectedDurationId)
        if (duration && typeof duration.price === "number") {
          priceFromTreatment = duration.price
          logger.info(
            `Treatment voucher: Duration-based. Treatment: ${treatmentDoc.name}, Duration: ${selectedDurationId}, DurationPrice: ${duration.price}, DerivedPrice: ${priceFromTreatment}`,
          )
        } else {
          logger.warn(
            `Treatment voucher: Duration-based, duration ${selectedDurationId} not found or no price. Treatment: ${treatmentDoc.name}`,
          )
        }
      } else if (
        treatmentDoc.pricingType === "duration_based" &&
        (!treatmentDoc.durations || treatmentDoc.durations.length === 0)
      ) {
        logger.warn(`Treatment voucher: Duration-based, but no durations defined. Treatment: ${treatmentDoc.name}`)
        // Fallback to fixedPrice if it exists and is positive, otherwise it's an issue
        if (typeof treatmentDoc.fixedPrice === "number" && treatmentDoc.fixedPrice > 0) {
          priceFromTreatment = treatmentDoc.fixedPrice
          logger.info(
            `Treatment voucher: Duration-based with no durations, falling back to fixedPrice. Treatment: ${treatmentDoc.name}, FixedPrice: ${treatmentDoc.fixedPrice}, DerivedPrice: ${priceFromTreatment}`,
          )
        }
      }

      if (typeof priceFromTreatment === "number" && priceFromTreatment > 0) {
        determinedPrice = priceFromTreatment
      } else {
        logger.error(
          `Could not determine a valid positive price for treatment: ${treatmentDoc.name} (ID: ${treatmentId}). PricingType: ${treatmentDoc.pricingType}, FixedPrice: ${treatmentDoc.fixedPrice}, SelectedDuration: ${selectedDurationId}. Derived price from treatment: ${priceFromTreatment}.`,
        )
        return {
          success: false,
          error: `Could not determine a valid price for the selected treatment '${treatmentDoc.name}'. Please check treatment configuration or select a valid duration.`,
        }
      }
    } else {
      // Should not be reached if client validation is good
      return { success: false, error: "Invalid voucher type specified." }
    }

    // Final check on determinedPrice
    if (determinedPrice <= 0) {
      logger.error(
        `Attempted to create voucher with non-positive price: ${determinedPrice} for voucherType: ${voucherType}.`,
      )
      return { success: false, error: "Voucher price must be positive." }
    }

    const code = `GV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    const giftVoucherData: Partial<IGiftVoucher> = {
      code,
      voucherType,
      amount: determinedPrice, // *** This is the primary value field, now correctly sourced ***
      monetaryValue: determinedPrice, // For consistency or if other parts use it
      originalAmount: determinedPrice,
      remainingAmount: determinedPrice,
      purchaserUserId: new mongoose.Types.ObjectId(session.user.id),
      ownerUserId: new mongoose.Types.ObjectId(session.user.id),
      isGift,
      status: "pending_payment",
      purchaseDate: new Date(),
      validFrom: new Date(),
      validUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      isActive: false,
    }

    if (voucherType === "treatment") {
      giftVoucherData.treatmentId = new mongoose.Types.ObjectId(treatmentId!) // treatmentId is validated above
      if (selectedDurationId) {
        // selectedDurationId is validated above if provided
        giftVoucherData.selectedDurationId = new mongoose.Types.ObjectId(selectedDurationId)
      }
    }

    const newVoucher = new GiftVoucher(giftVoucherData)
    await newVoucher.save()
    logger.info(`Successfully created gift voucher ${newVoucher._id} with amount ${determinedPrice}`)

    return {
      success: true,
      voucherId: newVoucher._id.toString(),
      amount: determinedPrice, // Return the actual amount used for the voucher
    }
  } catch (error) {
    logger.error("Error initiating gift voucher purchase:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      details: error, // Log the full error object
    })
    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors)
        .map((err) => err.message)
        .join(", ")
      return { success: false, error: `Validation failed: ${messages}` }
    }
    return { success: false, error: "Failed to initiate purchase. Please try again." }
  }
}

// ... (confirmGiftVoucherPurchase, setGiftDetails, getMemberPurchasedVouchers, getMemberOwnedVouchers, redeemGiftVoucher)
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
    const { voucherId, paymentId, success: paymentSuccess } = data

    const voucher = await GiftVoucher.findById(voucherId)
    if (!voucher) {
      return { success: false, error: "Voucher not found" }
    }
    if (voucher.purchaserUserId.toString() !== session.user.id) {
      // Consider if admin can confirm or if payment callback is server-to-server
      // logger.warn("Voucher purchaser mismatch during confirmation.", { voucherId, userId: session.user.id });
      // return { success: false, error: "Purchase record mismatch." };
    }
    if (voucher.status !== "pending_payment") {
      return { success: false, error: "Voucher not awaiting payment or already processed." }
    }

    if (paymentSuccess) {
      voucher.paymentId = paymentId
      if (!voucher.isGift) {
        // If it's not a gift, it's for the purchaser themselves
        voucher.status = "active"
        voucher.isActive = true
      } else {
        // If it is a gift, status will be handled by setGiftDetails (e.g., pending_send or sent)
        // Default to active if not immediately sent, can be overridden by setGiftDetails
        if (voucher.status === "pending_payment") {
          // Only update if still pending
          voucher.status = "active" // Or "pending_send" if that's more appropriate before gift details
          voucher.isActive = true // Or false if pending_send
        }
      }
      await voucher.save()
      revalidatePath("/dashboard/member/gift-vouchers")
      if (voucher.purchaserUserId.toString() !== voucher.ownerUserId.toString()) {
        revalidatePath(`/dashboard/user/${voucher.ownerUserId.toString()}/gift-vouchers`)
      }
      return {
        success: true,
        voucher: await toGiftVoucherPlain(voucher),
      }
    } else {
      voucher.status = "cancelled" // Or "payment_failed"
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
    if (voucher.purchaserUserId.toString() !== session.user.id) {
      return { success: false, error: "You are not authorized to modify this voucher." }
    }
    if (!details.recipientName || details.recipientName.trim() === "") {
      return { success: false, error: "Recipient name is required." }
    }
    // Phone validation can be more specific if needed (e.g., regex)
    if (!details.recipientPhone || details.recipientPhone.trim() === "") {
      return { success: false, error: "Recipient phone is required." }
    }
    if (details.sendDate && details.sendDate !== "immediate" && isNaN(new Date(details.sendDate).getTime())) {
      return { success: false, error: "Invalid send date format." }
    }

    voucher.isGift = true
    voucher.recipientName = details.recipientName
    voucher.recipientPhone = details.recipientPhone
    voucher.greetingMessage = details.greetingMessage

    const now = new Date()
    let sendNotificationNow = false

    // Only transition status if it's not already terminal (e.g., fully_used, expired, cancelled)
    const canUpdateStatus = !["fully_used", "expired", "cancelled"].includes(voucher.status)

    if (details.sendDate === "immediate" || !details.sendDate) {
      voucher.sendDate = now
      if (canUpdateStatus) {
        voucher.status = "sent"
        voucher.isActive = true
      }
      sendNotificationNow = true
    } else {
      const scheduledSendDate = new Date(details.sendDate)
      voucher.sendDate = scheduledSendDate
      if (canUpdateStatus) {
        if (scheduledSendDate <= now) {
          voucher.status = "sent"
          voucher.isActive = true
          sendNotificationNow = true
        } else {
          voucher.status = "pending_send"
          voucher.isActive = false // Not active until sent
          // TODO: Schedule notification for future sendDate (requires a job scheduler)
          logger.info(`Gift voucher ${voucher.code} scheduled for sending on ${scheduledSendDate.toISOString()}`)
        }
      }
    }

    // Attempt to send notification if applicable
    if (sendNotificationNow && voucher.recipientPhone && voucher.recipientName && voucher.status === "sent") {
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
        logger.info(`Gift voucher SMS notification sent to ${voucher.recipientPhone} for voucher ${voucher.code}`)
      } catch (notificationError) {
        logger.error("Failed to send gift voucher SMS notification", {
          error: notificationError,
          voucherId: voucher._id.toString(),
          recipientPhone: voucher.recipientPhone,
        })
        // Do not fail the entire operation if notification fails, but log it.
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
    const voucherDocs = await GiftVoucher.find({ ownerUserId: new mongoose.Types.ObjectId(session.user.id) })
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

export interface OrderDetailsForRedemption {
  orderId?: string
  totalAmount: number
  items?: { name: string; price: number }[]
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

    if (voucher.ownerUserId.toString() !== session.user.id) {
      // This check might be too restrictive if vouchers can be gifted and then redeemed by recipient
      // For now, assuming owner must redeem. If not, this logic needs adjustment.
      // Alternative: check if recipientPhone matches session.user.phone if it's a gift.
      // Or, if status is 'sent' and recipientName/Phone are set, allow redemption by a user matching those details.
      // For simplicity, keeping ownerUserId check for now.
      logger.warn(
        `Attempt to redeem voucher ${code} by non-owner. Owner: ${voucher.ownerUserId}, Redeemer: ${session.user.id}`,
      )
      return { success: false, error: "This voucher does not belong to you or cannot be redeemed by you." }
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
      // This check might be redundant if status check is comprehensive
      return { success: false, error: "Voucher is currently inactive." }
    }
    if (!["active", "partially_used", "sent"].includes(voucher.status)) {
      return {
        success: false,
        error: "Voucher is not available for use (e.g., pending payment, fully used, cancelled).",
      }
    }

    let amountApplied = 0
    const usageEntry: any = {
      date: new Date(),
      orderId: orderDetails.orderId ? new mongoose.Types.ObjectId(orderDetails.orderId) : undefined,
    }

    if (voucher.voucherType === "treatment") {
      if (voucher.status === "fully_used") {
        return { success: false, error: "Treatment voucher already used." }
      }
      voucher.status = "fully_used"
      amountApplied = voucher.amount // Use the main 'amount' field for treatment value
      usageEntry.amountUsed = amountApplied
      usageEntry.description = `Redeemed for treatment: ${orderDetails.items?.[0]?.name || voucher.treatmentId?.toString() || "Treatment"}`
    } else if (voucher.voucherType === "monetary") {
      if ((voucher.remainingAmount || 0) <= 0) {
        voucher.status = "fully_used" // Ensure status is correct if remaining is zero
        await voucher.save()
        return { success: false, error: "Voucher has no remaining balance." }
      }
      const redemptionAmount = orderDetails.totalAmount
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
        voucher.remainingAmount = 0
      } else {
        voucher.status = "partially_used"
      }
    } else {
      return { success: false, error: "Unknown voucher type." }
    }

    if (!voucher.usageHistory) voucher.usageHistory = []
    voucher.usageHistory.push(usageEntry)
    voucher.isActive = voucher.status === "active" || voucher.status === "partially_used" || voucher.status === "sent"
    await voucher.save()

    revalidatePath("/dashboard/member/gift-vouchers")
    revalidatePath("/dashboard/admin/gift-vouchers") // If admin views usage

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
