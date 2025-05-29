"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import GiftVoucher from "@/lib/db/models/gift-voucher"
import Treatment from "@/lib/db/models/treatment"
import User from "@/lib/db/models/user"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"
import mongoose from "mongoose"

// Types
export interface GiftVoucherPlain {
  _id: string
  code: string
  voucherType: "treatment" | "monetary"
  treatmentId?: string
  treatmentName?: string
  selectedDurationId?: string
  selectedDurationMinutes?: number
  monetaryValue?: number
  remainingAmount?: number
  purchaserUserId: string
  purchaserName?: string
  ownerUserId: string
  ownerName?: string
  isGift: boolean
  recipientName?: string
  recipientPhone?: string
  greetingMessage?: string
  sendDate?: Date
  status: string
  purchaseDate: Date
  validFrom: Date
  validUntil: Date
  isActive: boolean
  paymentId?: string
  usageHistory?: Array<{
    date: Date
    amountUsed: number
    orderId?: string
  }>
  createdAt?: Date
  updatedAt?: Date
}

export interface PurchaseInitiationData {
  voucherType: "treatment" | "monetary"
  treatmentId?: string
  selectedDurationId?: string
  monetaryValue?: number
  validityDays?: number
}

export interface GiftDetailsPayload {
  recipientName: string
  recipientPhone: string
  greetingMessage?: string
  sendDate?: Date
}

// Helper function to convert voucher to plain object
const toGiftVoucherPlain = async (voucher: any): Promise<GiftVoucherPlain> => {
  await voucher.populate([
    { path: "treatmentId", select: "name durations" },
    { path: "purchaserUserId", select: "name" },
    { path: "ownerUserId", select: "name" },
  ])

  const treatment = voucher.treatmentId
  let selectedDuration = null

  if (treatment && voucher.selectedDurationId) {
    selectedDuration = treatment.durations?.find((d: any) => d._id.toString() === voucher.selectedDurationId.toString())
  }

  return {
    _id: String(voucher._id),
    code: voucher.code,
    voucherType: voucher.voucherType,
    treatmentId: voucher.treatmentId?._id?.toString(),
    treatmentName: treatment?.name,
    selectedDurationId: voucher.selectedDurationId?.toString(),
    selectedDurationMinutes: selectedDuration?.minutes,
    monetaryValue: voucher.monetaryValue,
    remainingAmount: voucher.remainingAmount,
    purchaserUserId: voucher.purchaserUserId._id.toString(),
    purchaserName: voucher.purchaserUserId.name,
    ownerUserId: voucher.ownerUserId._id.toString(),
    ownerName: voucher.ownerUserId.name,
    isGift: voucher.isGift,
    recipientName: voucher.recipientName,
    recipientPhone: voucher.recipientPhone,
    greetingMessage: voucher.greetingMessage,
    sendDate: voucher.sendDate,
    status: voucher.status,
    purchaseDate: voucher.purchaseDate,
    validFrom: voucher.validFrom,
    validUntil: voucher.validUntil,
    isActive: voucher.isActive,
    paymentId: voucher.paymentId,
    usageHistory: voucher.usageHistory,
    createdAt: voucher.createdAt,
    updatedAt: voucher.updatedAt,
  }
}

// Admin actions
export async function createGiftVoucher(data: FormData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const voucherType = data.get("voucherType") as "treatment" | "monetary"
    const ownerUserId = data.get("ownerUserId") as string

    // Validate owner exists
    const owner = await User.findById(ownerUserId)
    if (!owner || !owner.roles.includes("member")) {
      return { success: false, error: "Invalid owner user" }
    }

    const voucherData: any = {
      code: data.get("code") || undefined, // Will be auto-generated if not provided
      voucherType,
      purchaserUserId: session.user.id, // Admin is the purchaser
      ownerUserId,
      validFrom: new Date(data.get("validFrom") as string),
      validUntil: new Date(data.get("validUntil") as string),
      isActive: data.get("isActive") === "true",
      status: "active", // Admin-created vouchers are immediately active
      isGift: false,
    }

    if (voucherType === "treatment") {
      const treatmentId = data.get("treatmentId") as string
      const selectedDurationId = data.get("selectedDurationId") as string

      // Validate treatment exists
      const treatment = await Treatment.findById(treatmentId)
      if (!treatment) {
        return { success: false, error: "Invalid treatment" }
      }

      voucherData.treatmentId = treatmentId
      if (selectedDurationId) {
        voucherData.selectedDurationId = selectedDurationId
      }
    } else {
      const monetaryValue = Number(data.get("monetaryValue"))
      if (monetaryValue < 150) {
        return { success: false, error: "Minimum value is 150 ILS" }
      }
      voucherData.monetaryValue = monetaryValue
      voucherData.remainingAmount = monetaryValue
    }

    const voucher = new GiftVoucher(voucherData)
    await voucher.save()

    revalidatePath("/dashboard/admin/gift-vouchers")

    return {
      success: true,
      giftVoucher: await toGiftVoucherPlain(voucher),
    }
  } catch (error) {
    logger.error("Error creating gift voucher:", error)
    return { success: false, error: "Failed to create gift voucher" }
  }
}

export async function updateGiftVoucher(id: string, data: FormData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const updateData: any = {
      code: data.get("code"),
      validFrom: new Date(data.get("validFrom") as string),
      validUntil: new Date(data.get("validUntil") as string),
      isActive: data.get("isActive") === "true",
    }

    // Only allow updating certain fields based on voucher type
    const existingVoucher = await GiftVoucher.findById(id)
    if (!existingVoucher) {
      return { success: false, error: "Gift voucher not found" }
    }

    if (existingVoucher.voucherType === "monetary") {
      const newValue = Number(data.get("monetaryValue"))
      if (newValue && newValue !== existingVoucher.monetaryValue) {
        // Adjust remaining amount proportionally
        const usedAmount = existingVoucher.monetaryValue - existingVoucher.remainingAmount
        updateData.monetaryValue = newValue
        updateData.remainingAmount = Math.max(0, newValue - usedAmount)
      }
    }

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
    logger.error("Error updating gift voucher:", error)
    return { success: false, error: "Failed to update gift voucher" }
  }
}

export async function deleteGiftVoucher(id: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const voucher = await GiftVoucher.findById(id)
    if (!voucher) {
      return { success: false, error: "Gift voucher not found" }
    }

    // Don't allow deletion of vouchers that have been used
    if (voucher.status === "partially_used" || voucher.status === "fully_used") {
      return { success: false, error: "Cannot delete used vouchers" }
    }

    await GiftVoucher.findByIdAndDelete(id)

    revalidatePath("/dashboard/admin/gift-vouchers")

    return { success: true, message: "Gift voucher deleted successfully" }
  } catch (error) {
    logger.error("Error deleting gift voucher:", error)
    return { success: false, error: "Failed to delete gift voucher" }
  }
}

export async function getGiftVouchers(
  page = 1,
  search = "",
  filters?: {
    voucherType?: "treatment" | "monetary"
    status?: string
    isActive?: boolean
  },
) {
  try {
    await dbConnect()

    const query: any = {}

    if (search) {
      query.$or = [
        { code: { $regex: search, $options: "i" } },
        { recipientName: { $regex: search, $options: "i" } },
        { recipientPhone: { $regex: search, $options: "i" } },
      ]
    }

    if (filters?.voucherType) {
      query.voucherType = filters.voucherType
    }

    if (filters?.status) {
      query.status = filters.status
    }

    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive
    }

    const limit = 10
    const skip = (page - 1) * limit

    const [giftVouchers, total] = await Promise.all([
      GiftVoucher.find(query)
        .populate("treatmentId", "name durations")
        .populate("purchaserUserId", "name email")
        .populate("ownerUserId", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      GiftVoucher.countDocuments(query),
    ])

    const plainVouchers = await Promise.all(giftVouchers.map((v) => toGiftVoucherPlain(v)))

    return {
      success: true,
      giftVouchers: plainVouchers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  } catch (error) {
    logger.error("Error fetching gift vouchers:", error)
    return {
      success: false,
      error: "Failed to fetch gift vouchers",
    }
  }
}

// Member actions
export async function getMemberOwnedVouchers() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const currentDate = new Date()
    const vouchers = await GiftVoucher.find({
      ownerUserId: session.user.id,
      isActive: true,
      validFrom: { $lte: currentDate },
      validUntil: { $gte: currentDate },
      status: { $in: ["active", "partially_used"] },
    })
      .populate("treatmentId", "name durations")
      .populate("purchaserUserId", "name")
      .sort({ validUntil: 1 })

    const plainVouchers = await Promise.all(vouchers.map((v) => toGiftVoucherPlain(v)))

    return {
      success: true,
      giftVouchers: plainVouchers,
    }
  } catch (error) {
    logger.error("Error fetching member owned vouchers:", error)
    return { success: false, error: "Failed to fetch vouchers" }
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
      purchaserUserId: session.user.id,
      status: { $ne: "pending_payment" }, // Exclude pending payments
    })
      .populate("treatmentId", "name durations")
      .populate("ownerUserId", "name")
      .sort({ purchaseDate: -1 })

    const plainVouchers = await Promise.all(vouchers.map((v) => toGiftVoucherPlain(v)))

    return {
      success: true,
      giftVouchers: plainVouchers,
    }
  } catch (error) {
    logger.error("Error fetching member purchased vouchers:", error)
    return { success: false, error: "Failed to fetch vouchers" }
  }
}

// Purchase flow actions
export async function initiatePurchaseGiftVoucher(data: PurchaseInitiationData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const validityDays = data.validityDays || 365 // Default 1 year validity
    const validFrom = new Date()
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + validityDays)

    const voucherData: any = {
      voucherType: data.voucherType,
      purchaserUserId: session.user.id,
      ownerUserId: session.user.id, // Initially owned by purchaser
      validFrom,
      validUntil,
      status: "pending_payment",
      isGift: false,
    }

    if (data.voucherType === "treatment") {
      if (!data.treatmentId) {
        return { success: false, error: "Treatment ID is required" }
      }

      const treatment = await Treatment.findById(data.treatmentId)
      if (!treatment) {
        return { success: false, error: "Invalid treatment" }
      }

      voucherData.treatmentId = data.treatmentId
      if (data.selectedDurationId) {
        voucherData.selectedDurationId = data.selectedDurationId
      }
    } else {
      if (!data.monetaryValue || data.monetaryValue < 150) {
        return { success: false, error: "Minimum value is 150 ILS" }
      }
      voucherData.monetaryValue = data.monetaryValue
      voucherData.remainingAmount = data.monetaryValue
    }

    const voucher = new GiftVoucher(voucherData)
    await voucher.save()

    // TODO: Integrate with payment system
    // For now, return voucher ID for next step
    return {
      success: true,
      voucherId: voucher._id.toString(),
      // paymentUrl: "payment-integration-url"
    }
  } catch (error) {
    logger.error("Error initiating gift voucher purchase:", error)
    return { success: false, error: "Failed to initiate purchase" }
  }
}

export async function confirmGiftVoucherPurchase(voucherId: string, paymentId: string) {
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

    if (voucher.status !== "pending_payment") {
      return { success: false, error: "Voucher already processed" }
    }

    voucher.status = "active"
    voucher.paymentId = paymentId
    await voucher.save()

    revalidatePath("/dashboard/member/gift-vouchers")

    return {
      success: true,
      voucher: await toGiftVoucherPlain(voucher),
    }
  } catch (error) {
    logger.error("Error confirming gift voucher purchase:", error)
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

    if (voucher.status !== "active") {
      return { success: false, error: "Voucher must be active to send as gift" }
    }

    // Update gift details
    voucher.isGift = true
    voucher.recipientName = details.recipientName
    voucher.recipientPhone = details.recipientPhone
    voucher.greetingMessage = details.greetingMessage
    voucher.sendDate = details.sendDate || new Date()

    // Check if we can find recipient user by phone
    const recipientUser = await User.findOne({
      phone: details.recipientPhone,
      roles: "member",
    })

    if (recipientUser) {
      voucher.ownerUserId = recipientUser._id
    }

    // Update status based on send date
    if (details.sendDate && details.sendDate > new Date()) {
      voucher.status = "pending_send"
    } else {
      voucher.status = "sent"
      // TODO: Send notification to recipient
    }

    await voucher.save()

    revalidatePath("/dashboard/member/gift-vouchers")

    return {
      success: true,
      voucher: await toGiftVoucherPlain(voucher),
    }
  } catch (error) {
    logger.error("Error setting gift details:", error)
    return { success: false, error: "Failed to set gift details" }
  }
}

// Redemption actions
export async function redeemGiftVoucher(code: string, orderId?: string, amountToUse?: number) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const voucher = await GiftVoucher.findOne({ code })
    if (!voucher) {
      return { success: false, error: "Invalid voucher code" }
    }

    // Check ownership
    if (voucher.ownerUserId.toString() !== session.user.id) {
      return { success: false, error: "This voucher does not belong to you" }
    }

    // Check validity
    const now = new Date()
    if (!voucher.isActive || now < voucher.validFrom || now > voucher.validUntil) {
      return { success: false, error: "Voucher is not valid" }
    }

    if (voucher.status === "fully_used") {
      return { success: false, error: "Voucher has already been used" }
    }

    if (voucher.voucherType === "treatment") {
      // Treatment voucher - mark as fully used
      voucher.status = "fully_used"
      if (orderId) {
        voucher.usageHistory = voucher.usageHistory || []
        voucher.usageHistory.push({
          date: new Date(),
          amountUsed: 0, // Not applicable for treatment vouchers
          orderId: new mongoose.Types.ObjectId(orderId),
        })
      }
    } else {
      // Monetary voucher
      if (!amountToUse || amountToUse <= 0) {
        return { success: false, error: "Invalid amount" }
      }

      if (amountToUse > voucher.remainingAmount) {
        return { success: false, error: "Insufficient voucher balance" }
      }

      voucher.remainingAmount -= amountToUse
      voucher.usageHistory = voucher.usageHistory || []
      voucher.usageHistory.push({
        date: new Date(),
        amountUsed: amountToUse,
        orderId: orderId ? new mongoose.Types.ObjectId(orderId) : undefined,
      })

      if (voucher.remainingAmount === 0) {
        voucher.status = "fully_used"
      } else {
        voucher.status = "partially_used"
      }
    }

    await voucher.save()

    return {
      success: true,
      voucher: await toGiftVoucherPlain(voucher),
      amountApplied: amountToUse || 0,
    }
  } catch (error) {
    logger.error("Error redeeming gift voucher:", error)
    return { success: false, error: "Failed to redeem voucher" }
  }
}

// System actions
export async function processScheduledGiftVouchers() {
  try {
    await dbConnect()

    const now = new Date()
    const vouchers = await GiftVoucher.find({
      status: "pending_send",
      sendDate: { $lte: now },
    })

    for (const voucher of vouchers) {
      // Check if we can find recipient user by phone
      const recipientUser = await User.findOne({
        phone: voucher.recipientPhone,
        roles: "member",
      })

      if (recipientUser) {
        voucher.ownerUserId = recipientUser._id
      }

      voucher.status = "sent"
      await voucher.save()

      // TODO: Send notification to recipient
      logger.info(`Gift voucher ${voucher.code} sent to ${voucher.recipientPhone}`)
    }

    return { success: true, processed: vouchers.length }
  } catch (error) {
    logger.error("Error processing scheduled gift vouchers:", error)
    return { success: false, error: "Failed to process scheduled vouchers" }
  }
}

// Check and update expired vouchers
export async function updateExpiredVouchers() {
  try {
    await dbConnect()

    const now = new Date()
    const result = await GiftVoucher.updateMany(
      {
        status: { $in: ["active", "partially_used"] },
        validUntil: { $lt: now },
      },
      {
        status: "expired",
        isActive: false,
      },
    )

    return { success: true, updated: result.modifiedCount }
  } catch (error) {
    logger.error("Error updating expired vouchers:", error)
    return { success: false, error: "Failed to update expired vouchers" }
  }
}

// Helper function to get users for gift voucher assignment
export async function getUsers(search = "", role = "member") {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const query: any = { roles: role }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ]
    }

    const users = await User.find(query).select("_id name email phone").sort({ name: 1 }).limit(20).lean()

    return {
      success: true,
      users: users.map((user) => ({
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
      })),
    }
  } catch (error) {
    logger.error("Error fetching users:", error)
    return { success: false, error: "Failed to fetch users" }
  }
}
