// types/booking.d.ts
import type { Types } from "mongoose"
import type { ITreatmentDuration } from "@/lib/db/models/treatment"
import type { IAddress } from "@/lib/db/models/address"
import type { IUser } from "@/lib/db/models/user"
import type { IBooking, IPaymentDetails } from "@/lib/db/models/booking" // Assuming IBooking is here
import type { IGiftVoucher } from "@/lib/db/models/gift-voucher"
import type { ICoupon } from "@/lib/db/models/coupon"

// Existing PopulatedBooking - make sure it's comprehensive for user view
export interface PopulatedBooking
  extends Omit<
    IBooking,
    | "treatmentId"
    | "addressId"
    | "professionalId"
    | "selectedDurationId"
    | "userId"
    | "appliedCouponId"
    | "redeemedGiftVoucherId"
    | "redeemedUserSubscriptionId"
    | "paymentDetails"
  > {
  _id: Types.ObjectId
  userId: {
    _id: Types.ObjectId
    name?: string | null
    email?: string | null
    phone?: string | null
  } | null
  treatmentId?: {
    _id: Types.ObjectId
    name: string
    selectedDuration?: ITreatmentDuration // Populated based on selectedDurationId
  } | null
  addressId?: Pick<IAddress, "_id" | "city" | "street" | "streetNumber" | "fullAddress" | "notes"> | null
  professionalId?: Pick<IUser, "_id" | "name" | "email" | "phone"> | null
  appliedCouponId?: Pick<ICoupon, "_id" | "code" | "discountType" | "discountValue"> | null
  redeemedGiftVoucherId?: Pick<IGiftVoucher, "_id" | "code" | "voucherType" | "originalAmount" | "treatmentName"> | null
  redeemedUserSubscriptionId?: {
    _id: Types.ObjectId
    subscriptionId?: { name?: string } | null // Assuming subscription has a name
    treatmentId?: { name?: string } | null // Assuming treatment has a name
    remainingQuantity?: number
  } | null
  paymentDetails: IPaymentDetails & {
    paymentMethodId?: {
      _id: Types.ObjectId
      type?: string // e.g., 'card', 'paypal'
      last4?: string // if card
      brand?: string // if card
    } | null
  }
}

// New type for Admin view, extending PopulatedBooking with more details if needed
// or being more specific about what an admin sees.
export interface AdminPopulatedBooking extends PopulatedBooking {
  // Potentially add more admin-specific populated fields here if different from PopulatedBooking
  // For now, we assume PopulatedBooking can be made comprehensive enough.
  // If we add adminNotes to IBooking, it will be available here.
  adminNotes?: string
  // We can add full user, professional, etc. objects if needed beyond Pick
}

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
  appliedCouponId?: string
  appliedGiftVoucherId?: string
  redeemedUserSubscriptionId?: string
}

export type TimeSlot = {
  time: string
  isAvailable: boolean
  surcharge?: {
    description: string
    amount: number
  }
}
