import mongoose, { Schema, type Document, type Model, type Types } from "mongoose"

export interface ICouponUsage extends Document {
  _id: mongoose.Types.ObjectId
  couponId: Types.ObjectId
  userId: Types.ObjectId
  orderId: Types.ObjectId // Will be used when 'regular orders' are implemented
  usageDate: Date
}

const CouponUsageSchema: Schema<ICouponUsage> = new Schema(
  {
    couponId: { type: Schema.Types.ObjectId, ref: "Coupon", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    orderId: { type: Schema.Types.ObjectId, required: true, index: true }, // For now, this will be a placeholder
    usageDate: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: "usageDate", updatedAt: false },
  },
)

CouponUsageSchema.index({ couponId: 1, userId: 1 })

const CouponUsage: Model<ICouponUsage> =
  mongoose.models.CouponUsage || mongoose.model<ICouponUsage>("CouponUsage", CouponUsageSchema)

export default CouponUsage
