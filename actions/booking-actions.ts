"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import mongoose, { type Types } from "mongoose"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import { getActivePaymentMethods as fetchUserActivePaymentMethods } from "@/actions/payment-method-actions"

import Booking, { type IBooking, type IPriceDetails, type BookingStatus } from "@/lib/db/models/booking"
import Treatment, { type ITreatment, type ITreatmentDuration } from "@/lib/db/models/treatment"
import UserSubscription, { type IUserSubscription } from "@/lib/db/models/user-subscription"
import GiftVoucher, { type IGiftVoucher } from "@/lib/db/models/gift-voucher"
import Coupon from "@/lib/db/models/coupon"
import User, { type IUser } from "@/lib/db/models/user"
import Address from "@/lib/db/models/address"
import PaymentMethod from "@/lib/db/models/payment-method" // Added for populating payment method details
import {
  WorkingHoursSettings,
  type IWorkingHoursSettings,
  type IFixedHours,
  type ISpecialDate,
} from "@/lib/db/models/working-hours"

import { logger } from "@/lib/logs/logger"
import type {
  TimeSlot,
  CalculatedPriceDetails as ClientCalculatedPriceDetails,
  PopulatedBooking,
  AdminPopulatedBooking,
} from "@/types/booking" // Updated imports
import { add, format, set, addMinutes, isBefore, isAfter } from "date-fns"
import { CalculatePricePayloadSchema, CreateBookingPayloadSchema } from "@/lib/validation/booking-schemas"
import type { z } from "zod"
import type { CreateBookingPayload as CreateBookingPayloadSchemaType } from "@/lib/validation/booking-schemas"

import { notificationManager } from "@/lib/notifications/notification-manager"
import type {
  EmailRecipient,
  PhoneRecipient,
  BookingSuccessNotificationData,
  NewBookingAvailableNotificationData,
  BookingConfirmedClientNotificationData,
  ProfessionalEnRouteClientNotificationData,
  BookingCompletedClientNotificationData,
  BookingCancelledUserNotificationData,
  BookingRescheduledUserNotificationData,
  BookingAssignedProfessionalNotificationData,
  NotificationLanguage,
} from "@/lib/notifications/notification-types"

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
  const specialDateSetting = settings.specialDates?.find((sd) => isSameUTCDay(new Date(sd.date), dateUTC))
  if (specialDateSetting) {
    return specialDateSetting
  }
  const dayOfWeekUTC = dateUTC.getUTCDay() // 0 for Sunday, 1 for Monday, etc.
  const fixedDaySetting = settings.fixedHours?.find((fh) => fh.dayOfWeek === dayOfWeekUTC)
  return fixedDaySetting || null
}

// Helper to parse "YYYY-MM-DD" string to a UTC Date object at midnight
function parseDateStringToUTCDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
}

// Common populate options for bookings to ensure consistency
const commonPopulateOptions = [
  {
    path: "userId",
    select: "_id name email phone", // Select fields needed for display
  },
  {
    path: "treatmentId",
    select: "name durations defaultDurationMinutes pricingType fixedPrice",
    populate: { path: "durations" },
  },
  {
    path: "addressId",
    select: "city street streetNumber fullAddress notes",
  },
  {
    path: "professionalId",
    select: "_id name email phone", // Select professional's details
  },
  {
    path: "paymentDetails.paymentMethodId",
    select: "_id type last4 brand", // Populate payment method details
    model: PaymentMethod, // Explicitly state model for nested populate
  },
  {
    path: "appliedCouponId",
    select: "_id code discountType discountValue",
    model: Coupon,
  },
  {
    path: "redeemedGiftVoucherId",
    select: "_id code voucherType originalAmount treatmentName",
    model: GiftVoucher,
  },
  {
    path: "redeemedUserSubscriptionId",
    select: "_id subscriptionId treatmentId remainingQuantity selectedDurationId",
    model: UserSubscription,
    populate: [
      { path: "subscriptionId", select: "name", model: "Subscription" }, // Assuming Subscription model exists and has 'name'
      { path: "treatmentId", select: "name", model: "Treatment" },
    ],
  },
]

function structurePopulatedBooking(rawBooking: any): PopulatedBooking {
  const booking = rawBooking.toObject ? rawBooking.toObject() : { ...rawBooking } // Ensure it's a plain object

  const populatedBooking: PopulatedBooking = {
    ...booking,
    _id: booking._id as Types.ObjectId,
    userId: booking.userId
      ? {
          _id: booking.userId._id as Types.ObjectId,
          name: booking.userId.name,
          email: booking.userId.email,
          phone: booking.userId.phone,
        }
      : null,
    treatmentId: null,
    addressId: booking.addressId
      ? {
          _id: booking.addressId._id as Types.ObjectId,
          city: booking.addressId.city,
          street: booking.addressId.street,
          streetNumber: booking.addressId.streetNumber,
          fullAddress: booking.addressId.fullAddress,
          notes: booking.addressId.notes,
        }
      : null,
    professionalId: booking.professionalId
      ? {
          _id: booking.professionalId._id as Types.ObjectId,
          name: booking.professionalId.name,
          email: booking.professionalId.email,
          phone: booking.professionalId.phone,
        }
      : null,
    paymentDetails: {
      ...booking.paymentDetails,
      paymentMethodId: booking.paymentDetails?.paymentMethodId
        ? {
            _id: booking.paymentDetails.paymentMethodId._id as Types.ObjectId,
            type: booking.paymentDetails.paymentMethodId.type,
            last4: booking.paymentDetails.paymentMethodId.last4,
            brand: booking.paymentDetails.paymentMethodId.brand,
          }
        : null,
    },
    appliedCouponId: booking.appliedCouponId
      ? {
          _id: booking.appliedCouponId._id as Types.ObjectId,
          code: booking.appliedCouponId.code,
          discountType: booking.appliedCouponId.discountType,
          discountValue: booking.appliedCouponId.discountValue,
        }
      : null,
    redeemedGiftVoucherId: booking.redeemedGiftVoucherId
      ? {
          _id: booking.redeemedGiftVoucherId._id as Types.ObjectId,
          code: booking.redeemedGiftVoucherId.code,
          voucherType: booking.redeemedGiftVoucherId.voucherType,
          originalAmount: booking.redeemedGiftVoucherId.originalAmount,
          treatmentName: booking.redeemedGiftVoucherId.treatmentName,
        }
      : null,
    redeemedUserSubscriptionId: booking.redeemedUserSubscriptionId
      ? {
          _id: booking.redeemedUserSubscriptionId._id as Types.ObjectId,
          subscriptionId: booking.redeemedUserSubscriptionId.subscriptionId
            ? { name: booking.redeemedUserSubscriptionId.subscriptionId.name }
            : null,
          treatmentId: booking.redeemedUserSubscriptionId.treatmentId
            ? { name: booking.redeemedUserSubscriptionId.treatmentId.name }
            : null,
          remainingQuantity: booking.redeemedUserSubscriptionId.remainingQuantity,
        }
      : null,
  }

  if (booking.treatmentId) {
    const treatmentDoc = booking.treatmentId as ITreatment
    populatedBooking.treatmentId = {
      _id: treatmentDoc._id as Types.ObjectId,
      name: treatmentDoc.name,
    }
    if (treatmentDoc.pricingType === "duration_based" && booking.selectedDurationId && treatmentDoc.durations) {
      const selectedDuration = treatmentDoc.durations.find(
        (d: ITreatmentDuration) => d._id?.toString() === booking.selectedDurationId?.toString(),
      )
      if (selectedDuration) {
        populatedBooking.treatmentId.selectedDuration = selectedDuration
      }
    } else if (treatmentDoc.pricingType === "fixed" && treatmentDoc.defaultDurationMinutes) {
      populatedBooking.treatmentId.selectedDuration = {
        minutes: treatmentDoc.defaultDurationMinutes,
        price: treatmentDoc.fixedPrice || 0,
        isActive: true,
      } as ITreatmentDuration
    }
  }
  return populatedBooking
}

export async function getAvailableTimeSlots(
  dateString: string, // YYYY-MM-DD
  treatmentId: string,
  selectedDurationId?: string,
): Promise<{ success: boolean; timeSlots?: TimeSlot[]; error?: string; workingHoursNote?: string }> {
  try {
    await dbConnect()
    const selectedDateUTC = parseDateStringToUTCDate(dateString)

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

    const daySettings = getDayWorkingHours(selectedDateUTC, settings)
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

    let currentTimeSlotStart = set(selectedDateUTC, {
      hours: startHour,
      minutes: startMinute,
      seconds: 0,
      milliseconds: 0,
    })
    const dayEndTime = set(selectedDateUTC, { hours: endHour, minutes: endMinute, seconds: 0, milliseconds: 0 })

    const now = new Date()
    const minimumBookingLeadTimeHours = settings.minimumBookingLeadTimeHours || 2
    const minimumBookingTime = add(now, { hours: minimumBookingLeadTimeHours })

    // Fetch existing bookings for the selected date to check for conflicts
    const existingBookingsOnDate = (await Booking.find({
      bookingDateTime: {
        $gte: selectedDateUTC, // Start of selected day (UTC)
        $lt: add(selectedDateUTC, { days: 1 }), // Start of next day (UTC)
      },
      status: { $nin: ["cancelled_by_user", "cancelled_by_admin", "completed", "no_show"] }, // Active bookings
    }).lean()) as IBooking[]

    while (isBefore(currentTimeSlotStart, dayEndTime)) {
      const potentialSlotEnd = addMinutes(currentTimeSlotStart, treatmentDurationMinutes)
      let isSlotAvailable = true

      if (isBefore(currentTimeSlotStart, minimumBookingTime)) {
        isSlotAvailable = false
      }
      if (isAfter(potentialSlotEnd, dayEndTime)) {
        isSlotAvailable = false
      }

      // Check for conflicts with existing bookings
      if (isSlotAvailable) {
        for (const existingBooking of existingBookingsOnDate) {
          const existingBookingStart = new Date(existingBooking.bookingDateTime)

          let existingBookingDurationMinutes = 0
          const existingTreatment = (await Treatment.findById(existingBooking.treatmentId).lean()) as ITreatment | null
          if (existingTreatment) {
            if (existingTreatment.pricingType === "fixed") {
              existingBookingDurationMinutes = existingTreatment.defaultDurationMinutes || 60
            } else if (existingTreatment.pricingType === "duration_based" && existingBooking.selectedDurationId) {
              const durationObj = existingTreatment.durations?.find(
                (d) => d._id.toString() === existingBooking.selectedDurationId?.toString(),
              )
              if (durationObj) existingBookingDurationMinutes = durationObj.minutes
            }
          }
          const existingBookingEnd = addMinutes(existingBookingStart, existingBookingDurationMinutes)

          // Check for overlap:
          // (SlotStart < ExistingEnd) and (SlotEnd > ExistingStart)
          if (isBefore(currentTimeSlotStart, existingBookingEnd) && isAfter(potentialSlotEnd, existingBookingStart)) {
            isSlotAvailable = false
            break
          }
        }
      }

      if (isSlotAvailable) {
        const slot: TimeSlot = {
          time: format(currentTimeSlotStart, "HH:mm", {
            useAdditionalWeekYearTokens: false,
            useAdditionalDayOfYearTokens: false,
          }),
          isAvailable: true,
        }

        if (daySettings.hasPriceAddition && daySettings.priceAddition && daySettings.priceAddition.amount > 0) {
          const basePriceForSurchargeCalc =
            treatment.pricingType === "fixed"
              ? treatment.fixedPrice || 0
              : treatment.durations?.find((d) => d._id.toString() === selectedDurationId)?.price || 0

          const surchargeBase = basePriceForSurchargeCalc
          const surchargeAmount =
            daySettings.priceAddition.type === "fixed"
              ? daySettings.priceAddition.amount
              : surchargeBase * (daySettings.priceAddition.amount / 100)

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

    const settings = (await WorkingHoursSettings.findOne().lean()) as IWorkingHoursSettings | null
    if (settings) {
      const daySettings = getDayWorkingHours(bookingDatePartUTC, settings)
      if (
        daySettings?.isActive &&
        daySettings.hasPriceAddition &&
        daySettings.priceAddition?.amount &&
        daySettings.priceAddition.amount > 0
      ) {
        const surchargeBase = basePrice
        const surchargeAmount =
          daySettings.priceAddition.type === "fixed"
            ? daySettings.priceAddition.amount
            : surchargeBase * (daySettings.priceAddition.amount / 100)

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
          priceDetails.treatmentPriceAfterSubscriptionOrTreatmentVoucher = 0
          priceDetails.isBaseTreatmentCoveredBySubscription = true
          priceDetails.redeemedUserSubscriptionId = userSub._id.toString()
        }
      }
    }

    if (giftVoucherCode) {
      const voucher = (await GiftVoucher.findOne({
        code: giftVoucherCode,
        status: { $in: ["active", "partially_used", "sent"] },
        validUntil: { $gte: new Date() },
      }).lean()) as IGiftVoucher | null

      if (voucher && voucher.isActive) {
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

          if (treatmentMatches && durationMatches && !priceDetails.isBaseTreatmentCoveredBySubscription) {
            priceDetails.treatmentPriceAfterSubscriptionOrTreatmentVoucher = 0
            priceDetails.isBaseTreatmentCoveredByTreatmentVoucher = true
            priceDetails.voucherAppliedAmount = basePrice
          }
        }
      }
    }

    let subtotalBeforeGeneralReductions =
      priceDetails.treatmentPriceAfterSubscriptionOrTreatmentVoucher + priceDetails.totalSurchargesAmount

    if (priceDetails.appliedGiftVoucherId && subtotalBeforeGeneralReductions > 0) {
      const voucherToApply = (await GiftVoucher.findById(
        priceDetails.appliedGiftVoucherId,
      ).lean()) as IGiftVoucher | null
      if (
        voucherToApply &&
        voucherToApply.isActive &&
        voucherToApply.voucherType === "monetary" &&
        voucherToApply.remainingAmount &&
        voucherToApply.remainingAmount > 0
      ) {
        const amountToApplyFromMonetary = Math.min(subtotalBeforeGeneralReductions, voucherToApply.remainingAmount)
        if (amountToApplyFromMonetary > 0) {
          priceDetails.voucherAppliedAmount = amountToApplyFromMonetary
          subtotalBeforeGeneralReductions -= amountToApplyFromMonetary
        }
      }
    }

    let currentTotalDue = subtotalBeforeGeneralReductions

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
    priceDetails.isFullyCoveredByVoucherOrSubscription = priceDetails.finalAmount === 0

    if (priceDetails.isBaseTreatmentCoveredBySubscription || priceDetails.isBaseTreatmentCoveredByTreatmentVoucher) {
      priceDetails.treatmentPriceAfterSubscriptionOrTreatmentVoucher = 0
    } else {
      priceDetails.treatmentPriceAfterSubscriptionOrTreatmentVoucher = basePrice
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
  let updatedVoucherDetails: IGiftVoucher | null = null

  try {
    await dbConnect()
    await mongooseDbSession.withTransaction(async () => {
      const newBooking = new Booking({
        ...validatedPayload,
        status: "pending_professional_assignment", // Default status for new bookings
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
          userId: new mongoose.Types.ObjectId(validatedPayload.userId),
        } as any)
        await voucher.save({ session: mongooseDbSession })
        updatedVoucherDetails = voucher.toObject() as IGiftVoucher
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
        bookingResult.priceDetails = newBooking.priceDetails
        await bookingResult.save({ session: mongooseDbSession })
      }
    })

    if (bookingResult) {
      revalidatePath("/dashboard/member/book-treatment")
      revalidatePath("/dashboard/member/subscriptions")
      revalidatePath("/dashboard/member/gift-vouchers")
      revalidatePath("/dashboard/member/bookings")
      revalidatePath("/dashboard/admin/bookings")
      revalidatePath("/dashboard/professional/bookings")

      const finalBookingObject = bookingResult.toObject() as IBooking
      if (updatedVoucherDetails) {
        ;(finalBookingObject as any).updatedVoucherDetails = updatedVoucherDetails
      }

      try {
        const user = await User.findById(finalBookingObject.userId)
          .select("name email phone notificationPreferences")
          .lean()
        const treatment = await Treatment.findById(finalBookingObject.treatmentId).select("name").lean()

        if (user && treatment) {
          const userLang = (user.notificationPreferences?.language as NotificationLanguage) || "he"
          const userNotificationMethods = user.notificationPreferences?.methods || ["email"]

          const bookingSuccessData: BookingSuccessNotificationData = {
            type: "BOOKING_SUCCESS",
            userName: user.name || "User",
            bookingId: finalBookingObject._id.toString(),
            treatmentName: treatment.name,
            bookingDateTime: finalBookingObject.bookingDateTime,
            orderDetailsLink: `${process.env.NEXTAUTH_URL || ""}/dashboard/member/bookings?bookingId=${finalBookingObject._id.toString()}`,
          }

          if (userNotificationMethods.includes("email") && user.email) {
            const emailRecipient: EmailRecipient = {
              type: "email",
              value: user.email,
              name: user.name,
              language: userLang,
            }
            await notificationManager.sendNotification(emailRecipient, bookingSuccessData)
          }
          if (userNotificationMethods.includes("sms") && user.phone) {
            const phoneRecipient: PhoneRecipient = {
              type: "phone",
              value: user.phone,
              language: userLang,
            }
            await notificationManager.sendNotification(phoneRecipient, bookingSuccessData)
          }

          logger.info(`Booking status: ${finalBookingObject.status}`)

          if (finalBookingObject.status === "pending_professional_assignment") {
            logger.info("Sending notifications to professionals...")

            try {
              const professionals = await User.find({
                roles: "professional",
                $or: [{ isActive: true }, { isActive: { $exists: false } }],
              })
                .select("name email phone notificationPreferences")
                .lean()

              logger.info(`Found ${professionals.length} professionals.`)

              const newBookingAvailableData: NewBookingAvailableNotificationData = {
                type: "NEW_BOOKING_AVAILABLE",
                bookingId: finalBookingObject._id.toString(),
                treatmentName: treatment.name,
                bookingDateTime: finalBookingObject.bookingDateTime,
                professionalActionLink: `${process.env.NEXTAUTH_URL || ""}/dashboard/professional/booking-management/${finalBookingObject._id.toString()}`,
                bookingAddress:
                  finalBookingObject.customAddressDetails?.fullAddress ||
                  (finalBookingObject.addressId as any)?.fullAddress,
              }

              for (const prof of professionals) {
                try {
                  logger.info(`Processing professional: ${prof.name}`)
                  const profLang = (prof.notificationPreferences?.language as NotificationLanguage) || "he"
                  const profNotificationMethods = prof.notificationPreferences?.methods || ["email"]
                  const personalizedData = { ...newBookingAvailableData, professionalName: prof.name }

                  if (profNotificationMethods.includes("email") && prof.email) {
                    const emailRecipient: EmailRecipient = {
                      type: "email",
                      value: prof.email,
                      name: prof.name,
                      language: profLang,
                    }
                    logger.info(`Sending email to professional: ${prof.name}`)
                    await notificationManager.sendNotification(emailRecipient, personalizedData)
                  }
                  if (profNotificationMethods.includes("sms") && prof.phone) {
                    const phoneRecipient: PhoneRecipient = {
                      type: "phone",
                      value: prof.phone,
                      language: profLang,
                    }
                    logger.info(`Sending SMS to professional: ${prof.name}`)
                    await notificationManager.sendNotification(phoneRecipient, personalizedData)
                  }
                } catch (profNotificationError) {
                  logger.error(`Failed to send notification to professional ${prof.name}:`, {
                    error: profNotificationError,
                  })
                }
              }
            } catch (professionalsError) {
              logger.error("Failed to fetch professionals:", { error: professionalsError })
            }
          }
        } else {
          logger.warn("Could not send booking notifications: User or Treatment not found", {
            bookingId: finalBookingObject._id.toString(),
          })
        }
      } catch (notificationError) {
        logger.error("Failed to send booking notifications:", {
          error: notificationError,
          bookingId: finalBookingObject._id.toString(),
        })
      }

      return { success: true, booking: finalBookingObject }
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

export async function getUserBookings(
  userId: string,
  filters: {
    status?: string
    page?: number
    limit?: number
    sortBy?: string
    sortDirection?: "asc" | "desc"
  },
): Promise<{ bookings: PopulatedBooking[]; totalPages: number; totalBookings: number }> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.id !== userId) {
      logger.warn("Unauthorized attempt to fetch user bookings", {
        requestedUserId: userId,
        sessionUserId: session?.user?.id,
      })
      return { bookings: [], totalPages: 0, totalBookings: 0 }
    }

    await dbConnect()

    const { status, page = 1, limit = 10, sortBy = "bookingDateTime", sortDirection = "desc" } = filters

    const query: any = { userId: new mongoose.Types.ObjectId(userId) }

    if (status && status !== "all") {
      switch (status) {
        case "upcoming":
          query.status = { $in: ["pending_professional_assignment", "confirmed", "professional_en_route"] }
          query.bookingDateTime = { $gte: new Date() }
          break
        case "past":
          query.status = { $in: ["completed", "no_show"] }
          break
        case "cancelled":
          query.status = { $in: ["cancelled_by_user", "cancelled_by_admin"] }
          break
        default:
          query.status = status
          break
      }
    }

    const sortOptions: { [key: string]: 1 | -1 } = {}
    if (sortBy) {
      sortOptions[sortBy] = sortDirection === "asc" ? 1 : -1
    } else {
      sortOptions["bookingDateTime"] = -1
    }

    const totalBookings = await Booking.countDocuments(query)
    const totalPages = Math.ceil(totalBookings / limit)

    const rawBookings = await Booking.find(query)
      .populate(commonPopulateOptions as any) // Use common populate options
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    const bookings: PopulatedBooking[] = rawBookings.map(structurePopulatedBooking)

    return { bookings, totalPages, totalBookings }
  } catch (error) {
    logger.error("Error fetching user bookings:", { userId, filters, error })
    return { bookings: [], totalPages: 0, totalBookings: 0 }
  }
}

export async function cancelBooking(
  bookingId: string,
  userId: string, // ID of the user initiating the cancellation (can be admin or client)
  cancelledByRole: "user" | "admin" | "professional",
  reason?: string,
): Promise<{ success: boolean; error?: string; booking?: IBooking }> {
  const authSession = await getServerSession(authOptions)
  if (!authSession) return { success: false, error: "common.unauthorized" }

  const mongooseDbSession = await mongoose.startSession()
  let cancelledBooking: IBooking | null = null

  try {
    await dbConnect()
    await mongooseDbSession.withTransaction(async () => {
      const booking = (await Booking.findById(bookingId).session(mongooseDbSession)) as IBooking | null
      if (!booking) throw new Error("bookings.errors.bookingNotFound")

      // Authorization checks
      const isUserCancellingOwnBooking = cancelledByRole === "user" && booking.userId.toString() === authSession.user.id
      const isAdminCancelling = cancelledByRole === "admin" && authSession.user.roles.includes("admin")
      const isProfessionalCancellingAssignedBooking =
        cancelledByRole === "professional" &&
        authSession.user.roles.includes("professional") &&
        booking.professionalId?.toString() === authSession.user.id

      if (!isUserCancellingOwnBooking && !isAdminCancelling && !isProfessionalCancellingAssignedBooking) {
        throw new Error("common.unauthorized")
      }

      if (["completed", "cancelled_by_user", "cancelled_by_admin"].includes(booking.status)) {
        throw new Error("bookings.errors.cannotCancelAlreadyProcessed")
      }

      booking.status =
        cancelledByRole === "user"
          ? "cancelled_by_user"
          : cancelledByRole === "admin"
            ? "cancelled_by_admin"
            : booking.status // Professional cancellation might have different logic or status
      booking.cancellationReason = reason
      booking.cancelledBy = cancelledByRole

      // Revert subscription usage
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

      // Revert gift voucher usage
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
            if (voucher.originalAmount && voucher.remainingAmount > voucher.originalAmount) {
              voucher.remainingAmount = voucher.originalAmount
            }
            voucher.status =
              voucher.remainingAmount > 0
                ? voucher.remainingAmount < (voucher.originalAmount || voucher.amount)
                  ? "partially_used"
                  : "active"
                : "fully_used"
            voucher.isActive = voucher.remainingAmount > 0
          }

          if (voucher.usageHistory) {
            voucher.usageHistory = voucher.usageHistory.filter(
              (entry) => entry.orderId?.toString() !== booking._id.toString(),
            )
          }
          await voucher.save({ session: mongooseDbSession })
        }
      }

      // Revert coupon usage
      if (booking.priceDetails.appliedCouponId && booking.priceDetails.discountAmount > 0) {
        const coupon = await Coupon.findById(booking.priceDetails.appliedCouponId).session(mongooseDbSession)
        if (coupon && coupon.timesUsed > 0) {
          coupon.timesUsed -= 1
          await coupon.save({ session: mongooseDbSession })
        }
      }
      await booking.save({ session: mongooseDbSession })
      cancelledBooking = booking.toObject()

      // Notifications
      const clientUser = await User.findById(booking.userId).select("name email phone notificationPreferences").lean()
      const treatment = await Treatment.findById(booking.treatmentId).select("name").lean()

      if (clientUser && treatment) {
        const clientLang = (clientUser.notificationPreferences?.language as NotificationLanguage) || "he"
        const clientNotificationMethods = clientUser.notificationPreferences?.methods || ["email"]
        const notificationData: BookingCancelledUserNotificationData = {
          type: "BOOKING_CANCELLED_USER",
          userName: clientUser.name || "User",
          bookingId: booking._id.toString(),
          treatmentName: treatment.name,
          bookingDateTime: booking.bookingDateTime,
          cancelledBy: cancelledByRole,
          cancellationReason: reason,
        }

        if (clientNotificationMethods.includes("email") && clientUser.email) {
          await notificationManager.sendNotification(
            { type: "email", value: clientUser.email, name: clientUser.name, language: clientLang },
            notificationData,
          )
        }
        if (clientNotificationMethods.includes("sms") && clientUser.phone) {
          await notificationManager.sendNotification(
            { type: "phone", value: clientUser.phone, language: clientLang },
            notificationData,
          )
        }
      }
    })

    if (cancelledBooking) {
      revalidatePath("/dashboard/member/bookings")
      revalidatePath("/dashboard/admin/bookings")
      revalidatePath("/dashboard/professional/bookings")
      revalidatePath("/dashboard/member/subscriptions")
      revalidatePath("/dashboard/member/gift-vouchers")
      return { success: true, booking: cancelledBooking }
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
        $or: [{ ownerUserId: userId }, { recipientEmail: authSession.user.email }],
        status: { $in: ["active", "partially_used", "sent"] },
        validUntil: { $gte: new Date() },
        isActive: true,
      }).lean(),
      User.findById(userId).select("preferences name email phone notificationPreferences treatmentPreferences").lean(),
      Address.find({ userId, isArchived: { $ne: true } }).lean(),
      fetchUserActivePaymentMethods(),
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
      logger.error(`Failed to fetch payment methods for user ${userId}: ${paymentMethodsResult.reason}`)
    }

    const activeTreatments = getFulfilledValue(treatmentsResult, [])
    const workingHoursSettings = getFulfilledValue(workingHoursResult)

    if (!user || !activeTreatments || !workingHoursSettings) {
      logger.error("Failed to load critical initial data for booking (enhanced):", {
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
      let treatmentName = voucher.treatmentName
      let selectedDurationName = voucher.selectedDurationName

      if (voucher.voucherType === "treatment" && voucher.treatmentId) {
        const treatmentDetails = activeTreatments.find(
          (t: ITreatment) => t._id.toString() === voucher.treatmentId?.toString(),
        )
        if (treatmentDetails) {
          treatmentName = treatmentDetails.name
          if (treatmentDetails.pricingType === "duration_based" && voucher.selectedDurationId) {
            const durationDetails = treatmentDetails.durations?.find(
              (d) => d._id.toString() === voucher.selectedDurationId?.toString(),
            )
            if (durationDetails) selectedDurationName = `${durationDetails.minutes} ${"min"}`
          } else {
            selectedDurationName = ""
          }
        }
      }
      return {
        ...voucher,
        treatmentName,
        selectedDurationName,
      }
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
    logger.error("Error fetching initial booking data (enhanced):", { error, userId })
    return { success: false, error: "bookings.errors.initialDataFetchFailed" }
  }
}

export async function professionalAcceptBooking(
  bookingId: string,
): Promise<{ success: boolean; error?: string; booking?: IBooking }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.roles.includes("professional")) {
    return { success: false, error: "common.unauthorized" }
  }
  const professionalId = session.user.id

  const mongooseDbSession = await mongoose.startSession()
  try {
    await dbConnect()
    let acceptedBooking: IBooking | null = null

    await mongooseDbSession.withTransaction(async () => {
      const booking = await Booking.findById(bookingId).session(mongooseDbSession)
      if (!booking) {
        throw new Error("bookings.errors.bookingNotFound")
      }
      if (booking.status !== "pending_professional_assignment") {
        throw new Error("bookings.errors.bookingNotAvailableForAcceptance")
      }

      booking.status = "confirmed"
      booking.professionalId = new mongoose.Types.ObjectId(professionalId)
      await booking.save({ session: mongooseDbSession })
      acceptedBooking = booking.toObject()
    })

    if (acceptedBooking) {
      revalidatePath(`/dashboard/professional/booking-management/${bookingId}`)
      revalidatePath("/dashboard/admin/bookings")
      revalidatePath("/dashboard/member/bookings")

      try {
        const clientUser = await User.findById(acceptedBooking.userId)
          .select("name email phone notificationPreferences")
          .lean()
        const treatment = await Treatment.findById(acceptedBooking.treatmentId).select("name").lean()
        const professional = await User.findById(professionalId).select("name").lean()

        if (clientUser && treatment && professional) {
          const clientLang = (clientUser.notificationPreferences?.language as NotificationLanguage) || "he"
          const clientNotificationMethods = clientUser.notificationPreferences?.methods || ["email"]

          const notificationData: BookingConfirmedClientNotificationData = {
            type: "BOOKING_CONFIRMED_CLIENT",
            userName: clientUser.name || "לקוח/ה",
            professionalName: professional.name || "מטפל/ת",
            bookingDateTime: acceptedBooking.bookingDateTime,
            treatmentName: treatment.name,
            bookingDetailsLink: `${process.env.NEXTAUTH_URL || ""}/dashboard/member/bookings?bookingId=${acceptedBooking._id.toString()}`,
          }

          if (clientNotificationMethods.includes("email") && clientUser.email) {
            await notificationManager.sendNotification(
              { type: "email", value: clientUser.email, name: clientUser.name, language: clientLang },
              notificationData,
            )
          }
          if (clientNotificationMethods.includes("sms") && clientUser.phone) {
            await notificationManager.sendNotification(
              { type: "phone", value: clientUser.phone, language: clientLang },
              notificationData,
            )
          }
        }
      } catch (notificationError) {
        logger.error("Failed to send booking confirmed by pro notification to client:", {
          error: notificationError,
          bookingId,
        })
      }
      return { success: true, booking: acceptedBooking }
    }
    return { success: false, error: "bookings.errors.acceptBookingFailed" }
  } catch (error) {
    logger.error("Error in professionalAcceptBooking:", { error, bookingId, professionalId })
    const errorMessage = error instanceof Error ? error.message : "bookings.errors.acceptBookingFailed"
    return {
      success: false,
      error: errorMessage.startsWith("bookings.errors.") ? errorMessage : "bookings.errors.acceptBookingFailed",
    }
  } finally {
    await mongooseDbSession.endSession()
  }
}

export async function professionalMarkEnRoute(
  bookingId: string,
): Promise<{ success: boolean; error?: string; booking?: IBooking }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.roles.includes("professional")) {
    return { success: false, error: "common.unauthorized" }
  }
  const professionalId = session.user.id

  try {
    await dbConnect()
    const booking = await Booking.findById(bookingId)
    if (!booking) {
      return { success: false, error: "bookings.errors.bookingNotFound" }
    }
    if (booking.professionalId?.toString() !== professionalId) {
      return { success: false, error: "common.forbidden" }
    }
    if (booking.status !== "confirmed") {
      return { success: false, error: "bookings.errors.bookingNotInCorrectStateForEnRoute" }
    }

    booking.status = "professional_en_route"
    await booking.save()
    revalidatePath(`/dashboard/professional/booking-management/${bookingId}`)
    revalidatePath("/dashboard/member/bookings")

    try {
      const clientUser = await User.findById(booking.userId).select("name email phone notificationPreferences").lean()
      const treatment = await Treatment.findById(booking.treatmentId).select("name").lean()
      const professional = await User.findById(professionalId).select("name").lean()

      if (clientUser && treatment && professional) {
        const clientLang = (clientUser.notificationPreferences?.language as NotificationLanguage) || "he"
        const clientNotificationMethods = clientUser.notificationPreferences?.methods || ["email"]
        const notificationData: ProfessionalEnRouteClientNotificationData = {
          type: "PROFESSIONAL_EN_ROUTE_CLIENT",
          userName: clientUser.name || "לקוח/ה",
          professionalName: professional.name || "מטפל/ת",
          bookingDateTime: booking.bookingDateTime,
          treatmentName: treatment.name,
        }
        if (clientNotificationMethods.includes("email") && clientUser.email) {
          await notificationManager.sendNotification(
            { type: "email", value: clientUser.email, name: clientUser.name, language: clientLang },
            notificationData,
          )
        }
        if (clientNotificationMethods.includes("sms") && clientUser.phone) {
          await notificationManager.sendNotification(
            { type: "phone", value: clientUser.phone, language: clientLang },
            notificationData,
          )
        }
      }
    } catch (notificationError) {
      logger.error("Failed to send professional en route notification to client:", {
        error: notificationError,
        bookingId,
      })
    }

    return { success: true, booking: booking.toObject() }
  } catch (error) {
    logger.error("Error in professionalMarkEnRoute:", { error, bookingId, professionalId })
    return { success: false, error: "bookings.errors.markEnRouteFailed" }
  }
}

export async function professionalMarkCompleted(
  bookingId: string,
): Promise<{ success: boolean; error?: string; booking?: IBooking }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.roles.includes("professional")) {
    return { success: false, error: "common.unauthorized" }
  }
  const professionalId = session.user.id

  try {
    await dbConnect()
    const booking = await Booking.findById(bookingId)
    if (!booking) {
      return { success: false, error: "bookings.errors.bookingNotFound" }
    }
    if (booking.professionalId?.toString() !== professionalId) {
      return { success: false, error: "common.forbidden" }
    }
    if (!["confirmed", "professional_en_route"].includes(booking.status)) {
      return { success: false, error: "bookings.errors.bookingNotInCorrectStateForCompletion" }
    }

    booking.status = "completed"
    await booking.save()
    revalidatePath(`/dashboard/professional/booking-management/${bookingId}`)
    revalidatePath("/dashboard/admin/bookings")
    revalidatePath("/dashboard/member/bookings")

    try {
      const clientUser = await User.findById(booking.userId).select("name email phone notificationPreferences").lean()
      const treatment = await Treatment.findById(booking.treatmentId).select("name").lean()
      const professional = await User.findById(professionalId).select("name").lean()

      if (clientUser && treatment && professional) {
        const clientLang = (clientUser.notificationPreferences?.language as NotificationLanguage) || "he"
        const clientNotificationMethods = clientUser.notificationPreferences?.methods || ["email"]
        const notificationData: BookingCompletedClientNotificationData = {
          type: "BOOKING_COMPLETED_CLIENT",
          userName: clientUser.name || "לקוח/ה",
          professionalName: professional.name || "מטפל/ת",
          treatmentName: treatment.name,
        }
        if (clientNotificationMethods.includes("email") && clientUser.email) {
          await notificationManager.sendNotification(
            { type: "email", value: clientUser.email, name: clientUser.name, language: clientLang },
            notificationData,
          )
        }
        if (clientNotificationMethods.includes("sms") && clientUser.phone) {
          await notificationManager.sendNotification(
            { type: "phone", value: clientUser.phone, language: clientLang },
            notificationData,
          )
        }
      }
    } catch (notificationError) {
      logger.error("Failed to send booking completed notification to client:", { error: notificationError, bookingId })
    }

    return { success: true, booking: booking.toObject() }
  } catch (error) {
    logger.error("Error in professionalMarkCompleted:", { error, bookingId, professionalId })
    return { success: false, error: "bookings.errors.markCompletedFailed" }
  }
}

// --- ADMIN BOOKING ACTIONS ---

export async function getAdminBookings(filters: {
  status?: string
  page?: number
  limit?: number
  sortBy?: string
  sortDirection?: "asc" | "desc"
  userId?: string // Filter by specific user
  professionalId?: string // Filter by specific professional
  dateFrom?: string // YYYY-MM-DD
  dateTo?: string // YYYY-MM-DD
}): Promise<{ bookings: AdminPopulatedBooking[]; totalPages: number; totalBookings: number; error?: string }> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user.roles.includes("admin")) {
      return { bookings: [], totalPages: 0, totalBookings: 0, error: "common.unauthorized" }
    }

    await dbConnect()

    const {
      status,
      page = 1,
      limit = 10,
      sortBy = "bookingDateTime",
      sortDirection = "desc",
      userId,
      professionalId,
      dateFrom,
      dateTo,
    } = filters

    const query: any = {}

    if (status && status !== "all") query.status = status
    if (userId) query.userId = new mongoose.Types.ObjectId(userId)
    if (professionalId) query.professionalId = new mongoose.Types.ObjectId(professionalId)

    if (dateFrom || dateTo) {
      query.bookingDateTime = {}
      if (dateFrom) query.bookingDateTime.$gte = parseDateStringToUTCDate(dateFrom)
      if (dateTo) {
        const toDate = parseDateStringToUTCDate(dateTo)
        query.bookingDateTime.$lte = add(toDate, { days: 1, seconds: -1 }) // End of day
      }
    }

    const sortOptions: { [key: string]: 1 | -1 } = {}
    if (sortBy) sortOptions[sortBy] = sortDirection === "asc" ? 1 : -1
    else sortOptions["bookingDateTime"] = -1

    const totalBookings = await Booking.countDocuments(query)
    const totalPages = Math.ceil(totalBookings / limit)

    const rawBookings = await Booking.find(query)
      .populate(commonPopulateOptions as any) // Use common populate options
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    const bookings: AdminPopulatedBooking[] = rawBookings.map(
      (b) => structurePopulatedBooking(b) as AdminPopulatedBooking,
    )

    return { bookings, totalPages, totalBookings }
  } catch (error) {
    logger.error("Error fetching admin bookings:", { filters, error })
    return { bookings: [], totalPages: 0, totalBookings: 0, error: "bookings.errors.fetchAdminBookingsFailed" }
  }
}

export async function getAdminBookingById(
  bookingId: string,
): Promise<{ success: boolean; booking?: AdminPopulatedBooking; error?: string }> {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.roles.includes("admin")) {
    return { success: false, error: "common.unauthorized" }
  }

  try {
    await dbConnect()
    const rawBooking = await Booking.findById(bookingId)
      .populate(commonPopulateOptions as any)
      .lean()

    if (!rawBooking) {
      return { success: false, error: "bookings.errors.bookingNotFound" }
    }

    const booking = structurePopulatedBooking(rawBooking) as AdminPopulatedBooking
    return { success: true, booking }
  } catch (error) {
    logger.error("Error fetching booking by ID for admin:", { bookingId, error })
    return { success: false, error: "bookings.errors.fetchBookingByIdFailed" }
  }
}

interface UpdateBookingByAdminPayload {
  bookingDateTime?: Date
  addressId?: string // ObjectId as string
  customAddressDetails?: IBooking["customAddressDetails"]
  status?: BookingStatus
  professionalId?: string | null // ObjectId as string, or null to unassign
  notes?: string // User notes
  adminNotes?: string // Admin internal notes
  cancellationReason?: string // if status is cancelled
}

export async function updateBookingByAdmin(
  bookingId: string,
  payload: UpdateBookingByAdminPayload,
): Promise<{ success: boolean; booking?: IBooking; error?: string }> {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.roles.includes("admin")) {
    return { success: false, error: "common.unauthorized" }
  }

  const mongooseDbSession = await mongoose.startSession()
  try {
    await dbConnect()
    let updatedBooking: IBooking | null = null

    await mongooseDbSession.withTransaction(async () => {
      const booking = await Booking.findById(bookingId).session(mongooseDbSession)
      if (!booking) {
        throw new Error("bookings.errors.bookingNotFound")
      }

      const oldStatus = booking.status
      const oldProfessionalId = booking.professionalId?.toString()

      // Update fields from payload
      if (payload.bookingDateTime) booking.bookingDateTime = payload.bookingDateTime
      if (payload.addressId) {
        booking.addressId = new mongoose.Types.ObjectId(payload.addressId)
        booking.customAddressDetails = undefined // Clear custom if selecting saved
      } else if (payload.customAddressDetails) {
        booking.customAddressDetails = payload.customAddressDetails
        booking.addressId = undefined // Clear saved if providing custom
      }
      if (payload.status) booking.status = payload.status
      if (payload.professionalId === null) {
        // Explicitly unassign
        booking.professionalId = undefined
      } else if (payload.professionalId) {
        booking.professionalId = new mongoose.Types.ObjectId(payload.professionalId)
      }
      if (payload.notes !== undefined) booking.notes = payload.notes // Allow empty string
      if (payload.adminNotes !== undefined) booking.adminNotes = payload.adminNotes
      if (payload.status?.startsWith("cancelled_") && payload.cancellationReason) {
        booking.cancellationReason = payload.cancellationReason
        booking.cancelledBy = "admin" // Assume admin initiated if using this function
      }

      // Handle status change implications (e.g., re-opening a cancelled booking)
      if (oldStatus.startsWith("cancelled_") && payload.status && !payload.status.startsWith("cancelled_")) {
        // TODO: Logic to potentially re-validate/re-apply subscription/voucher/coupon if booking is un-cancelled.
        // This can be complex and might require re-running parts of price calculation or manual adjustments.
        // For now, this is a placeholder for future enhancement.
        logger.info(`Booking ${bookingId} un-cancelled by admin. Manual review of discounts/redemptions may be needed.`)
      }

      await booking.save({ session: mongooseDbSession })
      updatedBooking = booking.toObject()

      // Notifications
      const clientUser = await User.findById(booking.userId).select("name email phone notificationPreferences").lean()
      const treatment = await Treatment.findById(booking.treatmentId).select("name").lean()

      if (clientUser && treatment) {
        const clientLang = (clientUser.notificationPreferences?.language as NotificationLanguage) || "he"
        const clientNotificationMethods = clientUser.notificationPreferences?.methods || ["email"]

        // Rescheduled notification
        if (payload.bookingDateTime && oldStatus !== "rescheduled") {
          // Check if actually rescheduled
          const rescheduleData: BookingRescheduledUserNotificationData = {
            type: "BOOKING_RESCHEDULED_USER",
            userName: clientUser.name || "User",
            bookingId: booking._id.toString(),
            oldBookingDateTime: booking.bookingDateTime, // This is now the new time, need original old time
            newBookingDateTime: payload.bookingDateTime,
            treatmentName: treatment.name,
          }
          // Note: Need to pass original booking.bookingDateTime before it's updated for oldBookingDateTime
          // This requires fetching the booking before modification or passing it in payload.
          // For simplicity, current implementation might send new time as old time if not careful.
          // Consider fetching booking state before this transaction for accurate old data.
        }

        // Professional assignment/change notification
        if (payload.professionalId && payload.professionalId !== oldProfessionalId) {
          const professional = await User.findById(payload.professionalId).select("name").lean()
          if (professional) {
            const assignData: BookingAssignedProfessionalNotificationData = {
              type: "BOOKING_ASSIGNED_PROFESSIONAL",
              userName: clientUser.name || "User",
              professionalName: professional.name,
              bookingDateTime: booking.bookingDateTime,
              treatmentName: treatment.name,
            }
            if (clientNotificationMethods.includes("email") && clientUser.email) {
              await notificationManager.sendNotification(
                { type: "email", value: clientUser.email, name: clientUser.name, language: clientLang },
                assignData,
              )
            }
            if (clientNotificationMethods.includes("sms") && clientUser.phone) {
              await notificationManager.sendNotification(
                { type: "phone", value: clientUser.phone, language: clientLang },
                assignData,
              )
            }
          }
        }
      }
    })

    if (updatedBooking) {
      revalidatePath("/dashboard/admin/bookings")
      revalidatePath(`/dashboard/admin/bookings/${bookingId}`) // If a details page exists
      revalidatePath("/dashboard/member/bookings") // For the client
      revalidatePath("/dashboard/professional/bookings") // For the professional
      return { success: true, booking: updatedBooking }
    }
    return { success: false, error: "bookings.errors.updateBookingFailed" }
  } catch (error) {
    logger.error("Error updating booking by admin:", { error, bookingId, payload })
    const errorMessage = error instanceof Error ? error.message : "bookings.errors.updateBookingFailed"
    return {
      success: false,
      error: errorMessage.startsWith("bookings.errors.") ? errorMessage : "bookings.errors.updateBookingFailed",
    }
  } finally {
    await mongooseDbSession.endSession()
  }
}

// assignProfessionalToBookingAdmin is effectively covered by updateBookingByAdmin
// if professionalId is part of its payload.

// cancelBookingByAdmin is also covered by updateBookingByAdmin if status is set to cancelled_by_admin
// and cancellationReason is provided.
// However, a dedicated cancelBookingByAdmin might be cleaner if it has more specific logic (e.g., refund processing).
// For now, using updateBookingByAdmin is more minimal.

export async function getProfessionalsForAssignment(): Promise<{
  success: boolean
  professionals?: IUser[]
  error?: string
}> {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.roles.includes("admin")) {
    return { success: false, error: "common.unauthorized" }
  }
  try {
    await dbConnect()
    const professionals = await User.find({ roles: "professional", isActive: true })
      .select("_id name email phone specialties") // Add any other relevant fields
      .lean()
    return { success: true, professionals: professionals as IUser[] }
  } catch (error) {
    logger.error("Error fetching professionals for assignment:", { error })
    return { success: false, error: "professionals.errors.fetchFailed" }
  }
}
