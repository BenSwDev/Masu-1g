import mongoose, { type Document, Schema } from "mongoose"

// Define the interface for the Coupon document
export interface ICoupon extends Document {
  code: string
  description: string
  discountType: "percentage" | "fixed"
  discountValue: number
  minPurchaseAmount: number
  maxDiscountAmount: number
  startDate: Date
  endDate: Date
  isActive: boolean
  usageLimit: number
  usedCount: number
  applicableTreatments: mongoose.Types.ObjectId[]
  createdBy: mongoose.Types.ObjectId
  partnerId?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

// Define the Coupon schema
const CouponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      required: true,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    minPurchaseAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxDiscountAmount: {
      type: Number,
      default: 0, // 0 means no limit
      min: 0,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    usageLimit: {
      type: Number,
      default: 0, // 0 means unlimited
      min: 0,
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    applicableTreatments: [
      {
        type: Schema.Types.ObjectId,
        ref: "Treatment",
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    partnerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
)

// Create indexes for better query performance
CouponSchema.index({ code: 1 }, { unique: true })
CouponSchema.index({ isActive: 1 })
CouponSchema.index({ startDate: 1, endDate: 1 })
CouponSchema.index({ partnerId: 1 })
CouponSchema.index({ applicableTreatments: 1 })
CouponSchema.index({ code: "text", description: "text" })

// Create and export the Coupon model
export const Coupon = mongoose.models.Coupon || mongoose.model<ICoupon>("Coupon", CouponSchema)
