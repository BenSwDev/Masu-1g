import mongoose, { Schema, type Document, type Model } from "mongoose"
import type { IGiftVoucherDocument } from "@/types/core"

// Re-export the core types for backward compatibility
export type { GiftVoucher as GiftVoucherPlain } from "@/types/core"
export type { IGiftVoucherDocument as IGiftVoucher } from "@/types/core"

const GiftVoucherSchema: Schema<IGiftVoucherDocument> = new Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    voucherType: { type: String, enum: ["treatment", "monetary"], required: true },
    amount: { type: Number, required: true, min: 0 },
    treatmentId: { type: Schema.Types.ObjectId, ref: "Treatment" },
    selectedDurationId: { type: Schema.Types.ObjectId },
    monetaryValue: { type: Number, min: 0 },
    originalAmount: { type: Number, min: 0 },
    remainingAmount: { type: Number, min: 0 },
    purchaserUserId: { type: Schema.Types.ObjectId, ref: "User" },
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User" },
    guestInfo: {
      name: { type: String },
      email: { type: String },
      phone: { type: String },
    },
    isGift: { type: Boolean, required: true, default: false },
    recipientName: { type: String },
    recipientPhone: { type: String },
    recipientEmail: { type: String },
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
      required: true,
      default: "pending_payment",
    },
    purchaseDate: { type: Date, required: true, default: Date.now },
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    paymentId: { type: String, sparse: true },
    paymentAmount: { type: Number, min: 0 },
    paymentMethodId: { type: String },
    transactionId: { type: String },
    notes: { type: String, maxLength: 1000 },
    usageHistory: [
      {
        date: { type: Date, required: true },
        amountUsed: { type: Number, required: true },
        orderId: { type: Schema.Types.ObjectId, ref: "Order" },
        description: { type: String },
        userId: { type: Schema.Types.ObjectId, ref: "User" },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  },
)

// Indexes
GiftVoucherSchema.index({ ownerUserId: 1, status: 1, validUntil: 1 })
GiftVoucherSchema.index({ purchaserUserId: 1, status: 1 })
GiftVoucherSchema.index({ status: 1, validUntil: 1 })
GiftVoucherSchema.index({ code: 1 }, { unique: true })

// Pre-save middleware to ensure data consistency
GiftVoucherSchema.pre("save", function (next) {
  // Set remainingAmount for monetary vouchers
  if (this.voucherType === "monetary" && this.remainingAmount === undefined) {
    this.remainingAmount = this.originalAmount || this.amount
  }
  
  // Set originalAmount if not provided
  if (this.originalAmount === undefined) {
    this.originalAmount = this.amount
  }
  
  next()
})

// Virtual for checking if voucher is expired
GiftVoucherSchema.virtual("isExpired").get(function () {
  return new Date() > this.validUntil
})

// Virtual for checking if voucher is valid for use
GiftVoucherSchema.virtual("isValidForUse").get(function () {
  const now = new Date()
  return (
    this.isActive &&
    this.status === "active" &&
    now >= this.validFrom &&
    now <= this.validUntil &&
    (this.voucherType === "monetary" ? (this.remainingAmount || 0) > 0 : true)
  )
})

// Instance method to use voucher
GiftVoucherSchema.methods.useVoucher = function (amountToUse: number, orderId?: string, description?: string) {
  if (this.voucherType === "monetary") {
    if ((this.remainingAmount || 0) < amountToUse) {
      throw new Error("Insufficient voucher balance")
    }
    this.remainingAmount = (this.remainingAmount || 0) - amountToUse
    if (this.remainingAmount <= 0) {
      this.status = "fully_used"
      this.remainingAmount = 0
    } else {
      this.status = "partially_used"
    }
  } else {
    // Treatment voucher
    this.status = "fully_used"
    amountToUse = this.amount
  }
  
  this.usageHistory.push({
    date: new Date(),
    amountUsed: amountToUse,
    orderId: orderId ? new mongoose.Types.ObjectId(orderId) : undefined,
    description: description || `Used ${amountToUse} from voucher`
  })
  
  return this.save()
}

const GiftVoucher: Model<IGiftVoucherDocument> = mongoose.models.GiftVoucher || mongoose.model<IGiftVoucherDocument>("GiftVoucher", GiftVoucherSchema)

export default GiftVoucher
