"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import mongoose from "mongoose" // Keep mongoose for session and ObjectId if needed
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"

// Import Models directly
import Booking, { type IBooking } from "@/lib/db/models/booking"
import Treatment, { type ITreatment } from "@/lib/db/models/treatment"
import UserSubscription, { type IUserSubscription } from "@/lib/db/models/user-subscription"
import GiftVoucher, { type IGiftVoucher } from "@/lib/db/models/gift-voucher"
import Coupon from "@/lib/db/models/coupon"
import User from "@/lib/db/models/user" // Import User model
import Address from "@/lib/db/models/address" // Import Address model
import PaymentMethod from "@/lib/db/models/payment-method" // Import PaymentMethod model
import {
  WorkingHoursSettings,
  type IWorkingHoursSettings,
  type IFixedHours,
  type ISpecialDate,
} from "@/lib/db/models/working-hours"

import { logger } from "@/lib/logs/logger"
import type { TimeSlot } from "@/types/booking"
import { add, format, parse, set, getDay, isSameDay, addMinutes, isBefore, isAfter } from "date-fns"
import { CalculatePricePayloadSchema, CreateBookingPayloadSchema } from "@/lib/validation/booking-schemas"
import type { z } from "zod"

// Helper to get working hours for a specific date
function getDayWorkingHours(date: Date, settings: IWorkingHoursSettings): IFixedHours | ISpecialDate | null {
  // בדוק תחילה תאריכים מיוחדים - הם עוקפים את ההגדרות הכלליות
  const specialDateSetting = settings.specialDates?.find((sd) => isSameDay(new Date(sd.date), date))
  if (specialDateSetting) {
    return specialDateSetting
  }

  // אם אין תאריך מיוחד, השתמש בהגדרות הקבועות
  const dayOfWeek = getDay(date) // 0 for Sunday, 1 for Monday...
  const fixedDaySetting = settings.fixedHours?.find((fh) => fh.dayOfWeek === dayOfWeek)
  return fixedDaySetting || null
}

export async function getAvailableTimeSlots(
  dateString: string, // YYYY-MM-DD
  treatmentId: string,
  selectedDurationId?: string,
): Promise<{ success: boolean; timeSlots?: TimeSlot[]; error?: string; workingHoursNote?: string }> {
  try {
    await dbConnect()
    const selectedDate = parse(dateString, "yyyy-MM-dd", new Date())
    if (isNaN(selectedDate.getTime())) {
      return { success: false, error: "bookings.errors.invalidDate" }
    }

    const treatment = (await Treatment.findById(treatmentId).lean()) as ITreatment | null
    if (!treatment || !treatment.isActive) {
      return { success: false, error: "bookings.errors.treatmentNotFound" }
    }

    let treatmentDurationMinutes = 0
    if (treatment.pricingType === "fixed") {
      treatmentDurationMinutes = 60 // Placeholder: This should come from treatment data
    } else if (treatment.pricingType === "duration_based") {
      if (!selectedDurationId) return { success: false, error: "bookings.errors.durationRequired" }
      const durationObj = treatment.durations?.find((d) => d._id.toString() === selectedDurationId && d.isActive)
      if (!durationObj) return { success: false, error: "bookings.errors.durationNotFound" }
      treatmentDurationMinutes = durationObj.minutes
    }

    if (treatmentDurationMinutes <= 0) {
      return { success: false, error: "bookings.errors.invalidTreatmentDuration" }
    }

    const settings = (await WorkingHoursSettings.findOne().lean()) as IWorkingHoursSettings | null
    if (!settings) {
      return { success: false, error: "bookings.errors.workingHoursNotSet" }
    }

    const daySettings = getDayWorkingHours(selectedDate, settings)
    if (!daySettings || !daySettings.isActive) {
      return {
        success: true,
        timeSlots: [],
        workingHoursNote: daySettings?.notes || "bookings.messages.closedOnSelectedDate",
      }
    }

    const timeSlots: TimeSlot[] = []
    const slotInterval = 30 // minutes, can be configured

    const [startHour, startMinute] = daySettings.startTime.split(":").map(Number)
    const [endHour, endMinute] = daySettings.endTime.split(":").map(Number)

    let currentTimeSlot = set(selectedDate, { hours: startHour, minutes: startMinute, seconds: 0, milliseconds: 0 })
    const endTimeForDay = set(selectedDate, { hours: endHour, minutes: endMinute, seconds: 0, milliseconds: 0 })

    const now = new Date()
    const minimumBookingTime = add(now, { hours: 2 })

    while (isBefore(currentTimeSlot, endTimeForDay)) {
      const potentialEndTime = addMinutes(currentTimeSlot, treatmentDurationMinutes)
      let isSlotAvailable = true
      if (isSameDay(selectedDate, now) && isBefore(currentTimeSlot, minimumBookingTime)) {
        isSlotAvailable = false
      }
      if (isAfter(potentialEndTime, endTimeForDay)) {
        isSlotAvailable = false
      }

      if (isSlotAvailable) {
        const slot: TimeSlot = {
          time: format(currentTimeSlot, "HH:mm"),
          isAvailable: true,
        }

        // בדוק אם יש תוספת מחיר לזמן הזה
        if (daySettings.hasPriceAddition && daySettings.priceAddition && daySettings.priceAddition.amount > 0) {
          const surchargeAmount =
            daySettings.priceAddition.type === "fixed"
              ? daySettings.priceAddition.amount
              : (treatment.fixedPrice || 0) * (daySettings.priceAddition.amount / 100)

          if (surchargeAmount > 0) {
            slot.surcharge = {
              description: daySettings.notes || "bookings.surcharges.specialTime",
              amount: surchargeAmount,
            }
          }
        }

        timeSlots.push(slot)
      }
      currentTimeSlot = addMinutes(currentTimeSlot, slotInterval)
    }
    return { success: true, timeSlots, workingHoursNote: daySettings.notes }
  } catch (error) {
    logger.error("Error fetching available time slots:", { error })
    return { success: false, error: "bookings.errors.fetchTimeSlotsFailed" }
  }
}

export interface CalculatedPriceDetails {
  basePrice: number
  surcharges: { description: string; amount: number }[]
  couponDiscount: number
  voucherAppliedAmount: number
  finalAmount: number
  isFullyCoveredByVoucherOrSubscription: boolean
  appliedCouponId?: string
  appliedGiftVoucherId?: string
  redeemedUserSubscriptionId?: string
}

export async function calculateBookingPrice(
  payload: unknown,
): Promise<{ success: boolean; priceDetails?: CalculatedPriceDetails; error?: string; issues?: z.ZodIssue[] }> {
  const validationResult = CalculatePricePayloadSchema.safeParse(payload)
  if (!validationResult.success) {
    logger.warn("Invalid payload for calculateBookingPrice:", { issues: validationResult.error.issues })
    return { success: false, error: "common.invalidInput", issues: validationResult.error.issues }
  }
  const validatedPayload = validationResult.data

  try {
    await dbConnect()
    const {
      treatmentId,
      selectedDurationId,
      bookingDateTime,
      couponCode,
      giftVoucherCode,
      userSubscriptionId,
      userId,
    } = validatedPayload

    const treatment = (await Treatment.findById(treatmentId).populate("durations").lean()) as ITreatment | null
    if (!treatment || !treatment.isActive) {
      return { success: false, error: "bookings.errors.treatmentNotFound" }
    }

    let basePrice = 0
    let treatmentDurationMinutes = 0 // For surcharge calculation if needed, or other logic

    if (treatment.pricingType === "fixed") {
      basePrice = treatment.fixedPrice || 0
      // Assuming fixed price treatments have a standard duration, if not, this needs to be defined
      // For now, let's assume a default or it's not relevant for price calculation beyond basePrice
    } else if (treatment.pricingType === "duration_based") {
      if (!selectedDurationId) return { success: false, error: "bookings.errors.durationRequired" }
      const duration = treatment.durations?.find((d) => d._id.toString() === selectedDurationId && d.isActive)
      if (!duration) return { success: false, error: "bookings.errors.durationNotFound" }
      basePrice = duration.price
      treatmentDurationMinutes = duration.minutes
    }

    const priceDetails: CalculatedPriceDetails = {
      basePrice,
      surcharges: [],
      couponDiscount: 0,
      voucherAppliedAmount: 0, // Renamed from voucherCoverage for clarity
      finalAmount: basePrice,
      isFullyCoveredByVoucherOrSubscription: false,
      // appliedCouponId, appliedGiftVoucherId, redeemedUserSubscriptionId will be set later
    }

    // Apply surcharges first
    const settings = (await WorkingHoursSettings.findOne().lean()) as IWorkingHoursSettings | null
    if (settings) {
      const daySettings = getDayWorkingHours(bookingDateTime, settings)
      if (
        daySettings?.isActive &&
        daySettings.hasPriceAddition &&
        daySettings.priceAddition?.amount &&
        daySettings.priceAddition.amount > 0
      ) {
        const surchargeAmount =
          daySettings.priceAddition.type === "fixed"
            ? daySettings.priceAddition.amount
            : basePrice * (daySettings.priceAddition.amount / 100) // Percentage of base price

        if (surchargeAmount > 0) {
          priceDetails.surcharges.push({
            description: daySettings.notes || `bookings.surcharges.specialTime (${format(bookingDateTime, "HH:mm")})`,
            amount: surchargeAmount,
          })
          priceDetails.finalAmount += surchargeAmount
        }
      }
    }

    let currentPayableAmount = priceDetails.finalAmount

    // Apply User Subscription (if any, and if it covers the selected treatment/duration)
    if (userSubscriptionId) {
      const userSub = (await UserSubscription.findById(userSubscriptionId)
        .populate("subscriptionId") // Populate to get subscription plan details
        .populate({
          // Populate treatment details from the subscription
          path: "treatmentId",
          model: "Treatment",
          populate: { path: "durations" },
        })
        .lean()) as (IUserSubscription & { treatmentId: ITreatment }) | null

      if (
        userSub &&
        userSub.userId.toString() === userId &&
        userSub.status === "active" &&
        userSub.remainingQuantity > 0
      ) {
        // **CRITICAL VALIDATION**: Ensure the selected treatment and duration match the subscription's terms
        const subTreatment = userSub.treatmentId as ITreatment // Already populated
        if (!subTreatment || subTreatment._id.toString() !== treatmentId) {
          return { success: false, error: "bookings.errors.subscriptionTreatmentMismatch" }
        }

        if (subTreatment.pricingType === "duration_based") {
          if (!userSub.selectedDurationId || userSub.selectedDurationId.toString() !== selectedDurationId) {
            // Check if the subscription allows any duration for this treatment, or if it's specific
            // This part might need more complex logic based on how subscriptions are defined
            // For now, assume if userSub.selectedDurationId exists, it must match.
            // If userSub.selectedDurationId is null/undefined, it means the subscription might cover any duration of that treatment.
            // This needs clarification from business logic.
            // For a stricter interpretation:
            if (userSub.selectedDurationId) {
              // If subscription is for a specific duration
              return { success: false, error: "bookings.errors.subscriptionDurationMismatch" }
            } else {
              // If subscription is for a treatment, and any of its active durations
              const isValidDurationForSubscribedTreatment = subTreatment.durations?.some(
                (d) => d._id.toString() === selectedDurationId && d.isActive,
              )
              if (!isValidDurationForSubscribedTreatment) {
                return { success: false, error: "bookings.errors.subscriptionDurationMismatch" }
              }
            }
          }
        }
        // If validation passes:
        priceDetails.isFullyCoveredByVoucherOrSubscription = true // Assuming subscription covers the full currentPayableAmount
        priceDetails.finalAmount = 0 // Subscription covers the cost
        currentPayableAmount = 0
        priceDetails.redeemedUserSubscriptionId = userSub._id.toString()
      } else {
        // Don't error out here if subscription is invalid, just don't apply it.
        // The UI should ideally prevent selecting an invalid subscription for redemption.
        // If it was explicitly chosen, then an error might be appropriate.
        // For now, if it's invalid, it just won't be applied.
        // However, if userSubscriptionId was provided, it implies an attempt to use it.
        logger.warn("Attempt to use invalid/unsuitable subscription", {
          userSubscriptionId,
          userId,
          treatmentId,
          selectedDurationId,
        })
        // return { success: false, error: "bookings.errors.subscriptionInvalid" }; // Re-enable if strict error is preferred
      }
    }

    // Apply Gift Voucher (if not fully covered by subscription)
    if (currentPayableAmount > 0 && giftVoucherCode) {
      const voucher = (await GiftVoucher.findOne({
        code: giftVoucherCode,
        status: { $in: ["active", "partially_used", "sent"] },
        validUntil: { $gte: new Date() },
      }).lean()) as IGiftVoucher | null // Ensure IGiftVoucher type

      if (voucher && voucher.isActive) {
        if (voucher.voucherType === "treatment") {
          const treatmentMatches = voucher.treatmentId?.toString() === treatmentId
          const durationMatchesOrNotApplicable =
            !treatment.durations ||
            treatment.durations.length === 0 ||
            !voucher.selectedDurationId ||
            voucher.selectedDurationId.toString() === selectedDurationId

          if (treatmentMatches && durationMatchesOrNotApplicable) {
            const amountToCoverByTreatmentVoucher = currentPayableAmount
            priceDetails.voucherAppliedAmount = amountToCoverByTreatmentVoucher
            currentPayableAmount = 0
            priceDetails.appliedGiftVoucherId = voucher._id.toString()
            priceDetails.isFullyCoveredByVoucherOrSubscription = true
          } else {
            logger.warn("Treatment gift voucher mismatch or invalid for selected treatment/duration", {
              /* ... */
            })
          }
        } else if (voucher.voucherType === "monetary" && voucher.remainingAmount && voucher.remainingAmount > 0) {
          const amountToApply = Math.min(currentPayableAmount, voucher.remainingAmount)
          priceDetails.voucherAppliedAmount = amountToApply
          currentPayableAmount -= amountToApply
          priceDetails.appliedGiftVoucherId = voucher._id.toString()
          // isFullyCoveredByVoucherOrSubscription will be set later based on finalAmount
        }
      }
    }

    // Apply Coupon (if not fully covered by subscription/voucher)
    if (currentPayableAmount > 0 && couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode }).lean()
      const now = new Date()
      if (
        coupon &&
        coupon.isActive &&
        new Date(coupon.validFrom) <= now &&
        new Date(coupon.validUntil) >= now &&
        (coupon.usageLimit === 0 || coupon.timesUsed < coupon.usageLimit)
        // TODO: Add check for coupon.usageLimitPerUser if that logic is implemented
      ) {
        let discount = 0
        if (coupon.discountType === "percentage") {
          discount = currentPayableAmount * (coupon.discountValue / 100)
        } else {
          // Fixed amount
          discount = Math.min(currentPayableAmount, coupon.discountValue)
        }
        priceDetails.couponDiscount = discount
        currentPayableAmount -= discount
        priceDetails.appliedCouponId = coupon._id.toString()
      }
    }

    priceDetails.finalAmount = Math.max(0, currentPayableAmount)
    if (
      priceDetails.finalAmount === 0 &&
      (priceDetails.redeemedUserSubscriptionId || priceDetails.appliedGiftVoucherId)
    ) {
      priceDetails.isFullyCoveredByVoucherOrSubscription = true
    }
    // Ensure it's also true if a monetary voucher made it zero without being a subscription
    else if (
      priceDetails.finalAmount === 0 &&
      priceDetails.appliedGiftVoucherId &&
      !priceDetails.redeemedUserSubscriptionId
    ) {
      const appliedVoucher = (await GiftVoucher.findById(
        priceDetails.appliedGiftVoucherId,
      ).lean()) as IGiftVoucher | null
      if (appliedVoucher && appliedVoucher.voucherType === "monetary") {
        priceDetails.isFullyCoveredByVoucherOrSubscription = true
      }
    }
    return { success: true, priceDetails }
  } catch (error) {
    logger.error("Error calculating booking price:", { error, payload: validatedPayload })
    return { success: false, error: "bookings.errors.calculatePriceFailed" }
  }
}

export async function createBooking(
  payload: unknown,
): Promise<{ success: boolean; booking?: IBooking; error?: string; issues?: z.ZodIssue[] }> {
  const validationResult = CreateBookingPayloadSchema.safeParse(payload)
  if (!validationResult.success) {
    logger.warn("Invalid payload for createBooking:", { issues: validationResult.error.issues })
    return { success: false, error: "common.invalidInput", issues: validationResult.error.issues }
  }
  const validatedPayload = validationResult.data

  const session = await getServerSession(authOptions)
  if (!session || session.user.id !== validatedPayload.userId) {
    return { success: false, error: "common.unauthorized" }
  }

  const mongooseDbSession = await mongoose.startSession()
  let bookingResult: IBooking | null = null

  try {
    await dbConnect()

    // **Pre-transaction validation for subscription usage**
    if (validatedPayload.source === "subscription_redemption" && validatedPayload.redeemedUserSubscriptionId) {
      const userSub = (await UserSubscription.findById(validatedPayload.redeemedUserSubscriptionId)
        .populate({ path: "treatmentId", model: "Treatment", populate: { path: "durations" } })
        .lean()) as (IUserSubscription & { treatmentId: ITreatment }) | null

      if (
        !userSub ||
        userSub.userId.toString() !== validatedPayload.userId ||
        userSub.status !== "active" ||
        userSub.remainingQuantity < 1
      ) {
        return { success: false, error: "bookings.errors.subscriptionInvalid" }
      }

      const subTreatment = userSub.treatmentId as ITreatment
      if (!subTreatment || subTreatment._id.toString() !== validatedPayload.treatmentId) {
        return { success: false, error: "bookings.errors.subscriptionTreatmentMismatch" }
      }
      if (subTreatment.pricingType === "duration_based") {
        if (
          !userSub.selectedDurationId ||
          userSub.selectedDurationId.toString() !== validatedPayload.selectedDurationId
        ) {
          // Stricter check: if subscription has a specific duration, it must match.
          // If subscription is for a treatment (any duration), then selectedDurationId must be valid for that treatment.
          if (userSub.selectedDurationId) {
            return { success: false, error: "bookings.errors.subscriptionDurationMismatch" }
          } else {
            const isValidDurationForSubscribedTreatment = subTreatment.durations?.some(
              (d) => d._id.toString() === validatedPayload.selectedDurationId && d.isActive,
            )
            if (!isValidDurationForSubscribedTreatment) {
              return { success: false, error: "bookings.errors.subscriptionDurationMismatch" }
            }
          }
        }
      }
    }
    // Similar pre-transaction validation for gift vouchers could be added if complex.

    await mongooseDbSession.withTransaction(async () => {
      const newBooking = new Booking({
        ...validatedPayload,
        status: "pending_professional_assignment", // Or "confirmed" if no assignment needed
      })
      // Ensure priceDetails from payload is used, not recalculated here unless necessary
      newBooking.priceDetails = validatedPayload.priceDetails

      await newBooking.save({ session: mongooseDbSession })
      bookingResult = newBooking

      if (validatedPayload.source === "subscription_redemption" && validatedPayload.redeemedUserSubscriptionId) {
        const userSub = await UserSubscription.findById(validatedPayload.redeemedUserSubscriptionId).session(
          mongooseDbSession,
        )
        // Redundant checks if pre-transaction validation was thorough, but good for safety within transaction
        if (!userSub || userSub.remainingQuantity < 1 || userSub.status !== "active") {
          throw new Error("bookings.errors.subscriptionRedemptionFailed") // This will rollback transaction
        }
        userSub.remainingQuantity -= 1
        if (userSub.remainingQuantity === 0) userSub.status = "depleted"
        await userSub.save({ session: mongooseDbSession })
      }

      if (
        validatedPayload.source === "gift_voucher_redemption" &&
        validatedPayload.redeemedGiftVoucherId &&
        validatedPayload.priceDetails.voucherAppliedAmount > 0
      ) {
        const voucher = (await GiftVoucher.findById(validatedPayload.redeemedGiftVoucherId).session(
          mongooseDbSession,
        )) as IGiftVoucher | null // Cast to IGiftVoucher

        if (!voucher) throw new Error("bookings.errors.voucherNotFoundDuringCreation")
        // Allow 'sent' status for first-time redemption of a gifted voucher
        if (!voucher.isActive && voucher.status !== "sent") {
          throw new Error("bookings.errors.voucherRedemptionFailedInactive")
        }

        if (voucher.voucherType === "treatment") {
          // Validation for treatment voucher (already done in calculatePrice, but good for safety)
          const treatmentMatches = voucher.treatmentId?.toString() === validatedPayload.treatmentId
          const durationMatchesOrNotApplicable =
            !validatedPayload.selectedDurationId ||
            !voucher.selectedDurationId ||
            voucher.selectedDurationId.toString() === validatedPayload.selectedDurationId
          if (!treatmentMatches || !durationMatchesOrNotApplicable) {
            logger.error("Mismatch: redeemed treatment voucher vs booking details (createBooking)", {
              /* ... */
            })
            throw new Error("bookings.errors.voucherMismatchDuringCreation")
          }
          voucher.status = "fully_used"
          voucher.remainingAmount = 0 // Explicitly set
          voucher.isActive = false // Treatment voucher is single use for that treatment
        } else if (voucher.voucherType === "monetary") {
          if (
            typeof voucher.remainingAmount !== "number" || // Check if remainingAmount is a number
            voucher.remainingAmount < validatedPayload.priceDetails.voucherAppliedAmount
          ) {
            throw new Error("bookings.errors.voucherInsufficientBalance")
          }
          voucher.remainingAmount -= validatedPayload.priceDetails.voucherAppliedAmount
          voucher.status = voucher.remainingAmount <= 0 ? "fully_used" : "partially_used"
          if (voucher.remainingAmount < 0) voucher.remainingAmount = 0 // Ensure not negative
          voucher.isActive = voucher.remainingAmount > 0 // Active if there's balance
        } else {
          throw new Error("bookings.errors.unknownVoucherTypeDuringCreation")
        }

        voucher.usageHistory = voucher.usageHistory || []
        voucher.usageHistory.push({
          date: new Date(),
          amountUsed: validatedPayload.priceDetails.voucherAppliedAmount,
          orderId: bookingResult!._id,
          description: `bookings.voucherUsage.redeemedForBooking ${bookingResult!._id.toString()}`,
          userId: validatedPayload.userId,
        } as any)
        await voucher.save({ session: mongooseDbSession })
      }

      if (validatedPayload.appliedCouponId && validatedPayload.priceDetails.couponDiscount > 0) {
        const coupon = await Coupon.findById(validatedPayload.appliedCouponId).session(mongooseDbSession)
        if (!coupon || !coupon.isActive) throw new Error("bookings.errors.couponApplyFailed")
        coupon.timesUsed += 1
        // Potentially add to coupon.usageHistoryPerUser if that logic is implemented
        await coupon.save({ session: mongooseDbSession })
      }

      // Payment status handling
      if (bookingResult) {
        if (
          validatedPayload.priceDetails.finalAmount === 0 &&
          (validatedPayload.redeemedUserSubscriptionId || validatedPayload.redeemedGiftVoucherId)
        ) {
          bookingResult.paymentDetails.paymentStatus = "not_required"
        } else if (validatedPayload.priceDetails.finalAmount > 0 && !validatedPayload.paymentDetails.paymentMethodId) {
          // This case should ideally be caught by frontend or schema validation if amount > 0
          logger.warn("Booking creation: Payment method ID missing for non-zero final amount.", {
            bookingId: bookingResult._id,
          })
          // Depending on strictness, could throw error or default to 'pending'
          // For now, if it reaches here, it implies an issue upstream or a specific flow.
          // Let's assume schema validation on payload would catch this.
          // If not, and paymentMethodId is truly optional in payload:
          // bookingResult.paymentDetails.paymentStatus = "pending";
        } else if (validatedPayload.priceDetails.finalAmount > 0 && validatedPayload.paymentDetails.paymentMethodId) {
          // If payment method is provided for a payable amount, assume it's 'paid' or 'pending' based on actual payment integration.
          // The original schema has paymentStatus in payload.paymentDetails.
          // So, we should trust validatedPayload.paymentDetails.paymentStatus if provided.
          // If not provided, and amount > 0, then it's an issue.
          bookingResult.paymentDetails.paymentStatus = validatedPayload.paymentDetails.paymentStatus || "pending"
        }
        // If paymentDetails.paymentStatus was already set in payload, it will be used.
        // The above logic primarily handles the 'not_required' case.
        await bookingResult.save({ session: mongooseDbSession })
      }
    }) // End of transaction

    if (bookingResult) {
      revalidatePath("/dashboard/member/book-treatment")
      revalidatePath("/dashboard/member/subscriptions")
      revalidatePath("/dashboard/member/gift-vouchers")
      // Potentially revalidate admin paths if relevant
      return { success: true, booking: bookingResult.toObject() as IBooking }
    } else {
      // This case should ideally not be reached if transaction fails, as error would be thrown
      return { success: false, error: "bookings.errors.bookingCreationFailedUnknown" }
    }
  } catch (error) {
    logger.error("Error creating booking:", { error, userId: session?.user?.id, payload: validatedPayload })
    const errorMessage = error instanceof Error ? error.message : "bookings.errors.createBookingFailed"
    // Ensure custom error messages from within the transaction are preserved
    return {
      success: false,
      error: errorMessage.startsWith("bookings.errors.") ? errorMessage : "bookings.errors.createBookingFailed",
    }
  } finally {
    await mongooseDbSession.endSession()
  }
}

export async function cancelBooking(
  bookingId: string,
  userId: string,
  cancelledByRole: "user" | "admin",
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  const authSession = await getServerSession(authOptions) // Renamed to avoid conflict
  if (!authSession || authSession.user.id !== userId) {
    if (!(cancelledByRole === "admin" && authSession?.user?.roles.includes("admin"))) {
      return { success: false, error: "common.unauthorized" }
    }
  }

  const mongooseDbSession = await mongoose.startSession() // Renamed
  let success = false

  try {
    await dbConnect()
    await mongooseDbSession.withTransaction(async () => {
      const booking = await Booking.findById(bookingId).session(mongooseDbSession)
      if (!booking) throw new Error("bookings.errors.bookingNotFound")
      if (booking.userId.toString() !== userId && cancelledByRole !== "admin") throw new Error("common.unauthorized")
      if (["completed", "cancelled_by_user", "cancelled_by_admin"].includes(booking.status)) {
        throw new Error("bookings.errors.cannotCancelAlreadyProcessed")
      }

      booking.status = cancelledByRole === "user" ? "cancelled_by_user" : "cancelled_by_admin"
      booking.cancellationReason = reason
      booking.cancelledBy = cancelledByRole

      if (booking.source === "subscription_redemption" && booking.redeemedUserSubscriptionId) {
        const userSub = await UserSubscription.findById(booking.redeemedUserSubscriptionId).session(mongooseDbSession)
        if (userSub) {
          userSub.remainingQuantity += 1
          if (userSub.status === "depleted") userSub.status = "active"
          await userSub.save({ session: mongooseDbSession })
        }
      }

      if (
        booking.source === "gift_voucher_redemption" &&
        booking.redeemedGiftVoucherId &&
        booking.priceDetails.voucherAppliedAmount > 0
      ) {
        const voucher = await GiftVoucher.findById(booking.redeemedGiftVoucherId).session(mongooseDbSession)
        if (voucher) {
          if (voucher.voucherType === "treatment" && voucher.status === "fully_used") {
            voucher.status = "active"
            voucher.remainingAmount = voucher.originalAmount || voucher.amount
          } else if (voucher.voucherType === "monetary") {
            voucher.remainingAmount = (voucher.remainingAmount || 0) + booking.priceDetails.voucherAppliedAmount
            if (voucher.status === "fully_used") voucher.status = "partially_used"
            if (voucher.remainingAmount > (voucher.originalAmount || 0)) {
              voucher.remainingAmount = voucher.originalAmount || 0
            }
          }
          voucher.isActive = true
          if (voucher.usageHistory) {
            voucher.usageHistory = voucher.usageHistory.filter(
              (entry) => entry.orderId?.toString() !== booking._id.toString(),
            )
          }
          await voucher.save({ session: mongooseDbSession })
        }
      }

      if (booking.appliedCouponId && booking.priceDetails.couponDiscount > 0) {
        const coupon = await Coupon.findById(booking.appliedCouponId).session(mongooseDbSession)
        if (coupon && coupon.timesUsed > 0) {
          coupon.timesUsed -= 1
          await coupon.save({ session: mongooseDbSession })
        }
      }
      await booking.save({ session: mongooseDbSession })
      success = true
    })

    if (success) {
      revalidatePath("/dashboard/member/book-treatment")
      revalidatePath("/dashboard/admin/bookings")
      return { success: true }
    } else {
      return { success: false, error: "bookings.errors.cancellationFailedUnknown" }
    }
  } catch (error) {
    logger.error("Error cancelling booking:", { error, bookingId, userId })
    const errorMessage = error instanceof Error ? error.message : "bookings.errors.cancelBookingFailed"
    return {
      success: false,
      error: errorMessage.startsWith("bookings.errors.") ? errorMessage : "bookings.errors.cancelBookingFailed",
    }
  } finally {
    await mongooseDbSession.endSession()
  }
}

export async function getBookingInitialData(userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const authSession = await getServerSession(authOptions) // Renamed
    if (!authSession || authSession.user.id !== userId) {
      return { success: false, error: "common.unauthorized" }
    }
    await dbConnect()

    const [
      userSubscriptionsResult,
      giftVouchersResult,
      userResult,
      addressesResult,
      paymentMethodsResult,
      treatmentsResult,
      workingHoursResult,
    ] = await Promise.allSettled([
      UserSubscription.find({ userId, status: "active", remainingQuantity: { $gt: 0 } })
        .populate("subscriptionId")
        .populate({ path: "treatmentId", model: Treatment, populate: { path: "durations" } })
        .lean(),
      GiftVoucher.find({
        ownerUserId: userId,
        status: { $in: ["active", "partially_used", "sent"] },
        validUntil: { $gte: new Date() },
      }).lean(),
      User.findById(userId)
        .select("preferences name email phone notificationPreferences treatmentPreferences")
        .lean(), // Use imported User model
      Address.find({ userId }).lean(), // Use imported Address model
      PaymentMethod.find({ userId, isActive: true }).lean(), // Use imported PaymentMethod model
      Treatment.find({ isActive: true }).populate("durations").lean(),
      WorkingHoursSettings.findOne().lean(),
    ])

    const getFulfilledValue = (result: PromiseSettledResult<any>, defaultValue: any = null) =>
      result.status === "fulfilled" ? result.value : defaultValue

    const activeUserSubscriptions = getFulfilledValue(userSubscriptionsResult, [])
    const usableGiftVouchers = getFulfilledValue(giftVouchersResult, [])
    const user = getFulfilledValue(userResult)
    const userAddresses = getFulfilledValue(addressesResult, [])
    const userPaymentMethods = getFulfilledValue(paymentMethodsResult, [])
    const activeTreatments = getFulfilledValue(treatmentsResult, [])
    const workingHoursSettings = getFulfilledValue(workingHoursResult)

    if (!user || !activeTreatments || !workingHoursSettings) {
      logger.error("Failed to load critical initial data for booking (models check)", {
        userId,
        userExists: !!user,
        activeTreatmentsExists: !!activeTreatments,
        workingHoursSettingsExists: !!workingHoursSettings,
        // Log if models were undefined during call (though error would be earlier)
        UserSubscriptionModel: !!UserSubscription,
        GiftVoucherModel: !!GiftVoucher,
        UserModel: !!User,
        AddressModel: !!Address,
        PaymentMethodModel: !!PaymentMethod,
        TreatmentModel: !!Treatment,
        WorkingHoursSettingsModel: !!WorkingHoursSettings,
      })
      return { success: false, error: "bookings.errors.initialDataLoadFailed" }
    }

    // Ensure user.notificationPreferences and user.treatmentPreferences exist before accessing their properties
    const notificationPrefs = user.notificationPreferences || {}
    const treatmentPrefs = user.treatmentPreferences || {}

    const populatedUserSubscriptions = activeUserSubscriptions.map((sub: any) => {
      if (sub.treatmentId && sub.treatmentId.pricingType === "duration_based" && sub.selectedDurationId) {
        const treatmentDoc = sub.treatmentId as ITreatment // Assuming ITreatment is correctly defined
        if (treatmentDoc.durations) {
          const selectedDuration = treatmentDoc.durations.find(
            (d: any) => d._id.toString() === sub.selectedDurationId.toString(),
          )
          return { ...sub, selectedDurationDetails: selectedDuration }
        }
      }
      return sub
    })

    const data = {
      activeUserSubscriptions: populatedUserSubscriptions,
      usableGiftVouchers,
      userPreferences: {
        therapistGender: treatmentPrefs.therapistGender || "any",
        notificationMethods: notificationPrefs.methods || ["email"],
        notificationLanguage: notificationPrefs.language || "he",
      },
      userAddresses,
      userPaymentMethods,
      activeTreatments,
      workingHoursSettings,
      currentUser: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    }

    return { success: true, data: JSON.parse(JSON.stringify(data)) }
  } catch (error) {
    const errorDetails: any = { userId }
    if (error instanceof Error) {
      errorDetails.name = error.name
      errorDetails.errorMessage = error.message
      errorDetails.stack = error.stack
    } else {
      try {
        errorDetails.rawErrorString = JSON.stringify(error)
      } catch (stringifyError) {
        errorDetails.rawError = error
        errorDetails.stringifyError = "Failed to stringify raw error"
      }
    }
    logger.error("Error fetching initial booking data (enhanced):", errorDetails)
    return { success: false, error: "bookings.errors.initialDataFetchFailed" }
  }
}
