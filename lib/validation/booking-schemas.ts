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
export const SchedulingDetailsSchema = z
  .object({
    bookingDate: z
      .date({ required_error: "bookings.validation.dateRequired" })
      .refine((date) => {
        const today = getTodayInTimezone()
        return date >= today
      }, {
        message: "bookings.validation.pastDateNotAllowed"
      }),
    bookingTime: z.string({ required_error: "bookings.validation.timeRequired" }),
    selectedAddressId: z.string().optional(), // Made optional, will validate that either this or customAddress is present
    customAddressDetails: z // New: for one-time address
      .object({
        fullAddress: z.string({ required_error: "bookings.validation.address.fullAddressRequired" }),
        city: z.string({ required_error: "bookings.validation.address.cityRequired" }),
        street: z.string({ required_error: "bookings.validation.address.streetRequired" }),
        streetNumber: z.string().optional(),
        apartment: z.string().optional(),
        entrance: z.string().optional(),
        floor: z.string().optional(),
        notes: z.string().max(200, "bookings.validation.address.notesTooLong").optional(),
        hasPrivateParking: z.boolean().optional(),
      })
      .optional(),
    notes: z.string().max(500, "bookings.validation.notesTooLong").optional(),
    isFlexibleTime: z.boolean().default(false),
    flexibilityRangeHours: z.number().min(1).max(12).optional(),
    isBookingForSomeoneElse: z.boolean().default(false),
    recipientName: z.string().optional(),
    recipientPhone: z.string().optional(),
    recipientEmail: z.string().email("bookings.validation.recipientEmailInvalid").optional(),
    recipientBirthDate: z.date().optional(),
    recipientGender: z.enum(["male", "female", "other"]).optional(),
  })
  .refine(
    (data) => {
      if (data.isBookingForSomeoneElse) {
        return !!data.recipientName && data.recipientName.trim().length > 1
      }
      return true
    },
    {
      message: "bookings.validation.recipientNameRequired",
      path: ["recipientName"],
    },
  )
  .refine(
    (data) => {
      if (data.isBookingForSomeoneElse) {
        // Basic phone validation, can be enhanced
        return !!data.recipientPhone && data.recipientPhone.trim().length >= 9
      }
      return true
    },
    {
      message: "bookings.validation.recipientPhoneRequired",
      path: ["recipientPhone"],
    },
  )
  .refine(
    (data) => {
      if (data.isBookingForSomeoneElse) {
        return !!data.recipientEmail && data.recipientEmail.trim().length > 0
      }
      return true
    },
    {
      message: "bookings.validation.recipientEmailRequired",
      path: ["recipientEmail"],
    },
  )
  .refine(
    (data) => {
      if (data.isBookingForSomeoneElse && data.recipientBirthDate) {
        const today = new Date()
        const birthDate = new Date(data.recipientBirthDate)
        const age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        const dayDiff = today.getDate() - birthDate.getDate()
        
        // Adjust age if birthday hasn't occurred this year
        const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age
        
        return actualAge >= 16
      }
      return true
    },
    {
      message: "bookings.validation.recipientMustBe16OrOlder",
      path: ["recipientBirthDate"],
    },
  )
  .refine((data) => !!data.selectedAddressId || !!data.customAddressDetails, {
    message: "bookings.validation.addressOrCustomRequired",
    path: ["selectedAddressId"], // Or path: ["customAddressDetails"]
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
  isBookingForSomeoneElse: z.boolean().optional(),
  recipientName: z.string().optional(),
  recipientPhone: z.string().optional(),
  recipientEmail: z.string().optional(),
  recipientBirthDate: z.date().optional(),
  recipientGender: z.enum(["male", "female", "other"]).optional(),
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
  recipientEmail: z.string().optional(),
  recipientBirthDate: z.date().optional(),
  recipientGender: z.enum(["male", "female", "other"]).optional(),
  guestInfo: z.object({
    name: z.string(),
    email: z.string().email(),
    phone: z.string(),
  }).optional(), // Optional for regular bookings, required for guest bookings
})

export type BookingSourceFormValues = z.infer<typeof BookingSourceSchema>
export type TreatmentSelectionFormValues = z.infer<typeof TreatmentSelectionSchema>
export type SchedulingFormValues = z.infer<typeof SchedulingDetailsSchema>
export type SummaryFormValues = z.infer<typeof SummarySchema>
export type PaymentFormValues = z.infer<typeof PaymentDetailsSchema>

// Schema for guest booking creation (similar to CreateBookingPayloadSchema but with different userId handling)
export const CreateGuestBookingPayloadSchema = z.object({
  userId: z.string().optional(), // Optional for guest bookings
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
  recipientEmail: z.string().optional(),
  recipientBirthDate: z.date().optional(),
  recipientGender: z.enum(["male", "female", "other"]).optional(),
  guestInfo: z.object({
    name: z.string(),
    email: z.string().email(),
    phone: z.string(),
  }).required(), // Required for guest bookings
})

export type CalculatePricePayloadType = z.infer<typeof CalculatePricePayloadSchema>
export type CreateBookingPayloadType = z.infer<typeof CreateBookingPayloadSchema>
export type CreateGuestBookingPayloadType = z.infer<typeof CreateGuestBookingPayloadSchema>
