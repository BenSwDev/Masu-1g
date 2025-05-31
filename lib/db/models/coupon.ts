import mongoose, { Schema, type Document, type Model, type Types } from "mongoose"

export interface ICoupon extends Document {
  code: string
  description?: string
  discountType: "percentage" | "fixedAmount"
  discountValue: number
  validFrom: Date
  validUntil: Date
  usageLimit: number // 0 for unlimited
  usageLimitPerUser: number // 0 for unlimited
  timesUsed: number
  isActive: boolean
  createdBy: Types.ObjectId // Admin User ID
  assignedPartnerId?: Types.ObjectId // Partner User ID
  notesForPartner?: string
  createdAt?: Date
  updatedAt?: Date
}

const CouponSchema: Schema<ICoupon> = new Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, index: true },
    description: { type: String, trim: true },
    discountType: { type: String, enum: ["percentage", "fixedAmount"], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    usageLimit: { type: Number, default: 1, min: 0 }, // 0 for unlimited
    usageLimitPerUser: { type: Number, default: 1, min: 0 }, // 0 for unlimited
    timesUsed: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignedPartnerId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    notesForPartner: { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Ensure validUntil is after validFrom
CouponSchema.pre("save", function (next) {
  if (this.validFrom && this.validUntil && this.validFrom > this.validUntil) {
    next(new Error("validUntil must be after validFrom"))
  } else {
    next()
  }
})

// Virtual for checking if coupon is currently valid (active and within date range)
CouponSchema.virtual("isCurrentlyValid").get(function () {
  const now = new Date()
  return this.isActive && this.validFrom <= now && this.validUntil >= now
})

// Virtual for checking if coupon has reached its total usage limit
CouponSchema.virtual("isUsageLimitReached").get(function () {
  return this.usageLimit !== 0 && this.timesUsed >= this.usageLimit
})

const Coupon: Model<ICoupon> = mongoose.models.Coupon || mongoose.model<ICoupon>("Coupon", CouponSchema)

export default Coupon
