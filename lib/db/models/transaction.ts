import mongoose, { Schema, type Document, type Model } from "mongoose"

export interface ITransaction extends Document {
  transactionNumber: string // T123456 format
  type: "booking" | "gift_voucher" | "subscription"
  entityId: mongoose.Types.ObjectId // ID of the booking, gift voucher, or subscription
  amount: number
  finalAmount?: number // For bookings with discounts
  date: Date // Transaction date (matches created date of entity)
  status: "completed" | "pending" | "cancelled" | "refunded"
  description: string
  
  // Customer information
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  
  // Additional metadata
  metadata?: {
    treatmentName?: string
    professionalName?: string
    voucherCode?: string
    subscriptionName?: string
    bookingNumber?: string
  }
  
  createdAt: Date
  updatedAt: Date
}

const TransactionSchema = new Schema<ITransaction>(
  {
    transactionNumber: { 
      type: String, 
      required: true, 
      unique: true, 
      index: true,
      match: /^T\d{6}$/
    },
    type: {
      type: String,
      enum: ["booking", "gift_voucher", "subscription"],
      required: true,
      index: true
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    finalAmount: {
      type: Number,
      min: 0
    },
    date: {
      type: Date,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ["completed", "pending", "cancelled", "refunded"],
      required: true,
      index: true
    },
    description: {
      type: String,
      required: true
    },
    customerName: String,
    customerEmail: String,
    customerPhone: String,
    metadata: {
      type: Schema.Types.Mixed
    }
  },
  { timestamps: true }
)

// Compound index for efficient queries
TransactionSchema.index({ date: -1, type: 1 })

const Transaction: Model<ITransaction> =
  mongoose.models.Transaction ||
  mongoose.model<ITransaction>("Transaction", TransactionSchema)

export default Transaction 