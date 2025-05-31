"use server"

import { revalidatePath } from "next/cache"
import Coupon, { type ICoupon } from "@/lib/db/models/coupon"
import User from "@/lib/db/models/user"
import { connectDB } from "@/lib/db/mongoose"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import {
  CreateCouponSchema,
  UpdateCouponSchema,
  type CreateCouponPayload,
  type UpdateCouponPayload,
} from "@/lib/validation/coupon-schemas"

// Helper functions to check roles
const isAdminUser = (user: { roles?: string[] } | null | undefined): boolean => !!user?.roles?.includes("admin")
const isPartnerUser = (user: { roles?: string[] } | null | undefined): boolean => !!user?.roles?.includes("partner")

// Function to calculate effective status
function calculateEffectiveStatus(coupon: ICoupon): "active" | "expired" | "scheduled" | "inactive_manual" {
  const now = new Date()
  const validFrom = new Date(coupon.validFrom)
  const validUntil = new Date(coupon.validUntil)

  if (!coupon.isActive) {
    return "inactive_manual" // Manually set to inactive
  }
  if (validFrom > now) {
    return "scheduled" // Not yet started
  }
  // To make validUntil inclusive for the whole day, we compare 'now' with the start of the next day.
  const endOfValidUntilDay = new Date(validUntil)
  endOfValidUntilDay.setDate(endOfValidUntilDay.getDate() + 1)
  // Or, for more precision to include the entire day:
  // const endOfValidUntilDay = new Date(validUntil.getFullYear(), validUntil.getMonth(), validUntil.getDate(), 23, 59, 59, 999);

  if (endOfValidUntilDay <= now) {
    return "expired" // Ended
  }
  // At this point, it's active and within the date range
  return "active"
}

// Admin Actions
export async function createCoupon(payload: CreateCouponPayload) {
  const session = await getServerSession(authOptions)
  if (!session || !isAdminUser(session.user)) {
    return { success: false, error: "Unauthorized" }
  }

  const validatedFields = CreateCouponSchema.safeParse(payload)
  if (!validatedFields.success) {
    return { success: false, error: "Invalid fields", details: validatedFields.error.flatten().fieldErrors }
  }

  try {
    await connectDB()
    const newCoupon = new Coupon({
      ...validatedFields.data,
      createdBy: session.user.id,
      assignedPartnerId: validatedFields.data.assignedPartnerId || null,
    })
    await newCoupon.save()
    revalidatePath("/dashboard/admin/coupons")
    return { success: true, message: "Coupon created successfully", coupon: JSON.parse(JSON.stringify(newCoupon)) }
  } catch (error: any) {
    console.error("Error creating coupon:", error)
    if (error.code === 11000) {
      return { success: false, error: "Coupon code already exists." }
    }
    return { success: false, error: error.message || "Failed to create coupon" }
  }
}

export async function updateCoupon(payload: UpdateCouponPayload) {
  const session = await getServerSession(authOptions)
  if (!session || !isAdminUser(session.user)) {
    return { success: false, error: "Unauthorized" }
  }

  const validatedFields = UpdateCouponSchema.safeParse(payload)
  if (!validatedFields.success) {
    return { success: false, error: "Invalid fields", details: validatedFields.error.flatten().fieldErrors }
  }

  const { id, ...updateData } = validatedFields.data

  try {
    await connectDB()
    const updatedCoupon = await Coupon.findByIdAndUpdate(
      id,
      {
        ...updateData,
        assignedPartnerId: updateData.assignedPartnerId || null,
      },
      { new: true },
    )

    if (!updatedCoupon) {
      return { success: false, error: "Coupon not found" }
    }
    revalidatePath("/dashboard/admin/coupons")
    revalidatePath(`/dashboard/partner/assigned-coupons`)
    return { success: true, message: "Coupon updated successfully", coupon: JSON.parse(JSON.stringify(updatedCoupon)) }
  } catch (error: any) {
    console.error("Error updating coupon:", error)
    if (error.code === 11000) {
      return { success: false, error: "Coupon code already exists (if changed)." }
    }
    return { success: false, error: error.message || "Failed to update coupon" }
  }
}

export async function deleteCoupon(couponId: string) {
  const session = await getServerSession(authOptions)
  if (!session || !isAdminUser(session.user)) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await connectDB()
    const deletedCoupon = await Coupon.findByIdAndDelete(couponId)
    if (!deletedCoupon) {
      return { success: false, error: "Coupon not found" }
    }
    revalidatePath("/dashboard/admin/coupons")
    revalidatePath(`/dashboard/partner/assigned-coupons`)
    return { success: true, message: "Coupon deleted successfully" }
  } catch (error: any) {
    console.error("Error deleting coupon:", error)
    return { success: false, error: error.message || "Failed to delete coupon" }
  }
}

export async function getAdminCoupons(
  page = 1,
  limit = 10,
  filters: { code?: string; isActive?: boolean; partnerId?: string; effectiveStatus?: string } = {},
): Promise<{
  coupons: (ICoupon & { effectiveStatus: string })[]
  totalPages: number
  currentPage: number
  totalCoupons: number
}> {
  const session = await getServerSession(authOptions)
  if (!session || !isAdminUser(session.user)) {
    throw new Error("Unauthorized: Admin access required.")
  }

  await connectDB()
  const query: any = {}
  if (filters.code) query.code = { $regex: filters.code, $options: "i" }
  // isActive filter might need to be adjusted if we primarily use effectiveStatus
  if (typeof filters.isActive === "boolean") query.isActive = filters.isActive
  if (filters.partnerId) query.assignedPartnerId = filters.partnerId

  // We fetch all coupons matching basic filters first, then filter by effectiveStatus in code if provided
  // This is because effectiveStatus is a derived field.
  // For more complex filtering by effectiveStatus, a more advanced query or aggregation might be needed.

  const allMatchingCoupons = await Coupon.find(query)
    .populate("createdBy", "name email")
    .populate("assignedPartnerId", "name email")
    .sort({ createdAt: -1 })
    .lean()

  const couponsWithEffectiveStatus = allMatchingCoupons.map((coupon) => ({
    ...coupon,
    effectiveStatus: calculateEffectiveStatus(coupon as ICoupon), // Cast needed as .lean() returns plain objects
  }))

  let filteredByEffectiveStatus = couponsWithEffectiveStatus
  if (filters.effectiveStatus) {
    filteredByEffectiveStatus = couponsWithEffectiveStatus.filter((c) => c.effectiveStatus === filters.effectiveStatus)
  }

  const totalCoupons = filteredByEffectiveStatus.length
  const paginatedCoupons = filteredByEffectiveStatus.slice((page - 1) * limit, page * limit)

  return {
    coupons: JSON.parse(JSON.stringify(paginatedCoupons)),
    totalPages: Math.ceil(totalCoupons / limit),
    currentPage: page,
    totalCoupons,
  }
}

export async function getPartnersForSelection(): Promise<{ value: string; label: string }[]> {
  const session = await getServerSession(authOptions)
  if (!session || !isAdminUser(session.user)) {
    return []
  }
  try {
    await connectDB()
    const partners = await User.find({ roles: "partner" }).select("_id name").lean()
    return partners.map((partner) => ({
      value: partner._id.toString(),
      label: (partner as any).name || `Partner ID: ${partner._id.toString()}`,
    }))
  } catch (error) {
    console.error("Error fetching partners for selection:", error)
    return []
  }
}

// Partner Actions
export async function getAssignedPartnerCoupons(
  page = 1,
  limit = 10,
  filters: { code?: string; isActive?: boolean } = {}, // isActive filter might be less relevant now
): Promise<{
  coupons: (ICoupon & { effectiveStatus: string })[]
  totalPages: number
  currentPage: number
  totalCoupons: number
}> {
  const session = await getServerSession(authOptions)
  if (!session || !isPartnerUser(session.user) || !session.user.id) {
    throw new Error("Unauthorized: Partner access required.")
  }

  await connectDB()
  const query: any = { assignedPartnerId: session.user.id }
  if (filters.code) query.code = { $regex: filters.code, $options: "i" }
  if (typeof filters.isActive === "boolean") query.isActive = filters.isActive

  const couponsData = await Coupon.find(query).sort({ validUntil: 1 }).lean()

  const couponsWithEffectiveStatus = couponsData.map((coupon) => ({
    ...coupon,
    effectiveStatus: calculateEffectiveStatus(coupon as ICoupon),
  }))

  // Apply pagination after calculating effective status
  const totalCoupons = couponsWithEffectiveStatus.length
  const paginatedCoupons = couponsWithEffectiveStatus.slice((page - 1) * limit, page * limit)

  return {
    coupons: JSON.parse(JSON.stringify(paginatedCoupons)),
    totalPages: Math.ceil(totalCoupons / limit),
    currentPage: page,
    totalCoupons,
  }
}
