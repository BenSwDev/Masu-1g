"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import Coupon, { type ICoupon } from "@/lib/db/models/coupon"
import User from "@/lib/db/models/user" // Assuming User model exists
import { connectDB } from "@/lib/db/mongoose" // Ensure this path is correct
import { getSession } from "@/lib/auth/auth" // Assuming getSession utility

// Schemas for validation
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
    assignedPartnerId: z.string().optional().nullable(), // ObjectId as string
    notesForPartner: z.string().optional(),
  })
  .refine((data) => data.validUntil >= data.validFrom, {
    message: "Expiration date must be after or same as start date",
    path: ["validUntil"],
  })

const CreateCouponSchema = CouponBaseSchema
const UpdateCouponSchema = CouponBaseSchema.extend({
  id: z.string(), // Coupon ID for update
})

export type CreateCouponPayload = z.infer<typeof CreateCouponSchema>
export type UpdateCouponPayload = z.infer<typeof UpdateCouponSchema>

// Helper to check admin role (implement according to your auth setup)
async function isAdminSession(session: any): Promise<boolean> {
  // Replace with your actual role check logic
  return session?.user?.role === "admin"
}

async function isPartnerSession(session: any): Promise<boolean> {
  // Replace with your actual role check logic
  return session?.user?.role === "partner"
}

// Admin Actions
export async function createCoupon(payload: CreateCouponPayload) {
  const session = await getSession()
  if (!session || !(await isAdminSession(session))) {
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
      // Duplicate key error for 'code'
      return { success: false, error: "Coupon code already exists." }
    }
    return { success: false, error: error.message || "Failed to create coupon" }
  }
}

export async function updateCoupon(payload: UpdateCouponPayload) {
  const session = await getSession()
  if (!session || !(await isAdminSession(session))) {
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
    revalidatePath(`/dashboard/partner/assigned-coupons`) // If partner is viewing
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
  const session = await getSession()
  if (!session || !(await isAdminSession(session))) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await connectDB()
    const deletedCoupon = await Coupon.findByIdAndDelete(couponId)
    if (!deletedCoupon) {
      return { success: false, error: "Coupon not found" }
    }
    // Consider deleting related CouponUsage records if necessary, or handle via schema middleware
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
  const session = await getSession()
  if (!session || !(await isAdminSession(session))) {
    throw new Error("Unauthorized")
  }

  await connectDB()
  const query: any = {}
  if (filters.code) query.code = { $regex: filters.code, $options: "i" }
  if (typeof filters.isActive === "boolean") query.isActive = filters.isActive
  if (filters.partnerId) query.assignedPartnerId = filters.partnerId

  const totalCoupons = await Coupon.countDocuments(query)
  const coupons = await Coupon.find(query)
    .populate("createdBy", "name email") // Populate admin who created
    .populate("assignedPartnerId", "name email") // Populate assigned partner
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean() // Use lean for performance if not modifying

  return {
    coupons: JSON.parse(JSON.stringify(coupons)),
    totalPages: Math.ceil(totalCoupons / limit),
    currentPage: page,
    totalCoupons,
  }
}

// Function to get partners for selection in admin form
// This is a simplified version. You'd typically fetch users with 'partner' role.
export async function getPartnersForSelection(): Promise<{ value: string; label: string }[]> {
  const session = await getSession()
  if (!session || !(await isAdminSession(session))) {
    return [] // Or throw error
  }
  try {
    await connectDB()
    const partners = await User.find({ role: "partner" }).select("_id name").lean()
    return partners.map((partner) => ({
      value: partner._id.toString(),
      label: partner.name || "Unnamed Partner",
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
  const session = await getSession()
  if (!session || !(await isPartnerSession(session))) {
    throw new Error("Unauthorized")
  }

  await connectDB()
  const query: any = { assignedPartnerId: session.user.id }
  if (filters.code) query.code = { $regex: filters.code, $options: "i" }
  if (typeof filters.isActive === "boolean") query.isActive = filters.isActive

  const totalCoupons = await Coupon.countDocuments(query)
  const coupons = await Coupon.find(query)
    .sort({ validUntil: 1 }) // Sort by soonest expiring
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()

  return {
    coupons: JSON.parse(JSON.stringify(coupons)),
    totalPages: Math.ceil(totalCoupons / limit),
    currentPage: page,
    totalCoupons,
  }
}
