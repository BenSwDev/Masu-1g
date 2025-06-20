// types/booking.d.ts
import type { Types } from "mongoose"
import type { IBooking, IPriceDetails, IPaymentDetails } from "@/lib/db/models/booking"
import type { IAddress } from "@/lib/db/models/address"
import type { IUser } from "@/lib/db/models/user"
import type { ITreatment, ITreatmentDuration } from "@/lib/db/models/treatment"
import type { ICoupon } from "@/lib/db/models/coupon"
import type { IGiftVoucher } from "@/lib/db/models/gift-voucher"
import type { IUserSubscription } from "@/lib/db/models/user-subscription"
import type { ISubscription } from "@/lib/db/models/subscription"
import type { IPaymentMethod } from "@/lib/db/models/payment-method"

// ➕ NEW TYPES for enhanced booking workflow
export type BookingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
export type NotificationPreference = "sms" | "email" | "none"
export type PaymentStatus = "success" | "fail"
export type BookingRating = 1 | 2 | 3 | 4 | 5

// Gift functionality types
export interface GiftSettings {
  isGift: boolean
  greeting?: string
  sendWhen?: "now" | Date
  hidePrice?: boolean
}

// Consents types
export interface BookingConsents {
  customerAlerts: NotificationPreference
  patientAlerts: NotificationPreference
  marketingOptIn: boolean
  termsAccepted: boolean
}

// Enhanced payment details
export interface EnhancedPaymentDetails {
  transactionId?: Types.ObjectId
  amountPaid?: number
  cardLast4?: string
  cardHolder?: string
  paymentStatus?: PaymentStatus
}

// Review system
export interface BookingReview {
  rating: BookingRating
  comment?: string
}

// Static pricing snapshot
export interface StaticPricingSnapshot {
  staticTreatmentPrice?: number
  staticTherapistPay?: number
  staticTimeSurcharge?: number
  staticTimeSurchargeReason?: string
  staticTherapistPayExtra?: number
  companyFee?: number
}

// Add missing TimeSlot interface
export interface TimeSlot {
  time: string // Format "HH:mm"
  isAvailable: boolean
  surcharge?: {
    description: string
    amount: number
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

export interface PopulatedPaymentDetails extends Omit<IPaymentDetails, "paymentMethodId"> {
  paymentMethodId?: Pick<IPaymentMethod, "_id" | "type" | "last4" | "brand" | "isDefault" | "displayName"> | null
}

export interface PopulatedBookingTreatment
  extends Pick<ITreatment, "_id" | "name" | "pricingType" | "defaultDurationMinutes" | "fixedPrice"> {
  durations?: ITreatmentDuration[]
}

export interface PopulatedBooking
  extends Omit<
    IBooking,
    "treatmentId" | "addressId" | "professionalId" | "selectedDurationId" | "priceDetails" | "paymentDetails"
  > {
  _id: Types.ObjectId
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
  userPaymentMethods: any[]
  activeTreatments: any[]
  workingHoursSettings: any
  currentUser: {
    id: string
    name: string
    email: string
    phone?: string
  }
}

export interface SelectedBookingOptions {
  // Step tracking
  step?: BookingStep
  
  // Treatment selection (Step 1)
  selectedTreatmentId?: string
  selectedDurationId?: string
  treatmentCategory?: string
  
  // Scheduling (Step 2)
  bookingDate?: string
  bookingTime?: string
  therapistGenderPreference: "male" | "female" | "any"
  isFlexibleTime: boolean
  flexibilityRangeHours?: number
  
  // Details (Step 3) - Enhanced with gift functionality
  notes?: string
  source: "new_purchase" | "subscription_redemption" | "gift_voucher_redemption"
  selectedUserSubscriptionId?: string
  selectedGiftVoucherId?: string
  appliedCouponCode?: string
  recipientName?: string
  recipientPhone?: string
  recipientEmail?: string
  recipientBirthDate?: Date
  recipientGender?: "male" | "female" | "other"
  isBookingForSomeoneElse?: boolean
  
  // ➕ Gift settings (Step 3)
  giftSettings?: GiftSettings
  
  // Address (Step 4)
  selectedAddressId?: string
  customAddressDetails?: any
  
  // Summary (Step 5) - no additional fields needed
  
  // Payment & Consents (Step 6)
  paymentMethodId?: string
  consents?: BookingConsents
  
  // Static pricing snapshots (calculated dynamically but stored statically)
  staticPricing?: StaticPricingSnapshot
}
