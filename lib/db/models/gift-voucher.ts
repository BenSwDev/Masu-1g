import mongoose, { type Document, Schema } from "mongoose"

export interface IGiftVoucher extends Document {
  code: string
  amount: number
  currency: string
  isActive: boolean
  expiryDate: Date
  purchasedBy: string // User ID
  purchasedAt: Date
  recipientEmail?: string
  recipientName?: string
  recipientPhone?: string
  message?: string
  isRedeemed: boolean
  redeemedBy?: string // User ID
  redeemedAt?: Date
  transactionId?: string
  createdAt: Date
  updatedAt: Date
}

const GiftVoucherSchema = new Schema<IGiftVoucher>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: "ILS",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    purchasedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    purchasedAt: {
      type: Date,
      default: Date.now,
    },
    recipientEmail: {
      type: String,
      trim: true,
    },
    recipientName: {
      type: String,
      trim: true,
    },
    recipientPhone: {
      type: String,
      trim: true,
    },
    message: {
      type: String,
    },
    isRedeemed: {
      type: Boolean,
      default: false,
    },
    redeemedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    redeemedAt: {
      type: Date,
    },
    transactionId: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
)

// Virtual for checking if voucher is expired
GiftVoucherSchema.virtual("isExpired").get(function (this: IGiftVoucher) {
  return new Date() > this.expiryDate
})

// Virtual for checking if voucher is valid
GiftVoucherSchema.virtual("isValid").get(function (this: IGiftVoucher) {
  const now = new Date()
  return this.isActive && !this.isRedeemed && now <= this.expiryDate
})

// Method to validate if a voucher can be redeemed
GiftVoucherSchema.methods.validateRedemption = function (): {
  valid: boolean
  message?: string
} {
  if (!this.isActive) {
    return { valid: false, message: "voucher_inactive" }
  }

  if (this.isRedeemed) {
    return { valid: false, message: "voucher_already_redeemed" }
  }

  const now = new Date()
  if (now > this.expiryDate) {
    return { valid: false, message: "voucher_expired" }
  }

  return { valid: true }
}

// Method to redeem voucher
GiftVoucherSchema.methods.redeem = async function (
  userId: string,
  transactionId?: string,
): Promise<{ success: boolean; message?: string }> {
  const validation = this.validateRedemption()

  if (!validation.valid) {
    return { success: false, message: validation.message }
  }

  this.isRedeemed = true
  this.redeemedBy = userId
  this.redeemedAt = new Date()

  if (transactionId) {
    this.transactionId = transactionId
  }

  await this.save()

  return { success: true }
}

// Generate a unique voucher code
GiftVoucherSchema.statics.generateUniqueCode = async function (): Promise<string> {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const codeLength = 8
  let isUnique = false
  let code = ""

  while (!isUnique) {
    code = ""
    for (let i = 0; i < codeLength; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length)
      code += characters.charAt(randomIndex)
    }

    // Add hyphens for readability
    code = `${code.slice(0, 4)}-${code.slice(4)}`

    // Check if code already exists
    const existingVoucher = await this.findOne({ code })
    if (!existingVoucher) {
      isUnique = true
    }
  }

  return code
}

export const GiftVoucher = mongoose.models.GiftVoucher || mongoose.model<IGiftVoucher>("GiftVoucher", GiftVoucherSchema)
