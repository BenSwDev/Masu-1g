import mongoose, { Schema, type Document } from "mongoose"

export interface IGiftVoucher extends Document {
  code: string
  amount: number
  currency: string
  purchaserUserId: Schema.Types.ObjectId
  recipientName: string
  recipientEmail: string
  message: string
  expiryDate: Date
  isUsed: boolean
  usageDate?: Date
  createdAt: Date
  updatedAt: Date
}

const GiftVoucherSchema: Schema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    purchaserUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recipientName: { type: String, required: true },
    recipientEmail: { type: String, required: true },
    message: { type: String },
    expiryDate: { type: Date, required: true },
    isUsed: { type: Boolean, default: false },
    usageDate: { type: Date },
  },
  { timestamps: true },
)

// GiftVoucherSchema.index({ code: 1 }, { unique: true }) // Removed duplicate index

GiftVoucherSchema.index({ purchaserUserId: 1, recipientEmail: 1 })
GiftVoucherSchema.index({ code: 1, expiryDate: 1 })

export default mongoose.model<IGiftVoucher>("GiftVoucher", GiftVoucherSchema)
