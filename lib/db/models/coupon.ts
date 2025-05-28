import mongoose, { type Document, Schema } from "mongoose"

export interface ICoupon extends Document {
  code: string
  description: string
  discountType: "percentage" | "fixed"
  discountValue: number
  startDate: Date
  endDate: Date
  isActive: boolean
  maxUses: number
  currentUses: number
  minPurchaseAmount?: number
  maxDiscountAmount?: number
  applicableServices?: string[] // IDs of services/treatments
  applicableUsers?: string[] // IDs of users
  createdBy: string // User ID
  createdAt: Date
  updatedAt: Date
  usageHistory: {
    userId: string
    usedAt: Date
    orderId?: string
    discountAmount: number
  }[]
}

const CouponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
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
    maxUses: {
      type: Number,
      default: 0, // 0 means unlimited
    },
    currentUses: {
      type: Number,
      default: 0,
    },
    minPurchaseAmount: {
      type: Number,
      min: 0,
    },
    maxDiscountAmount: {
      type: Number,
      min: 0,
    },
    applicableServices: [
      {
        type: Schema.Types.ObjectId,
        ref: "Treatment",
      },
    ],
    applicableUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    usageHistory: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        usedAt: {
          type: Date,
          required: true,
          default: Date.now,
        },
        orderId: {
          type: String,
        },
        discountAmount: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
)

// Virtual for checking if coupon is expired
CouponSchema.virtual("isExpired").get(function (this: ICoupon) {
  return new Date() > this.endDate
})

// Virtual for checking if coupon has reached max uses
CouponSchema.virtual("isMaxedOut").get(function (this: ICoupon) {
  return this.maxUses > 0 && this.currentUses >= this.maxUses
})

// Virtual for checking if coupon is valid
CouponSchema.virtual("isValid").get(function (this: ICoupon) {
  const now = new Date()
  return (
    this.isActive &&
    now >= this.startDate &&
    now <= this.endDate &&
    !(this.maxUses > 0 && this.currentUses >= this.maxUses)
  )
})

// Method to validate if a coupon can be used by a specific user for a specific amount
CouponSchema.methods.validateUse = function (
  userId: string,
  purchaseAmount: number,
): { valid: boolean; message?: string } {
  if (!this.isActive) {
    return { valid: false, message: "coupon_inactive" }
  }

  const now = new Date()
  if (now < this.startDate) {
    return { valid: false, message: "coupon_not_started" }
  }

  if (now > this.endDate) {
    return { valid: false, message: "coupon_expired" }
  }

  if (this.maxUses > 0 && this.currentUses >= this.maxUses) {
    return { valid: false, message: "coupon_max_uses_reached" }
  }

  if (this.minPurchaseAmount && purchaseAmount < this.minPurchaseAmount) {
    return {
      valid: false,
      message: "purchase_amount_below_minimum",
    }
  }

  if (this.applicableUsers && this.applicableUsers.length > 0 && !this.applicableUsers.includes(userId)) {
    return { valid: false, message: "coupon_not_applicable_to_user" }
  }

  // Check if user has already used this coupon
  const userUsageCount = this.usageHistory.filter((usage) => usage.userId.toString() === userId).length

  if (userUsageCount > 0) {
    return { valid: false, message: "coupon_already_used_by_user" }
  }

  return { valid: true }
}

// Method to calculate discount amount
CouponSchema.methods.calculateDiscount = function (purchaseAmount: number): number {
  let discountAmount = 0

  if (this.discountType === "percentage") {
    discountAmount = (purchaseAmount * this.discountValue) / 100
    if (this.maxDiscountAmount && discountAmount > this.maxDiscountAmount) {
      discountAmount = this.maxDiscountAmount
    }
  } else {
    // Fixed discount
    discountAmount = this.discountValue
    if (discountAmount > purchaseAmount) {
      discountAmount = purchaseAmount
    }
  }

  return discountAmount
}

// Method to apply coupon and update usage
CouponSchema.methods.apply = async function (
  userId: string,
  purchaseAmount: number,
  orderId?: string,
): Promise<{ success: boolean; discountAmount?: number; message?: string }> {
  const validation = this.validateUse(userId, purchaseAmount)

  if (!validation.valid) {
    return { success: false, message: validation.message }
  }

  const discountAmount = this.calculateDiscount(purchaseAmount)

  // Update coupon usage
  this.currentUses += 1
  this.usageHistory.push({
    userId,
    usedAt: new Date(),
    orderId,
    discountAmount,
  })

  await this.save()

  return {
    success: true,
    discountAmount,
  }
}

export const Coupon = mongoose.models.Coupon || mongoose.model<ICoupon>("Coupon", CouponSchema)
