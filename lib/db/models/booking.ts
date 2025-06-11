import mongoose, { Schema, type Document, type Model, type Types } from "mongoose"

export type BookingStatus =
  | "abandoned" // הזמנה ננטשה - לא הושלמה
  | "pending_professional_assignment" // ממתין למציאת מטפל
  | "confirmed" // אושר, שובץ מטפל
  | "professional_en_route" // מטפל בדרך
  | "completed" // הושלם
  | "cancelled_by_user" // בוטל ע"י משתמש
  | "cancelled_by_admin" // בוטל ע"י מנהל
  | "cancelled_refunded" // בוטל והכסף הוחזר
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

export interface IBookingAddressSnapshot {
  fullAddress: string
  city: string
  street: string
  streetNumber?: string
  apartment?: string
  entrance?: string
  floor?: string
  notes?: string
  doorName?: string
  buildingName?: string
  hotelName?: string
  roomNumber?: string
  otherInstructions?: string
  hasPrivateParking?: boolean
}

export interface IBooking extends Document {
  bookingNumber: string // New: Unique 6-digit booking number
  userId: Types.ObjectId
  bookedByUserName?: string // New: Name of the user who made the booking
  bookedByUserEmail?: string // New: Email of the user who made the booking
  bookedByUserPhone?: string // New: Phone of the user who made the booking
  treatmentId: Types.ObjectId
  selectedDurationId?: Types.ObjectId // If treatment is duration-based
  bookingDateTime: Date // Date and time of the appointment
  addressId?: Types.ObjectId
  customAddressDetails?: IBookingAddressSnapshot // If user provided a one-time address not saved
  bookingAddressSnapshot?: IBookingAddressSnapshot // New: Snapshot of the address used for the booking
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
  professionalId?: Types.ObjectId // Assigned professional (can be null)
  recipientName?: string // Name of the person receiving the treatment if not the user
  recipientPhone?: string // Phone of the person receiving the treatment
  recipientEmail?: string // Email of the person receiving the treatment
  recipientBirthDate?: Date // Birth date of the person receiving the treatment
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

const BookingAddressSnapshotSchema = new Schema<IBookingAddressSnapshot>(
  {
    fullAddress: { type: String, required: true },
    city: { type: String, required: true },
    street: { type: String, required: true },
    streetNumber: { type: String },
    apartment: { type: String },
    entrance: { type: String },
    floor: { type: String },
    notes: { type: String },
    doorName: { type: String },
    buildingName: { type: String },
    hotelName: { type: String },
    roomNumber: { type: String },
    otherInstructions: { type: String },
    hasPrivateParking: { type: Boolean },
  },
  { _id: false },
)

const BookingSchema: Schema<IBooking> = new Schema(
  {
    bookingNumber: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    bookedByUserName: { type: String },
    bookedByUserEmail: { type: String },
    bookedByUserPhone: { type: String },
    treatmentId: { type: Schema.Types.ObjectId, ref: "Treatment", required: true },
    selectedDurationId: { type: Schema.Types.ObjectId },
    bookingDateTime: { type: Date, required: true, index: true },
    addressId: { type: Schema.Types.ObjectId, ref: "Address" },
    customAddressDetails: BookingAddressSnapshotSchema,
    bookingAddressSnapshot: BookingAddressSnapshotSchema,
    therapistGenderPreference: { type: String, enum: ["male", "female", "any"], required: true },
    notes: { type: String, trim: true },
    status: {
      type: String,
      enum: [
        "abandoned",
        "pending_professional_assignment",
        "confirmed",
        "professional_en_route",
        "completed",
        "cancelled_by_user",
        "cancelled_by_admin",
        "cancelled_refunded",
        "no_show",
      ],
      default: "pending_professional_assignment", // Will be overridden to 'confirmed' in createBooking
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
    professionalId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    recipientName: { type: String, trim: true },
    recipientPhone: { type: String, trim: true },
    recipientEmail: { type: String, trim: true },
    recipientBirthDate: { type: Date },
  },
  { timestamps: true },
)

BookingSchema.index({ userId: 1, bookingDateTime: -1 })
BookingSchema.index({ status: 1, bookingDateTime: 1 })
BookingSchema.index({ professionalId: 1, bookingDateTime: 1, status: 1 })

const Booking: Model<IBooking> = mongoose.models.Booking || mongoose.model<IBooking>("Booking", BookingSchema)

export default Booking
