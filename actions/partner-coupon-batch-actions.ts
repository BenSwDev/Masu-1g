"use server"

import { revalidatePath } from "next/cache"
import PartnerCouponBatch, { type IPartnerCouponBatch } from "@/lib/db/models/partner-coupon-batch"
import Coupon, { type ICoupon } from "@/lib/db/models/coupon"
import User from "@/lib/db/models/user"
import { connectDB } from "@/lib/db/mongoose"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import {
  CreatePartnerCouponBatchSchema,
  UpdatePartnerCouponBatchSchema,
  UpdateCouponsInBatchSchema,
  type CreatePartnerCouponBatchPayload,
  type UpdatePartnerCouponBatchPayload,
  type UpdateCouponsInBatchPayload,
} from "@/lib/validation/partner-coupon-batch-schemas"

// Helper functions to check roles
const isAdminUser = (user: { roles?: string[] } | null | undefined): boolean => !!user?.roles?.includes("admin")

// Function to calculate effective status for batches
function calculateBatchEffectiveStatus(batch: IPartnerCouponBatch): "active" | "expired" | "scheduled" | "inactive_manual" {
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

// Helper function to generate unique coupon codes
function generateCouponCode(prefix: string, index: number): string {
  // Generate PC + 6 random alphanumeric characters
  const randomSuffix = Array.from({ length: 6 }, () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    return chars.charAt(Math.floor(Math.random() * chars.length))
  }).join('')
  return `PC${randomSuffix}`
}

// Admin Actions
export async function createPartnerCouponBatch(payload: CreatePartnerCouponBatchPayload) {
  const session = await getServerSession(authOptions)
  if (!session || !isAdminUser(session.user)) {
    return { success: false, error: "Unauthorized" }
  }

  const validatedFields = CreatePartnerCouponBatchSchema.safeParse(payload)
  if (!validatedFields.success) {
    return { success: false, error: "Invalid fields", details: validatedFields.error.flatten().fieldErrors }
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
    newBatch.couponIds = savedCoupons.map(coupon => coupon._id as any)
    await newBatch.save()

    revalidatePath("/dashboard/admin/partner-coupon-batches")
    return { 
      success: true, 
      message: "Partner coupon batch created successfully", 
      batch: JSON.parse(JSON.stringify(newBatch)),
      couponsCreated: savedCoupons.length
    }
  } catch (_error: any) {
    console.error("Error creating partner coupon batch:", _error)
    return { success: false, error: _error.message || "Failed to create partner coupon batch" }
  }
}

export async function updatePartnerCouponBatch(payload: UpdatePartnerCouponBatchPayload) {
  const session = await getServerSession(authOptions)
  if (!session || !isAdminUser(session.user)) {
    return { success: false, error: "Unauthorized" }
  }

  const validatedFields = UpdatePartnerCouponBatchSchema.safeParse(payload)
  if (!validatedFields.success) {
    return { success: false, error: "Invalid fields", details: validatedFields.error.flatten().fieldErrors }
  }

  const { id, ...updateData } = validatedFields.data

  try {
    await connectDB()
    const updatedBatch = await PartnerCouponBatch.findByIdAndUpdate(
      id,
      {
        ...updateData,
        assignedPartnerId: updateData.assignedPartnerId || null,
      },
      { new: true },
    )

    if (!updatedBatch) {
      return { success: false, error: "Partner coupon batch not found" }
    }

    // Update all related coupons with the new batch settings
    await Coupon.updateMany(
      { _id: { $in: updatedBatch.couponIds } },
      {
        discountType: updateData.discountType,
        discountValue: updateData.discountValue,
        validFrom: updateData.validFrom,
        validUntil: updateData.validUntil,
        usageLimit: updateData.usageLimit,
        usageLimitPerUser: updateData.usageLimitPerUser,
        isActive: updateData.isActive,
        assignedPartnerId: updateData.assignedPartnerId || null,
        notesForPartner: updateData.notesForPartner,
      }
    )

    revalidatePath("/dashboard/admin/partner-coupon-batches")
    return { 
      success: true, 
      message: "Partner coupon batch updated successfully", 
      batch: JSON.parse(JSON.stringify(updatedBatch)) 
    }
  } catch (_error: any) {
    console.error("Error updating partner coupon batch:", _error)
    return { success: false, error: _error.message || "Failed to update partner coupon batch" }
  }
}

export async function deletePartnerCouponBatch(batchId: string) {
  const session = await getServerSession(authOptions)
  if (!session || !isAdminUser(session.user)) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await connectDB()
    const batch = await PartnerCouponBatch.findById(batchId)
    if (!batch) {
      return { success: false, error: "Partner coupon batch not found" }
    }

    // Delete all related coupons
    await Coupon.deleteMany({ _id: { $in: batch.couponIds } })
    
    // Delete the batch
    await PartnerCouponBatch.findByIdAndDelete(batchId)

    revalidatePath("/dashboard/admin/partner-coupon-batches")
    return { success: true, message: "Partner coupon batch deleted successfully" }
  } catch (_error: any) {
    console.error("Error deleting partner coupon batch:", _error)
    return { success: false, error: _error.message || "Failed to delete partner coupon batch" }
  }
}

export async function getPartnerCouponBatches(
  page = 1,
  limit = 10,
  filters: { name?: string; isActive?: boolean; partnerId?: string; effectiveStatus?: string } = {},
): Promise<{
  batches: (IPartnerCouponBatch & { effectiveStatus: string; activeCouponsCount: number })[]
  totalPages: number
  currentPage: number
  totalBatches: number
}> {
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
    allMatchingBatches.map(async (batch) => {
      // Count active coupons in this batch
      const activeCouponsCount = await Coupon.countDocuments({
        _id: { $in: batch.couponIds },
        isActive: true
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
    filteredByEffectiveStatus = batchesWithEffectiveStatus.filter((b) => b.effectiveStatus === filters.effectiveStatus)
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

export async function getBatchCoupons(batchId: string): Promise<{
  batch: IPartnerCouponBatch | null
  coupons: (ICoupon & { effectiveStatus: string })[]
}> {
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

  const couponsWithEffectiveStatus = coupons.map((coupon) => ({
    ...coupon,
    effectiveStatus: calculateCouponEffectiveStatus(coupon as ICoupon),
  }))

  return {
    batch: JSON.parse(JSON.stringify(batch)),
    coupons: JSON.parse(JSON.stringify(couponsWithEffectiveStatus)),
  }
}

export async function updateCouponsInBatch(payload: UpdateCouponsInBatchPayload) {
  const session = await getServerSession(authOptions)
  if (!session || !isAdminUser(session.user)) {
    return { success: false, error: "Unauthorized" }
  }

  const validatedFields = UpdateCouponsInBatchSchema.safeParse(payload)
  if (!validatedFields.success) {
    return { success: false, error: "Invalid fields", details: validatedFields.error.flatten().fieldErrors }
  }

  try {
    await connectDB()
    
    const { batchId, couponIds, updates } = validatedFields.data

    // Verify the batch exists and the coupons belong to it
    const batch = await PartnerCouponBatch.findById(batchId)
    if (!batch) {
      return { success: false, error: "Partner coupon batch not found" }
    }

    const validCouponIds = couponIds.filter(id => 
      batch.couponIds.some(batchCouponId => batchCouponId.toString() === id)
    )

    if (validCouponIds.length === 0) {
      return { success: false, error: "No valid coupons selected" }
    }

    // Update the selected coupons
    await Coupon.updateMany(
      { _id: { $in: validCouponIds } },
      { $set: updates }
    )

    revalidatePath("/dashboard/admin/partner-coupon-batches")
    return { 
      success: true, 
      message: `${validCouponIds.length} coupons updated successfully`,
      updatedCount: validCouponIds.length
    }
  } catch (_error: any) {
    console.error("Error updating coupons in batch:", _error)
    return { success: false, error: _error.message || "Failed to update coupons" }
  }
}

// Helper function for coupon effective status (reused from coupon-actions)
function calculateCouponEffectiveStatus(coupon: ICoupon): "active" | "expired" | "scheduled" | "inactive_manual" {
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