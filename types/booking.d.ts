import type {
  IUserSubscription as IUserSubscriptionBase, // Keep original
  ITreatment as ITreatmentBase, // Keep original
  ITreatmentDuration as ITreatmentDurationBase, // Keep original
  IAddress,
  IPaymentMethod,
  IWorkingHoursSettings,
  GiftVoucherPlain as IGiftVoucher,
} from "@/lib/db/models" // Assuming models export their interfaces or types

// Extend IUserSubscription for populated data in BookingInitialData
export type PopulatedUserSubscription = IUserSubscriptionBase & {
  subscriptionId: { _id: string; name: string /* other ISubscription fields if needed */ } // Assuming subscriptionId is populated
  treatmentId?: ITreatmentBase & { durations?: ITreatmentDurationBase[] } // treatmentId can be optional or fully populated
  selectedDurationDetails?: ITreatmentDurationBase // If a specific duration is tied to the user's subscription instance
}

export interface BookingInitialData {
  activeUserSubscriptions: PopulatedUserSubscription[] // Use the more specific type
  usableGiftVouchers: IGiftVoucher[]
  userPreferences: {
    therapistGender: "male" | "female" | "any"
    notificationMethods: ("email" | "sms")[]
    notificationLanguage: "en" | "he" | "ru"
  }
  userAddresses: IAddress[]
  userPaymentMethods: IPaymentMethod[]
  activeTreatments: (ITreatmentBase & { durations: ITreatmentDurationBase[] })[]
  workingHoursSettings: IWorkingHoursSettings
  translations: Record<string, string> // Added this based on your wizard props
}

export interface SelectedBookingOptions {
  source: "new_purchase" | "subscription_redemption" | "gift_voucher_redemption" | null
  selectedUserSubscriptionId?: string
  selectedGiftVoucherId?: string
  selectedTreatmentId: string | null
  selectedDurationId?: string | null // ID of ITreatmentDuration
  bookingDate: Date | null
  bookingTime: string | null // e.g., "14:30"
  isFlexibleTime: boolean
  flexibilityRangeHours?: number
  therapistGenderPreference: "male" | "female" | "any"
  selectedAddressId: string | null
  // Or custom address if new one is added during flow
  customAddress?: { city: string; street: string; streetNumber?: string; notes?: string }
  notes?: string
  appliedCouponCode?: string // Store code, ID will be resolved on server
}

export interface CalculatedPriceDetails {
  basePrice: number
  surcharges: { description: string; amount: number }[]
  couponDiscount: number
  voucherAppliedAmount: number // Renamed from voucherCoverage
  finalAmount: number
  isFullyCoveredByVoucherOrSubscription: boolean
  appliedCouponId?: string
  appliedGiftVoucherId?: string
  redeemedUserSubscriptionId?: string
}

// Payload for creating a booking
export interface CreateBookingPayload {
  userId: string
  treatmentId: string
  selectedDurationId?: string
  bookingDateTime: Date
  addressId?: string
  customAddressDetails?: { fullAddress: string; city: string; street: string; streetNumber?: string; notes?: string }
  therapistGenderPreference: "male" | "female" | "any"
  notes?: string
  priceDetails: CalculatedPriceDetails // This should be the final calculated price details
  paymentDetails: {
    paymentMethodId?: string // Required if finalAmount > 0
    paymentStatus: "pending" | "paid" | "failed" | "not_required"
  }
  source: "new_purchase" | "subscription_redemption" | "gift_voucher_redemption"
  redeemedUserSubscriptionId?: string
  redeemedGiftVoucherId?: string
  appliedCouponId?: string
  isFlexibleTime: boolean
  flexibilityRangeHours?: number
}

// Payload for calculating price
export interface CalculatePricePayload {
  treatmentId: string
  selectedDurationId?: string
  bookingDateTime: Date // Full date and time for surcharge calculation
  couponCode?: string
  giftVoucherCode?: string // Or ID if already selected
  userSubscriptionId?: string // If trying to redeem from subscription
  userId: string // To check ownership of voucher/subscription and coupon eligibility
}

export interface TimeSlot {
  time: string // "HH:mm"
  isAvailable: boolean
  surcharge?: { description: string; amount: number } // Optional surcharge for this specific slot
}
