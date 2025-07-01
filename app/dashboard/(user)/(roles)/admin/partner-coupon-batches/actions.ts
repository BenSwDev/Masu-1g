import { BookingStatus } from '@/lib/db/models/booking';
"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import { logger } from "@/lib/logs/logger"
import { connectDB } from "@/lib/db/mongoose"
import PartnerCouponBatch, { type IPartnerCouponBatch } from "@/lib/db/models/partner-coupon-batch"
import Coupon, { type ICoupon } from "@/lib/db/models/coupon"
import User from "@/lib/db/models/user"
import {
  CreatePartnerCouponBatchSchema,
  UpdatePartnerCouponBatchSchema,
  UpdateCouponsInBatchSchema,
  type CreatePartnerCouponBatchPayload,
  type UpdatePartnerCouponBatchPayload,
  type UpdateCouponsInBatchPayload,
} from "@/lib/validation/partner-coupon-batch-schemas"
import { Types } from "mongoose"

// Helper functions to check roles
const isAdminUser = (user: { roles?: string[] } | null | undefined): boolean =>
  !!user?.roles?.includes("admin")

// Function to calculate effective status for batches
function calculateBatchEffectiveStatus(
  batch: IPartnerCouponBatch
): "active" | "expired" | "scheduled" | "inactive_manual" {
  const now = new Date()
  const validFrom = new Date(batch.validFrom)
  const validUntil = new Date(batch.validUntil)

  if (!batch.isActive) {
    return "inactive_manual"
  }
  if (validFrom > now) {
    return "scheduled"
  }
  const endOfValidUntilDay = new Date(validUntil)
  endOfValidUntilDay.setDate(endOfValidUntilDay.getDate() + 1)

  if (endOfValidUntilDay <= now) {
    return "expired"
  }
  return "active"
}

// Function to calculate effective status for coupons
function calculateCouponEffectiveStatus(
  coupon: ICoupon
): "active" | "expired" | "scheduled" | "inactive_manual" {
  const now = new Date()
  const validFrom = new Date(coupon.validFrom)
  const validUntil = new Date(coupon.validUntil)

  if (!coupon.isActive) {
    return "inactive_manual"
  }
  if (validFrom > now) {
    return "scheduled"
  }
  const endOfValidUntilDay = new Date(validUntil)
  endOfValidUntilDay.setDate(endOfValidUntilDay.getDate() + 1)

  if (endOfValidUntilDay <= now) {
    return "expired"
  }
  return "active"
}

// Function to generate coupon code
function generateCouponCode(prefix: string, index: number): string {
  // Generate PC + 6 random alphanumeric characters
  const randomSuffix = Array.from({ length: 6 }, () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    return chars.charAt(Math.floor(Math.random() * chars.length))
  }).join("")
  return `PC${randomSuffix}`
}

export interface GetPartnerCouponBatchesResult {
  batches: (IPartnerCouponBatch & { effectiveStatus: string; activeCouponsCount: number })[]
  totalPages: number
  currentPage: number
  totalBatches: number
}

export interface GetBatchCouponsResult {
  batch: IPartnerCouponBatch | null
  coupons: (ICoupon & { effectiveStatus: string })[]
}

export interface GetPartnersForSelectionResult {
  success: boolean
  partners?: Array<{
    value: string
    label: string
  }>
  error?: string
}

/**
 * Gets a list of partner coupon batches with pagination and filtering
 * @param page - Page number (1-based)
 * @param limit - Number of items per page
 * @param filters - Optional filters for name, active status, partner ID, and effective status
 * @returns GetPartnerCouponBatchesResult
 */
export async function getPartnerCouponBatches(
  page = 1,
  limit = 10,
  filters: { name?: string; isActive?: boolean; partnerId?: string; effectiveStatus?: string } = {}
): Promise<GetPartnerCouponBatchesResult> {
  const session = await getServerSession(authOptions)
  if (!session || !isAdminUser(session.user)) {
    throw new Error("Unauthorized: Admin access required.")
  }

  await connectDB()
  const query: any = {}
  if (filters.name) query.name = { $regex: filters.name, $options: "i" }
  if (typeof filters.isActive === "boolean") query.isActive = filters.isActive
  if (filters.partnerId) query.assignedPartnerId = filters.partnerId

  const allMatchingBatches = await PartnerCouponBatch.find(query)
    .populate("createdBy", "name email")
    .populate("assignedPartnerId", "name email")
    .sort({ createdAt: -1 })
    .lean()

  const batchesWithEffectiveStatus = await Promise.all(
    allMatchingBatches.map(async batch => {
      // Count active coupons in this batch
      const activeCouponsCount = await Coupon.countDocuments({
        _id: { $in: batch.couponIds },
        isActive: true,
      })

      return {
        ...batch,
        effectiveStatus: calculateBatchEffectiveStatus(batch as IPartnerCouponBatch),
        activeCouponsCount,
      }
    })
  )

  let filteredByEffectiveStatus = batchesWithEffectiveStatus
  if (filters.effectiveStatus) {
    filteredByEffectiveStatus = batchesWithEffectiveStatus.filter(
      b => b.effectiveStatus === filters.effectiveStatus
    )
  }

  const totalBatches = filteredByEffectiveStatus.length
  const paginatedBatches = filteredByEffectiveStatus.slice((page - 1) * limit, page * limit)

  return {
    batches: JSON.parse(JSON.stringify(paginatedBatches)),
    totalPages: Math.ceil(totalBatches / limit),
    currentPage: page,
    totalBatches,
  }
}

/**
 * Gets a list of partners for selection in forms
 * @returns GetPartnersForSelectionResult
 */
export async function getPartnersForSelection(): Promise<GetPartnersForSelectionResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await connectDB()

    const partners = await User.find({ roles: "partner" })
      .select("_id name email")
      .sort({ name: 1 })
      .lean()

    return {
      success: true,
      partners: partners.map(partner => ({
        value: partner._id.toString?.() || '',
        label: partner.name || partner.email,
      })),
    }
  } catch (error) {
    logger.error("Error fetching partners for selection:", error)
    return { success: false, error: "Failed to fetch partners" }
  }
}

/**
 * Creates a new partner coupon batch with associated coupons
 * @param payload - The batch creation payload
 * @returns Object containing success status and created batch data
 */
export async function createPartnerCouponBatch(payload: CreatePartnerCouponBatchPayload) {
  const session = await getServerSession(authOptions)
  if (!session || !isAdminUser(session.user)) {
    return { success: false, error: "Unauthorized" }
  }

  const validatedFields = CreatePartnerCouponBatchSchema.safeParse(payload)
  if (!validatedFields.success) {
    return {
      success: false,
      error: "Invalid fields",
      details: validatedFields.error.flatten().fieldErrors,
    }
  }

  try {
    await connectDB()

    // Create the batch first
    const newBatch = new PartnerCouponBatch({
      ...validatedFields.data,
      createdBy: session.user.id,
      assignedPartnerId: validatedFields.data.assignedPartnerId || null,
      couponIds: [], // Will be populated after creating coupons
    })

    await newBatch.save()

    // Generate individual coupons
    const coupons = []
    for (let i = 1; i <= validatedFields.data.couponCount; i++) {
      const couponCode = generateCouponCode("", i) // No prefix needed, will generate PC codes

      const coupon = new Coupon({
        code: couponCode,
        description: `${validatedFields.data.name} - קופון ${i}`,
        discountType: validatedFields.data.discountType,
        discountValue: validatedFields.data.discountValue,
        validFrom: validatedFields.data.validFrom,
        validUntil: validatedFields.data.validUntil,
        usageLimit: validatedFields.data.usageLimit,
        usageLimitPerUser: validatedFields.data.usageLimitPerUser,
        timesUsed: 0,
        isActive: validatedFields.data.isActive,
        createdBy: session.user.id,
        assignedPartnerId: validatedFields.data.assignedPartnerId || null,
        notesForPartner: validatedFields.data.notesForPartner,
      })

      coupons.push(coupon)
    }

    // Save all coupons
    const savedCoupons = await Coupon.insertMany(coupons)

    // Update batch with coupon IDs
    newBatch.couponIds = savedCoupons.map(coupon => coupon._id as unknown as Types.ObjectId)
    await newBatch.save()

    revalidatePath("/dashboard/admin/partner-coupon-batches")
    return {
      success: true,
      message: "Partner coupon batch created successfully",
      batch: JSON.parse(JSON.stringify(newBatch)),
      couponsCreated: savedCoupons.length,
    }
  } catch (error: any) {
    logger.error("Error creating partner coupon batch:", error)
    return { success: false, error: error.message || "Failed to create partner coupon batch" }
  }
}

/**
 * Updates an existing partner coupon batch
 * @param payload - The batch update payload
 * @returns Object containing success status and updated batch data
 */
export async function updatePartnerCouponBatch(payload: UpdatePartnerCouponBatchPayload) {
  const session = await getServerSession(authOptions)
  if (!session || !isAdminUser(session.user)) {
    return { success: false, error: "Unauthorized" }
  }

  const validatedFields = UpdatePartnerCouponBatchSchema.safeParse(payload)
  if (!validatedFields.success) {
    return {
      success: false,
      error: "Invalid fields",
      details: validatedFields.error.flatten().fieldErrors,
    }
  }

  try {
    await connectDB()

    const batch = await PartnerCouponBatch.findById(payload.id)
    if (!batch) {
      return { success: false, error: "Batch not found" }
    }

    // Update batch fields
    Object.assign(batch, {
      name: validatedFields.data.name,
      description: validatedFields.data.description,
      assignedPartnerId: validatedFields.data.assignedPartnerId || null,
      discountType: validatedFields.data.discountType,
      discountValue: validatedFields.data.discountValue,
      validFrom: validatedFields.data.validFrom,
      validUntil: validatedFields.data.validUntil,
      usageLimit: validatedFields.data.usageLimit,
      usageLimitPerUser: validatedFields.data.usageLimitPerUser,
      isActive: validatedFields.data.isActive,
      notesForPartner: validatedFields.data.notesForPartner,
    })

    await batch.save()

    // Update all coupons in the batch
    await Coupon.updateMany(
      { _id: { $in: batch.couponIds } },
      {
        $set: {
          discountType: validatedFields.data.discountType,
          discountValue: validatedFields.data.discountValue,
          validFrom: validatedFields.data.validFrom,
          validUntil: validatedFields.data.validUntil,
          usageLimit: validatedFields.data.usageLimit,
          usageLimitPerUser: validatedFields.data.usageLimitPerUser,
          isActive: validatedFields.data.isActive,
          assignedPartnerId: validatedFields.data.assignedPartnerId || null,
          notesForPartner: validatedFields.data.notesForPartner,
        },
      }
    )

    revalidatePath("/dashboard/admin/partner-coupon-batches")
    return {
      success: true,
      message: "Partner coupon batch updated successfully",
      batch: JSON.parse(JSON.stringify(batch)),
    }
  } catch (error: any) {
    logger.error("Error updating partner coupon batch:", error)
    return { success: false, error: error.message || "Failed to update partner coupon batch" }
  }
}

/**
 * Deletes a partner coupon batch and its associated coupons
 * @param batchId - The ID of the batch to delete
 * @returns Object containing success status
 */
export async function deletePartnerCouponBatch(batchId: string) {
  const session = await getServerSession(authOptions)
  if (!session || !isAdminUser(session.user)) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await connectDB()

    const batch = await PartnerCouponBatch.findById(batchId)
    if (!batch) {
      return { success: false, error: "Batch not found" }
    }

    // Delete all coupons in the batch
    await Coupon.deleteMany({ _id: { $in: batch.couponIds } })

    // Delete the batch
    await batch.deleteOne()

    revalidatePath("/dashboard/admin/partner-coupon-batches")
    return { success: true, message: "Partner coupon batch deleted successfully" }
  } catch (error: any) {
    logger.error("Error deleting partner coupon batch:", error)
    return { success: false, error: error.message || "Failed to delete partner coupon batch" }
  }
}

/**
 * Gets all coupons in a batch
 * @param batchId - The ID of the batch
 * @returns GetBatchCouponsResult
 */
export async function getBatchCoupons(batchId: string): Promise<GetBatchCouponsResult> {
  const session = await getServerSession(authOptions)
  if (!session || !isAdminUser(session.user)) {
    throw new Error("Unauthorized: Admin access required.")
  }

  await connectDB()

  const batch = await PartnerCouponBatch.findById(batchId)
    .populate("createdBy", "name email")
    .populate("assignedPartnerId", "name email")
    .lean()

  if (!batch) {
    return { batch: null, coupons: [] }
  }

  const coupons = await Coupon.find({ _id: { $in: batch.couponIds } })
    .sort({ code: 1 })
    .lean()

  const couponsWithEffectiveStatus = coupons.map(coupon => ({
    ...coupon,
    effectiveStatus: calculateCouponEffectiveStatus(coupon as ICoupon),
  }))

  return {
    batch: JSON.parse(JSON.stringify(batch)),
    coupons: JSON.parse(JSON.stringify(couponsWithEffectiveStatus)),
  }
}

/**
 * Updates multiple coupons in a batch
 * @param payload - The update payload containing coupon IDs and fields to update
 * @returns Object containing success status
 */
export async function updateCouponsInBatch(payload: UpdateCouponsInBatchPayload) {
  const session = await getServerSession(authOptions)
  if (!session || !isAdminUser(session.user)) {
    return { success: false, error: "Unauthorized" }
  }

  const validatedFields = UpdateCouponsInBatchSchema.safeParse(payload)
  if (!validatedFields.success) {
    return {
      success: false,
      error: "Invalid fields",
      details: validatedFields.error.flatten().fieldErrors,
    }
  }

  try {
    await connectDB()

    // Update the coupons
    await Coupon.updateMany(
      { _id: { $in: validatedFields.data.couponIds } },
      {
        $set: {
          isActive: validatedFields.data.updates.isActive,
          validFrom: validatedFields.data.updates.validFrom,
          validUntil: validatedFields.data.updates.validUntil,
          usageLimit: validatedFields.data.updates.usageLimit,
          usageLimitPerUser: validatedFields.data.updates.usageLimitPerUser,
        },
      }
    )

    revalidatePath("/dashboard/admin/partner-coupon-batches")
    return { success: true, message: "Coupons updated successfully" }
  } catch (error: any) {
    logger.error("Error updating coupons in batch:", error)
    return { success: false, error: error.message || "Failed to update coupons" }
  }
}

