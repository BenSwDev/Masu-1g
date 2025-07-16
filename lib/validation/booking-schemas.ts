import { z } from "zod"
import { startOfDay } from "date-fns"
import { formatInTimeZone, toZonedTime } from "date-fns-tz"
import { citySchema } from "@/lib/validation/city-validation"

// Define timezone constant
const TIMEZONE = "Asia/Jerusalem" // Israel timezone

// Create a timezone-aware today for validation
const getTodayInTimezone = () => {
  const now = new Date()
  const nowInTZ = toZonedTime(now, TIMEZONE)
  return startOfDay(nowInTZ)
}

// ➕ סכמות חדשות

// Schema for booking consents
const BookingConsentsSchema = z.object({
  customerAlerts: z.enum(["sms", "email", "none"], {
    required_error: "Customer alert method is required"
  }),
  patientAlerts: z.enum(["sms", "email", "none"], {
    required_error: "Patient alert method is required"
  }),
  marketingOptIn: z.boolean(),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "Terms must be accepted to proceed"
  }),
})

// Schema for gift information
const BookingGiftInfoSchema = z.object({
  isGift: z.boolean().default(false),
  giftGreeting: z.string().max(500, "Gift greeting too long").optional(),
  giftSendWhen: z.union([z.literal("now"), z.date()]).optional(),
  giftHidePrice: z.boolean().default(false),
})

// Schema for enhanced payment details
const EnhancedPaymentDetailsSchema = z.object({
  transactionId: z.string().optional(),
  amountPaid: z.number().min(0, "Amount must be positive").optional(),
  cardLast4: z.string().length(4, "Card last 4 must be exactly 4 digits").optional(),
  cardHolder: z.string().min(1, "Card holder name required").optional(),
  paymentStatus: z.enum(["success", "fail"]).optional(),
})

// Schema for booking review
const BookingReviewSchema = z.object({
  rating: z.number().int().min(1).max(5, "Rating must be between 1 and 5"),
  comment: z.string().max(1000, "Review comment too long").optional(),
})

// Schema for static pricing data
const StaticPricingDataSchema = z.object({
  staticTreatmentPrice: z.number().min(0, "Treatment price must be positive"),
  staticTherapistPay: z.number().min(0, "Therapist pay must be positive"),
  companyFee: z.number().min(0, "Company fee must be positive"),
  staticTimeSurcharge: z.number().min(0, "Time surcharge must be positive").optional(),
  staticTimeSurchargeReason: z.string().max(200, "Surcharge reason too long").optional(),
  staticTherapistPayExtra: z.number().min(0, "Extra therapist pay must be positive").optional(),
})

// Schema for selecting the booking source
const BookingSourceSchema = z.object({
  source: z.enum(["new_purchase", "subscription_redemption", "gift_voucher_redemption"], {
    required_error: "bookings.validation.sourceRequired",
  }),
})

// Schema for selecting treatment and duration
const TreatmentSelectionSchema = z.object({
  selectedUserSubscriptionId: z.string().optional(),
  selectedGiftVoucherId: z.string().optional(),
  selectedTreatmentId: z.string({ required_error: "bookings.validation.treatmentRequired" }),
  selectedDurationId: z.string().optional(), // Required if treatment is duration-based and not covered by sub/voucher
  therapistGenderPreference: z.enum(["any", "male", "female"]).default("any"),
})

// Schema for scheduling details
const SchedulingDetailsSchema = z
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
        fullAddress: z.string().min(1, "Full address is required"),
        city: z.string().min(1, "City is required"),
        street: z.string().min(1, "Street is required"),
        streetNumber: z.string().optional(),
        addressType: z.enum(["apartment", "house", "office", "hotel", "other"]).default("apartment"), // ✅ Fix: Add required addressType
        apartment: z.string().optional(),
        entrance: z.string().optional(),
        floor: z.string().optional(),
        notes: z.string().max(500, "Notes too long").optional(),
        doorName: z.string().optional(),
        buildingName: z.string().optional(),
        hotelName: z.string().optional(),
        roomNumber: z.string().optional(),
        otherInstructions: z.string().optional(),
        hasPrivateParking: z.boolean().optional(),
      })
      .optional(),
    notes: z.string().max(500, "bookings.validation.notesTooLong").optional(),
    isFlexibleTime: z.boolean().default(false),
    flexibilityRangeHours: z.number().min(1).max(12).optional(),
    isBookingForSomeoneElse: z.boolean().default(false),
    recipientName: z.string().optional(),
    recipientPhone: z.string().optional(),
      recipientEmail: z.string().email("bookings.validation.recipientEmailInvalid").optional().or(z.literal("")),
  recipientBirthDate: z.date().optional(),
  recipientGender: z.enum(["male", "female"]).optional(),
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
        // Gender is required when booking for someone else
        return !!data.recipientGender
      }
      return true
    },
    {
      message: "bookings.validation.recipientGenderRequired",
      path: ["recipientGender"],
    },
  )
  .refine(
    (data) => {
      // Age validation only applies if birth date is provided
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
const SummarySchema = z.object({
  // This schema is now effectively empty but kept for structure.
})

// Schema for payment details
const PaymentDetailsSchema = z.object({
  appliedCouponCode: z.string().optional(),
  agreedToTerms: z.boolean().refine((val) => val === true, {
    message: "bookings.validation.termsRequired",
  }),
  agreedToMarketing: z.boolean().default(true),
})

// Combined schema for the entire booking wizard state (can be used for context or final validation)
// Create base object schema first to avoid ZodEffects issues
const BaseBookingWizardSchema = z.object({
  // Booking source
  source: z.enum(["new_purchase", "subscription_redemption", "gift_voucher_redemption"], {
    required_error: "bookings.validation.sourceRequired",
  }),
  
  // Treatment selection
  selectedUserSubscriptionId: z.string().optional(),
  selectedGiftVoucherId: z.string().optional(),
  selectedTreatmentId: z.string({ required_error: "bookings.validation.treatmentRequired" }),
  selectedDurationId: z.string().optional(),
  therapistGenderPreference: z.enum(["any", "male", "female"]).default("any"),
  
  // Scheduling details
  bookingDate: z
    .date({ required_error: "bookings.validation.dateRequired" })
    .refine((date) => {
      const today = getTodayInTimezone()
      return date >= today
    }, {
      message: "bookings.validation.pastDateNotAllowed"
    }),
  bookingTime: z.string({ required_error: "bookings.validation.timeRequired" }),
  selectedAddressId: z.string().optional(),
  customAddressDetails: z
    .object({
      fullAddress: z.string().min(1, "Full address is required"),
      city: z.string().min(1, "City is required"),
      street: z.string().min(1, "Street is required"),
      streetNumber: z.string().optional(),
      addressType: z.enum(["apartment", "house", "office", "hotel", "other"]).default("apartment"), // ✅ Fix: Add required addressType
      apartment: z.string().optional(),
      entrance: z.string().optional(),
      floor: z.string().optional(),
      notes: z.string().max(500, "Notes too long").optional(),
      doorName: z.string().optional(),
      buildingName: z.string().optional(),
      hotelName: z.string().optional(),
      roomNumber: z.string().optional(),
      otherInstructions: z.string().optional(),
      hasPrivateParking: z.boolean().optional(),
    })
    .optional(),
  notes: z.string().max(500, "bookings.validation.notesTooLong").optional(),
  isFlexibleTime: z.boolean().default(false),
  flexibilityRangeHours: z.number().min(1).max(12).optional(),
  isBookingForSomeoneElse: z.boolean().default(false),
  recipientName: z.string().optional(),
  recipientPhone: z.string().optional(),
  recipientEmail: z.string().email("bookings.validation.recipientEmailInvalid").optional().or(z.literal("")),
  recipientBirthDate: z.date().optional(),
  recipientGender: z.enum(["male", "female"]).optional(),
  
  // Notification preferences for this booking
  notificationMethods: z.array(z.enum(["email", "sms"])).default(["email"]),
  recipientNotificationMethods: z.array(z.enum(["email", "sms"])).optional(), // For when booking for someone else
  notificationLanguage: z.enum(["he", "en", "ru"]).default("he"),
  
  // Payment details - Removed selectedPaymentMethodId (using CARDCOM directly)
  appliedCouponCode: z.string().optional(),
  agreedToTerms: z.boolean().refine((val) => val === true, {
    message: "bookings.validation.termsRequired",
  }),
  agreedToMarketing: z.boolean().default(true),
})

// Apply validations with refinements
const BookingWizardSchema = BaseBookingWizardSchema
  .refine((data) => !!data.selectedAddressId || !!data.customAddressDetails, {
    message: "bookings.validation.addressOrCustomRequired",
    path: ["selectedAddressId"],
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
        // Gender is required when booking for someone else
        return !!data.recipientGender
      }
      return true
    },
    {
      message: "bookings.validation.recipientGenderRequired",
      path: ["recipientGender"],
    },
  )


// Schema for the payload of calculateBookingPrice action
export const CalculatePricePayloadSchema = z.object({
  userId: z.string().optional(), // Made optional for guest bookings
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
  recipientGender: z.enum(["male", "female"]).optional(),
  guestPhone: z.string().optional(), // Add guest phone for ownership validation
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
      fullAddress: z.string().min(1, "Full address is required"),
      city: z.string().min(1, "City is required"),
      street: z.string().min(1, "Street is required"),
      streetNumber: z.string().optional(),
      addressType: z.enum(["apartment", "house", "office", "hotel", "other"]).default("apartment"), // ✅ Fix: Add required addressType
      apartment: z.string().optional(),
      entrance: z.string().optional(),
      floor: z.string().optional(),
      notes: z.string().max(500, "Notes too long").optional(),
      doorName: z.string().optional(),
      buildingName: z.string().optional(),
      hotelName: z.string().optional(),
      roomNumber: z.string().optional(),
      otherInstructions: z.string().optional(),
      hasPrivateParking: z.boolean().optional(),
    })
    .optional(),
  therapistGenderPreference: z.enum(["any", "male", "female"]).default("any"),
  notes: z.string().max(500).optional(),
  priceDetails: z.any(), // Assuming priceDetails is pre-calculated and validated
  paymentDetails: z.object({
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
  recipientGender: z.enum(["male", "female"]).optional(),
  notificationMethods: z.array(z.enum(["email", "sms"])).default(["email"]),
  recipientNotificationMethods: z.array(z.enum(["email", "sms"])).optional(),
  notificationLanguage: z.enum(["he", "en", "ru"]).default("he"),
  guestInfo: z.object({
    name: z.string(),
    email: z.string().email().optional(),
    phone: z.string(),
  }).optional(), // Optional for regular bookings, required for guest bookings
  
  // ➕ שדות חדשים - optional לתאימות לאחור
  step: z.number().int().min(1).max(7).default(1).optional(),
  treatmentCategory: z.string().optional(), // ObjectId as string
  staticPricingData: StaticPricingDataSchema.optional(),
  giftInfo: BookingGiftInfoSchema.optional(),
  consents: BookingConsentsSchema.optional(),
  enhancedPaymentDetails: EnhancedPaymentDetailsSchema.optional(),
  review: BookingReviewSchema.optional(),
})

type BookingSourceFormValues = z.infer<typeof BookingSourceSchema>
type TreatmentSelectionFormValues = z.infer<typeof TreatmentSelectionSchema>
type SchedulingFormValues = z.infer<typeof SchedulingDetailsSchema>
type SummaryFormValues = z.infer<typeof SummarySchema>
type PaymentFormValues = z.infer<typeof PaymentDetailsSchema>
type BookingWizardFormValues = z.infer<typeof BookingWizardSchema>

// Schema for guest booking creation (similar to CreateBookingPayloadSchema but with different userId handling)
export const CreateGuestBookingPayloadSchema = z.object({
  userId: z.string().optional(), // Optional for guest bookings
  treatmentId: z.string().min(1, "Treatment ID is required"),
  selectedDurationId: z.string().optional(),
  bookingDateTime: z.date()
    .refine((date) => {
      const today = getTodayInTimezone()
      return date >= today
    }, {
      message: "Booking date cannot be in the past"
    }),
  selectedAddressId: z.string().optional(), // Can be undefined if customAddressDetails is provided
  customAddressDetails: z // New: for one-time address
    .object({
      fullAddress: z.string().min(1, "Full address is required"),
      city: z.string().min(1, "City is required"),
      street: z.string().min(1, "Street is required"),
      streetNumber: z.string().optional(),
      addressType: z.enum(["apartment", "house", "office", "hotel", "other"]).default("apartment"), // ✅ Fix: Add required addressType
      apartment: z.string().optional(),
      entrance: z.string().optional(),
      floor: z.string().optional(),
      notes: z.string().max(500, "Notes too long").optional(),
      doorName: z.string().optional(),
      buildingName: z.string().optional(),
      hotelName: z.string().optional(),
      roomNumber: z.string().optional(),
      otherInstructions: z.string().optional(),
      hasPrivateParking: z.boolean().optional(),
    })
    .optional(),
  therapistGenderPreference: z.enum(["any", "male", "female"]).default("any"),
  notes: z.string().max(500, "Notes too long").optional(),
  priceDetails: z.any(), // Assuming priceDetails is pre-calculated and validated
  paymentDetails: z.object({
    paymentStatus: z.enum(["paid", "pending", "failed", "not_required", "refunded"]),
    transactionId: z.string().optional(),
  }),
  source: z.enum(["new_purchase", "subscription_redemption", "gift_voucher_redemption"]),
  redeemedUserSubscriptionId: z.string().optional(),
  redeemedGiftVoucherId: z.string().optional(),
  appliedCouponId: z.string().optional(),
  isFlexibleTime: z.boolean().optional(),
  flexibilityRangeHours: z.number().min(1).max(12).optional(),
  isBookingForSomeoneElse: z.boolean().optional(),
  recipientName: z.string().optional(),
  recipientPhone: z.string()
    .optional()
    .refine((phone) => {
      if (!phone) return true // Optional field
      // Basic Israeli phone validation
      const phoneRegex = /^(\+972|0)?[5-9]\d{8}$/
      return phoneRegex.test(phone.replace(/[-\s]/g, ""))
    }, {
      message: "Invalid phone format"
    }),
  recipientEmail: z.string().email("Invalid email format").optional().or(z.literal("")),
  recipientBirthDate: z.date().optional(),
  recipientGender: z.enum(["male", "female"]).optional(),
  notificationMethods: z.array(z.enum(["email", "sms"])).default(["email"]),
  recipientNotificationMethods: z.array(z.enum(["email", "sms"])).optional(),
  notificationLanguage: z.enum(["he", "en", "ru"]).default("he"),
  guestInfo: z.object({
    name: z.string().min(1, "Guest name is required"),
    email: z.string().email("Invalid email format").optional(),
    phone: z.string()
      .min(1, "Guest phone is required")
      .refine((phone) => {
        // Basic Israeli phone validation
        const phoneRegex = /^(\+972|0)?[5-9]\d{8}$/
        return phoneRegex.test(phone.replace(/[-\s]/g, ""))
      }, {
        message: "Invalid guest phone format"
      }),
  }).required(), // Required for guest bookings
  
  // ➕ שדות חדשים לאורחים - optional לתאימות לאחור
  step: z.number().int().min(1).max(7).default(1).optional(),
  treatmentCategory: z.string().optional(), // ObjectId as string
  staticPricingData: StaticPricingDataSchema.optional(),
  giftInfo: BookingGiftInfoSchema.optional(),
  consents: BookingConsentsSchema.optional(),
  enhancedPaymentDetails: EnhancedPaymentDetailsSchema.optional(),
  review: BookingReviewSchema.optional(),
})
.refine((data) => {
  // Either selectedAddressId or customAddressDetails must be provided
  return data.selectedAddressId || data.customAddressDetails
}, {
  message: "Either address ID or custom address details must be provided",
  path: ["selectedAddressId"]
})
.refine((data) => {
  // If booking for someone else, validate recipient details
  if (data.isBookingForSomeoneElse) {
    return data.recipientName && data.recipientName.trim().length > 0
  }
  return true
}, {
  message: "Recipient name is required when booking for someone else",
  path: ["recipientName"]
})
.refine((data) => {
  // If booking for someone else, validate recipient phone
  if (data.isBookingForSomeoneElse) {
    return data.recipientPhone && data.recipientPhone.trim().length > 0
  }
  return true
}, {
  message: "Recipient phone is required when booking for someone else",
  path: ["recipientPhone"]
})
.refine((data) => {
  // If booking for someone else, validate recipient gender
  if (data.isBookingForSomeoneElse) {
    return !!data.recipientGender
  }
  return true
}, {
  message: "Recipient gender is required when booking for someone else",
  path: ["recipientGender"]
})


export type CalculatePricePayloadType = z.infer<typeof CalculatePricePayloadSchema>
export type CreateBookingPayloadType = z.infer<typeof CreateBookingPayloadSchema>
export type CreateGuestBookingPayloadType = z.infer<typeof CreateGuestBookingPayloadSchema>

// ➕ טיפוסים חדשים
type BookingConsentsType = z.infer<typeof BookingConsentsSchema>
type BookingGiftInfoType = z.infer<typeof BookingGiftInfoSchema>
type EnhancedPaymentDetailsType = z.infer<typeof EnhancedPaymentDetailsSchema>
type BookingReviewType = z.infer<typeof BookingReviewSchema>
type StaticPricingDataType = z.infer<typeof StaticPricingDataSchema>
