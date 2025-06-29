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
  guestInfo?: { // Guest information for non-user purchases
    name: string
    email: string
    phone: string
  }
  isGift: boolean
  recipientName?: string
  recipientPhone?: string
  recipientEmail?: string
  greetingMessage?: string
  giftMessage?: string // Alternative field name for greetingMessage
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
  paymentAmount?: number // Payment amount for admin display
  paymentMethodId?: string // Payment method ID for admin display
  transactionId?: string // Transaction ID for admin display
  notes?: string // Admin notes
  usageHistory?: { date: Date | string; amountUsed: number; orderId?: string; description?: string }[]
  isActive: boolean
  createdAt?: Date | string
  updatedAt?: Date | string
}

// This is the Mongoose Document interface, representing the data structure in MongoDB.
export interface IGiftVoucher extends Document {
  _id: mongoose.Types.ObjectId
  code: string
  voucherType: "treatment" | "monetary"
  amount: number // The primary value of the voucher, required.
  treatmentId?: mongoose.Types.ObjectId
  treatmentName?: string // Add for display purposes
  selectedDurationId?: mongoose.Types.ObjectId
  selectedDurationName?: string // Add for display purposes
  monetaryValue?: number // If monetary, this is the value. If treatment, could store the price at time of purchase.
  originalAmount?: number // For monetary vouchers, often same as 'amount' initially.
  remainingAmount?: number // For monetary vouchers, tracks current balance.
  purchaserUserId?: mongoose.Types.ObjectId // Made optional for guest purchases
  purchaserName?: string // For display
  ownerUserId?: mongoose.Types.ObjectId // Made optional for guest purchases
  ownerName?: string // For display
  guestInfo?: { // Guest information for non-user purchases
    name: string
    email: string
    phone: string
  }
  isGift: boolean
  recipientName?: string
  recipientPhone?: string
  recipientEmail?: string
  greetingMessage?: string
  giftMessage?: string // Alternative field name for greetingMessage
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
  paymentAmount?: number // Payment amount for admin display
  paymentMethodId?: string // Payment method ID for admin display
  transactionId?: string // Transaction ID for admin display
  notes?: string // Admin notes
  usageHistory: { date: Date; amountUsed: number; orderId?: mongoose.Types.ObjectId; description?: string; userId?: mongoose.Types.ObjectId }[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const GiftVoucherSchema: Schema<IGiftVoucher> = new Schema(
  {
    code: { type: String, required: true, unique: true, trim: true }, // unique: true also creates an index
    voucherType: { type: String, enum: ["treatment", "monetary"], required: true },
    amount: { type: Number, required: true, min: 0 }, // *** This field is required ***
    treatmentId: { type: Schema.Types.ObjectId, ref: "Treatment", sparse: true },
    selectedDurationId: { type: Schema.Types.ObjectId, sparse: true }, // Assuming you have a Duration concept
    monetaryValue: { type: Number, min: 0 }, // Value for monetary type, or price of treatment at purchase
    originalAmount: { type: Number, min: 0 }, // Initial value, especially for monetary type
    remainingAmount: { type: Number, min: 0 }, // Current balance for monetary type
    purchaserUserId: { type: Schema.Types.ObjectId, ref: "User", required: false }, // Made optional for guest purchases
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", required: false }, // Made optional for guest purchases
    guestInfo: {
      // Guest information for non-user purchases
      name: { type: String },
      email: { type: String },
      phone: { type: String },
    },
    isGift: { type: Boolean, default: false },
    recipientName: { type: String },
    recipientPhone: { type: String },
    recipientEmail: { type: String },
    greetingMessage: { type: String, maxLength: 500 },
    giftMessage: { type: String, maxLength: 500 }, // Alternative field name for greetingMessage
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
    paymentAmount: { type: Number, min: 0 }, // Payment amount for admin display
    paymentMethodId: { type: String }, // Payment method ID for admin display
    transactionId: { type: String }, // Transaction ID for admin display
    notes: { type: String, maxLength: 1000 }, // Admin notes
    usageHistory: [
      {
        date: { type: Date, required: true },
        amountUsed: { type: Number, required: true },
        orderId: { type: Schema.Types.ObjectId, ref: "Order" }, // Assuming an Order model
        description: { type: String },
      },
    ],
    isActive: { type: Boolean, default: true }, // Admin override or general flag
  },
  {
    timestamps: true,
  },
)

// Indexes (unique index on 'code' is handled by 'unique: true' in schema definition)
GiftVoucherSchema.index({ ownerUserId: 1, status: 1, validUntil: 1 })
// GiftVoucherSchema.index({ purchaserUserId: 1 }); // Already indexed via purchaserUserId field with index:true
GiftVoucherSchema.index({ status: 1, sendDate: 1, isGift: 1 })

GiftVoucherSchema.virtual("isExpired").get(function (this: IGiftVoucher) {
  return new Date() > this.validUntil && this.status !== "fully_used" && this.status !== "cancelled"
})

GiftVoucherSchema.pre<IGiftVoucher>("save", function (next) {
  // 1. Ensure 'amount' is populated if missing and originalAmount exists
  if (typeof this.amount !== "number" && typeof this.originalAmount === "number") {
    this.amount = this.originalAmount
  }

  // 2. Ensure 'amount' is non-negative if it's a number.
  // If 'amount' is still not a number at this point, the 'required: true' validation will catch it.
  if (typeof this.amount === "number") {
    if (this.amount < 0) {
      this.amount = 0
    }
  } else {
    // If amount is still not a number, and this is a new document,
    // Mongoose's `required: true` validation for `amount` will fail, which is correct.
    // If this is an existing document, it indicates a data integrity issue that this hook couldn't resolve from originalAmount.
    // We cannot proceed to default other fields from an undefined `amount`.
    // For now, we let the `required` validation catch this.
    // If we absolutely had to save, we might consider throwing an error here or setting a default if appropriate.
  }

  // 3. Default originalAmount, monetaryValue, and remainingAmount
  //    These should only be defaulted if 'amount' is now a valid number.
  if (typeof this.amount === "number") {
    // Default originalAmount from amount if originalAmount is missing
    if (typeof this.originalAmount !== "number") {
      this.originalAmount = this.amount
    }

    // Default monetaryValue
    if (typeof this.monetaryValue !== "number") {
      if (this.voucherType === "monetary" && typeof this.originalAmount === "number") {
        this.monetaryValue = this.originalAmount
      } else {
        // For treatment vouchers, or if originalAmount is somehow still not a number for monetary
        this.monetaryValue = this.amount
      }
    }

    // Default remainingAmount for monetary vouchers
    if (this.voucherType === "monetary") {
      if (typeof this.remainingAmount !== "number") {
        // If remainingAmount is missing, default it to originalAmount (which should be set by now)
        if (typeof this.originalAmount === "number") {
          this.remainingAmount = this.originalAmount
        } else {
          // Fallback if originalAmount somehow didn't get set (should not happen if amount is a number)
          this.remainingAmount = this.amount
        }
      }
      // Ensure remainingAmount does not exceed originalAmount for monetary vouchers
      if (typeof this.remainingAmount === "number" && typeof this.originalAmount === "number") {
        if (this.remainingAmount > this.originalAmount) {
          this.remainingAmount = this.originalAmount
        }
        if (this.remainingAmount < 0) {
          this.remainingAmount = 0
        }
      }
    }
    // For treatment vouchers, remainingAmount is typically specific (e.g., 1 for one use, or 0 after use).
    // It's usually set by application logic rather than defaulted from 'amount' in this generic hook,
    // unless 'amount' itself represents a single use value and it's a new voucher.
    // The application logic in `createBooking` handles setting remainingAmount to 0 for treatment vouchers upon use.
  }

  // 4. Handle 'isExpired' status
  // Ensure 'validUntil' is a Date object for comparison
  const validUntilDate = this.validUntil instanceof Date ? this.validUntil : new Date(this.validUntil)
  if (
    new Date() > validUntilDate &&
    this.status !== "fully_used" &&
    this.status !== "expired" &&
    this.status !== "cancelled"
  ) {
    this.status = "expired"
    this.isActive = false // Expired vouchers should not be active
  }

  // Ensure isActive reflects status for monetary vouchers
  if (this.voucherType === "monetary") {
    if (
      this.status === "fully_used" ||
      this.status === "expired" ||
      this.status === "cancelled" ||
      (typeof this.remainingAmount === "number" && this.remainingAmount <= 0)
    ) {
      this.isActive = false
    } else if (this.status === "active" || this.status === "partially_used") {
      this.isActive = true
    }
  } else if (this.voucherType === "treatment") {
    if (this.status === "fully_used" || this.status === "expired" || this.status === "cancelled") {
      this.isActive = false
    } else if (this.status === "active" || this.status === "pending_send" || this.status === "sent") {
      // Treatment vouchers are active until used/expired/cancelled
      this.isActive = true
    }
  }

  next()
})

const GiftVoucher: Model<IGiftVoucher> =
  mongoose.models.GiftVoucher || mongoose.model<IGiftVoucher>("GiftVoucher", GiftVoucherSchema)

export default GiftVoucher
export { GiftVoucher }
