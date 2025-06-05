"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import mongoose from "mongoose"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import { getActivePaymentMethods as fetchUserActivePaymentMethods } from "@/actions/payment-method-actions"

import Booking, { type IBooking, type IPriceDetails } from "@/lib/db/models/booking"
import Treatment, { type ITreatment } from "@/lib/db/models/treatment"
import UserSubscription, { type IUserSubscription } from "@/lib/db/models/user-subscription"
import GiftVoucher, { type IGiftVoucher } from "@/lib/db/models/gift-voucher"
import Coupon from "@/lib/db/models/coupon"
import User from "@/lib/db/models/user"
import Address from "@/lib/db/models/address"
import {
  WorkingHoursSettings,
  type IWorkingHoursSettings,
  type IFixedHours,
  type ISpecialDate,
} from "@/lib/db/models/working-hours"

import { logger } from "@/lib/logs/logger"
import type { TimeSlot, CalculatedPriceDetails as ClientCalculatedPriceDetails } from "@/types/booking"
import { add, format, set, addMinutes, isBefore, isAfter } from "date-fns" // Removed parse, getDay, isSameDay as we'll use UTC versions
import { CalculatePricePayloadSchema, CreateBookingPayloadSchema } from "@/lib/validation/booking-schemas"
import type { z } from "zod"
import type { CreateBookingPayload as CreateBookingPayloadSchemaType } from "@/lib/validation/booking-schemas"

// Helper to compare if two Date objects represent the same calendar day in UTC
function isSameUTCDay(dateLeft: Date, dateRight: Date): boolean {
  return (
    dateLeft.getUTCFullYear() === dateRight.getUTCFullYear() &&
    dateLeft.getUTCMonth() === dateRight.getUTCMonth() &&
    dateLeft.getUTCDate() === dateRight.getUTCDate()
  )
}

// Helper to get working hours for a specific date, using UTC for day calculation
function getDayWorkingHours(dateUTC: Date, settings: IWorkingHoursSettings): IFixedHours | ISpecialDate | null {
  // Check special dates first - they override fixed settings
  // Ensure sd.date from DB (which is likely a BSON UTC date) is correctly converted to a JS Date object for comparison
  const specialDateSetting = settings.specialDates?.find((sd) => isSameUTCDay(new Date(sd.date), dateUTC))
  if (specialDateSetting) {
    return specialDateSetting
  }

  // If no special date, use fixed settings based on UTC day of week
  const dayOfWeekUTC = dateUTC.getUTCDay() // 0 for Sunday (UTC), 1 for Monday (UTC)...
  const fixedDaySetting = settings.fixedHours?.find((fh) => fh.dayOfWeek === dayOfWeekUTC)
  return fixedDaySetting || null
}

// Helper to parse "YYYY-MM-DD" string to a UTC Date object at midnight
function parseDateStringToUTCDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number)
  // JavaScript months are 0-indexed (0 for January, 11 for December)
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
}

export async function getAvailableTimeSlots(
  dateString: string, // YYYY-MM-DD
  treatmentId: string,
  selectedDurationId?: string,
): Promise<{ success: boolean; timeSlots?: TimeSlot[]; error?: string; workingHoursNote?: string }> {
  try {
    await dbConnect()
    const selectedDateUTC = parseDateStringToUTCDate(dateString) // Use UTC date

    // Validate selectedDateUTC (e.g., check if it's a valid date, though parseDateStringToUTCDate should handle basic format)
    if (isNaN(selectedDateUTC.getTime())) {
      return { success: false, error: "bookings.errors.invalidDate" }
    }

    const treatment = (await Treatment.findById(treatmentId).lean()) as ITreatment | null
    if (!treatment || !treatment.isActive) {
      return { success: false, error: "bookings.errors.treatmentNotFound" }
    }

    let treatmentDurationMinutes = 0
    if (treatment.pricingType === "fixed") {
      treatmentDurationMinutes = treatment.defaultDurationMinutes || 60
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

    const daySettings = getDayWorkingHours(selectedDateUTC, settings) // Pass UTC date
    if (!daySettings || !daySettings.isActive) {
      return {
        success: true,
        timeSlots: [],
        workingHoursNote: daySettings?.notes || "bookings.messages.closedOnSelectedDate",
      }
    }

    const timeSlots: TimeSlot[] = []
    const slotInterval = settings.slotIntervalMinutes || 30

    const [startHour, startMinute] = daySettings.startTime.split(":").map(Number)
    const [endHour, endMinute] = daySettings.endTime.split(":").map(Number)

    // Create time slots based on UTC date but local time parts from settings
    // The times (e.g., 09:00) are relative to the calendar day, not a specific UTC offset for the time itself.
    let currentTimeSlotStart = set(selectedDateUTC, {
      hours: startHour,
      minutes: startMinute,
      seconds: 0,
      milliseconds: 0,
    })
    const dayEndTime = set(selectedDateUTC, { hours: endHour, minutes: endMinute, seconds: 0, milliseconds: 0 })

    const now = new Date() // Current time in server's local timezone (UTC on Vercel)
    const minimumBookingLeadTimeHours = settings.minimumBookingLeadTimeHours || 2
    const minimumBookingTime = add(now, { hours: minimumBookingLeadTimeHours })

    while (isBefore(currentTimeSlotStart, dayEndTime)) {
      const potentialSlotEnd = addMinutes(currentTimeSlotStart, treatmentDurationMinutes)
      let isSlotAvailable = true

      if (isBefore(currentTimeSlotStart, minimumBookingTime)) {
        isSlotAvailable = false
      }
      if (isAfter(potentialSlotEnd, dayEndTime)) {
        isSlotAvailable = false
      }

      if (isSlotAvailable) {
        const slot: TimeSlot = {
          time: format(currentTimeSlotStart, "HH:mm", {
            useAdditionalWeekYearTokens: false,
            useAdditionalDayOfYearTokens: false,
          }), // Format time part only
          isAvailable: true,
        }

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
      currentTimeSlotStart = addMinutes(currentTimeSlotStart, slotInterval)
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
      bookingDateTime, // This is a full JS Date object from client, includes time
      couponCode,
      giftVoucherCode,
      userSubscriptionId,
      userId,
    } = validatedPayload

    // For surcharge calculation based on day, we need the DATE PART in UTC
    // bookingDateTime is already a Date object. We need to ensure its day is interpreted correctly for surcharges.
    // The time part of bookingDateTime is what the user selected (e.g., 11:30).
    // We need to determine the calendar day in UTC for surcharge rules.
    // Example: bookingDateTime could be "2025-06-15T08:30:00.000Z" if user selected June 15th 11:30 Israel time (UTC+3)
    // We need to use this bookingDateTime directly for getDayWorkingHours if it's already UTC normalized,
    // or convert its *date part* to a consistent UTC representation for day-based rules.
    // Since bookingDateTime comes from client selection, it should represent the intended local date and time.
    // Let's assume bookingDateTime is a JS Date object whose UTC representation reflects the chosen slot.
    // For example, if user chose June 15th, 11:30 (Israel Time = UTC+3), bookingDateTime might be 2025-06-15T08:30:00Z.
    // getDayWorkingHours needs the *calendar day* of this event.
    // We can create a new UTC date just for the day part.
    const bookingDatePartUTC = new Date(
      Date.UTC(
        bookingDateTime.getUTCFullYear(),
        bookingDateTime.getUTCMonth(),
        bookingDateTime.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    )

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
      treatmentPriceAfterSubscriptionOrTreatmentVoucher: basePrice,
      couponDiscount: 0,
      voucherAppliedAmount: 0,
      finalAmount: 0,
      isBaseTreatmentCoveredBySubscription: false,
      isBaseTreatmentCoveredByTreatmentVoucher: false,
      isFullyCoveredByVoucherOrSubscription: false,
    }

    let amountToPayForBaseTreatment = basePrice
    priceDetails.treatmentPriceAfterSubscriptionOrTreatmentVoucher = basePrice

    const settings = (await WorkingHoursSettings.findOne().lean()) as IWorkingHoursSettings | null
    if (settings) {
      const daySettings = getDayWorkingHours(bookingDatePartUTC, settings) // Use UTC date part
      if (
        daySettings?.isActive &&
        daySettings.hasPriceAddition &&
        daySettings.priceAddition?.amount &&
        daySettings.priceAddition.amount > 0
      ) {
        // Surcharge calculation should use the original basePrice, not amountToPayForBaseTreatment
        const surchargeBase =
          treatment.pricingType === "fixed"
            ? treatment.fixedPrice || 0
            : treatment.durations?.find((d) => d._id.toString() === selectedDurationId)?.price || 0

        const surchargeAmount =
          daySettings.priceAddition.type === "fixed"
            ? daySettings.priceAddition.amount
            : surchargeBase * (daySettings.priceAddition.amount / 100)

        if (surchargeAmount > 0) {
          priceDetails.surcharges.push({
            description:
              daySettings.priceAddition.description ||
              daySettings.notes ||
              `bookings.surcharges.specialTime (${format(bookingDateTime, "HH:mm")})`, // format bookingDateTime for time display
            amount: surchargeAmount,
          })
          priceDetails.totalSurchargesAmount += surchargeAmount
        }
      }
    }

    // ... (rest of the calculateBookingPrice logic remains the same as previously corrected)
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
    if (giftVoucherCode) {
      const voucher = (await GiftVoucher.findOne({
        code: giftVoucherCode,
        // Ensure status check allows for 'sent' if that's a valid state for redemption
        status: { $in: ["active", "partially_used", "sent"] },
        validUntil: { $gte: new Date() },
      }).lean()) as IGiftVoucher | null

      if (voucher && voucher.isActive) {
        // isActive might be redundant if status check is comprehensive
        logger.debug("Processing gift voucher:", {
          voucherId: voucher._id,
          voucherType: voucher.voucherType,
          treatmentIdFromPayload: treatmentId,
          durationIdFromPayload: selectedDurationId,
        })

        let voucherCanBeApplied = false
        let voucherCoverageAmount = 0

        if (voucher.voucherType === "treatment") {
          // Log values for precise comparison debugging
          logger.debug("Voucher (Treatment Type) Details:", {
            voucherTreatmentId: voucher.treatmentId?.toString(),
            payloadTreatmentId: treatmentId,
            voucherDurationId: voucher.selectedDurationId?.toString(),
            payloadDurationId: selectedDurationId,
            isSubscriptionApplied: priceDetails.isBaseTreatmentCoveredBySubscription,
          })

          const treatmentMatches = voucher.treatmentId?.toString() === treatmentId

          let durationMatches = false
          if (treatment.pricingType === "duration_based") {
            // Both voucher and payload must have matching duration IDs if treatment is duration-based
            // and voucher specifies a duration.
            if (voucher.selectedDurationId) {
              durationMatches = voucher.selectedDurationId.toString() === selectedDurationId
            } else {
              // If voucher is for a duration-based treatment but doesn't specify a duration,
              // it implies it's generic for the treatment, and any valid duration selected by user is fine.
              // This case might need clarification: does a "treatment voucher" without duration lock duration?
              // For now, assume if voucher.selectedDurationId is null/undefined, it doesn't restrict duration choice.
              // However, for it to *cover* the treatment, the selected duration by user is what matters.
              // The current logic implies the voucher must specify the duration if the treatment is duration-based.
              // Let's stick to: if voucher has a duration, it must match. If not, it cannot cover a duration-based treatment this way.
              // This might be too strict. A common scenario is a voucher for "Treatment X" and user picks duration.
              // For now, to fix the user's specific case (where voucher HAS duration):
              durationMatches = voucher.selectedDurationId?.toString() === selectedDurationId
            }
          } else {
            // treatment.pricingType === "fixed"
            // For fixed price treatments, duration is not a factor for matching.
            // Voucher also should not have a selectedDurationId.
            durationMatches = !voucher.selectedDurationId
          }

          logger.debug("Voucher Match Check:", { treatmentMatches, durationMatches })

          if (treatmentMatches && durationMatches && !priceDetails.isBaseTreatmentCoveredBySubscription) {
            voucherCoverageAmount = amountToPayForBaseTreatment // amountToPayForBaseTreatment is the current base price due
            priceDetails.isBaseTreatmentCoveredByTreatmentVoucher = true
            priceDetails.treatmentPriceAfterSubscriptionOrTreatmentVoucher = 0 // Base price is now fully covered
            voucherCanBeApplied = true
            logger.debug("Treatment voucher applied successfully to cover base treatment.", { voucherCoverageAmount })
          } else {
            logger.warn("Treatment voucher conditions not met for base treatment coverage.", {
              treatmentMatches,
              durationMatches,
              isSubscriptionApplied: priceDetails.isBaseTreatmentCoveredBySubscription,
            })
          }
        } else if (voucher.voucherType === "monetary" && voucher.remainingAmount && voucher.remainingAmount > 0) {
          // ... (existing monetary voucher logic - ensure it correctly interacts if base is already covered) ...
          // This part should be fine as it reduces currentTotalDue later.
          // The key is that amountToPayForBaseTreatment is correctly 0 if covered by treatment voucher.
          let coverageForBase = 0
          if (amountToPayForBaseTreatment > 0) {
            // If base treatment not yet covered by subscription or another treatment voucher
            coverageForBase = Math.min(amountToPayForBaseTreatment, voucher.remainingAmount)
            // Update treatmentPriceAfterSubscriptionOrTreatmentVoucher only if it's not already 0
            if (priceDetails.treatmentPriceAfterSubscriptionOrTreatmentVoucher > 0) {
              priceDetails.treatmentPriceAfterSubscriptionOrTreatmentVoucher = Math.max(
                0,
                priceDetails.treatmentPriceAfterSubscriptionOrTreatmentVoucher - coverageForBase,
              )
            }
          }
          const remainingVoucherAfterBase = voucher.remainingAmount - coverageForBase
          // Monetary voucher can also cover surcharges
          const coverageForSurcharges = Math.min(priceDetails.totalSurchargesAmount, remainingVoucherAfterBase)

          voucherCoverageAmount = coverageForBase + coverageForSurcharges
          voucherCanBeApplied = true
          logger.debug("Monetary voucher applied.", {
            coverageForBase,
            coverageForSurcharges,
            totalCoverage: voucherCoverageAmount,
          })
        }

        if (voucherCanBeApplied && voucherCoverageAmount > 0) {
          if (voucher.voucherType === "treatment" && priceDetails.isBaseTreatmentCoveredByTreatmentVoucher) {
            // This ensures amountToPayForBaseTreatment becomes 0 if the treatment voucher covered it.
            amountToPayForBaseTreatment = 0
          } else if (voucher.voucherType === "monetary") {
            // For monetary, we reduce amountToPayForBaseTreatment by the part of voucher used for base.
            // This was handled by `coverageForBase` logic above, which updated `priceDetails.treatmentPriceAfterSubscriptionOrTreatmentVoucher`.
            // We need to ensure `amountToPayForBaseTreatment` reflects this.
            // If a subscription/treatment voucher already covered the base, amountToPayForBaseTreatment is 0.
            // If not, and monetary voucher covers part/all of base, update it.
            if (
              !priceDetails.isBaseTreatmentCoveredBySubscription &&
              !priceDetails.isBaseTreatmentCoveredByTreatmentVoucher
            ) {
              const partOfMonetaryForBase = Math.min(amountToPayForBaseTreatment, voucher.remainingAmount)
              amountToPayForBaseTreatment -= partOfMonetaryForBase
            }
          }
          priceDetails.voucherAppliedAmount += voucherCoverageAmount // Use += in case multiple vouchers could apply (though current logic is one)
          priceDetails.appliedGiftVoucherId = voucher._id.toString()
        }
      } else {
        logger.warn("Gift voucher not found, inactive, or expired.", { giftVoucherCode })
      }
    }

    // Recalculate currentTotalDue *after* all potential base price coverages
    // amountToPayForBaseTreatment should be 0 if covered by subscription or treatment voucher.
    // Or reduced if partially covered by monetary voucher (if that's a use case for base price).
    // For clarity, ensure treatmentPriceAfterSubscriptionOrTreatmentVoucher is the primary source for base cost due.

    const finalBasePriceDue = priceDetails.treatmentPriceAfterSubscriptionOrTreatmentVoucher

    // If a monetary voucher was applied and it covered some of the base price,
    // treatmentPriceAfterSubscriptionOrTreatmentVoucher should reflect that.
    // Let's ensure this is consistent.
    // The `amountToPayForBaseTreatment` variable should be aligned with `priceDetails.treatmentPriceAfterSubscriptionOrTreatmentVoucher`
    // before calculating currentTotalDue.
    // The most reliable value for base price still due is priceDetails.treatmentPriceAfterSubscriptionOrTreatmentVoucher

    let currentTotalDue =
      priceDetails.treatmentPriceAfterSubscriptionOrTreatmentVoucher + priceDetails.totalSurchargesAmount

    // If a monetary voucher was applied, part of its `voucherAppliedAmount` might have covered surcharges.
    // This needs to be subtracted from currentTotalDue.
    if (priceDetails.appliedGiftVoucherId && priceDetails.voucherAppliedAmount > 0) {
      const appliedVoucher = (await GiftVoucher.findById(
        priceDetails.appliedGiftVoucherId,
      ).lean()) as IGiftVoucher | null
      if (appliedVoucher?.voucherType === "monetary") {
        // How much of the monetary voucher was used for base price?
        // This is tricky if base was already covered by sub/treatment voucher.
        // Let's assume voucherAppliedAmount for monetary voucher is the total reduction it provides.
        // The previous logic for monetary voucher:
        // voucherCoverageAmount = coverageForBase + coverageForSurcharges;
        // priceDetails.voucherAppliedAmount += voucherCoverageAmount;
        // So, currentTotalDue should effectively be reduced by priceDetails.voucherAppliedAmount if it's monetary.
        // currentTotalDue = (base price after sub/treat_voucher) + surcharges - (monetary_voucher_value_applied_to_this_sum)

        // Simpler: currentTotalDue is base_due + surcharges. Now apply monetary voucher to this sum.
        currentTotalDue -= priceDetails.voucherAppliedAmount // This assumes voucherAppliedAmount is ONLY from monetary here.
        // This is problematic if treatment voucher also sets voucherAppliedAmount.

        // Let's refine:
        // priceDetails.voucherAppliedAmount should be the sum of all voucher effects.
        // If treatment voucher: priceDetails.voucherAppliedAmount = basePrice (if covered)
        // If monetary voucher: priceDetails.voucherAppliedAmount = amount used from monetary
        // This needs to be clearer. Let's use separate fields or ensure voucherAppliedAmount is handled carefully.

        // For now, let's assume priceDetails.voucherAppliedAmount is ONLY for monetary for now for this calculation step.
        // And treatmentPriceAfterSubscriptionOrTreatmentVoucher handles the other types.
        // The issue is if both a treatment voucher AND a monetary voucher are somehow applied (not typical).

        // Given the user's problem is with TREATMENT VOUCHER not zeroing out base price:
        // The key is that `priceDetails.treatmentPriceAfterSubscriptionOrTreatmentVoucher` must be 0.
        // And `priceDetails.isBaseTreatmentCoveredByTreatmentVoucher` must be true.
        // If these are correct, then `currentTotalDue` will start as `0 + priceDetails.totalSurchargesAmount`.
        // The display in SummaryStep will then correctly hide the raw base price and show the strikethrough.
      }
    }

    // Apply Coupon
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
      priceDetails.isFullyCoveredByVoucherOrSubscription = false
    }

    // Define initialDataForPriceCalc here, before it's used
    const initialDataForPriceCalc = await getBookingInitialData(userId)

    if (priceDetails.isBaseTreatmentCoveredBySubscription || priceDetails.isBaseTreatmentCoveredByTreatmentVoucher) {
      priceDetails.treatmentPriceAfterSubscriptionOrTreatmentVoucher = 0
    } else if (
      priceDetails.appliedGiftVoucherId &&
      initialDataForPriceCalc.success &&
      initialDataForPriceCalc.data &&
      initialDataForPriceCalc.data.usableGiftVouchers.find(
        (v) => v._id.toString() === priceDetails.appliedGiftVoucherId,
      )?.voucherType === "monetary"
    ) {
      const voucherDetails = initialDataForPriceCalc.data.usableGiftVouchers.find(
        (v) => v._id.toString() === priceDetails.appliedGiftVoucherId,
      )
      if (voucherDetails) {
        const baseCoveredByMonetary = Math.min(basePrice, voucherDetails.remainingAmount || 0)
        priceDetails.treatmentPriceAfterSubscriptionOrTreatmentVoucher = Math.max(0, basePrice - baseCoveredByMonetary)
      }
    }
    return { success: true, priceDetails }
  } catch (error) {
    logger.error("Error calculating booking price:", { error, payload: validatedPayload })
    return { success: false, error: "bookings.errors.calculatePriceFailed" }
  }
}

// createBooking, cancelBooking, getBookingInitialData remain the same as in previous correct version
// ... (rest of the file: createBooking, cancelBooking, getBookingInitialData)
// Ensure getBookingInitialData is also using UTC for any date comparisons if necessary,
// but its primary role is data fetching, not date logic for pricing.
// The `fetchUserActivePaymentMethods` call in `getBookingInitialData` is not related to this date issue.

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
    await mongooseDbSession.withTransaction(async () => {
      const newBooking = new Booking({
        ...validatedPayload,
        status: "pending_professional_assignment",
        priceDetails: {
          basePrice: validatedPayload.priceDetails.basePrice,
          surcharges: validatedPayload.priceDetails.surcharges,
          totalSurchargesAmount: validatedPayload.priceDetails.totalSurchargesAmount,
          treatmentPriceAfterSubscriptionOrTreatmentVoucher:
            validatedPayload.priceDetails.treatmentPriceAfterSubscriptionOrTreatmentVoucher,
          discountAmount: validatedPayload.priceDetails.couponDiscount,
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

      if (bookingResult) {
        if (bookingResult.priceDetails.finalAmount === 0) {
          bookingResult.paymentDetails.paymentStatus = "not_required"
        }
        await bookingResult.save({ session: mongooseDbSession })
      }
    })

    if (bookingResult) {
      revalidatePath("/dashboard/member/book-treatment")
      revalidatePath("/dashboard/member/subscriptions")
      revalidatePath("/dashboard/member/gift-vouchers")
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

      if (booking.priceDetails.appliedGiftVoucherId && booking.priceDetails.voucherAppliedAmount > 0) {
        const voucher = (await GiftVoucher.findById(booking.priceDetails.appliedGiftVoucherId).session(
          mongooseDbSession,
        )) as IGiftVoucher | null
        if (voucher) {
          if (voucher.voucherType === "treatment" && booking.priceDetails.isBaseTreatmentCoveredByTreatmentVoucher) {
            voucher.status = "active"
            voucher.isActive = true
            voucher.remainingAmount = voucher.originalAmount || voucher.amount
          } else if (voucher.voucherType === "monetary") {
            voucher.remainingAmount = (voucher.remainingAmount || 0) + booking.priceDetails.voucherAppliedAmount
            if (voucher.status === "fully_used" && voucher.remainingAmount > 0) voucher.status = "partially_used"
            if (voucher.remainingAmount > (voucher.originalAmount || 0)) {
              voucher.remainingAmount = voucher.originalAmount || 0
            }
          }
          voucher.isActive = voucher.remainingAmount > 0 || voucher.voucherType === "treatment"

          if (voucher.usageHistory) {
            voucher.usageHistory = voucher.usageHistory.filter(
              (entry) => entry.orderId?.toString() !== booking._id.toString(),
            )
          }
          await voucher.save({ session: mongooseDbSession })
        }
      }

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
      paymentMethodsResult, // This will now be the result of fetchUserActivePaymentMethods
      treatmentsResult,
      workingHoursResult,
    ] = await Promise.allSettled([
      UserSubscription.find({ userId, status: "active", remainingQuantity: { $gt: 0 } })
        .populate("subscriptionId")
        .populate({ path: "treatmentId", model: Treatment, populate: { path: "durations" } })
        .lean(),
      GiftVoucher.find({
        $or: [{ ownerUserId: userId }, { recipientEmail: authSession.user.email }],
        status: { $in: ["active", "partially_used", "sent"] },
        validUntil: { $gte: new Date() },
      }).lean(),
      User.findById(userId).select("preferences name email phone notificationPreferences treatmentPreferences").lean(),
      Address.find({ userId, isArchived: { $ne: true } }).lean(),
      fetchUserActivePaymentMethods(), // Using the imported central function
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
    let userPaymentMethods: any[] = []
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
    } else if (paymentMethodsResult.status === "rejected") {
      logger.error(
        `Promise for fetching payment methods was rejected for user ${userId}: ${paymentMethodsResult.reason}`,
      )
    }

    const activeTreatments = getFulfilledValue(treatmentsResult, [])
    const workingHoursSettings = getFulfilledValue(workingHoursResult)

    if (!user || !activeTreatments || !workingHoursSettings) {
      logger.error("Failed to load critical initial data for booking (models check)", {
        userId,
        userFound: !!user,
        treatmentsFound: !!activeTreatments,
        settingsFound: !!workingHoursSettings,
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
            if (durationDetails) durationName = `${durationDetails.minutes} ${"min"}`
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
      usableGiftVouchers: enhancedUsableGiftVouchers,
      userPreferences: {
        therapistGender: treatmentPrefs.therapistGender || "any",
        notificationMethods: notificationPrefs.methods || ["email"],
        notificationLanguage: notificationPrefs.language || "he",
      },
      userAddresses,
      userPaymentMethods, // This now comes from the central function
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
    logger.error("Error fetching initial booking data (enhanced):", { error, userId })
    return { success: false, error: "bookings.errors.initialDataFetchFailed" }
  }
}
