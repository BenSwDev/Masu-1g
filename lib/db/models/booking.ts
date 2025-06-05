import mongoose, { Schema, type Document, type Model, type Types } from "mongoose"

export type BookingStatus =
  | "pending_professional_assignment" // ממתין למציאת מטפל
  | "confirmed" // אושר, שובץ מטפל
  | "professional_en_route" // מטפל בדרך
  | "completed" // הושלם
  | "cancelled_by_user" // בוטל ע"י משתמש
  | "cancelled_by_admin" // בוטל ע"י מנהל
  | "no_show" // לא הופיע

export interface IPriceDetails {
  basePrice: number
  surcharges: { description: string; amount: number }[]
  totalSurchargesAmount: number
  treatmentPriceAfterSubscriptionOrTreatmentVoucher: number
  discountAmount: number // From coupon
  voucherAppliedAmount: number // From gift voucher
  finalAmount: number
  isBaseTreatmentCoveredBySubscription?: boolean
  isBaseTreatmentCoveredByTreatmentVoucher?: boolean
  isFullyCoveredByVoucherOrSubscription?: boolean
  appliedCouponId?: Types.ObjectId
  appliedGiftVoucherId?: Types.ObjectId
  redeemedUserSubscriptionId?: Types.ObjectId
}

export interface IPaymentDetails {
  paymentMethodId?: Types.ObjectId
  transactionId?: string
  paymentStatus: "pending" | "paid" | "failed" | "not_required" // not_required for full redemption
}

export interface IBooking extends Document {
  userId: Types.ObjectId
  treatmentId: Types.ObjectId
  selectedDurationId?: Types.ObjectId // If treatment is duration-based
  bookingDateTime: Date // Date and time of the appointment
  addressId?: Types.ObjectId // Could be denormalized address details too
  customAddressDetails?: {
    // If user provided a one-time address not saved
    fullAddress: string
    city: string
    street: string
    streetNumber?: string
    notes?: string
  }
  therapistGenderPreference: "male" | "female" | "any"
  notes?: string // User notes for the booking
  status: BookingStatus
  priceDetails: IPriceDetails
  paymentDetails: IPaymentDetails
  source: "new_purchase" | "subscription_redemption" | "gift_voucher_redemption"
  redeemedUserSubscriptionId?: Types.ObjectId // If sourced from user's subscription
  redeemedGiftVoucherId?: Types.ObjectId // If sourced from gift voucher
  appliedCouponId?: Types.ObjectId // If a coupon was applied
  isFlexibleTime: boolean
  flexibilityRangeHours?: number // e.g., 1 or 2 hours before/after
  cancellationReason?: string // If cancelled
  cancelledBy?: "user" | "admin"
  professionalId?: Types.ObjectId // Assigned professional
  createdAt: Date
  updatedAt: Date
}

const PriceDetailsSchema = new Schema<IPriceDetails>(
  {
    basePrice: { type: Number, required: true, min: 0 },
    surcharges: [
      {
        description: { type: String, required: true },
        amount: { type: Number, required: true, min: 0 },
      },
    ],
    totalSurchargesAmount: { type: Number, default: 0, min: 0 },
    treatmentPriceAfterSubscriptionOrTreatmentVoucher: { type: Number, default: 0, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    voucherAppliedAmount: { type: Number, default: 0, min: 0 },
    finalAmount: { type: Number, required: true, min: 0 },
    isBaseTreatmentCoveredBySubscription: { type: Boolean, default: false },
    isBaseTreatmentCoveredByTreatmentVoucher: { type: Boolean, default: false },
    isFullyCoveredByVoucherOrSubscription: { type: Boolean, default: false },
    appliedCouponId: { type: Schema.Types.ObjectId, ref: "Coupon" },
    appliedGiftVoucherId: { type: Schema.Types.ObjectId, ref: "GiftVoucher" },
    redeemedUserSubscriptionId: { type: Schema.Types.ObjectId, ref: "UserSubscription" },
  },
  { _id: false },
)

const PaymentDetailsSchema = new Schema<IPaymentDetails>(
  {
    paymentMethodId: { type: Schema.Types.ObjectId, ref: "PaymentMethod" },
    transactionId: { type: String },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "not_required"],
      required: true,
    },
  },
  { _id: false },
)

const BookingSchema: Schema<IBooking> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    treatmentId: { type: Schema.Types.ObjectId, ref: "Treatment", required: true },
    selectedDurationId: { type: Schema.Types.ObjectId }, // No direct ref, validated in logic
    bookingDateTime: { type: Date, required: true, index: true },
    addressId: { type: Schema.Types.ObjectId, ref: "Address" },
    customAddressDetails: {
      fullAddress: String,
      city: String,
      street: String,
      streetNumber: String,
      notes: String,
    },
    therapistGenderPreference: { type: String, enum: ["male", "female", "any"], required: true },
    notes: { type: String, trim: true },
    status: {
      type: String,
      enum: [
        "pending_professional_assignment",
        "confirmed",
        "professional_en_route",
        "completed",
        "cancelled_by_user",
        "cancelled_by_admin",
        "no_show",
      ],
      default: "pending_professional_assignment",
      required: true,
      index: true,
    },
    priceDetails: { type: PriceDetailsSchema, required: true },
    paymentDetails: { type: PaymentDetailsSchema, required: true },
    source: {
      type: String,
      enum: ["new_purchase", "subscription_redemption", "gift_voucher_redemption"],
      required: true,
    },
    redeemedUserSubscriptionId: { type: Schema.Types.ObjectId, ref: "UserSubscription" },
    redeemedGiftVoucherId: { type: Schema.Types.ObjectId, ref: "GiftVoucher" },
    appliedCouponId: { type: Schema.Types.ObjectId, ref: "Coupon" },
    isFlexibleTime: { type: Boolean, default: false },
    flexibilityRangeHours: { type: Number, min: 0 },
    cancellationReason: { type: String },
    cancelledBy: { type: String, enum: ["user", "admin"] },
    professionalId: { type: Schema.Types.ObjectId, ref: "User" }, // Assuming professionals are Users
  },
  { timestamps: true },
)

BookingSchema.index({ userId: 1, bookingDateTime: -1 })
BookingSchema.index({ status: 1, bookingDateTime: 1 })
BookingSchema.index({ professionalId: 1, bookingDateTime: 1, status: 1 })

const Booking: Model<IBooking> = mongoose.models.Booking || mongoose.model<IBooking>("Booking", BookingSchema)

export default Booking
