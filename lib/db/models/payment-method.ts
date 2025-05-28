import mongoose, { Schema, type Document } from "mongoose"

export interface IPaymentMethod extends Document {
  userId: string
  cardNumber: string
  expiryMonth: string
  expiryYear: string
  cvv: string
  cardHolderName: string
  cardName?: string
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

const PaymentMethodSchema = new Schema<IPaymentMethod>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    cardNumber: {
      type: String,
      required: true,
    },
    expiryMonth: {
      type: String,
      required: true,
    },
    expiryYear: {
      type: String,
      required: true,
    },
    cvv: {
      type: String,
      required: true,
    },
    cardHolderName: {
      type: String,
      required: true,
    },
    cardName: {
      type: String,
      required: false,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
)

// Index for efficient queries
PaymentMethodSchema.index({ userId: 1, isDefault: 1 })

export const PaymentMethod =
  mongoose.models.PaymentMethod || mongoose.model<IPaymentMethod>("PaymentMethod", PaymentMethodSchema)

export default PaymentMethod
