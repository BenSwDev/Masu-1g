import { z } from "zod"

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
})

// Schema for scheduling details
export const SchedulingDetailsSchema = z.object({
  bookingDate: z.date({ required_error: "bookings.validation.dateRequired" }),
  bookingTime: z.string({ required_error: "bookings.validation.timeRequired" }),
  selectedAddressId: z.string({ required_error: "bookings.validation.addressRequired" }),
  therapistGenderPreference: z.enum(["any", "male", "female"]).default("any"),
  notes: z.string().max(500, "bookings.validation.notesTooLong").optional(),
  isFlexibleTime: z.boolean().default(false),
  flexibilityRangeHours: z.number().min(1).max(12).optional(),
})

// Schema for the summary/coupon step
export const SummarySchema = z.object({
  appliedCouponCode: z.string().optional(),
})

// Schema for payment details
export const PaymentDetailsSchema = z.object({
  selectedPaymentMethodId: z.string({
    required_error: "bookings.validation.paymentMethodRequired",
  }),
})

// Combined schema for the entire booking wizard state (can be used for context or final validation)
export const BookingWizardSchema = BookingSourceSchema.merge(TreatmentSelectionSchema)
  .merge(SchedulingDetailsSchema)
  .merge(SummarySchema)
  .merge(PaymentDetailsSchema) // Merge payment only if finalAmount > 0
  .refine(
    (data) => {
      // If treatment is duration-based and not fully covered by a subscription/voucher that dictates duration,
      // then selectedDurationId is required.
      // This logic is complex to represent purely in Zod without fetching treatment data.
      // For now, we assume client-side logic handles this, or it's part of a more complex server-side validation.
      // A simpler check: if selectedTreatmentId is present and it's known to be duration-based, selectedDurationId must be present.
      // This refinement might be better handled in the component or action.
      return true // Placeholder for more complex cross-field validation
    },
    {
      message: "bookings.validation.durationRequiredForType",
      path: ["selectedDurationId"],
    },
  )

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
// This largely mirrors the IBooking structure but focuses on input validation
export const CreateBookingPayloadSchema = z.object({
  userId: z.string(),
  treatmentId: z.string(),
  selectedDurationId: z.string().optional(),
  bookingDateTime: z.date(),
  selectedAddressId: z.string(),
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
  appliedCouponId: z.string().optional(), // This should be ID, not code, after validation
  isFlexibleTime: z.boolean().optional(),
  flexibilityRangeHours: z.number().optional(),
})

export type BookingSourceFormValues = z.infer<typeof BookingSourceSchema>
export type TreatmentSelectionFormValues = z.infer<typeof TreatmentSelectionSchema>
export type SchedulingFormValues = z.infer<typeof SchedulingDetailsSchema>
export type SummaryFormValues = z.infer<typeof SummarySchema>
export type PaymentFormValues = z.infer<typeof PaymentDetailsSchema>

export type CalculatePricePayloadType = z.infer<typeof CalculatePricePayloadSchema>
export type CreateBookingPayloadType = z.infer<typeof CreateBookingPayloadSchema>
