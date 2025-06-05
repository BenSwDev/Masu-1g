"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import mongoose from "mongoose" // Keep mongoose for session and ObjectId if needed
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import { getActivePaymentMethods as fetchUserActivePaymentMethods } from "@/actions/payment-method-actions"

// Import Models directly
import Booking, { type IBooking, type IPriceDetails } from "@/lib/db/models/booking"
import Treatment, { type ITreatment } from "@/lib/db/models/treatment"
import UserSubscription, { type IUserSubscription } from "@/lib/db/models/user-subscription"
import GiftVoucher, { type IGiftVoucher } from "@/lib/db/models/gift-voucher"
import Coupon from "@/lib/db/models/coupon"
import User from "@/lib/db/models/user" // Import User model
import Address from "@/lib/db/models/address" // Import Address model
import {
  WorkingHoursSettings,
  type IWorkingHoursSettings,
  type IFixedHours,
  type ISpecialDate,
} from "@/lib/db/models/working-hours"

import { logger } from "@/lib/logs/logger"
import type { TimeSlot, CalculatedPriceDetails as ClientCalculatedPriceDetails } from "@/types/booking" // Renamed to avoid conflict
import { add, format, parse, set, getDay, isSameDay, addMinutes, isBefore, isAfter } from "date-fns"
import { CalculatePricePayloadSchema, CreateBookingPayloadSchema } from "@/lib/validation/booking-schemas"
import type { z } from "zod"
import type { CreateBookingPayload as CreateBookingPayloadSchemaType } from "@/lib/validation/booking-schemas"

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
      treatmentDurationMinutes = treatment.defaultDurationMinutes || 60 // Ensure defaultDurationMinutes exists on ITreatment
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
    const slotInterval = settings.slotIntervalMinutes || 30 // Use configured slot interval

    const [startHour, startMinute] = daySettings.startTime.split(":").map(Number)
    const [endHour, endMinute] = daySettings.endTime.split(":").map(Number)

    let currentTimeSlot = set(selectedDate, { hours: startHour, minutes: startMinute, seconds: 0, milliseconds: 0 })
    const endTimeForDay = set(selectedDate, { hours: endHour, minutes: endMinute, seconds: 0, milliseconds: 0 })

    const now = new Date()
    // Use configured minimum booking lead time, e.g., 2 hours from settings or default
    const minimumBookingLeadTimeHours = settings.minimumBookingLeadTimeHours || 2
    const minimumBookingTime = add(now, { hours: minimumBookingLeadTimeHours })

    while (isBefore(currentTimeSlot, endTimeForDay)) {
      const potentialEndTime = addMinutes(currentTimeSlot, treatmentDurationMinutes)
      let isSlotAvailable = true
      // Check if slot start time is before the minimum booking time
      if (isBefore(currentTimeSlot, minimumBookingTime)) {
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

        // Check for price addition for this specific time slot
        if (daySettings.hasPriceAddition && daySettings.priceAddition && daySettings.priceAddition.amount > 0) {
          const basePriceForSurchargeCalc =
            treatment.pricingType === "fixed"
              ? treatment.fixedPrice || 0
              : treatment.durations?.find((d) => d._id.toString() === selectedDurationId)?.price || 0

          const surchargeAmount =
            daySettings.priceAddition.type === "fixed"
              ? daySettings.priceAddition.amount
              : basePriceForSurchargeCalc * (daySettings.priceAddition.amount / 100)

          if (surchargeAmount > 0) {
            slot.surcharge = {
              description:
                daySettings.priceAddition.description || daySettings.notes || "bookings.surcharges.specialTime",
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

export async function calculateBookingPrice(
  payload: unknown,
): Promise<{ success: boolean; priceDetails?: ClientCalculatedPriceDetails; error?: string; issues?: z.ZodIssue[] }> {
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
    if (treatment.pricingType === "fixed") {
      basePrice = treatment.fixedPrice || 0
    } else if (treatment.pricingType === "duration_based") {
      if (!selectedDurationId) return { success: false, error: "bookings.errors.durationRequired" }
      const duration = treatment.durations?.find((d) => d._id.toString() === selectedDurationId && d.isActive)
      if (!duration) return { success: false, error: "bookings.errors.durationNotFound" }
      basePrice = duration.price
    }

    const priceDetails: ClientCalculatedPriceDetails = {
      basePrice,
      surcharges: [],
      totalSurchargesAmount: 0,
      treatmentPriceAfterSubscriptionOrTreatmentVoucher: basePrice, // Initially, it's the base price
      couponDiscount: 0,
      voucherAppliedAmount: 0,
      finalAmount: 0, // Will be calculated
      isBaseTreatmentCoveredBySubscription: false,
      isBaseTreatmentCoveredByTreatmentVoucher: false,
      isFullyCoveredByVoucherOrSubscription: false,
    }

    // Initialize amountToPay with basePrice only. Surcharges will be added after determining base coverage.
    let amountToPayForBaseTreatment = basePrice
    priceDetails.treatmentPriceAfterSubscriptionOrTreatmentVoucher = basePrice // Initialize with full base price

    // 1. Calculate Surcharges (always apply, regardless of coverage)
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
            : basePrice * (daySettings.priceAddition.amount / 100)

        if (surchargeAmount > 0) {
          priceDetails.surcharges.push({
            description:
              daySettings.priceAddition.description ||
              daySettings.notes ||
              `bookings.surcharges.specialTime (${format(bookingDateTime, "HH:mm")})`,
            amount: surchargeAmount,
          })
          priceDetails.totalSurchargesAmount += surchargeAmount
        }
      }
    }

    // 2. Apply User Subscription (covers basePrice only)
    if (userSubscriptionId) {
      const userSub = (await UserSubscription.findById(userSubscriptionId)
        .populate("subscriptionId")
        .populate({ path: "treatmentId", model: "Treatment", populate: { path: "durations" } })
        .lean()) as (IUserSubscription & { treatmentId: ITreatment }) | null

      if (
        userSub &&
        userSub.userId.toString() === userId &&
        userSub.status === "active" &&
        userSub.remainingQuantity > 0
      ) {
        const subTreatment = userSub.treatmentId as ITreatment
        const isTreatmentMatch = subTreatment && subTreatment._id.toString() === treatmentId
        let isDurationMatch = true
        if (isTreatmentMatch && subTreatment.pricingType === "duration_based") {
          isDurationMatch = userSub.selectedDurationId
            ? userSub.selectedDurationId.toString() === selectedDurationId
            : subTreatment.durations?.some((d) => d._id.toString() === selectedDurationId && d.isActive) || false
        }

        if (isTreatmentMatch && isDurationMatch) {
          amountToPayForBaseTreatment = 0 // Subscription covers the base price
          priceDetails.isBaseTreatmentCoveredBySubscription = true
          priceDetails.redeemedUserSubscriptionId = userSub._id.toString()
          priceDetails.treatmentPriceAfterSubscriptionOrTreatmentVoucher = 0
        } else {
          logger.warn("Attempt to use subscription for mismatched treatment/duration", {
            userSubscriptionId,
            treatmentId,
            selectedDurationId,
          })
        }
      }
    }

    // 3. Apply Gift Voucher
    // Treatment voucher covers basePrice (if not covered by sub). Monetary voucher covers anything remaining.
    if (giftVoucherCode) {
      // Check if voucher code is provided
      const voucher = (await GiftVoucher.findOne({
        code: giftVoucherCode,
        status: { $in: ["active", "partially_used", "sent"] },
        validUntil: { $gte: new Date() },
      }).lean()) as IGiftVoucher | null

      if (voucher && voucher.isActive) {
        let voucherCanBeApplied = false
        let voucherCoverageAmount = 0

        if (voucher.voucherType === "treatment") {
          const treatmentMatches = voucher.treatmentId?.toString() === treatmentId
          const durationMatches =
            !treatment.durations ||
            treatment.durations.length === 0 ||
            !voucher.selectedDurationId ||
            voucher.selectedDurationId.toString() === selectedDurationId

          if (treatmentMatches && durationMatches && !priceDetails.isBaseTreatmentCoveredBySubscription) {
            // Treatment voucher applies only if base isn't already covered by subscription
            voucherCoverageAmount = amountToPayForBaseTreatment // Covers the remaining base treatment cost
            priceDetails.isBaseTreatmentCoveredByTreatmentVoucher = true
            priceDetails.treatmentPriceAfterSubscriptionOrTreatmentVoucher = 0 // Base treatment is now fully covered
            voucherCanBeApplied = true
          }
        } else if (voucher.voucherType === "monetary" && voucher.remainingAmount && voucher.remainingAmount > 0) {
          // Monetary voucher can cover remaining base treatment cost AND surcharges
          // First, see how much of base treatment is left (if any)
          let coverageForBase = 0
          if (amountToPayForBaseTreatment > 0) {
            coverageForBase = Math.min(amountToPayForBaseTreatment, voucher.remainingAmount)
            priceDetails.treatmentPriceAfterSubscriptionOrTreatmentVoucher = Math.max(
              0,
              amountToPayForBaseTreatment - coverageForBase,
            )
          }

          // Then, remaining voucher amount can cover surcharges
          const remainingVoucherAfterBase = voucher.remainingAmount - coverageForBase
          const coverageForSurcharges = Math.min(priceDetails.totalSurchargesAmount, remainingVoucherAfterBase)

          voucherCoverageAmount = coverageForBase + coverageForSurcharges
          voucherCanBeApplied = true
        }

        if (voucherCanBeApplied && voucherCoverageAmount > 0) {
          // Apply the calculated voucherCoverageAmount to the relevant parts
          if (voucher.voucherType === "treatment") {
            amountToPayForBaseTreatment -= voucherCoverageAmount // Should be 0 now
          } else {
            // Monetary
            // Reduce amountToPayForBaseTreatment first
            const appliedToBase = Math.min(amountToPayForBaseTreatment, voucherCoverageAmount)
            amountToPayForBaseTreatment -= appliedToBase

            // Then reduce from totalSurchargesAmount effectively
            // The finalAmount calculation will handle this.
          }
          priceDetails.voucherAppliedAmount = voucherCoverageAmount
          priceDetails.appliedGiftVoucherId = voucher._id.toString()
        }
      }
    }

    // Calculate final amount: remaining base treatment cost + all surcharges
    let currentTotalDue = amountToPayForBaseTreatment + priceDetails.totalSurchargesAmount

    // If a monetary voucher was applied, its voucherAppliedAmount already reduced the effective cost.
    // We need to ensure monetary voucher application correctly reduces currentTotalDue.
    // The previous logic for monetary voucher already calculates voucherCoverageAmount that can be applied.
    // Let's refine how monetary voucher reduces the total.

    const initialData = await getBookingInitialData(userId)

    if (
      priceDetails.appliedGiftVoucherId &&
      initialData.data.usableGiftVouchers.find((v) => v._id.toString() === priceDetails.appliedGiftVoucherId)
        ?.voucherType === "monetary"
    ) {
      // If a monetary voucher was applied, `priceDetails.voucherAppliedAmount` is the total amount it covered.
      // `currentTotalDue` should be (original base + original surcharges) - monetary voucher amount.
      currentTotalDue = basePrice + priceDetails.totalSurchargesAmount - priceDetails.voucherAppliedAmount
      // Ensure `treatmentPriceAfterSubscriptionOrTreatmentVoucher` reflects any base price coverage by monetary voucher.
      if (
        !priceDetails.isBaseTreatmentCoveredBySubscription &&
        !priceDetails.isBaseTreatmentCoveredByTreatmentVoucher
      ) {
        const baseCoveredByMonetary = Math.min(basePrice, priceDetails.voucherAppliedAmount)
        priceDetails.treatmentPriceAfterSubscriptionOrTreatmentVoucher = basePrice - baseCoveredByMonetary
      }
    }

    // 4. Apply Coupon (applies to the currentTotalDue)
    if (currentTotalDue > 0 && couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode }).lean()
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
          discount = currentTotalDue * (coupon.discountValue / 100)
        } else {
          discount = Math.min(currentTotalDue, coupon.discountValue)
        }
        currentTotalDue -= discount
        priceDetails.couponDiscount = discount
        priceDetails.appliedCouponId = coupon._id.toString()
      }
    }

    priceDetails.finalAmount = Math.max(0, currentTotalDue)

    if (priceDetails.finalAmount === 0) {
      priceDetails.isFullyCoveredByVoucherOrSubscription = true
    } else {
      priceDetails.isFullyCoveredByVoucherOrSubscription = false // Explicitly set if not zero
    }

    // Ensure treatmentPriceAfterSubscriptionOrTreatmentVoucher is correctly set if base was covered
    // This might be redundant if already handled above, but good for final check.
    if (priceDetails.isBaseTreatmentCoveredBySubscription || priceDetails.isBaseTreatmentCoveredByTreatmentVoucher) {
      priceDetails.treatmentPriceAfterSubscriptionOrTreatmentVoucher = 0
    } else if (
      priceDetails.appliedGiftVoucherId &&
      initialData.data.usableGiftVouchers.find((v) => v._id.toString() === priceDetails.appliedGiftVoucherId)
        ?.voucherType === "monetary"
    ) {
      // If only monetary voucher applied, check how much of base it covered
      const voucherDetails = initialData.data.usableGiftVouchers.find(
        (v) => v._id.toString() === priceDetails.appliedGiftVoucherId,
      )
      if (voucherDetails) {
        const baseCoveredByMonetary = Math.min(basePrice, voucherDetails.remainingAmount || 0) // Use remainingAmount from voucher
        priceDetails.treatmentPriceAfterSubscriptionOrTreatmentVoucher = Math.max(0, basePrice - baseCoveredByMonetary)
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
  const validatedPayload = validationResult.data as CreateBookingPayloadSchemaType & {
    priceDetails: ClientCalculatedPriceDetails
  }

  const session = await getServerSession(authOptions)
  if (!session || session.user.id !== validatedPayload.userId) {
    return { success: false, error: "common.unauthorized" }
  }

  const mongooseDbSession = await mongoose.startSession()
  let bookingResult: IBooking | null = null

  try {
    await dbConnect()
    // Pre-transaction validations (as before)
    // ...

    await mongooseDbSession.withTransaction(async () => {
      const newBooking = new Booking({
        ...validatedPayload,
        status: "pending_professional_assignment",
        priceDetails: {
          // Map ClientCalculatedPriceDetails to IPriceDetails for DB
          basePrice: validatedPayload.priceDetails.basePrice,
          surcharges: validatedPayload.priceDetails.surcharges,
          totalSurchargesAmount: validatedPayload.priceDetails.totalSurchargesAmount,
          treatmentPriceAfterSubscriptionOrTreatmentVoucher:
            validatedPayload.priceDetails.treatmentPriceAfterSubscriptionOrTreatmentVoucher,
          discountAmount: validatedPayload.priceDetails.couponDiscount, // Map couponDiscount to discountAmount
          voucherAppliedAmount: validatedPayload.priceDetails.voucherAppliedAmount,
          finalAmount: validatedPayload.priceDetails.finalAmount,
          isBaseTreatmentCoveredBySubscription: validatedPayload.priceDetails.isBaseTreatmentCoveredBySubscription,
          isBaseTreatmentCoveredByTreatmentVoucher:
            validatedPayload.priceDetails.isBaseTreatmentCoveredByTreatmentVoucher,
          isFullyCoveredByVoucherOrSubscription: validatedPayload.priceDetails.isFullyCoveredByVoucherOrSubscription,
          appliedCouponId: validatedPayload.priceDetails.appliedCouponId
            ? new mongoose.Types.ObjectId(validatedPayload.priceDetails.appliedCouponId)
            : undefined,
          appliedGiftVoucherId: validatedPayload.priceDetails.appliedGiftVoucherId
            ? new mongoose.Types.ObjectId(validatedPayload.priceDetails.appliedGiftVoucherId)
            : undefined,
          redeemedUserSubscriptionId: validatedPayload.priceDetails.redeemedUserSubscriptionId
            ? new mongoose.Types.ObjectId(validatedPayload.priceDetails.redeemedUserSubscriptionId)
            : undefined,
        } as IPriceDetails,
        paymentDetails: {
          // Ensure paymentDetails from payload is correctly structured
          paymentMethodId: validatedPayload.paymentDetails.paymentMethodId
            ? new mongoose.Types.ObjectId(validatedPayload.paymentDetails.paymentMethodId)
            : undefined,
          paymentStatus:
            validatedPayload.priceDetails.finalAmount === 0
              ? "not_required"
              : validatedPayload.paymentDetails.paymentStatus || "pending",
          transactionId: validatedPayload.paymentDetails.transactionId,
        },
      })

      await newBooking.save({ session: mongooseDbSession })
      bookingResult = newBooking

      // Update subscription, voucher, coupon (as before, ensure logic is sound with new priceDetails)
      if (
        validatedPayload.priceDetails.redeemedUserSubscriptionId &&
        validatedPayload.priceDetails.isBaseTreatmentCoveredBySubscription
      ) {
        const userSub = await UserSubscription.findById(
          validatedPayload.priceDetails.redeemedUserSubscriptionId,
        ).session(mongooseDbSession)
        if (!userSub || userSub.remainingQuantity < 1 || userSub.status !== "active") {
          throw new Error("bookings.errors.subscriptionRedemptionFailed")
        }
        userSub.remainingQuantity -= 1
        if (userSub.remainingQuantity === 0) userSub.status = "depleted"
        await userSub.save({ session: mongooseDbSession })
      }

      if (
        validatedPayload.priceDetails.appliedGiftVoucherId &&
        validatedPayload.priceDetails.voucherAppliedAmount > 0
      ) {
        const voucher = (await GiftVoucher.findById(validatedPayload.priceDetails.appliedGiftVoucherId).session(
          mongooseDbSession,
        )) as IGiftVoucher | null
        if (!voucher) throw new Error("bookings.errors.voucherNotFoundDuringCreation")
        if (!voucher.isActive && voucher.status !== "sent")
          throw new Error("bookings.errors.voucherRedemptionFailedInactive")

        if (
          voucher.voucherType === "treatment" &&
          validatedPayload.priceDetails.isBaseTreatmentCoveredByTreatmentVoucher
        ) {
          voucher.status = "fully_used"
          voucher.remainingAmount = 0
          voucher.isActive = false
        } else if (voucher.voucherType === "monetary") {
          if (
            typeof voucher.remainingAmount !== "number" ||
            voucher.remainingAmount < validatedPayload.priceDetails.voucherAppliedAmount
          ) {
            throw new Error("bookings.errors.voucherInsufficientBalance")
          }
          voucher.remainingAmount -= validatedPayload.priceDetails.voucherAppliedAmount
          voucher.status = voucher.remainingAmount <= 0 ? "fully_used" : "partially_used"
          if (voucher.remainingAmount < 0) voucher.remainingAmount = 0
          voucher.isActive = voucher.remainingAmount > 0
        }
        // Add to usage history (as before)
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

      if (validatedPayload.priceDetails.appliedCouponId && validatedPayload.priceDetails.couponDiscount > 0) {
        const coupon = await Coupon.findById(validatedPayload.priceDetails.appliedCouponId).session(mongooseDbSession)
        if (!coupon || !coupon.isActive) throw new Error("bookings.errors.couponApplyFailed")
        coupon.timesUsed += 1
        await coupon.save({ session: mongooseDbSession })
      }

      // Final save of booking if any internal changes were made to paymentStatus after other updates
      if (bookingResult) {
        if (bookingResult.priceDetails.finalAmount === 0) {
          bookingResult.paymentDetails.paymentStatus = "not_required"
        }
        // Potentially other logic for paymentStatus based on actual payment gateway integration
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
      return { success: false, error: "bookings.errors.bookingCreationFailedUnknown" }
    }
  } catch (error) {
    logger.error("Error creating booking:", { error, userId: session?.user?.id, payload: validatedPayload })
    const errorMessage = error instanceof Error ? error.message : "bookings.errors.createBookingFailed"
    return {
      success: false,
      error: errorMessage.startsWith("bookings.errors.") ? errorMessage : "bookings.errors.createBookingFailed",
    }
  } finally {
    await mongooseDbSession.endSession()
  }
}

// cancelBooking and getBookingInitialData remain largely the same,
// but getBookingInitialData might need to ensure ITreatment has defaultDurationMinutes if used.
// And cancelBooking needs to correctly refund voucher amounts if surcharges were part of the original voucherAppliedAmount.
// For now, focusing on the core calculation and creation logic.

export async function cancelBooking(
  bookingId: string,
  userId: string,
  cancelledByRole: "user" | "admin",
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  const authSession = await getServerSession(authOptions)
  if (!authSession || authSession.user.id !== userId) {
    if (!(cancelledByRole === "admin" && authSession?.user?.roles.includes("admin"))) {
      return { success: false, error: "common.unauthorized" }
    }
  }

  const mongooseDbSession = await mongoose.startSession()
  let success = false

  try {
    await dbConnect()
    await mongooseDbSession.withTransaction(async () => {
      const booking = (await Booking.findById(bookingId).session(mongooseDbSession)) as IBooking | null
      if (!booking) throw new Error("bookings.errors.bookingNotFound")
      if (booking.userId.toString() !== userId && cancelledByRole !== "admin") throw new Error("common.unauthorized")
      if (["completed", "cancelled_by_user", "cancelled_by_admin"].includes(booking.status)) {
        throw new Error("bookings.errors.cannotCancelAlreadyProcessed")
      }

      booking.status = cancelledByRole === "user" ? "cancelled_by_user" : "cancelled_by_admin"
      booking.cancellationReason = reason
      booking.cancelledBy = cancelledByRole

      // Refund subscription
      if (
        booking.priceDetails.redeemedUserSubscriptionId &&
        booking.priceDetails.isBaseTreatmentCoveredBySubscription
      ) {
        const userSub = await UserSubscription.findById(booking.priceDetails.redeemedUserSubscriptionId).session(
          mongooseDbSession,
        )
        if (userSub) {
          userSub.remainingQuantity += 1
          if (userSub.status === "depleted") userSub.status = "active"
          await userSub.save({ session: mongooseDbSession })
        }
      }

      // Refund gift voucher
      if (booking.priceDetails.appliedGiftVoucherId && booking.priceDetails.voucherAppliedAmount > 0) {
        const voucher = (await GiftVoucher.findById(booking.priceDetails.appliedGiftVoucherId).session(
          mongooseDbSession,
        )) as IGiftVoucher | null
        if (voucher) {
          // If it was a treatment voucher that covered the base, and now it's cancelled, make it active again.
          if (voucher.voucherType === "treatment" && booking.priceDetails.isBaseTreatmentCoveredByTreatmentVoucher) {
            // Assuming treatment vouchers are single-use for the specific treatment.
            // If it was used and booking cancelled, it should become available again.
            voucher.status = "active"
            voucher.isActive = true
            // remainingAmount for treatment voucher might be tricky, depends on how it was stored.
            // If originalAmount stores its value, reset to that.
            voucher.remainingAmount = voucher.originalAmount || voucher.amount
          } else if (voucher.voucherType === "monetary") {
            voucher.remainingAmount = (voucher.remainingAmount || 0) + booking.priceDetails.voucherAppliedAmount
            if (voucher.status === "fully_used" && voucher.remainingAmount > 0) voucher.status = "partially_used"
            if (voucher.remainingAmount > (voucher.originalAmount || 0)) {
              // Cap at original amount
              voucher.remainingAmount = voucher.originalAmount || 0
            }
          }
          voucher.isActive = voucher.remainingAmount > 0 || voucher.voucherType === "treatment" // Treatment voucher active even if amount is 0 if not used

          if (voucher.usageHistory) {
            voucher.usageHistory = voucher.usageHistory.filter(
              (entry) => entry.orderId?.toString() !== booking._id.toString(),
            )
          }
          await voucher.save({ session: mongooseDbSession })
        }
      }

      // Refund coupon usage
      if (booking.priceDetails.appliedCouponId && booking.priceDetails.discountAmount > 0) {
        const coupon = await Coupon.findById(booking.priceDetails.appliedCouponId).session(mongooseDbSession)
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
      revalidatePath("/dashboard/admin/bookings") // Assuming admin path for bookings
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
    const authSession = await getServerSession(authOptions)
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
        $or: [{ ownerUserId: userId }, { recipientEmail: authSession.user.email }], // Allow user to see vouchers they own or received
        status: { $in: ["active", "partially_used", "sent"] }, // 'sent' for vouchers they received but not yet activated by them
        validUntil: { $gte: new Date() },
      }).lean(),
      User.findById(userId).select("preferences name email phone notificationPreferences treatmentPreferences").lean(),
      Address.find({ userId, isArchived: { $ne: true } }).lean(),
      fetchUserActivePaymentMethods(), // קריאה לפונקציה המיובאת
      Treatment.find({ isActive: true }).populate("durations").lean(),
      WorkingHoursSettings.findOne().lean(),
    ])

    const getFulfilledValue = (result: PromiseSettledResult<any>, defaultValue: any = null) =>
      result.status === "fulfilled" ? result.value : defaultValue

    const activeUserSubscriptions = getFulfilledValue(userSubscriptionsResult, [])
    const usableGiftVouchers = getFulfilledValue(giftVouchersResult, [])
    const user = getFulfilledValue(userResult)
    const userAddresses = getFulfilledValue(addressesResult, [])
    const paymentMethodsSettledResult = paymentMethodsResult.status === "fulfilled" ? paymentMethodsResult.value : null
    let userPaymentMethods: any[] = [] // Explicitly type if possible, e.g., IPaymentMethod[] from payment-method-actions

    if (
      paymentMethodsSettledResult &&
      paymentMethodsSettledResult.success &&
      paymentMethodsSettledResult.paymentMethods
    ) {
      userPaymentMethods = paymentMethodsSettledResult.paymentMethods
    } else if (paymentMethodsSettledResult && paymentMethodsSettledResult.error) {
      logger.warn(
        `Failed to fetch payment methods for user ${userId} in getBookingInitialData: ${paymentMethodsSettledResult.error}`,
      )
      // Consider if this should be a critical error or if it's okay to proceed with an empty list
    } else if (paymentMethodsResult.status === "rejected") {
      logger.error(
        `Promise for fetching payment methods was rejected for user ${userId}: ${paymentMethodsResult.reason}`,
      )
    }
    const activeTreatments = getFulfilledValue(treatmentsResult, [])
    const workingHoursSettings = getFulfilledValue(workingHoursResult)

    if (!user || !activeTreatments || !workingHoursSettings) {
      logger.error("Failed to load critical initial data for booking (models check)", {
        /* ... */
      })
      return { success: false, error: "bookings.errors.initialDataLoadFailed" }
    }

    const notificationPrefs = user.notificationPreferences || {}
    const treatmentPrefs = user.treatmentPreferences || {}

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

    // Enhance usableGiftVouchers with treatment/duration names if it's a treatment voucher
    const enhancedUsableGiftVouchers = usableGiftVouchers.map((voucher: IGiftVoucher) => {
      if (voucher.voucherType === "treatment" && voucher.treatmentId) {
        const treatmentDetails = activeTreatments.find(
          (t: ITreatment) => t._id.toString() === voucher.treatmentId?.toString(),
        )
        if (treatmentDetails) {
          let durationName = ""
          if (treatmentDetails.pricingType === "duration_based" && voucher.selectedDurationId) {
            const durationDetails = treatmentDetails.durations?.find(
              (d) => d._id.toString() === voucher.selectedDurationId?.toString(),
            )
            if (durationDetails) durationName = `${durationDetails.minutes} ${"min"}` // Assuming "min" is a common term
          }
          return {
            ...voucher,
            treatmentName: treatmentDetails.name,
            selectedDurationName: durationName,
          }
        }
      }
      return voucher
    })

    const data = {
      activeUserSubscriptions: populatedUserSubscriptions,
      usableGiftVouchers: enhancedUsableGiftVouchers, // Use enhanced list
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
    // ... (error logging as before)
    logger.error("Error fetching initial booking data (enhanced):", { error, userId })
    return { success: false, error: "bookings.errors.initialDataFetchFailed" }
  }
}
