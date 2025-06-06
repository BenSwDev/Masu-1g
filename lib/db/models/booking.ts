import mongoose, { Schema, type Document, type Types } from "mongoose"

export type BookingStatus =
  | "pending_professional_assignment" // New booking, needs a professional
  | "confirmed" // Professional assigned, client notified
  | "professional_en_route" // Professional on the way
  | "completed" // Service rendered
  | "cancelled_by_user"
  | "cancelled_by_admin"
  | "no_show" // Client did not show up
  | "rescheduled" // Booking was rescheduled

export interface IPriceDetails {
  basePrice: number
  surcharges: { description: string; amount: number }[]
  totalSurchargesAmount: number
  treatmentPriceAfterSubscriptionOrTreatmentVoucher: number // Price of treatment after subscription/treatment voucher (can be 0)
  discountAmount: number // From coupon
  voucherAppliedAmount: number // Monetary amount from gift voucher or value of treatment voucher
  finalAmount: number // Actual amount to be paid
  isBaseTreatmentCoveredBySubscription: boolean
  isBaseTreatmentCoveredByTreatmentVoucher: boolean
  isFullyCoveredByVoucherOrSubscription: boolean // If finalAmount is 0 due to voucher/subscription
  appliedCouponId?: Types.ObjectId
  appliedGiftVoucherId?: Types.ObjectId
  redeemedUserSubscriptionId?: Types.ObjectId
}

export interface IPaymentDetails {
  paymentMethodId?: Types.ObjectId
  paymentStatus: "pending" | "paid" | "failed" | "refunded" | "not_required"
  transactionId?: string // From payment gateway
  paymentDate?: Date
}

export interface IBooking extends Document {
  userId: Types.ObjectId
  treatmentId: Types.ObjectId
  selectedDurationId?: Types.ObjectId // For duration-based treatments
  bookingDateTime: Date
  addressId?: Types.ObjectId // If user selected a saved address
  customAddressDetails?: {
    // If user entered a new address
    fullAddress: string
    city: string
    street: string
    streetNumber?: string
    apartment?: string
    entryCode?: string
    floor?: string
    notes?: string // e.g., "ring bell twice"
  }
  therapistGenderPreference: "male" | "female" | "any"
  notes?: string // User notes for the booking
  adminNotes?: string // Internal notes for admin/staff
  status: BookingStatus
  priceDetails: IPriceDetails
  paymentDetails: IPaymentDetails
  source: "new_purchase" | "subscription_redemption" | "gift_voucher_redemption" // How the booking was initiated
  redeemedUserSubscriptionId?: Types.ObjectId // If paid via user's subscription
  redeemedGiftVoucherId?: Types.ObjectId // If paid via gift voucher
  appliedCouponId?: Types.ObjectId // If a coupon was used
  isFlexibleTime: boolean // If user is flexible with time
  flexibilityRangeHours?: number // e.g., +/- 2 hours
  cancellationReason?: string
  cancelledBy?: "user" | "admin" | "professional"
  professionalId?: Types.ObjectId // Assigned professional
  createdAt: Date
  updatedAt: Date
}

const PriceDetailsSchema = new Schema<IPriceDetails>(
  {
    basePrice: { type: Number, required: true, default: 0 },
    surcharges: [
      {
        description: { type: String, required: true },
        amount: { type: Number, required: true },
      },
    ],
    totalSurchargesAmount: { type: Number, required: true, default: 0 },
    treatmentPriceAfterSubscriptionOrTreatmentVoucher: { type: Number, required: true, default: 0 },
    discountAmount: { type: Number, required: true, default: 0 },
    voucherAppliedAmount: { type: Number, required: true, default: 0 },
    finalAmount: { type: Number, required: true, default: 0 },
    isBaseTreatmentCoveredBySubscription: { type: Boolean, default: false },
    isBaseTreatmentCoveredByTreatmentVoucher: { type: Boolean, default: false },
    isFullyCoveredByVoucherOrSubscription: { type: Boolean, default: false },
    appliedCouponId: { type: Schema.Types.ObjectId, ref: "Coupon" },
    appliedGiftVoucherId: { type: Schema.Types.ObjectId, ref: "GiftVoucher" },
    redeemedUserSubscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "UserSubscription",
    },
  },
  { _id: false },
)

const PaymentDetailsSchema = new Schema<IPaymentDetails>(
  {
    paymentMethodId: { type: Schema.Types.ObjectId, ref: "PaymentMethod" },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded", "not_required"],
      required: true,
      default: "pending",
    },
    transactionId: { type: String },
    paymentDate: { type: Date },
  },
  { _id: false },
)

const BookingSchema = new Schema<IBooking>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    treatmentId: { type: Schema.Types.ObjectId, ref: "Treatment", required: true },
    selectedDurationId: { type: Schema.Types.ObjectId }, // Refers to a sub-document ID within Treatment.durations
    bookingDateTime: { type: Date, required: true, index: true },
    addressId: { type: Schema.Types.ObjectId, ref: "Address" },
    customAddressDetails: {
      fullAddress: { type: String },
      city: { type: String },
      street: { type: String },
      streetNumber: { type: String },
      apartment: { type: String },
      entryCode: { type: String },
      floor: { type: String },
      notes: { type: String },
    },
    therapistGenderPreference: {
      type: String,
      enum: ["male", "female", "any"],
      default: "any",
    },
    notes: { type: String },
    adminNotes: { type: String }, // New field for admin internal notes
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
        "rescheduled",
      ],
      required: true,
      default: "pending_professional_assignment",
      index: true,
    },
    priceDetails: { type: PriceDetailsSchema, required: true },
    paymentDetails: { type: PaymentDetailsSchema, required: true },
    source: {
      type: String,
      enum: ["new_purchase", "subscription_redemption", "gift_voucher_redemption"],
      required: true,
    },
    redeemedUserSubscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "UserSubscription",
    },
    redeemedGiftVoucherId: { type: Schema.Types.ObjectId, ref: "GiftVoucher" },
    appliedCouponId: { type: Schema.Types.ObjectId, ref: "Coupon" },
    isFlexibleTime: { type: Boolean, default: false },
    flexibilityRangeHours: { type: Number },
    cancellationReason: { type: String },
    cancelledBy: { type: String, enum: ["user", "admin", "professional"] },
    professionalId: { type: Schema.Types.ObjectId, ref: "User", index: true }, // Professional is also a User
  },
  { timestamps: true },
)

// Indexes
BookingSchema.index({ userId: 1, bookingDateTime: -1 })
BookingSchema.index({ professionalId: 1, bookingDateTime: -1 })
BookingSchema.index({ status: 1, bookingDateTime: -1 })

export default mongoose.models.Booking || mongoose.model<IBooking>("Booking", BookingSchema)
