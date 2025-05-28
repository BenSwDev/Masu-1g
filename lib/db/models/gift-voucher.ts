import mongoose, { Schema, type Document, type Model } from "mongoose"

export interface IGiftVoucher extends Document {
  code: string
  value: number
  validFrom: Date
  validUntil: Date
  isActive: boolean
  recipientName: string
  recipientEmail: string
  message?: string
  createdAt: Date
  updatedAt: Date
}

const GiftVoucherSchema: Schema = new Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    value: { type: Number, required: true, min: 0 },
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    recipientName: { type: String, required: true, trim: true },
    recipientEmail: { type: String, required: true, trim: true },
    message: { type: String, trim: true },
  },
  {
    timestamps: true,
  },
)

// Index for efficient queries
GiftVoucherSchema.index({ code: 1 })
GiftVoucherSchema.index({ validUntil: 1 })
GiftVoucherSchema.index({ isActive: 1 })
GiftVoucherSchema.index({ recipientEmail: 1 })

const GiftVoucher: Model<IGiftVoucher> =
  mongoose.models.GiftVoucher || mongoose.model<IGiftVoucher>("GiftVoucher", GiftVoucherSchema)

export default GiftVoucher
