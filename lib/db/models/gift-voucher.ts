import mongoose, { Schema, type Document, type Model } from "mongoose"

export interface IGiftVoucher extends Document {
  code: string
  value: number
  validFrom: Date
  validUntil: Date
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const GiftVoucherSchema: Schema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    value: { type: Number, required: true },
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  },
)

const GiftVoucher: Model<IGiftVoucher> =
  mongoose.models.GiftVoucher || mongoose.model<IGiftVoucher>("GiftVoucher", GiftVoucherSchema)

export default GiftVoucher
