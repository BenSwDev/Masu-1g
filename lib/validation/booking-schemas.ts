import { z } from "zod"
import { startOfDay } from "date-fns"
import { formatInTimeZone, toZonedTime } from "date-fns-tz"

// Define timezone constant
const TIMEZONE = "Asia/Jerusalem" // Israel timezone

// Create a timezone-aware today for validation
export const getTodayInTimezone = () => {
  const now = new Date()
  const nowInTZ = toZonedTime(now, TIMEZONE)
  return startOfDay(nowInTZ)
}

// Schema for selecting the booking source
export const BookingSourceSchema = z.object({
  source: z.enum(["new_purchase", "subscription_redemption", "gift_voucher_redemption"], {
    required_error: "bookings.validation.sourceRequired",
  }),
})

// Schema for selecting treatment and duration
export const TreatmentSelectionSchema = z.object({
  selectedUserSubscriptionId: z.string().optional(),
  selectedGiftVoucherId: z.string().optional(),
  selectedTreatmentId: z.string({ required_error: "bookings.validation.treatmentRequired" }),
  selectedDurationId: z.string().optional(), // Required if treatment is duration-based and not covered by sub/voucher
  therapistGenderPreference: z.enum(["any", "male", "female"]).default("any"),
})

// Schema for scheduling details
export const SchedulingDetailsSchema = z.object({
  bookingDate: z.preprocess((arg) => {
    if (typeof arg === 'string') {
      return new Date(arg);
    } else if (arg instanceof Date) {
      return arg;
    }
    return undefined;
  }, z.date({
    required_error: "bookings.validation.dateRequired",
    invalid_type_error: "bookings.validation.invalidDate",
  })),
  bookingTime: z.string({
    required_error: "bookings.validation.timeRequired",
    invalid_type_error: "bookings.validation.invalidTime",
  }),
  isFlexibleTime: z.boolean().default(false),
  flexibilityRangeHours: z.number().optional(),
  notes: z.string().optional(),
  isBookingForSomeoneElse: z.boolean().default(false),
  recipientName: z.string().optional(),
  recipientPhone: z.string().optional(),
  recipientEmail: z.string().email("bookings.validation.invalidEmail").optional(),
  recipientBirthDate: z.preprocess((arg) => {
    if (typeof arg === 'string') {
      return new Date(arg + 'T00:00:00');
    } else if (arg instanceof Date) {
      return arg;
    }
    return undefined;
  }, z.date().optional())
    .refine(
      (date) => {
        if (!date) return true;
        const minAge = 16;
        const today = new Date();
        let age = today.getFullYear() - date.getFullYear();
        const monthDiff = today.getMonth() - date.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
          age--;
        }
        return age >= minAge;
      },
      {
        message: "bookings.validation.recipientMinAge",
      }
    ),
  selectedAddressId: z.string().optional(),
  customAddressDetails: z.object({
    country: z.string(),
    city: z.string(),
    street: z.string(),
    streetNumber: z.string(),
    apartment: z.string().optional(),
    floor: z.string().optional(),
    entrance: z.string().optional(),
    addressType: z.enum(["apartment", "house", "private", "office", "hotel", "other"]),
    notes: z.string().optional(),
  }).optional(),
})

// Schema for the summary/coupon step
export const SummarySchema = z.object({
  // This schema is now effectively empty but kept for structure.
})

// Schema for payment details
export const PaymentDetailsSchema = z.object({
  selectedPaymentMethodId: z.string({
    required_error: "bookings.validation.paymentMethodRequired",
  }),
  appliedCouponCode: z.string().optional(),
  agreedToTerms: z.boolean().refine((val) => val === true, {
    message: "bookings.validation.termsRequired",
  }),
  agreedToMarketing: z.boolean().default(true),
})

// Combined schema for the entire booking wizard state (can be used for context or final validation)
export const BookingWizardSchema = BookingSourceSchema.merge(TreatmentSelectionSchema)
  .merge(SchedulingDetailsSchema)
  .merge(SummarySchema)
  .merge(PaymentDetailsSchema)

// Schema for the payload of calculateBookingPrice action
export const CalculatePricePayloadSchema = z.object({
  userId: z.string(),
  treatmentId: z.string(),
  selectedDurationId: z.string().optional(),
  bookingDateTime: z.date(),
  couponCode: z.string().optional(),
  giftVoucherCode: z.string().optional(),
  userSubscriptionId: z.string().optional(),
})

// Schema for the payload of createBooking action
export const CreateBookingPayloadSchema = z.object({
  userId: z.string(),
  treatmentId: z.string(),
  selectedDurationId: z.string().optional(),
  bookingDateTime: z.date(),
  selectedAddressId: z.string().optional(), // Can be undefined if customAddressDetails is provided
  customAddressDetails: z // New: for one-time address
    .object({
      fullAddress: z.string(),
      city: z.string(),
      street: z.string(),
      streetNumber: z.string().optional(),
      apartment: z.string().optional(),
      entrance: z.string().optional(),
      floor: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
  therapistGenderPreference: z.enum(["any", "male", "female"]).default("any"),
  notes: z.string().max(500).optional(),
  priceDetails: z.any(), // Assuming priceDetails is pre-calculated and validated
  paymentDetails: z.object({
    paymentMethodId: z.string().optional(), // Optional if fully covered
    paymentStatus: z.enum(["paid", "pending", "failed", "not_required", "refunded"]),
    transactionId: z.string().optional(),
  }),
  source: z.enum(["new_purchase", "subscription_redemption", "gift_voucher_redemption"]),
  redeemedUserSubscriptionId: z.string().optional(),
  redeemedGiftVoucherId: z.string().optional(),
  appliedCouponId: z.string().optional(),
  isFlexibleTime: z.boolean().optional(),
  flexibilityRangeHours: z.number().optional(),
  isBookingForSomeoneElse: z.boolean().optional(),
  recipientName: z.string().optional(),
  recipientPhone: z.string().optional(),
  recipientEmail: z.string().email("bookings.validation.invalidEmail").optional(),
  recipientBirthDate: z.date().optional(),
})

export type BookingSourceFormValues = z.infer<typeof BookingSourceSchema>
export type TreatmentSelectionFormValues = z.infer<typeof TreatmentSelectionSchema>
export type SchedulingFormValues = z.infer<typeof SchedulingDetailsSchema>
export type SummaryFormValues = z.infer<typeof SummarySchema>
export type PaymentFormValues = z.infer<typeof PaymentDetailsSchema>

export type CalculatePricePayloadType = z.infer<typeof CalculatePricePayloadSchema>
export type CreateBookingPayloadType = z.infer<typeof CreateBookingPayloadSchema>
