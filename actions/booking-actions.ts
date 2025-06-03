"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import mongoose from "mongoose"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import Booking, { type IBooking } from "@/lib/db/models/booking"
import Treatment, { type ITreatment } from "@/lib/db/models/treatment"
import UserSubscription from "@/lib/db/models/user-subscription"
import GiftVoucher from "@/lib/db/models/gift-voucher"
import Coupon from "@/lib/db/models/coupon"
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
// import { utcToZonedTime, zonedToUtc } from "date-fns-tz"; // For timezone handling if needed

// const TIMEZONE = "Asia/Jerusalem"; // Or your relevant timezone

// Helper to get working hours for a specific date
function getDayWorkingHours(date: Date, settings: IWorkingHoursSettings): IFixedHours | ISpecialDate | null {
  const specialDateSetting = settings.specialDates?.find((sd) => isSameDay(new Date(sd.date), date))
  if (specialDateSetting) {
    return specialDateSetting
  }
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
      // Assuming a default duration for fixed price treatments if not specified, e.g., 60 mins.
      // This needs to be defined in the treatment model or passed. For now, let's assume 60.
      // Ideally, ITreatment should have a `defaultDurationMinutes` or similar.
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

    // Minimum booking time: 2 hours from now if today
    const now = new Date()
    const minimumBookingTime = add(now, { hours: 2 })

    while (isBefore(currentTimeSlot, endTimeForDay)) {
      const potentialEndTime = addMinutes(currentTimeSlot, treatmentDurationMinutes)

      // Check if slot is in the past or too soon for today
      let isSlotAvailable = true
      if (isSameDay(selectedDate, now) && isBefore(currentTimeSlot, minimumBookingTime)) {
        isSlotAvailable = false
      }

      // Check if potential end time exceeds working hours for the day
      if (isAfter(potentialEndTime, endTimeForDay)) {
        isSlotAvailable = false // Cannot fit treatment
      }

      // TODO: Check against existing bookings for this day (more complex, skip for now)
      // const existingBookingsForSlot = await Booking.find({
      //   bookingDateTime: { $gte: currentTimeSlot, $lt: potentialEndTime },
      //   status: { $in: ["pending_professional_assignment", "confirmed"] }
      // });
      // if (existingBookingsForSlot.length > 0) isSlotAvailable = false;

      if (isSlotAvailable) {
        const slot: TimeSlot = {
          time: format(currentTimeSlot, "HH:mm"),
          isAvailable: true, // For now, assume available if within hours
        }
        if (daySettings.hasPriceAddition && daySettings.priceAddition) {
          // This is a simplified surcharge application.
          // Real logic might depend on the exact time slot, not just the day.
          slot.surcharge = {
            description: daySettings.notes || "bookings.surcharges.specialTime",
            amount:
              daySettings.priceAddition.type === "fixed"
                ? daySettings.priceAddition.amount
                : (treatment.fixedPrice || 0) * (daySettings.priceAddition.amount / 100), // Simplified for fixed price
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

export async function calculateBookingPrice(
  payload: unknown, // Change type to unknown for initial validation
): Promise<{ success: boolean; priceDetails?: any; error?: string; issues?: z.ZodIssue[] }> {
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
    } = validatedPayload // Use validatedPayload

    const treatment = (await Treatment.findById(treatmentId).lean()) as ITreatment | null
    if (!treatment || !treatment.isActive) {
      return { success: false, error: "bookings.errors.treatmentNotFound" }
    }

    let basePrice = 0
    let treatmentNameForDescription = treatment.name

    if (treatment.pricingType === "fixed") {
      basePrice = treatment.fixedPrice || 0
    } else if (treatment.pricingType === "duration_based") {
      if (!selectedDurationId) return { success: false, error: "bookings.errors.durationRequired" }
      const duration = treatment.durations?.find((d) => d._id.toString() === selectedDurationId && d.isActive)
      if (!duration) return { success: false, error: "bookings.errors.durationNotFound" }
      basePrice = duration.price
      treatmentNameForDescription = `${treatment.name} (${duration.minutes} ${"common.minutes"})`
    }

    if (basePrice <= 0 && !userSubscriptionId && !giftVoucherCode) {
      // Allow 0 if fully covered
      // return { success: false, error: "bookings.errors.invalidBasePrice" };
    }

    const priceDetails: any = {
      basePrice,
      surcharges: [],
      couponDiscount: 0,
      voucherAppliedAmount: 0,
      finalAmount: basePrice,
      isFullyCoveredByVoucherOrSubscription: false,
    }

    // 1. Apply Surcharges based on bookingDateTime and workingHoursSettings
    const settings = (await WorkingHoursSettings.findOne().lean()) as IWorkingHoursSettings | null
    if (settings) {
      const daySettings = getDayWorkingHours(bookingDateTime, settings)
      if (daySettings?.isActive && daySettings.hasPriceAddition && daySettings.priceAddition?.amount) {
        // More precise surcharge logic might check if bookingDateTime falls into specific surchargeable hours
        const surchargeAmount =
          daySettings.priceAddition.type === "fixed"
            ? daySettings.priceAddition.amount
            : basePrice * (daySettings.priceAddition.amount / 100)

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

    // 2. Handle Subscription Redemption
    if (userSubscriptionId) {
      const userSub = await UserSubscription.findById(userSubscriptionId).populate("subscriptionId")
      if (
        userSub &&
        userSub.userId.toString() === userId &&
        userSub.status === "active" &&
        userSub.remainingQuantity > 0
      ) {
        // Check if treatment matches (this logic can be complex depending on subscription rules)
        // For simplicity, assume if userSub is provided, it's applicable.
        priceDetails.isFullyCoveredByVoucherOrSubscription = true // Assuming 1 session covers it
        priceDetails.finalAmount = 0
        currentPayableAmount = 0
        priceDetails.redeemedUserSubscriptionId = userSub._id.toString()
        // No price change, but it's covered.
      } else {
        return { success: false, error: "bookings.errors.subscriptionInvalid" }
      }
    }

    // 3. Handle Gift Voucher Redemption (only if not covered by subscription)
    if (currentPayableAmount > 0 && giftVoucherCode) {
      const voucher = await GiftVoucher.findOne({ code: giftVoucherCode, ownerUserId: userId }).lean() // Ensure user owns it
      if (
        voucher &&
        voucher.isActive &&
        voucher.status !== "fully_used" &&
        voucher.status !== "expired" &&
        new Date(voucher.validUntil) >= new Date()
      ) {
        if (voucher.voucherType === "treatment" && voucher.treatmentId?.toString() === treatmentId) {
          // Potentially check selectedDurationId if voucher is specific
          priceDetails.voucherAppliedAmount = currentPayableAmount // Covers remaining
          currentPayableAmount = 0
          priceDetails.appliedGiftVoucherId = voucher._id.toString()
        } else if (voucher.voucherType === "monetary" && voucher.remainingAmount && voucher.remainingAmount > 0) {
          const amountToApply = Math.min(currentPayableAmount, voucher.remainingAmount)
          priceDetails.voucherAppliedAmount = amountToApply
          currentPayableAmount -= amountToApply
          priceDetails.appliedGiftVoucherId = voucher._id.toString()
        }
      } else {
        // Optional: return error if voucher invalid, or just ignore it
        // return { success: false, error: "bookings.errors.giftVoucherInvalid" };
      }
    }

    // 4. Apply Coupon (only if not fully covered by subscription/voucher and amount > 0)
    if (currentPayableAmount > 0 && couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode }).lean()
      // Basic validation: active, within date range, usage limits (more complex validation needed for per-user limits)
      const now = new Date()
      if (
        coupon &&
        coupon.isActive &&
        new Date(coupon.validFrom) <= now &&
        new Date(coupon.validUntil) >= now &&
        (coupon.usageLimit === 0 || coupon.timesUsed < coupon.usageLimit)
      ) {
        let discount = 0
        if (coupon.discountType === "percentage") {
          discount = currentPayableAmount * (coupon.discountValue / 100)
        } else {
          // fixedAmount
          discount = Math.min(currentPayableAmount, coupon.discountValue) // Cannot discount more than payable
        }
        priceDetails.couponDiscount = discount
        currentPayableAmount -= discount
        priceDetails.appliedCouponId = coupon._id.toString()
      } else {
        // Optional: return error if coupon invalid, or just ignore it
        // return { success: false, error: "bookings.errors.couponInvalid" };
      }
    }

    priceDetails.finalAmount = Math.max(0, currentPayableAmount) // Ensure final amount is not negative
    if (
      priceDetails.finalAmount === 0 &&
      (priceDetails.redeemedUserSubscriptionId || priceDetails.appliedGiftVoucherId)
    ) {
      priceDetails.isFullyCoveredByVoucherOrSubscription = true
    }

    return { success: true, priceDetails }
  } catch (error) {
    logger.error("Error calculating booking price:", { error, payload: validatedPayload }) // Log validated payload
    return { success: false, error: "bookings.errors.calculatePriceFailed" }
  }
}

export async function createBooking(
  payload: unknown, // Change type to unknown
): Promise<{ success: boolean; booking?: IBooking; error?: string; issues?: z.ZodIssue[] }> {
  const validationResult = CreateBookingPayloadSchema.safeParse(payload)
  if (!validationResult.success) {
    logger.warn("Invalid payload for createBooking:", { issues: validationResult.error.issues })
    return { success: false, error: "common.invalidInput", issues: validationResult.error.issues }
  }
  const validatedPayload = validationResult.data

  const session = await getServerSession(authOptions)
  if (!session || session.user.id !== validatedPayload.userId) {
    // Use validatedPayload
    return { success: false, error: "common.unauthorized" }
  }

  try {
    await dbConnect()

    // Start a mongoose session for transaction
    const mongooseSession = await mongoose.startSession()
    let bookingResult: IBooking | null = null

    await mongooseSession.withTransaction(async () => {
      // 1. Create the booking record
      const newBooking = new Booking({
        ...validatedPayload,
        status: "pending_professional_assignment", // Initial status
      })
      await newBooking.save({ session: mongooseSession })
      bookingResult = newBooking

      // 2. Update redeemed UserSubscription if applicable
      if (validatedPayload.source === "subscription_redemption" && validatedPayload.redeemedUserSubscriptionId) {
        const userSub = await UserSubscription.findById(validatedPayload.redeemedUserSubscriptionId).session(
          mongooseSession,
        )
        if (!userSub || userSub.remainingQuantity < 1 || userSub.status !== "active") {
          throw new Error("bookings.errors.subscriptionRedemptionFailed")
        }
        userSub.remainingQuantity -= 1
        if (userSub.remainingQuantity === 0) {
          userSub.status = "depleted"
        }
        await userSub.save({ session: mongooseSession })
      }

      // 3. Update redeemed GiftVoucher if applicable
      if (
        validatedPayload.source === "gift_voucher_redemption" &&
        validatedPayload.redeemedGiftVoucherId &&
        validatedPayload.priceDetails.voucherAppliedAmount > 0
      ) {
        const voucher = await GiftVoucher.findById(validatedPayload.redeemedGiftVoucherId).session(mongooseSession)
        if (!voucher || !voucher.isActive) throw new Error("bookings.errors.voucherRedemptionFailedInactive")

        if (voucher.voucherType === "treatment") {
          voucher.status = "fully_used"
          voucher.remainingAmount = 0
        } else if (voucher.voucherType === "monetary") {
          if (
            !voucher.remainingAmount ||
            voucher.remainingAmount < validatedPayload.priceDetails.voucherAppliedAmount
          ) {
            throw new Error("bookings.errors.voucherInsufficientBalance")
          }
          voucher.remainingAmount -= validatedPayload.priceDetails.voucherAppliedAmount
          if (voucher.remainingAmount <= 0) {
            voucher.status = "fully_used"
            voucher.remainingAmount = 0
          } else {
            voucher.status = "partially_used"
          }
        }
        voucher.isActive = voucher.status === "active" || voucher.status === "partially_used"
        voucher.usageHistory = voucher.usageHistory || []
        voucher.usageHistory.push({
          date: new Date(),
          amountUsed: validatedPayload.priceDetails.voucherAppliedAmount,
          orderId: newBooking._id, // Link to this booking
          description: `bookings.voucherUsage.redeemedForBooking ${newBooking._id.toString()}`,
        })
        await voucher.save({ session: mongooseSession })
      }

      // 4. Update applied Coupon if applicable
      if (validatedPayload.appliedCouponId && validatedPayload.priceDetails.couponDiscount > 0) {
        const coupon = await Coupon.findById(validatedPayload.appliedCouponId).session(mongooseSession)
        if (!coupon || !coupon.isActive) throw new Error("bookings.errors.couponApplyFailed")
        coupon.timesUsed += 1
        // Could add more complex logic for usageLimitPerUser here
        await coupon.save({ session: mongooseSession })
      }

      // 5. TODO: Process payment if finalAmount > 0 (Simulated for now)
      if (
        validatedPayload.paymentDetails.paymentStatus === "pending" &&
        validatedPayload.priceDetails.finalAmount > 0
      ) {
        // Simulate payment processing
        // In a real app, call payment gateway here
        // For now, assume payment is successful if paymentMethodId is provided
        if (validatedPayload.paymentDetails.paymentMethodId) {
          bookingResult!.paymentDetails.paymentStatus = "paid"
          // bookingResult!.paymentDetails.transactionId = `SIM_TXN_${Date.now()}`; // Simulated
          await bookingResult!.save({ session: mongooseSession })
        } else {
          // This case should ideally be caught by frontend validation
          throw new Error("bookings.errors.paymentMethodRequired")
        }
      } else if (validatedPayload.priceDetails.finalAmount === 0) {
        bookingResult!.paymentDetails.paymentStatus = "not_required"
        await bookingResult!.save({ session: mongooseSession })
      }
    }) // End of transaction

    await mongooseSession.endSession()

    if (bookingResult) {
      revalidatePath("/dashboard/member/book-treatment") // Or specific history page
      revalidatePath("/dashboard/member/subscriptions")
      revalidatePath("/dashboard/member/gift-vouchers")
      // TODO: Send notifications (booking confirmation, etc.)
      // notificationManager.sendNotification(...)
      return { success: true, booking: bookingResult.toObject() as IBooking }
    } else {
      // Should not happen if transaction is set up correctly
      return { success: false, error: "bookings.errors.bookingCreationFailedUnknown" }
    }
  } catch (error) {
    logger.error("Error creating booking:", { error, userId: session?.user?.id, payload: validatedPayload }) // Log validated payload
    const errorMessage = error instanceof Error ? error.message : "bookings.errors.createBookingFailed"
    if (errorMessage.startsWith("bookings.errors.")) {
      return { success: false, error: errorMessage }
    }
    return { success: false, error: "bookings.errors.createBookingFailed" }
  }
}

export async function cancelBooking(
  bookingId: string,
  userId: string, // User performing cancellation (can be admin or booking owner)
  cancelledByRole: "user" | "admin",
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions)
  if (!session || session.user.id !== userId) {
    // If admin is cancelling, userId might be different from session.user.id
    // but admin role must be present.
    if (!(cancelledByRole === "admin" && session?.user?.roles.includes("admin"))) {
      return { success: false, error: "common.unauthorized" }
    }
  }

  try {
    await dbConnect()
    const mongooseSession = await mongoose.startSession()
    let success = false

    await mongooseSession.withTransaction(async () => {
      const booking = await Booking.findById(bookingId).session(mongooseSession)
      if (!booking) {
        throw new Error("bookings.errors.bookingNotFound")
      }

      // Authorization: User can cancel their own, Admin can cancel any
      if (booking.userId.toString() !== userId && cancelledByRole !== "admin") {
        throw new Error("common.unauthorized")
      }

      // Check if booking can be cancelled (e.g., not already completed or cancelled, within cancellation window)
      if (["completed", "cancelled_by_user", "cancelled_by_admin"].includes(booking.status)) {
        throw new Error("bookings.errors.cannotCancelAlreadyProcessed")
      }
      // Add logic for cancellation window if needed (e.g., cannot cancel < 24h before)

      booking.status = cancelledByRole === "user" ? "cancelled_by_user" : "cancelled_by_admin"
      booking.cancellationReason = reason
      booking.cancelledBy = cancelledByRole

      // Restore redeemed items
      // 1. UserSubscription
      if (booking.source === "subscription_redemption" && booking.redeemedUserSubscriptionId) {
        const userSub = await UserSubscription.findById(booking.redeemedUserSubscriptionId).session(mongooseSession)
        if (userSub) {
          userSub.remainingQuantity += 1
          if (userSub.status === "depleted") {
            userSub.status = "active" // Or logic to check expiry date
          }
          await userSub.save({ session: mongooseSession })
        }
      }

      // 2. GiftVoucher
      if (
        booking.source === "gift_voucher_redemption" &&
        booking.redeemedGiftVoucherId &&
        booking.priceDetails.voucherAppliedAmount > 0
      ) {
        const voucher = await GiftVoucher.findById(booking.redeemedGiftVoucherId).session(mongooseSession)
        if (voucher) {
          if (voucher.voucherType === "treatment" && voucher.status === "fully_used") {
            voucher.status = "active" // Or original status before redemption
            voucher.remainingAmount = voucher.originalAmount || voucher.amount // Restore original value
          } else if (voucher.voucherType === "monetary") {
            voucher.remainingAmount = (voucher.remainingAmount || 0) + booking.priceDetails.voucherAppliedAmount
            if (voucher.status === "fully_used") {
              voucher.status = "partially_used" // Or active if full amount restored
            }
            if (voucher.remainingAmount > (voucher.originalAmount || 0)) {
              // Cap at original
              voucher.remainingAmount = voucher.originalAmount || 0
            }
          }
          voucher.isActive = true // Make it active again
          // Remove the specific usage entry for this booking
          if (voucher.usageHistory) {
            voucher.usageHistory = voucher.usageHistory.filter(
              (entry) => entry.orderId?.toString() !== booking._id.toString(),
            )
          }
          await voucher.save({ session: mongooseSession })
        }
      }

      // 3. Coupon
      if (booking.appliedCouponId && booking.priceDetails.couponDiscount > 0) {
        const coupon = await Coupon.findById(booking.appliedCouponId).session(mongooseSession)
        if (coupon && coupon.timesUsed > 0) {
          coupon.timesUsed -= 1
          await coupon.save({ session: mongooseSession })
        }
      }

      // TODO: Handle payment refund if applicable (complex, depends on payment gateway)
      // For now, assume no direct refund logic here.

      await booking.save({ session: mongooseSession })
      success = true
    })

    await mongooseSession.endSession()

    if (success) {
      revalidatePath("/dashboard/member/book-treatment") // Or history page
      revalidatePath("/dashboard/admin/bookings") // If admin page exists
      // TODO: Send cancellation notifications
      return { success: true }
    } else {
      // Should not happen if transaction is set up correctly
      return { success: false, error: "bookings.errors.cancellationFailedUnknown" }
    }
  } catch (error) {
    logger.error("Error cancelling booking:", { error, bookingId, userId })
    const errorMessage = error instanceof Error ? error.message : "bookings.errors.cancelBookingFailed"
    if (errorMessage.startsWith("bookings.errors.")) {
      return { success: false, error: errorMessage }
    }
    return { success: false, error: "bookings.errors.cancelBookingFailed" }
  }
}

// Action to fetch initial data for the booking page
export async function getBookingInitialData(userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.id !== userId) {
      return { success: false, error: "common.unauthorized" }
    }
    await dbConnect()

    const [
      userSubscriptionsResult,
      giftVouchersResult,
      userResult, // For preferences
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
      mongoose.models.User.findById(userId).select("preferences name email phone notificationPreferences").lean(),
      mongoose.models.Address.find({ userId }).lean(),
      mongoose.models.PaymentMethod.find({ userId, isActive: true }).lean(),
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
      logger.error("Failed to load critical initial data for booking", {
        userId,
        user,
        activeTreatments,
        workingHoursSettings,
      })
      return { success: false, error: "bookings.errors.initialDataLoadFailed" }
    }

    // Populate selectedDurationDetails for subscriptions
    const populatedUserSubscriptions = activeUserSubscriptions.map((sub: any) => {
      if (sub.treatmentId && sub.treatmentId.pricingType === "duration_based" && sub.selectedDurationId) {
        const treatmentDoc = sub.treatmentId as ITreatment
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
        // Assuming structure from user.preferences
        therapistGender: user.preferences?.treatment?.therapistGender || "any",
        notificationMethods: user.notificationPreferences?.methods || ["email"],
        notificationLanguage: user.notificationPreferences?.language || "he",
      },
      userAddresses,
      userPaymentMethods,
      activeTreatments,
      workingHoursSettings,
      currentUser: {
        // Pass some basic user info if needed by client
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    }

    return { success: true, data: JSON.parse(JSON.stringify(data)) } // Ensure plain objects
  } catch (error) {
    logger.error("Error fetching initial booking data:", { error, userId })
    return { success: false, error: "bookings.errors.initialDataFetchFailed" }
  }
}
