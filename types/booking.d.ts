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
import type { IPaymentMethod } from "@/lib/db/models/payment-method"

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

// ➕ Export types from model for consistency
export type { 
  IBookingConsents, 
  IEnhancedPaymentDetails, 
  IBookingReview,
  BookingStatus 
} from "@/lib/db/models/booking"

// ➕ טיפוסים חדשים למידע מתנות
export interface BookingGiftInfo {
  isGift: boolean
  giftGreeting?: string
  giftSendWhen?: "now" | Date
  giftHidePrice?: boolean
}

// ➕ טיפוס לנתוני מחירים סטטיים - עקבי עם המודל
export interface StaticPricingData {
  staticTreatmentPrice: number
  staticTherapistPay: number
  companyFee: number
  staticTimeSurcharge?: number
  staticTimeSurchargeReason?: string
  staticTherapistPayExtra?: number
}

// ✅ טיפוס מחירים מחושבים - עודכן להתאמה למודל
export interface CalculatedPriceDetails {
  basePrice: number
  surcharges: { description: string; amount: number; professionalShare?: { amount: number; type: "fixed" | "percentage" } }[]
  totalSurchargesAmount: number
  treatmentPriceAfterSubscriptionOrTreatmentVoucher: number
  discountAmount: number // Updated name to match model (was: couponDiscount)
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

// ✅ PopulatedBooking מעודכן להיות עקבי עם IBooking במודל
export interface PopulatedBooking
  extends Omit<
    IBooking,
    "treatmentId" | "addressId" | "professionalId" | "selectedDurationId" | "priceDetails" | "paymentDetails"
  > {
  _id: Types.ObjectId
  treatmentId?: PopulatedBookingTreatment | null
  selectedDurationId?: Types.ObjectId
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
  // ➕ שדות חדשים מהמודל שהיו חסרים
  step: 1 | 2 | 3 | 4 | 5 | 6 | 7
  treatmentCategory: Types.ObjectId
  staticTreatmentPrice: number
  staticTherapistPay: number
  companyFee: number
  staticTimeSurcharge?: number
  staticTimeSurchargeReason?: string
  staticTherapistPayExtra?: number
  isGift: boolean
  giftGreeting?: string
  giftSendWhen?: "now" | Date
  giftHidePrice?: boolean
  consents: IBookingConsents
  enhancedPaymentDetails?: IEnhancedPaymentDetails
  review?: IBookingReview
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
  selectedAddressId?: string
  customAddressDetails?: Partial<IAddress>
  therapistGenderPreference: "male" | "female" | "any"
  selectedPaymentMethodId?: string
  source: "new_purchase" | "subscription_redemption" | "gift_voucher_redemption"
  selectedUserSubscriptionId?: string
  selectedGiftVoucherId?: string
  appliedCouponCode?: string
  // New unified redemption field
  redemptionCode?: string
  redemptionData?: RedemptionCode
}
