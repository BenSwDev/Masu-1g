import mongoose, { Schema, type Document, type Model } from "mongoose"

// Interface for GiftVoucherPlain to be used across client and server
// We'll define it more robustly in actions or a dedicated types file later if needed
// For now, this matches the existing structure.
export interface GiftVoucherPlain {
  _id: string
  code: string
  voucherType: "treatment" | "monetary"
  treatmentId?: string
  treatmentName?: string // For display purposes
  selectedDurationId?: string
  selectedDurationName?: string // For display purposes
  monetaryValue?: number
  originalAmount?: number // For monetary vouchers, initial value
  remainingAmount?: number // For monetary vouchers, current value
  purchaserUserId: string
  purchaserName?: string // For display
  ownerUserId: string
  ownerName?: string // For display
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
  usageHistory?: { date: Date; amountUsed: number; orderId?: string }[]
  isActive: boolean // Kept for direct admin control, though status is primary
  createdAt?: Date
  updatedAt?: Date
}

export interface IGiftVoucher extends Document {
  code: string
  voucherType: "treatment" | "monetary"
  treatmentId?: mongoose.Types.ObjectId
  selectedDurationId?: mongoose.Types.ObjectId
  monetaryValue?: number // If monetary, this is the value. If treatment, could store the price at time of purchase.
  originalAmount?: number // For monetary vouchers
  remainingAmount?: number // For monetary vouchers
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
  usageHistory: { date: Date; amountUsed: number; orderId?: mongoose.Types.ObjectId }[]
  isActive: boolean // Admin override or general flag
  createdAt: Date
  updatedAt: Date
}

const GiftVoucherSchema: Schema = new Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    voucherType: { type: String, enum: ["treatment", "monetary"], required: true },
    treatmentId: { type: Schema.Types.ObjectId, ref: "Treatment", sparse: true },
    selectedDurationId: { type: Schema.Types.ObjectId, sparse: true }, // Assuming you have a Duration model or similar
    monetaryValue: { type: Number, min: 0 },
    originalAmount: { type: Number, min: 0 }, // For monetary type
    remainingAmount: { type: Number, min: 0 }, // For monetary type
    purchaserUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    isGift: { type: Boolean, default: false },
    recipientName: { type: String },
    recipientPhone: { type: String }, // Consider validation for phone format
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
      },
    ],
    isActive: { type: Boolean, default: true }, // Can be used by admin to manually deactivate
  },
  {
    timestamps: true,
  },
)

// Ensure voucher code is unique
GiftVoucherSchema.index({ code: 1 }, { unique: true })

// Index for querying by owner and status
GiftVoucherSchema.index({ ownerUserId: 1, status: 1, validUntil: 1 })

// Index for querying by purchaser
GiftVoucherSchema.index({ purchaserUserId: 1 })

// Index for scheduled sending
GiftVoucherSchema.index({ status: 1, sendDate: 1, isGift: 1 })

// Helper to determine if a voucher is expired based on validUntil and status
GiftVoucherSchema.virtual("isExpired").get(function (this: IGiftVoucher) {
  return new Date() > this.validUntil && this.status !== "fully_used" && this.status !== "cancelled"
})

// Pre-save hook to update status to 'expired' if applicable
GiftVoucherSchema.pre<IGiftVoucher>("save", function (next) {
  if (this.isExpired && this.status !== "expired" && this.status !== "fully_used" && this.status !== "cancelled") {
    this.status = "expired"
  }
  if (
    this.voucherType === "monetary" &&
    typeof this.originalAmount === "number" &&
    typeof this.remainingAmount === "undefined"
  ) {
    this.remainingAmount = this.originalAmount
  }
  next()
})

const GiftVoucher: Model<IGiftVoucher> =
  mongoose.models.GiftVoucher || mongoose.model<IGiftVoucher>("GiftVoucher", GiftVoucherSchema)

export default GiftVoucher
