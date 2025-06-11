import { z } from "zod"

export const PartnerCouponBatchBaseSchema = z
  .object({
    name: z.string().min(1, "Name is required").trim(),
    description: z.string().optional(),
    assignedPartnerId: z.string().optional().nullable(),
    couponCount: z.number().min(1, "Must have at least 1 coupon").max(1000, "Cannot exceed 1000 coupons"),
    discountType: z.enum(["percentage", "fixedAmount"]),
    discountValue: z.number().min(0, "Discount value must be non-negative"),
    validFrom: z.date(),
    validUntil: z.date(),
    usageLimit: z.number().min(0, "Usage limit must be non-negative").default(1),
    usageLimitPerUser: z.number().min(0, "Usage limit per user must be non-negative").default(1),
    isActive: z.boolean().default(true),
    codePrefix: z.string().min(2, "Code prefix must be at least 2 characters").max(10, "Code prefix cannot exceed 10 characters").trim(),
    notesForPartner: z.string().optional(),
  })
  .refine((data) => data.validUntil >= data.validFrom, {
    message: "Expiration date must be after or same as start date",
    path: ["validUntil"],
  })

export const CreatePartnerCouponBatchSchema = PartnerCouponBatchBaseSchema

export const UpdatePartnerCouponBatchSchema = z
  .object({
    id: z.string().min(1, "Batch ID is required for update"),
    name: z.string().min(1, "Name is required").trim(),
    description: z.string().optional(),
    assignedPartnerId: z.string().optional().nullable(),
    discountType: z.enum(["percentage", "fixedAmount"]),
    discountValue: z.number().min(0, "Discount value must be non-negative"),
    validFrom: z.date(),
    validUntil: z.date(),
    usageLimit: z.number().min(0, "Usage limit must be non-negative").default(1),
    usageLimitPerUser: z.number().min(0, "Usage limit per user must be non-negative").default(1),
    isActive: z.boolean().default(true),
    notesForPartner: z.string().optional(),
  })
  .refine((data) => data.validUntil >= data.validFrom, {
    message: "Expiration date must be after or same as start date",
    path: ["validUntil"],
  })

export const UpdateCouponsInBatchSchema = z.object({
  batchId: z.string().min(1, "Batch ID is required"),
  couponIds: z.array(z.string()).min(1, "At least one coupon must be selected"),
  updates: z.object({
    isActive: z.boolean().optional(),
    validFrom: z.date().optional(),
    validUntil: z.date().optional(),
    usageLimit: z.number().min(0).optional(),
    usageLimitPerUser: z.number().min(0).optional(),
  }),
})

export type CreatePartnerCouponBatchPayload = z.infer<typeof CreatePartnerCouponBatchSchema>
export type UpdatePartnerCouponBatchPayload = z.infer<typeof UpdatePartnerCouponBatchSchema>
export type UpdateCouponsInBatchPayload = z.infer<typeof UpdateCouponsInBatchSchema> 