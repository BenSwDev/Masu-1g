import mongoose, { Schema, type Document, type Model, type Types } from "mongoose"

export type BookingStatus =
  | "pending_payment" // ממתין לתשלום - הזמנות לא שולמו
  | "pending_professional" // ממתינה לשיוך מטפל - שולם אבל לא שויך מטפל
  | "confirmed" // מאושר - שויך מטפל
  | "on_way" // בדרך - מטפל בדרך לטיפול
  | "in_treatment" // בטיפול - מטפל התחיל טיפול
  | "completed" // הושלם - שויך מטפל והושלם
  | "cancelled" // בוטל - בוטל ללא החזר
  | "refunded" // הוחזר - בוטל עם החזר

export interface IProfessionalShare {
  amount: number
  type: "fixed" | "percentage"
}

export interface IPriceDetails {
  basePrice: number
  surcharges: { description: string; amount: number; professionalShare?: IProfessionalShare }[]
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
  // Financial breakdown
  totalProfessionalPayment?: number // Total amount to be paid to professional
  totalOfficeCommission?: number // Total office commission
  baseProfessionalPayment?: number // Professional payment from base treatment
  surchargesProfessionalPayment?: number // Professional payment from surcharges
  professionalPaymentOverride?: number // Manual override for professional payment (admin only)
}

export interface IPaymentDetails {
  transactionId?: string
  paymentStatus: "pending" | "paid" | "failed" | "not_required" // not_required for full redemption
}

export interface IBookingAddressSnapshot {
  fullAddress: string
  city: string // Note: Must be from active cities in database only
  street: string
  streetNumber?: string
  addressType: "apartment" | "house" | "office" | "hotel" | "other"
  apartment?: string
  entrance?: string
  floor?: string
  notes?: string
  doorName?: string // for house
  buildingName?: string // for office
  hotelName?: string // for hotel
  roomNumber?: string // for hotel
  instructions?: string // for other
  otherInstructions?: string
  hasPrivateParking?: boolean
}

export interface IBookingConsents {
  customerAlerts: "sms" | "email" | "none"
  patientAlerts: "sms" | "email" | "none"
  marketingOptIn: boolean
  termsAccepted: boolean
}

export interface IEnhancedPaymentDetails {
  transactionId?: Types.ObjectId
  amountPaid?: number
  cardLast4?: string
  cardHolder?: string
  paymentStatus?: "success" | "fail"
}

export interface IBookingReview {
  rating: 1 | 2 | 3 | 4 | 5
  comment?: string
}

export interface IBooking extends Document {
  bookingNumber: string // New: Unique 6-digit booking number
  userId?: Types.ObjectId // Made optional for guest bookings
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
  refundAmount?: number // Amount refunded if status is "refunded"
  refundTransactionId?: string // Transaction ID for refund
  professionalId?: Types.ObjectId // Assigned professional (can be null)
  recipientName?: string // Name of the person receiving the treatment if not the user
  recipientPhone?: string // Phone of the person receiving the treatment
  recipientEmail?: string // Email of the person receiving the treatment
  recipientBirthDate?: Date // Birth date of the person receiving the treatment
  recipientGender?: "male" | "female" // Gender of the person receiving the treatment
  isBookingForSomeoneElse?: boolean
  professionalPaymentStatus?: "pending" | "paid" | "failed" // Professional payment status/ NEW FIELD
  formState?: { // NEW FIELD for storing form data for recovery
    currentStep: number
    guestInfo?: any
    guestAddress?: any
    bookingOptions?: any
    calculatedPrice?: any
    savedAt: Date
  }
  createdAt: Date
  updatedAt: Date
  reviewReminderSentAt?: Date
  suitableProfessionals?: Array<{
    professionalId: Types.ObjectId
    name: string
    email: string
    phone?: string
    gender?: string
    profileId: Types.ObjectId
    calculatedAt: Date
  }>
  step: 1 | 2 | 3 | 4 | 5 | 6 | 7 // מעקב שלבי wizard
  treatmentCategory: Types.ObjectId // קטגוריית טיפול
  staticTreatmentPrice: number // מחיר טיפול סטטי
  staticTherapistPay: number // תשלום מטפל סטטי
  staticTimeSurcharge?: number // תוספת מחיר זמן סטטית
  staticTimeSurchargeReason?: string // סיבת תוספת זמן
  staticTherapistPayExtra?: number // תוספת תשלום למטפל
  companyFee: number // עמלת החברה
  isGift: boolean
  giftGreeting?: string
  giftSendWhen?: "now" | Date
  giftHidePrice?: boolean
  consents: IBookingConsents
  enhancedPaymentDetails?: IEnhancedPaymentDetails
  review?: IBookingReview
}

const ProfessionalShareSchema = new Schema<IProfessionalShare>({
  amount: { type: Number, default: 0 },
  type: { type: String, enum: ["fixed", "percentage"], default: "percentage" },
}, { _id: false })

// ➕ סכמות חדשות
const BookingConsentsSchema = new Schema<IBookingConsents>({
  customerAlerts: { type: String, enum: ["sms", "email", "none"], required: true },
  patientAlerts: { type: String, enum: ["sms", "email", "none"], required: true },
  marketingOptIn: { type: Boolean, required: true },
  termsAccepted: { type: Boolean, required: true },
}, { _id: false })

const EnhancedPaymentDetailsSchema = new Schema<IEnhancedPaymentDetails>({
  transactionId: { type: Schema.Types.ObjectId, ref: "Transaction" },
  amountPaid: { type: Number, min: 0 },
  cardLast4: { type: String, maxlength: 4 },
  cardHolder: { type: String, trim: true },
  paymentStatus: { type: String, enum: ["success", "fail"] },
}, { _id: false })

const BookingReviewSchema = new Schema<IBookingReview>({
  rating: { type: Number, enum: [1, 2, 3, 4, 5], required: true },
  comment: { type: String, trim: true },
}, { _id: false })

const PriceDetailsSchema = new Schema<IPriceDetails>(
  {
    basePrice: { type: Number, required: true, min: 0 },
    surcharges: [
      {
        description: { type: String, required: true },
        amount: { type: Number, required: true, min: 0 },
        professionalShare: { type: ProfessionalShareSchema, default: undefined },
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
    totalProfessionalPayment: { type: Number, min: 0 },
    totalOfficeCommission: { type: Number, min: 0 },
    baseProfessionalPayment: { type: Number, min: 0 },
    surchargesProfessionalPayment: { type: Number, min: 0 },
    professionalPaymentOverride: { type: Number, min: 0 },
  },
  { _id: false },
)

const PaymentDetailsSchema = new Schema<IPaymentDetails>(
  {
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
    city: { type: String, required: true }, // Note: Must be from active cities in database only
    street: { type: String, required: true },
    streetNumber: { type: String },
    addressType: { type: String, enum: ["apartment", "house", "office", "hotel", "other"], required: true },
    apartment: { type: String },
    entrance: { type: String },
    floor: { type: String },
    notes: { type: String },
    doorName: { type: String }, // for house
    buildingName: { type: String }, // for office
    hotelName: { type: String }, // for hotel
    roomNumber: { type: String }, // for hotel
    instructions: { type: String }, // for other
    otherInstructions: { type: String },
    hasPrivateParking: { type: Boolean },
  },
  { _id: false },
)

const BookingSchema: Schema<IBooking> = new Schema(
  {
    bookingNumber: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: false }, // Made optional for guest bookings
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
        "pending_payment",
        "pending_professional",
        "confirmed",
        "on_way",
        "in_treatment",
        "completed",
        "cancelled",
        "refunded",
      ],
      default: "pending_payment",
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
    refundAmount: { type: Number, min: 0 },
    refundTransactionId: { type: String },
    professionalId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    recipientName: { type: String, trim: true },
    recipientPhone: { type: String, trim: true },
    recipientEmail: { type: String, trim: true },
    recipientBirthDate: { type: Date },
    recipientGender: { type: String, enum: ["male", "female"] },
    isBookingForSomeoneElse: { type: Boolean, default: false },
    professionalPaymentStatus: { 
      type: String, 
      enum: ["pending", "paid", "failed"], 
      default: "pending" 
    },
    reviewReminderSentAt: { type: Date },
    formState: {
      currentStep: { type: Number },
      guestInfo: { type: Schema.Types.Mixed },
      guestAddress: { type: Schema.Types.Mixed },
      bookingOptions: { type: Schema.Types.Mixed },
      calculatedPrice: { type: Schema.Types.Mixed },
      savedAt: { type: Date },
    },
    suitableProfessionals: [
      {
        professionalId: { type: Schema.Types.ObjectId, ref: "User" },
        name: { type: String },
        email: { type: String },
        phone: { type: String },
        gender: { type: String },
        profileId: { type: Schema.Types.ObjectId, ref: "UserProfile" },
        calculatedAt: { type: Date },
      },
    ],
    // ➕ שדות חדשים - optional לתאימות לאחור
    step: { type: Number, enum: [1, 2, 3, 4, 5, 6, 7], default: 1 },
    treatmentCategory: { type: Schema.Types.ObjectId, ref: "TreatmentCategory" },
    staticTreatmentPrice: { type: Number, min: 0 },
    staticTherapistPay: { type: Number, min: 0 },
    staticTimeSurcharge: { type: Number, min: 0 },
    staticTimeSurchargeReason: { type: String, trim: true },
    staticTherapistPayExtra: { type: Number, min: 0 },
    companyFee: { type: Number, min: 0 },
    isGift: { type: Boolean, default: false },
    giftGreeting: { type: String, trim: true },
    giftSendWhen: { type: Schema.Types.Mixed }, // תומך ב"now" או Date
    giftHidePrice: { type: Boolean, default: false },
    consents: { type: BookingConsentsSchema },
    enhancedPaymentDetails: { type: EnhancedPaymentDetailsSchema },
    review: { type: BookingReviewSchema },
  },
  { timestamps: true },
)

// Indexes for performance (bookingNumber unique index is automatically created by unique: true)
BookingSchema.index({ userId: 1, bookingDateTime: -1 })
BookingSchema.index({ status: 1, bookingDateTime: 1 })
BookingSchema.index({ professionalId: 1, bookingDateTime: 1, status: 1 })
BookingSchema.index({ bookedByUserEmail: 1 }) // For guest booking searches
BookingSchema.index({ recipientEmail: 1 }) // For recipient searches
BookingSchema.index({ treatmentId: 1, bookingDateTime: 1 }) // For treatment-based queries
BookingSchema.index({ step: 1 }) // For wizard step tracking

const Booking: Model<IBooking> = mongoose.models.Booking || mongoose.model<IBooking>("Booking", BookingSchema)

export default Booking
export { Booking }
