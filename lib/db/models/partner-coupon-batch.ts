import mongoose, { Schema, type Document, type Model, type Types } from "mongoose"

export interface IPartnerCouponBatch extends Document {
  name: string
  description?: string
  assignedPartnerId?: Types.ObjectId // Partner User ID
  couponCount: number
  discountType: "percentage" | "fixedAmount"
  discountValue: number
  validFrom: Date
  validUntil: Date
  usageLimit: number // Per coupon
  usageLimitPerUser: number // Per coupon per user
  isActive: boolean
  couponIds: Types.ObjectId[] // Array of generated coupon IDs
  codePrefix: string // Prefix for generated coupon codes
  createdBy: Types.ObjectId // Admin User ID
  notesForPartner?: string
  createdAt?: Date
  updatedAt?: Date
}

const PartnerCouponBatchSchema: Schema<IPartnerCouponBatch> = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    assignedPartnerId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    couponCount: { type: Number, required: true, min: 1 },
    discountType: { type: String, enum: ["percentage", "fixedAmount"], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    usageLimit: { type: Number, default: 1, min: 0 }, // 0 for unlimited
    usageLimitPerUser: { type: Number, default: 1, min: 0 }, // 0 for unlimited
    isActive: { type: Boolean, default: true },
    couponIds: [{ type: Schema.Types.ObjectId, ref: "Coupon" }],
    codePrefix: { type: String, required: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    notesForPartner: { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Ensure validUntil is after validFrom
PartnerCouponBatchSchema.pre("save", function (next) {
  if (this.validFrom && this.validUntil && this.validFrom > this.validUntil) {
    next(new Error("validUntil must be after validFrom"))
  } else {
    next()
  }
})

// Virtual for checking if batch is currently valid (active and within date range)
PartnerCouponBatchSchema.virtual("isCurrentlyValid").get(function () {
  const now = new Date()
  return this.isActive && this.validFrom <= now && this.validUntil >= now
})

const PartnerCouponBatch: Model<IPartnerCouponBatch> = 
  mongoose.models.PartnerCouponBatch || mongoose.model<IPartnerCouponBatch>("PartnerCouponBatch", PartnerCouponBatchSchema)

export default PartnerCouponBatch 
