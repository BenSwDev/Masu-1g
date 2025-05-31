import { z } from "zod"

export const CouponBaseSchema = z
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

export const CreateCouponSchema = CouponBaseSchema

// Re-define UpdateCouponSchema explicitly without using .extend()
export const UpdateCouponSchema = z
  .object({
    // Fields from CouponBaseSchema (copied)
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
    // Additional field for update
    id: z.string().min(1, "Coupon ID is required for update"),
  })
  .refine((data) => data.validUntil >= data.validFrom, {
    // Re-apply refinement if it's relevant to all fields including id (though id doesn't affect this specific refine)
    message: "Expiration date must be after or same as start date",
    path: ["validUntil"],
  })

export type CreateCouponPayload = z.infer<typeof CreateCouponSchema>
export type UpdateCouponPayload = z.infer<typeof UpdateCouponSchema>
