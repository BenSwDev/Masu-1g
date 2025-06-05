import mongoose, { Schema, type Document, type Model } from "mongoose"

// Interface for GiftVoucherPlain to be used across client and server
// This is the structure of the data when it's fetched and processed for client-side display or API responses.
export interface GiftVoucherPlain {
  _id: string
  code: string
  voucherType: "treatment" | "monetary"
  amount: number // The primary value of the voucher
  treatmentId?: string
  treatmentName?: string // For display purposes
  selectedDurationId?: string
  selectedDurationName?: string // For display purposes
  monetaryValue?: number // Can be same as amount, or specific if schema differentiates
  originalAmount?: number // For monetary vouchers, initial value (often same as amount)
  remainingAmount?: number // For monetary vouchers, current value
  purchaserUserId: string
  purchaserName?: string // For display
  ownerUserId: string
  ownerName?: string // For display
  isGift: boolean
  recipientName?: string
  recipientPhone?: string
  greetingMessage?: string
  sendDate?: Date | string // Allow string for form input
  status:
    | "pending_payment"
    | "active"
    | "partially_used"
    | "fully_used"
    | "expired"
    | "pending_send"
    | "sent"
    | "cancelled"
  purchaseDate: Date | string
  validFrom: Date | string
  validUntil: Date | string
  paymentId?: string
  usageHistory?: { date: Date | string; amountUsed: number; orderId?: string; description?: string }[]
  isActive: boolean
  createdAt?: Date | string
  updatedAt?: Date | string
}

// This is the Mongoose Document interface, representing the data structure in MongoDB.
export interface IGiftVoucher extends Document {
  code: string
  voucherType: "treatment" | "monetary"
  amount: number // The primary value of the voucher, required.
  treatmentId?: mongoose.Types.ObjectId
  selectedDurationId?: mongoose.Types.ObjectId
  monetaryValue?: number // If monetary, this is the value. If treatment, could store the price at time of purchase.
  originalAmount?: number // For monetary vouchers, often same as 'amount' initially.
  remainingAmount?: number // For monetary vouchers, tracks current balance.
  purchaserUserId: mongoose.Types.ObjectId
  ownerUserId: mongoose.Types.ObjectId
  isGift: boolean
  recipientName?: string
  recipientPhone?: string
  greetingMessage?: string
  sendDate?: Date
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
  paymentId?: string
  usageHistory: { date: Date; amountUsed: number; orderId?: mongoose.Types.ObjectId; description?: string }[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const GiftVoucherSchema: Schema<IGiftVoucher> = new Schema(
  {
    code: { type: String, required: true, unique: true, trim: true }, // unique: true also creates an index
    voucherType: { type: String, enum: ["treatment", "monetary"], required: true },
    amount: { type: Number, required: true, min: 0 }, // *** This field is required ***
    treatmentId: { type: Schema.Types.ObjectId, ref: "Treatment", sparse: true },
    selectedDurationId: { type: Schema.Types.ObjectId, sparse: true }, // Assuming you have a Duration concept
    monetaryValue: { type: Number, min: 0 }, // Value for monetary type, or price of treatment at purchase
    originalAmount: { type: Number, min: 0 }, // Initial value, especially for monetary type
    remainingAmount: { type: Number, min: 0 }, // Current balance for monetary type
    purchaserUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    isGift: { type: Boolean, default: false },
    recipientName: { type: String },
    recipientPhone: { type: String },
    greetingMessage: { type: String, maxLength: 500 },
    sendDate: { type: Date },
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
    purchaseDate: { type: Date, default: Date.now },
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    paymentId: { type: String, sparse: true },
    usageHistory: [
      {
        date: { type: Date, required: true },
        amountUsed: { type: Number, required: true },
        orderId: { type: Schema.Types.ObjectId, ref: "Order" }, // Assuming an Order model
        description: { type: String },
      },
    ],
    isActive: { type: Boolean, default: true }, // Admin override or general flag
  },
  {
    timestamps: true,
  },
)

// Indexes (unique index on 'code' is handled by 'unique: true' in schema definition)
GiftVoucherSchema.index({ ownerUserId: 1, status: 1, validUntil: 1 })
// GiftVoucherSchema.index({ purchaserUserId: 1 }); // Already indexed via purchaserUserId field with index:true
GiftVoucherSchema.index({ status: 1, sendDate: 1, isGift: 1 })

GiftVoucherSchema.virtual("isExpired").get(function (this: IGiftVoucher) {
  return new Date() > this.validUntil && this.status !== "fully_used" && this.status !== "cancelled"
})

GiftVoucherSchema.pre<IGiftVoucher>("save", function (next) {
  // Ensure 'amount' is positive if not already handled by min:0
  if (this.amount < 0) {
    // Or handle as a validation error
    this.amount = 0
  }

  // If monetaryValue, originalAmount, or remainingAmount are not set,
  // and 'amount' is present, consider defaulting them from 'amount'.
  if (this.voucherType === "monetary") {
    if (typeof this.originalAmount !== "number") {
      this.originalAmount = this.amount
    }
    if (typeof this.remainingAmount !== "number") {
      this.remainingAmount = this.amount // Or originalAmount if that's set
    }
    if (typeof this.monetaryValue !== "number") {
      this.monetaryValue = this.amount
    }
  } else if (this.voucherType === "treatment") {
    // For treatment vouchers, monetaryValue and originalAmount might represent the treatment's value at purchase.
    // remainingAmount might be less relevant or represent "1 use".
    if (typeof this.monetaryValue !== "number") {
      this.monetaryValue = this.amount
    }
    if (typeof this.originalAmount !== "number") {
      this.originalAmount = this.amount
    }
    // For treatment, remainingAmount could be set to amount if it represents 1 use, or 0 if it's single-use and this is post-use.
    // Initial creation logic in actions should handle this.
  }

  if (this.isExpired && this.status !== "expired" && this.status !== "fully_used" && this.status !== "cancelled") {
    this.status = "expired"
  }
  next()
})

const GiftVoucher: Model<IGiftVoucher> =
  mongoose.models.GiftVoucher || mongoose.model<IGiftVoucher>("GiftVoucher", GiftVoucherSchema)

export default GiftVoucher
