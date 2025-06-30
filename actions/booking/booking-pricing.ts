"use server"

import dbConnect from "@/lib/db/mongodb"
import Booking from "@/lib/db/models/booking"
import Treatment from "@/lib/db/models/treatment"
import Coupon from "@/lib/db/models/coupon"
import GiftVoucher from "@/lib/db/models/gift-voucher"
import Subscription from "@/lib/db/models/subscription"
import User from "@/lib/db/models/user"
import ProfessionalProfile from "@/lib/db/models/professional-profile"
import { WorkingHoursSettings } from "@/lib/db/models/working-hours"
import { logger } from "@/lib/logs/logger"
import type { CalculatedPriceDetails } from "@/types/booking"
import mongoose from "mongoose"
import { format } from "date-fns"
import { CalculatePricePayloadSchema } from "@/lib/validation/booking-schemas"
import type { z } from "zod"
import { getDayWorkingHours } from "./booking-availability"

/**
 * Calculate booking price with all discounts, surcharges, and professional payments
 */
export async function calculateBookingPrice(payload: unknown): Promise<{
  success: boolean
  priceDetails?: CalculatedPriceDetails
  error?: string
  issues?: z.ZodIssue[]
}> {
  const validationResult = CalculatePricePayloadSchema.safeParse(payload)
  if (!validationResult.success) {
    logger.warn("Invalid payload for calculateBookingPrice:", {
      issues: validationResult.error.issues,
    })
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

    const bookingDatePartUTC = new Date(
      Date.UTC(
        bookingDateTime.getUTCFullYear(),
        bookingDateTime.getUTCMonth(),
        bookingDateTime.getUTCDate(),
        12,
        0,
        0,
        0
      )
    )

    const treatment = (await Treatment.findById(treatmentId)
      .populate("durations")
      .lean()) as any | null
    if (!treatment || !treatment.isActive) {
      return { success: false, error: "bookings.errors.treatmentNotFound" }
    }

    let basePrice = 0
    if (treatment.pricingType === "fixed") {
      basePrice = treatment.fixedPrice || 0
    } else if (treatment.pricingType === "duration_based") {
      if (!selectedDurationId) return { success: false, error: "bookings.errors.durationRequired" }
      const duration = treatment.durations?.find(
        (d: any) => d._id.toString() === selectedDurationId && d.isActive
      )
      if (!duration) return { success: false, error: "bookings.errors.durationNotFound" }
      basePrice = duration.price
    }

    const priceDetails: CalculatedPriceDetails = {
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
      // Initialize financial breakdown
      totalProfessionalPayment: 0,
      totalOfficeCommission: 0,
      baseProfessionalPayment: 0,
      surchargesProfessionalPayment: 0,
    }

    // Calculate surcharges based on working hours settings
    const settings = (await WorkingHoursSettings.findOne().lean()) as any | null
    if (settings) {
      const daySettings = getDayWorkingHours(bookingDatePartUTC, settings)
      if (
        daySettings?.isActive &&
        daySettings.hasPriceAddition &&
        daySettings.priceAddition?.amount &&
        daySettings.priceAddition.amount > 0
      ) {
        // Check if booking time is within surcharge time range
        const bookingTimeMinutes = bookingDateTime.getHours() * 60 + bookingDateTime.getMinutes()
        let isInSurchargeRange = true // Default to true if no time range specified

        if (
          daySettings.priceAddition.priceAdditionStartTime ||
          daySettings.priceAddition.priceAdditionEndTime
        ) {
          let surchargeStartMinutes = 0
          let surchargeEndMinutes = 24 * 60 // Default to full day

          if (daySettings.priceAddition.priceAdditionStartTime) {
            const [startHour, startMinute] = daySettings.priceAddition.priceAdditionStartTime
              .split(":")
              .map(Number)
            surchargeStartMinutes = startHour * 60 + startMinute
          }

          if (daySettings.priceAddition.priceAdditionEndTime) {
            const [endHour, endMinute] = daySettings.priceAddition.priceAdditionEndTime
              .split(":")
              .map(Number)
            surchargeEndMinutes = endHour * 60 + endMinute
          }

          isInSurchargeRange =
            bookingTimeMinutes >= surchargeStartMinutes && bookingTimeMinutes <= surchargeEndMinutes
        }

        if (isInSurchargeRange) {
          const surchargeBase = basePrice
          const surchargeAmount =
            daySettings.priceAddition.type === "fixed"
              ? daySettings.priceAddition.amount
              : surchargeBase * (daySettings.priceAddition.amount / 100)

          if (surchargeAmount > 0) {
            // Calculate professional share for this surcharge
            let professionalShare: any | undefined = undefined
            if (
              "professionalShare" in daySettings &&
              daySettings.professionalShare &&
              daySettings.professionalShare.amount > 0
            ) {
              professionalShare = {
                amount: daySettings.professionalShare.amount,
                type: daySettings.professionalShare.type,
              }
            }

            priceDetails.surcharges.push({
              description:
                daySettings.priceAddition.description ||
                ("notes" in daySettings ? daySettings.notes : "") ||
                `bookings.surcharges.specialTime (${format(bookingDateTime, "HH:mm")})`,
              amount: surchargeAmount,
              ...(professionalShare && { professionalShare }),
            })
            priceDetails.totalSurchargesAmount += surchargeAmount
          }
        }
      }
    }

    // Apply subscription discounts
    if (userSubscriptionId) {
      const userSub = (await Subscription.findById(userSubscriptionId)
        .populate("subscriptionId")
        .populate({ path: "treatmentId", model: "Treatment", populate: { path: "durations" } })
        .lean()) as any | null

      if (
        userSub &&
        userSub.status === "active" &&
        userSub.remainingQuantity > 0 &&
        userSub.userId &&
        userId &&
        userSub.userId.toString() === userId
      ) {
        const subTreatment = userSub.treatmentId as any
        const isTreatmentMatch =
          subTreatment && (subTreatment._id as any).toString() === treatmentId
        let isDurationMatch = true
        if (isTreatmentMatch && subTreatment.pricingType === "duration_based") {
          isDurationMatch = userSub.selectedDurationId
            ? userSub.selectedDurationId.toString() === selectedDurationId
            : subTreatment.durations?.some(
                (d: any) => d._id.toString() === selectedDurationId && d.isActive
              ) || false
        }

        if (isTreatmentMatch && isDurationMatch) {
          priceDetails.treatmentPriceAfterSubscriptionOrTreatmentVoucher = 0
          priceDetails.isBaseTreatmentCoveredBySubscription = true
          priceDetails.redeemedUserSubscriptionId = (userSub._id as any).toString()
        }
      }
    }

    // Apply gift voucher discounts
    if (giftVoucherCode) {
      const voucher = (await GiftVoucher.findOne({
        code: giftVoucherCode,
        status: { $in: ["active", "partially_used", "sent"] },
        validUntil: { $gte: new Date() },
      }).lean()) as any | null

      if (voucher && (voucher.isActive || voucher.status === "sent")) {
        priceDetails.appliedGiftVoucherId = voucher._id.toString()

        if (voucher.voucherType === "treatment") {
          const treatmentMatches = voucher.treatmentId?.toString() === treatmentId
          let durationMatches = true

          if (treatment.pricingType === "duration_based") {
            durationMatches = voucher.selectedDurationId
              ? voucher.selectedDurationId.toString() === selectedDurationId
              : true
            if (!voucher.selectedDurationId) durationMatches = false
          } else {
            durationMatches = !voucher.selectedDurationId
          }

          if (
            treatmentMatches &&
            durationMatches &&
            !priceDetails.isBaseTreatmentCoveredBySubscription
          ) {
            priceDetails.treatmentPriceAfterSubscriptionOrTreatmentVoucher = 0
            priceDetails.isBaseTreatmentCoveredByTreatmentVoucher = true
            priceDetails.voucherAppliedAmount = basePrice
          }
        }
      }
    }

    let subtotalBeforeGeneralReductions =
      priceDetails.treatmentPriceAfterSubscriptionOrTreatmentVoucher +
      priceDetails.totalSurchargesAmount

    // Apply monetary gift vouchers
    if (priceDetails.appliedGiftVoucherId && subtotalBeforeGeneralReductions > 0) {
      const voucherToApply = (await GiftVoucher.findById(
        priceDetails.appliedGiftVoucherId
      ).lean()) as any | null
      if (
        voucherToApply &&
        voucherToApply.isActive &&
        voucherToApply.voucherType === "monetary" &&
        voucherToApply.remainingAmount &&
        voucherToApply.remainingAmount > 0
      ) {
        const amountToApplyFromMonetary = Math.min(
          subtotalBeforeGeneralReductions,
          voucherToApply.remainingAmount
        )
        if (amountToApplyFromMonetary > 0) {
          priceDetails.voucherAppliedAmount = amountToApplyFromMonetary
          subtotalBeforeGeneralReductions -= amountToApplyFromMonetary
        }
      }
    }

    let currentTotalDue = subtotalBeforeGeneralReductions

    // Apply coupon discounts
    if (currentTotalDue > 0 && couponCode && !giftVoucherCode && !userSubscriptionId) {
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
    priceDetails.isFullyCoveredByVoucherOrSubscription = priceDetails.finalAmount === 0

    if (
      priceDetails.isBaseTreatmentCoveredBySubscription ||
      priceDetails.isBaseTreatmentCoveredByTreatmentVoucher
    ) {
      priceDetails.treatmentPriceAfterSubscriptionOrTreatmentVoucher = 0
    } else {
      priceDetails.treatmentPriceAfterSubscriptionOrTreatmentVoucher = basePrice
    }

    // Calculate professional payment and office commission
    const financialBreakdown = calculateProfessionalPayment(
      treatment,
      selectedDurationId,
      priceDetails
    )
    Object.assign(priceDetails, financialBreakdown)

    return { success: true, priceDetails }
  } catch (error) {
    logger.error("Error calculating booking price:", { error, payload: validatedPayload })
    return { success: false, error: "bookings.errors.calculatePriceFailed" }
  }
}

/**
 * Calculate professional payment breakdown
 */
function calculateProfessionalPayment(
  treatment: any,
  selectedDurationId?: string,
  priceDetails?: CalculatedPriceDetails
): {
  totalProfessionalPayment: number
  totalOfficeCommission: number
  baseProfessionalPayment: number
  surchargesProfessionalPayment: number
} {
  // 1. Base treatment professional payment
  let baseProfessionalPayment = 0
  if (treatment.pricingType === "fixed" && treatment.fixedProfessionalPrice) {
    baseProfessionalPayment = treatment.fixedProfessionalPrice
  } else if (treatment.pricingType === "duration_based" && selectedDurationId) {
    const duration = treatment.durations?.find((d: any) => d._id.toString() === selectedDurationId)
    if (duration) {
      baseProfessionalPayment = duration.professionalPrice || 0
    }
  }

  // 2. Surcharges professional payment
  let surchargesProfessionalPayment = 0
  if (priceDetails?.surcharges) {
    for (const surcharge of priceDetails.surcharges) {
      if (surcharge.professionalShare) {
        const surchargeAmount = surcharge.amount
        if (surcharge.professionalShare.type === "fixed") {
          surchargesProfessionalPayment += surcharge.professionalShare.amount
        } else if (surcharge.professionalShare.type === "percentage") {
          surchargesProfessionalPayment +=
            surchargeAmount * (surcharge.professionalShare.amount / 100)
        }
      }
    }
  }

  // 3. Total professional payment
  const totalProfessionalPayment = baseProfessionalPayment + surchargesProfessionalPayment

  // 4. Office commission calculation
  const finalAmount = priceDetails?.finalAmount || 0
  const totalOfficeCommission = finalAmount - totalProfessionalPayment

  return {
    totalProfessionalPayment,
    totalOfficeCommission,
    baseProfessionalPayment,
    surchargesProfessionalPayment,
  }
}

/**
 * Recalculate booking price for existing booking
 */
export async function recalculateBookingPrice(
  bookingId: string,
  updates?: {
    bookingDateTime?: Date
    treatmentId?: string
    selectedDurationId?: string
  }
): Promise<{ success: boolean; priceDetails?: CalculatedPriceDetails; error?: string }> {
  try {
    await dbConnect()

    const booking = await Booking.findById(bookingId)
      .populate("treatmentId")
      .lean()

    if (!booking) {
      return { success: false, error: "Booking not found" }
    }

    // Use updated values or existing booking values
    const treatmentId = updates?.treatmentId || booking.treatmentId._id.toString()
    const selectedDurationId = updates?.selectedDurationId || booking.selectedDurationId?.toString()
    const bookingDateTime = updates?.bookingDateTime || booking.bookingDateTime

    // Recalculate price with current data
    const priceCalculation = await calculateBookingPrice({
      treatmentId,
      selectedDurationId,
      bookingDateTime,
      userId: booking.userId?.toString(),
      // Don't include discounts in recalculation by default
    })

    return priceCalculation
  } catch (error) {
    logger.error("Error recalculating booking price:", { error, bookingId })
    return { success: false, error: "Failed to recalculate price" }
  }
}

/**
 * Calculate price for guest booking
 */
export async function calculateGuestBookingPrice(payload: unknown): Promise<{
  success: boolean
  priceDetails?: CalculatedPriceDetails
  error?: string
  issues?: z.ZodIssue[]
}> {
  // Guest bookings use the same pricing logic as regular bookings
  // but without user-specific discounts like subscriptions
  const validationResult = CalculatePricePayloadSchema.safeParse(payload)
  if (!validationResult.success) {
    logger.warn("Invalid payload for calculateGuestBookingPrice:", {
      issues: validationResult.error.issues,
    })
    return { success: false, error: "common.invalidInput", issues: validationResult.error.issues }
  }

  // Remove user-specific fields for guest calculation
  const guestPayload = {
    ...validationResult.data,
    userId: undefined,
    userSubscriptionId: undefined,
  }

  return calculateBookingPrice(guestPayload)
}

/**
 * Validate coupon for booking
 */
export async function validateCouponForBooking(
  couponCode: string,
  treatmentId: string,
  userId?: string
): Promise<{ valid: boolean; coupon?: any; error?: string }> {
  try {
    await dbConnect()

    const coupon = await Coupon.findOne({ code: couponCode }).lean()
    if (!coupon) {
      return { valid: false, error: "Coupon not found" }
    }

    const now = new Date()

    if (!coupon.isActive) {
      return { valid: false, error: "Coupon is not active" }
    }

    if (new Date(coupon.validFrom) > now) {
      return { valid: false, error: "Coupon is not yet valid" }
    }

    if (new Date(coupon.validUntil) < now) {
      return { valid: false, error: "Coupon has expired" }
    }

    if (coupon.usageLimit > 0 && coupon.timesUsed >= coupon.usageLimit) {
      return { valid: false, error: "Coupon usage limit reached" }
    }

    // Check if coupon is applicable to this treatment
    if ((coupon as any).applicableTreatments && (coupon as any).applicableTreatments.length > 0) {
      const isApplicable = (coupon as any).applicableTreatments.some(
        (id: any) => id.toString() === treatmentId
      )
      if (!isApplicable) {
        return { valid: false, error: "Coupon not applicable to this treatment" }
      }
    }

    return { valid: true, coupon }
  } catch (error) {
    logger.error("Error validating coupon:", { error, couponCode })
    return { valid: false, error: "System error" }
  }
}

/**
 * Get base price for treatment and duration
 */
export async function getBasePriceForTreatment(
  treatmentId: string,
  selectedDurationId?: string
): Promise<{ success: boolean; basePrice?: number; error?: string }> {
  try {
    await dbConnect()

    const treatment = await Treatment.findById(treatmentId).lean()
    if (!treatment || !treatment.isActive) {
      return { success: false, error: "Treatment not found" }
    }

    let basePrice = 0
    if (treatment.pricingType === "fixed") {
      basePrice = treatment.fixedPrice || 0
    } else if (treatment.pricingType === "duration_based") {
      if (!selectedDurationId) {
        return { success: false, error: "Duration required for duration-based treatment" }
      }
      const duration = treatment.durations?.find(
        (d: any) => d._id.toString() === selectedDurationId && d.isActive
      )
      if (!duration) {
        return { success: false, error: "Duration not found" }
      }
      basePrice = duration.price || 0
    }

    return { success: true, basePrice }
  } catch (error) {
    logger.error("Error getting base price for treatment:", { error, treatmentId })
    return { success: false, error: "System error" }
  }
}
