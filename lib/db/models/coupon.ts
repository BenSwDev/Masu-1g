import mongoose, { Schema, type Document, type Model } from "mongoose"

export interface ICoupon extends Document {
  code: string
  discountType: "percentage" | "fixed"
  discountValue: number
  validFrom: Date
  validUntil: Date
  isActive: boolean
  usageLimit?: number
  usageCount: number
  createdAt: Date
  updatedAt: Date
}

const CouponSchema: Schema = new Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    discountType: { type: String, enum: ["percentage", "fixed"], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    usageLimit: { type: Number, min: 1 },
    usageCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  },
)

// Index for efficient queries
CouponSchema.index({ code: 1 })
CouponSchema.index({ validUntil: 1 })
CouponSchema.index({ isActive: 1 })

const Coupon: Model<ICoupon> = mongoose.models.Coupon || mongoose.model<ICoupon>("Coupon", CouponSchema)

export default Coupon
