import mongoose, { Schema, type Document, type Model } from "mongoose"

export interface IGiftVoucher extends Document {
  code: string
  voucherType: "treatment" | "monetary"

  // Treatment voucher fields
  treatmentId?: mongoose.Types.ObjectId
  selectedDurationId?: mongoose.Types.ObjectId

  // Monetary voucher fields
  monetaryValue?: number
  remainingAmount?: number

  // Common fields
  purchaserUserId: mongoose.Types.ObjectId
  ownerUserId: mongoose.Types.ObjectId

  // Gift fields
  isGift: boolean
  recipientName?: string
  recipientPhone?: string
  greetingMessage?: string
  sendDate?: Date

  // Status and validity
  status:
    | "pending_payment"
    | "active"
    | "partially_used"
    | "fully_used"
    | "expired"
    | "pending_send"
    | "sent"
    | "cancelled"
  purchaseDate: Date
  validFrom: Date
  validUntil: Date
  isActive: boolean

  // Payment and usage
  paymentId?: string
  usageHistory?: Array<{
    date: Date
    amountUsed: number
    orderId?: mongoose.Types.ObjectId
  }>

  createdAt: Date
  updatedAt: Date
}

const GiftVoucherSchema: Schema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    voucherType: {
      type: String,
      enum: ["treatment", "monetary"],
      required: true,
    },

    // Treatment voucher fields
    treatmentId: {
      type: Schema.Types.ObjectId,
      ref: "Treatment",
      sparse: true,
      required: function () {
        return this.voucherType === "treatment"
      },
    },
    selectedDurationId: {
      type: Schema.Types.ObjectId,
      sparse: true,
    },

    // Monetary voucher fields
    monetaryValue: {
      type: Number,
      min: 0,
      required: function () {
        return this.voucherType === "monetary"
      },
    },
    remainingAmount: {
      type: Number,
      min: 0,
      required: function () {
        return this.voucherType === "monetary"
      },
    },

    // Common fields
    purchaserUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    ownerUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Gift fields
    isGift: {
      type: Boolean,
      default: false,
    },
    recipientName: {
      type: String,
    },
    recipientPhone: {
      type: String,
    },
    greetingMessage: {
      type: String,
    },
    sendDate: {
      type: Date,
    },

    // Status and validity
    status: {
      type: String,
      enum: [
        "pending_payment",
        "active",
        "partially_used",
        "fully_used",
        "expired",
        "pending_send",
        "sent",
        "cancelled",
      ],
      default: "pending_payment",
      index: true,
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    validFrom: {
      type: Date,
      required: true,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    // Payment and usage
    paymentId: {
      type: String,
      sparse: true,
    },
    usageHistory: [
      {
        date: {
          type: Date,
          required: true,
        },
        amountUsed: {
          type: Number,
          required: true,
        },
        orderId: {
          type: Schema.Types.ObjectId,
          ref: "Order",
        },
      },
    ],
  },
  {
    timestamps: true,
  },
)

// Indexes for performance
GiftVoucherSchema.index({ status: 1, validUntil: 1 })
GiftVoucherSchema.index({ purchaserUserId: 1, status: 1 })
GiftVoucherSchema.index({ ownerUserId: 1, status: 1 })
GiftVoucherSchema.index({ sendDate: 1, status: 1 })

// Virtual for checking if voucher is valid
GiftVoucherSchema.virtual("isValid").get(function () {
  const now = new Date()
  return this.isActive && this.status === "active" && now >= this.validFrom && now <= this.validUntil
})

// Method to check if monetary voucher has sufficient balance
GiftVoucherSchema.methods.hasSufficientBalance = function (amount: number): boolean {
  if (this.voucherType !== "monetary") return false
  return this.remainingAmount >= amount
}

// Pre-save hook to generate code if not provided
GiftVoucherSchema.pre("save", async function (next) {
  if (!this.code) {
    // Generate unique code
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    this.code = `GV-${timestamp}-${random}`
  }

  // Set remainingAmount for new monetary vouchers
  if (this.isNew && this.voucherType === "monetary" && !this.remainingAmount) {
    this.remainingAmount = this.monetaryValue
  }

  next()
})

const GiftVoucher: Model<IGiftVoucher> =
  mongoose.models.GiftVoucher || mongoose.model<IGiftVoucher>("GiftVoucher", GiftVoucherSchema)

export default GiftVoucher
