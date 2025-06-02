import mongoose, { Schema, type Document } from "mongoose"

export interface IGiftVoucher extends Document {
  code: string
  amount: number
  expiryDate?: Date
  isUsed: boolean
  userId?: mongoose.Types.ObjectId // Optional: User who redeemed the voucher
  orderId?: mongoose.Types.ObjectId // Optional: Order where the voucher was used
  createdAt: Date
  updatedAt: Date
}

const GiftVoucherSchema: Schema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true, // Ensures a unique index is created
      trim: true,
      // uppercase: true, // Optional: if codes should be stored in uppercase
    },
    amount: {
      type: Number,
      required: true,
    },
    expiryDate: {
      type: Date,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Assuming you have a User model
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order", // Assuming you have an Order model
    },
  },
  {
    timestamps: true,
  },
)

// GiftVoucherSchema.index({ code: 1 }); // If this exists for a non-unique index
// OR
// GiftVoucherSchema.index({ code: 1 }, { unique: true }); // If this exists and 'code' field also has unique:true

export default mongoose.model<IGiftVoucher>("GiftVoucher", GiftVoucherSchema)
