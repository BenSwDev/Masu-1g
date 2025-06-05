import type { IBooking as OriginalIBooking, IPriceDetails, IPaymentDetails } from "@/lib/db/models/booking"
import type { ITreatment } from "@/lib/db/models/treatment"
import type { IUser } from "@/lib/db/models/user"
import type { IAddress } from "@/lib/db/models/address"

// Simplified Treatment structure for population
export interface PopulatedTreatmentForBooking
  extends Pick<ITreatment, "_id" | "name" | "category" | "pricingType" | "defaultDurationMinutes"> {
  _id: string
  durations?: Array<{ _id?: string; minutes: number; price: number; isActive?: boolean }>
}

// Simplified Professional (User) structure for population
export interface PopulatedProfessionalForBooking extends Pick<IUser, "name" | "email"> {
  _id: string
}

// Simplified Address structure for population
export interface PopulatedAddressForBooking
  extends Pick<
    IAddress,
    "fullAddress" | "city" | "street" | "streetNumber" | "addressType" | "isDefault" | "instructions"
  > {
  _id: string
}

export interface PopulatedPriceDetails
  extends Omit<IPriceDetails, "appliedCouponId" | "appliedGiftVoucherId" | "redeemedUserSubscriptionId"> {
  appliedCouponId?: string
  appliedGiftVoucherId?: string
  redeemedUserSubscriptionId?: string
}

export interface PopulatedPaymentDetails extends Omit<IPaymentDetails, "paymentMethodId"> {
  paymentMethodId?: string
}

// Interface for a booking object after population and stringification of ObjectIds
export interface PopulatedBooking
  extends Omit<
    OriginalIBooking,
    | "_id"
    | "userId"
    | "treatmentId"
    | "selectedDurationId"
    | "professionalId"
    | "addressId"
    | "priceDetails"
    | "paymentDetails"
    | "appliedCouponId"
    | "redeemedGiftVoucherId"
    | "redeemedUserSubscriptionId"
  > {
  _id: string
  userId: { _id: string; name?: string; email?: string } // Assuming User model has name and email
  treatmentId: PopulatedTreatmentForBooking
  selectedDurationId?: string
  selectedDuration?: { minutes: number; price: number } // Derived from treatmentId.durations and booking.selectedDurationId
  professionalId?: PopulatedProfessionalForBooking | null
  addressId?: PopulatedAddressForBooking | null
  customAddressDetails?: {
    fullAddress: string
    city: string
    street: string
    streetNumber?: string
    notes?: string
  }
  priceDetails: PopulatedPriceDetails
  paymentDetails: PopulatedPaymentDetails
  appliedCouponId?: string
  redeemedGiftVoucherId?: string
  redeemedUserSubscriptionId?: string
  createdAt: string // Dates will be stringified
  updatedAt: string
  bookingDateTime: string // Dates will be stringified
}

// Keep existing TimeSlot and CalculatedPriceDetails if they are used elsewhere, or integrate.
// For this feature, PopulatedBooking is the primary type for displaying bookings.
export interface TimeSlot {
  time: string // e.g., "09:00"
  isAvailable: boolean
  surcharge?: {
    description: string
    amount: number
  }
}

export interface CalculatedPriceDetails {
  basePrice: number
  surcharges: { description: string; amount: number }[]
  totalSurchargesAmount: number
  treatmentPriceAfterSubscriptionOrTreatmentVoucher: number
  couponDiscount: number
  voucherAppliedAmount: number
  finalAmount: number
  isBaseTreatmentCoveredBySubscription?: boolean
  isBaseTreatmentCoveredByTreatmentVoucher?: boolean
  isFullyCoveredByVoucherOrSubscription?: boolean
  appliedCouponId?: string
  appliedGiftVoucherId?: string
  redeemedUserSubscriptionId?: string
}
