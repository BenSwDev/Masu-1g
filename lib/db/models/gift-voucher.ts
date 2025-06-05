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
  usageHistory?: { date: Date | string; amountUsed: number; orderId?: string; description?: string; userId?: string }[]
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
  usageHistory: {
    date: Date
    amountUsed: number
    orderId?: mongoose.Types.ObjectId
    description?: string
    userId?: mongoose.Types.ObjectId // Added userId to usage history
  }[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  isExpired: boolean // Virtual property
}

const GiftVoucherSchema: Schema<IGiftVoucher> = new Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    voucherType: { type: String, enum: ["treatment", "monetary"], required: true },
    amount: { type: Number, required: true, min: 0 },
    treatmentId: { type: Schema.Types.ObjectId, ref: "Treatment", sparse: true },
    selectedDurationId: { type: Schema.Types.ObjectId, sparse: true },
    monetaryValue: { type: Number, min: 0 },
    originalAmount: { type: Number, min: 0 },
    remainingAmount: { type: Number, min: 0 },
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
        amountUsed: { type: Number, required: true, min: 0 },
        orderId: { type: Schema.Types.ObjectId, ref: "Order" },
        description: { type: String },
        userId: { type: Schema.Types.ObjectId, ref: "User" }, // Added userId to usage history schema
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true }, // Ensure virtuals are included in toJSON
    toObject: { virtuals: true }, // Ensure virtuals are included in toObject
  },
)

GiftVoucherSchema.index({ ownerUserId: 1, status: 1, validUntil: 1 })
GiftVoucherSchema.index({ status: 1, sendDate: 1, isGift: 1 })

GiftVoucherSchema.virtual("isExpired").get(function (this: IGiftVoucher) {
  return new Date() > this.validUntil && !["fully_used", "cancelled", "expired"].includes(this.status)
})

GiftVoucherSchema.pre<IGiftVoucher>("save", function (next) {
  // Defensive: If 'amount' is missing or not a number during an update, try to restore it from 'originalAmount'.
  // 'originalAmount' should be the immutable face value set at creation.
  if (!this.isNew && typeof this.amount !== "number" && typeof this.originalAmount === "number") {
    this.amount = this.originalAmount
  }

  // On creation, ensure 'amount' is valid and initialize other monetary fields from it.
  if (this.isNew) {
    if (typeof this.amount !== "number" || this.amount < 0) {
      // This should ideally be caught by schema 'required' and 'min' validators.
      // If it reaches here, it's a pre-validation issue.
      return next(new Error("GiftVoucher 'amount' is invalid or missing at creation."))
    }

    if (typeof this.originalAmount !== "number") {
      this.originalAmount = this.amount
    }
    // For monetary vouchers, remainingAmount should also be initialized from amount.
    if (this.voucherType === "monetary" && typeof this.remainingAmount !== "number") {
      this.remainingAmount = this.amount
    }
    // monetaryValue might be the price of treatment or same as amount.
    if (typeof this.monetaryValue !== "number") {
      this.monetaryValue = this.amount
    }
  } else {
    // On update
    // Ensure 'originalAmount' is also preserved or restored from 'amount' if it got lost (and amount is valid).
    // This is less likely to be needed if 'amount' is restored first, but good for robustness.
    if (typeof this.originalAmount !== "number" && typeof this.amount === "number" && this.amount >= 0) {
      this.originalAmount = this.amount
    }
  }

  // Ensure critical monetary fields are not negative.
  // These checks run after potential restoration/initialization.
  if (typeof this.amount === "number" && this.amount < 0) this.amount = 0
  if (typeof this.originalAmount === "number" && this.originalAmount < 0) this.originalAmount = 0
  if (typeof this.remainingAmount === "number" && this.remainingAmount < 0) this.remainingAmount = 0
  if (typeof this.monetaryValue === "number" && this.monetaryValue < 0) this.monetaryValue = 0

  // Update status if expired (and not already in a terminal state)
  if (this.isExpired && !["fully_used", "cancelled", "expired"].includes(this.status)) {
    this.status = "expired"
    this.isActive = false // Also set isActive to false if it expires
  }

  next()
})

const GiftVoucher: Model<IGiftVoucher> =
  mongoose.models.GiftVoucher || mongoose.model<IGiftVoucher>("GiftVoucher", GiftVoucherSchema)

export default GiftVoucher
