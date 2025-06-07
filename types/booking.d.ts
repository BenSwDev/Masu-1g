// types/booking.d.ts
import type { Types } from "mongoose"
import type { IBooking, IPriceDetails, IPaymentDetails } from "@/lib/db/models/booking"
import type { IAddress } from "@/lib/db/models/address"
import type { IUser } from "@/lib/db/models/user"
import type { ITreatment, ITreatmentDuration } from "@/lib/db/models/treatment"
import type { ICoupon } from "@/lib/db/models/coupon"
import type { IGiftVoucher, IGiftVoucherUsageHistory } from "@/lib/db/models/gift-voucher"
import type { IUserSubscription } from "@/lib/db/models/user-subscription"
import type { ISubscription } from "@/lib/db/models/subscription"
import type { IPaymentMethod } from "@/lib/db/models/payment-method"

export interface CalculatedPriceDetails {
  basePrice: number
  surcharges: { description: string; amount: number }[]
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
  // selectedDurationId is still present from IBooking for logic, but display components might use treatmentId.durations
}

// Ensure ITreatmentDuration is also available if not already globally typed or re-exported
export type { ITreatmentDuration }
