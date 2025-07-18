// types/booking.d.ts
import type { Types } from "mongoose"
import type { IBooking, IPriceDetails, IPaymentDetails, IBookingConsents, IEnhancedPaymentDetails, IBookingReview } from "@/lib/db/models/booking"
import type { IAddress } from "@/lib/db/models/address"
import type { IUser } from "@/lib/db/models/user"
import type { ITreatment, ITreatmentDuration } from "@/lib/db/models/treatment"
import type { ICoupon } from "@/lib/db/models/coupon"
import type { IGiftVoucher } from "@/lib/db/models/gift-voucher"
import type { IUserSubscription } from "@/lib/db/models/user-subscription"
import type { ISubscription } from "@/lib/db/models/subscription"
// Removed PaymentMethod import - no longer using payment methods

// Add missing TimeSlot interface
export interface TimeSlot {
  time: string // Format "HH:mm"
  isAvailable: boolean
  surcharge?: {
    description: string
    amount: number
    professionalShare?: { amount: number; type: "fixed" | "percentage" }
  }
}

// Add missing IGiftVoucherUsageHistory type
export interface IGiftVoucherUsageHistory {
  date: Date
  amountUsed: number
  orderId?: Types.ObjectId
  description?: string
  userId?: Types.ObjectId
}

// ➕ טיפוסים חדשים מהמודל
export type { IBookingConsents, IEnhancedPaymentDetails, IBookingReview }

// ➕ טיפוסים חדשים למידע מתנות
export interface BookingGiftInfo {
  isGift: boolean
  giftGreeting?: string
  giftSendWhen?: "now" | Date
  giftHidePrice?: boolean
}

// ➕ טיפוס לנתוני מחירים סטטיים
export interface StaticPricingData {
  staticTreatmentPrice: number
  staticTherapistPay: number
  companyFee: number
  staticTimeSurcharge?: number
  staticTimeSurchargeReason?: string
  staticTherapistPayExtra?: number
}

export interface CalculatedPriceDetails {
  basePrice: number
  surcharges: { description: string; amount: number; professionalShare?: { amount: number; type: "fixed" | "percentage" } }[]
  totalSurchargesAmount: number
  treatmentPriceAfterSubscriptionOrTreatmentVoucher: number
  couponDiscount: number
  voucherAppliedAmount: number
  finalAmount: number
  isBaseTreatmentCoveredBySubscription: boolean
  isBaseTreatmentCoveredByTreatmentVoucher: boolean
  isFullyCoveredByVoucherOrSubscription: boolean
  appliedCouponId?: string // Will be ObjectId string
  appliedGiftVoucherId?: string // Will be ObjectId string
  redeemedUserSubscriptionId?: string // Will be ObjectId string
  discountAmount?: number
  // Financial breakdown
  totalProfessionalPayment: number // Total amount to be paid to professional
  totalOfficeCommission: number // Total office commission
  baseProfessionalPayment: number // Professional payment from base treatment
  surchargesProfessionalPayment: number // Professional payment from surcharges
  paymentBonus?: {
    amount: number
    description: string
    addedBy: string // admin user ID
    addedAt: Date
  }
}

export interface PopulatedPriceDetails
  extends Omit<IPriceDetails, "appliedCouponId" | "appliedGiftVoucherId" | "redeemedUserSubscriptionId"> {
  appliedCouponId?: ICoupon | null
  appliedGiftVoucherId?: (IGiftVoucher & { usageHistory?: IGiftVoucherUsageHistory[] }) | null
  redeemedUserSubscriptionId?:
    | (IUserSubscription & {
        subscriptionId: Pick<ISubscription, "_id" | "name" | "description">
        treatmentId: Pick<ITreatment, "_id" | "name" | "pricingType" | "defaultDurationMinutes" | "durations">
      })
    | null
}

export interface PopulatedPaymentDetails extends IPaymentDetails {
  // Removed paymentMethodId - using CARDCOM only
}

export interface PopulatedBookingTreatment
  extends Pick<ITreatment, "_id" | "name" | "pricingType" | "defaultDurationMinutes" | "fixedPrice"> {
  durations?: ITreatmentDuration[]
}

export interface PopulatedBooking
  extends Omit<
    IBooking,
    "treatmentId" | "addressId" | "professionalId" | "selectedDurationId" | "priceDetails" | "paymentDetails" | "_id" | "userId"
  > {
  _id: string
  userId?: Types.ObjectId | null
  treatmentId?: PopulatedBookingTreatment | null
  selectedDurationId?: Types.ObjectId // Add this back to interface
  // addressId is the original DB ref, bookingAddressSnapshot is used for display details
  addressId?: Pick<
    IAddress,
    | "_id"
    | "city"
    | "street"
    | "streetNumber"
    | "fullAddress"
    | "addressType"
    | "apartmentDetails"
    | "houseDetails"
    | "officeDetails"
    | "hotelDetails"
    | "otherDetails"
    | "additionalNotes"
  > | null
  professionalId?: Pick<IUser, "_id" | "name"> | null
  priceDetails: PopulatedPriceDetails
  paymentDetails: PopulatedPaymentDetails
  suitableProfessionals?: Array<{
    professionalId: Types.ObjectId
    name: string
    email: string
    phone?: string
    gender?: string
    profileId: Types.ObjectId
    calculatedAt: Date
  }>
  // ➕ שדות חדשים מהמודל - הוספה מלאה
  step?: number
  treatmentCategory?: Types.ObjectId
  staticTreatmentPrice?: number
  staticTherapistPay?: number
  staticTimeSurcharge?: number
  staticTimeSurchargeReason?: string
  staticTherapistPayExtra?: number
  companyFee?: number
  isGift?: boolean
  giftGreeting?: string
  giftSendWhen?: "now" | Date
  giftHidePrice?: boolean
  consents?: IBookingConsents
  enhancedPaymentDetails?: IEnhancedPaymentDetails
  review?: IBookingReview
  customerReview?: {
    rating: number
    comment?: string
    status: "pending" | "approved" | "rejected"
    createdAt: Date
    reviewerName?: string
  }
  professionalReview?: {
    customerRating: number
    comment?: string
    experienceRating: "positive" | "negative" | "neutral"
    status: "pending" | "approved" | "rejected"
    createdAt: Date
  }
  endTime?: Date
  // selectedDurationId is still present from IBooking for logic, but display components might use treatmentId.durations
}

// Ensure ITreatmentDuration is also available if not already globally typed or re-exported
export type { ITreatmentDuration }

// Additional types for booking workflow
export interface BookingInitialData {
  activeUserSubscriptions: any[]
  usableGiftVouchers: any[]
  userPreferences: {
    therapistGender: "male" | "female" | "any"
    notificationMethods: string[]
    notificationLanguage: string
  }
  userAddresses: any[]
  activeTreatments: any[]
  workingHoursSettings: any
  currentUser: {
    id: string
    name: string
    email: string
    phone?: string
  }
}

// Add unified redemption types
export interface RedemptionCode {
  code: string
  type: "coupon" | "partner_coupon" | "monetary_voucher" | "treatment_voucher" | "subscription"
  isValid: boolean
  data?: ICoupon | IGiftVoucher | IUserSubscription
}

// Update booking options to include unified redemption
export interface SelectedBookingOptions {
  selectedTreatmentId: string
  selectedDurationId?: string
  selectedDateTime: Date | null
  bookingDate?: Date | string
  bookingTime?: string
  selectedAddressId?: string
  customAddressDetails?: Partial<IAddress>
  therapistGenderPreference: "male" | "female" | "any"
  source: "new_purchase" | "subscription_redemption" | "gift_voucher_redemption"
  selectedUserSubscriptionId?: string
  selectedGiftVoucherId?: string
  appliedCouponCode?: string
  isFlexibleTime?: boolean
  // New unified redemption field
  redemptionCode?: string
  redemptionData?: RedemptionCode
}
