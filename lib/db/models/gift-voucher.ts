import mongoose, { type Document, Schema } from "mongoose"

// Define the interface for the GiftVoucher document
export interface IGiftVoucher extends Document {
  code: string
  amount: number
  recipientName: string
  recipientEmail: string
  senderName: string
  senderEmail: string
  message: string
  isRedeemed: boolean
  redeemedBy?: mongoose.Types.ObjectId
  redeemedAt?: Date
  expiryDate: Date
  purchasedBy: mongoose.Types.ObjectId
  paymentId?: string
  createdAt: Date
  updatedAt: Date
}

// Define the GiftVoucher schema
const GiftVoucherSchema = new Schema<IGiftVoucher>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    recipientName: {
      type: String,
      required: true,
      trim: true,
    },
    recipientEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    senderName: {
      type: String,
      required: true,
      trim: true,
    },
    senderEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    message: {
      type: String,
      default: "",
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
    expiryDate: {
      type: Date,
      required: true,
    },
    purchasedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    paymentId: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
)

// Create indexes for better query performance
GiftVoucherSchema.index({ code: 1 }, { unique: true })
GiftVoucherSchema.index({ isRedeemed: 1 })
GiftVoucherSchema.index({ expiryDate: 1 })
GiftVoucherSchema.index({ purchasedBy: 1 })
GiftVoucherSchema.index({ redeemedBy: 1 })
GiftVoucherSchema.index({ recipientEmail: 1 })
GiftVoucherSchema.index({ code: "text", recipientName: "text", senderName: "text" })

// Create and export the GiftVoucher model
export const GiftVoucher = mongoose.models.GiftVoucher || mongoose.model<IGiftVoucher>("GiftVoucher", GiftVoucherSchema)
