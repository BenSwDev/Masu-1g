"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import Coupon, { type ICoupon } from "@/lib/db/models/coupon"
import User from "@/lib/db/models/user"
import { connectDB } from "@/lib/db/mongoose"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
// Removed uuidv4 import as it's not used in this version of couponId generation (Mongoose ObjectId is default)

// Schemas for validation (assuming these are defined as in previous correct versions)
const CouponBaseSchema = z
  .object({
    code: z.string().min(3, "Code must be at least 3 characters").trim(),
    description: z.string().optional(),
    discountType: z.enum(["percentage", "fixedAmount"]),
    discountValue: z.number().min(0, "Discount value must be non-negative"),
    validFrom: z.date(),
    validUntil: z.date(),
    usageLimit: z.number().min(0, "Usage limit must be non-negative").default(1),
    usageLimitPerUser: z.number().min(0, "Usage limit per user must be non-negative").default(1),
    isActive: z.boolean().default(true),
    assignedPartnerId: z.string().optional().nullable(),
    notesForPartner: z.string().optional(),
  })
  .refine((data) => data.validUntil >= data.validFrom, {
    message: "Expiration date must be after or same as start date",
    path: ["validUntil"],
  })

const CreateCouponSchema = CouponBaseSchema
const UpdateCouponSchema = CouponBaseSchema.extend({
  id: z.string(),
})

export type CreateCouponPayload = z.infer<typeof CreateCouponSchema>
export type UpdateCouponPayload = z.infer<typeof UpdateCouponSchema>

// Helper functions to check roles
const isAdminUser = (user: { roles?: string[] } | null | undefined): boolean => !!user?.roles?.includes("admin")
const isPartnerUser = (user: { roles?: string[] } | null | undefined): boolean => !!user?.roles?.includes("partner")

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
      createdBy: session.user.id, // Mongoose ObjectId from session user
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
  filters: { code?: string; isActive?: boolean; partnerId?: string } = {},
): Promise<{ coupons: ICoupon[]; totalPages: number; currentPage: number; totalCoupons: number }> {
  const session = await getServerSession(authOptions)
  if (!session || !isAdminUser(session.user)) {
    // Consider throwing an error or returning a structured error response
    // For now, throwing to align with typical data fetching patterns in Server Components
    throw new Error("Unauthorized: Admin access required.")
  }

  await connectDB()
  const query: any = {}
  if (filters.code) query.code = { $regex: filters.code, $options: "i" }
  if (typeof filters.isActive === "boolean") query.isActive = filters.isActive
  if (filters.partnerId) query.assignedPartnerId = filters.partnerId

  const totalCoupons = await Coupon.countDocuments(query)
  const couponsData = await Coupon.find(query)
    .populate("createdBy", "name email")
    .populate("assignedPartnerId", "name email")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()

  return {
    coupons: JSON.parse(JSON.stringify(couponsData)), // Ensure data is serializable
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
    // Ensure 'role' field exists and is correctly named in your User model
    const partners = await User.find({ roles: "partner" }).select("_id name").lean()
    return partners.map((partner) => ({
      value: partner._id.toString(),
      // Fallback for name if it can be missing
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
  filters: { code?: string; isActive?: boolean } = {},
): Promise<{ coupons: ICoupon[]; totalPages: number; currentPage: number; totalCoupons: number }> {
  const session = await getServerSession(authOptions)
  if (!session || !isPartnerUser(session.user) || !session.user.id) {
    throw new Error("Unauthorized: Partner access required.")
  }

  await connectDB()
  const query: any = { assignedPartnerId: session.user.id }
  if (filters.code) query.code = { $regex: filters.code, $options: "i" }
  if (typeof filters.isActive === "boolean") query.isActive = filters.isActive

  const totalCoupons = await Coupon.countDocuments(query)
  const couponsData = await Coupon.find(query)
    .sort({ validUntil: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()

  return {
    coupons: JSON.parse(JSON.stringify(couponsData)),
    totalPages: Math.ceil(totalCoupons / limit),
    currentPage: page,
    totalCoupons,
  }
}
