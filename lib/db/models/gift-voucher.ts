import mongoose, { Schema, type Document, type Model } from "mongoose"

// Interface for GiftVoucherPlain to be used across client and server
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
  sendDate?: Date // Changed to Date
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
  paymentMethodId?: string // Added
  usageHistory?: { date: Date; amountUsed: number; orderId?: string; description?: string }[] // Added description
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

export interface IGiftVoucher extends Document {
  code: string
  voucherType: "treatment" | "monetary"
  treatmentId?: mongoose.Types.ObjectId
  selectedDurationId?: mongoose.Types.ObjectId
  monetaryValue?: number
  originalAmount?: number
  remainingAmount?: number
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
  paymentMethodId?: mongoose.Types.ObjectId // Added
  usageHistory: { date: Date; amountUsed: number; orderId?: mongoose.Types.ObjectId; description?: string }[] // Added description
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const GiftVoucherSchema: Schema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    voucherType: { type: String, enum: ["treatment", "monetary"], required: true },
    treatmentId: { type: Schema.Types.ObjectId, ref: "Treatment", sparse: true },
    selectedDurationId: { type: Schema.Types.ObjectId, sparse: true },
    monetaryValue: { type: Number, min: 0 },
    originalAmount: { type: Number, min: 0 },
    remainingAmount: { type: Number, min: 0 },
    purchaserUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    isGift: { type: Boolean, default: false },
    recipientName: { type: String },
    recipientPhone: { type: String },
    greetingMessage: { type: String, maxLength: 500 },
    sendDate: { type: Date }, // Can be scheduled
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
    paymentMethodId: { type: Schema.Types.ObjectId, ref: "PaymentMethod", sparse: true }, // Added
    usageHistory: [
      {
        date: { type: Date, required: true },
        amountUsed: { type: Number, required: true },
        orderId: { type: Schema.Types.ObjectId, ref: "Order" },
        description: { type: String }, // Added
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

// ... (rest of the schema definition, indexes, virtuals, pre-save hooks)
GiftVoucherSchema.index({ code: 1 }, { unique: true })
GiftVoucherSchema.index({ ownerUserId: 1, status: 1, validUntil: 1 })
GiftVoucherSchema.index({ purchaserUserId: 1 })
GiftVoucherSchema.index({ status: 1, sendDate: 1, isGift: 1 })

GiftVoucherSchema.virtual("isExpired").get(function (this: IGiftVoucher) {
  return new Date() > this.validUntil && this.status !== "fully_used" && this.status !== "cancelled"
})

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
  // Ensure isActive reflects current state based on status and validity
  if (this.status === "active" || this.status === "partially_used" || this.status === "sent") {
    this.isActive = new Date() >= this.validFrom && new Date() <= this.validUntil
  } else {
    this.isActive = false
  }
  next()
})

const GiftVoucher: Model<IGiftVoucher> =
  mongoose.models.GiftVoucher || mongoose.model<IGiftVoucher>("GiftVoucher", GiftVoucherSchema)

export default GiftVoucher
