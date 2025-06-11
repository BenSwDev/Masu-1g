"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import mongoose from "mongoose"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"

import Booking, { type IBooking, type IPriceDetails, type IBookingAddressSnapshot, type BookingStatus } from "@/lib/db/models/booking"
import Treatment, { type ITreatment } from "@/lib/db/models/treatment"
import UserSubscription, { type IUserSubscription } from "@/lib/db/models/user-subscription"
import Subscription from "@/lib/db/models/subscription"
import GiftVoucher, { type IGiftVoucher } from "@/lib/db/models/gift-voucher"
import Coupon from "@/lib/db/models/coupon"
import User, { type IUser } from "@/lib/db/models/user"
import Address, { type IAddress, constructFullAddress as constructFullAddressHelper } from "@/lib/db/models/address"
import {
  WorkingHoursSettings,
  type IWorkingHoursSettings,
  type IFixedHours,
  type ISpecialDate,
  type ISpecialDateEvent,
} from "@/lib/db/models/working-hours"
import { getNextSequenceValue } from "@/lib/db/models/counter"

import { logger } from "@/lib/logs/logger"
import { mergeGuestWithExistingUser, convertGuestToRealUser } from "@/actions/guest-auth-actions"
import type {
  TimeSlot,
  CalculatedPriceDetails as ClientCalculatedPriceDetails,
  PopulatedBooking,
} from "@/types/booking"
import { add, format, set, addMinutes, isBefore, isAfter } from "date-fns"
import { formatInTimeZone, toZonedTime, format as formatTz } from "date-fns-tz"
import { CalculatePricePayloadSchema, CreateBookingPayloadSchema } from "@/lib/validation/booking-schemas"
import type { z } from "zod"
import type { CreateBookingPayloadType as CreateBookingPayloadSchemaType } from "@/lib/validation/booking-schemas"

import { notificationManager } from "@/lib/notifications/notification-manager"
import type {
  EmailRecipient,
  PhoneRecipient,
  BookingSuccessNotificationData,
  NotificationLanguage,
} from "@/lib/notifications/notification-types"

import type { ICoupon } from "@/lib/db/models/coupon"
import type { ISubscription } from "@/lib/db/models/subscription"
import type { IPaymentMethod } from "@/lib/db/models/payment-method"

import { getActivePaymentMethods as fetchUserActivePaymentMethods } from "@/actions/payment-method-actions"

export type { IGiftVoucherUsageHistory } from "@/types/booking"

// Define the timezone we'll use throughout the app
const TIMEZONE = "Asia/Jerusalem" // Israel timezone

// Replace the isSameUTCDay function with a timezone-aware version
function isSameDay(dateLeft: Date, dateRight: Date): boolean {
  // Convert both dates to the same timezone before comparing
  const zonedLeft = toZonedTime(dateLeft, TIMEZONE)
  const zonedRight = toZonedTime(dateRight, TIMEZONE)
  
  return (
    zonedLeft.getFullYear() === zonedRight.getFullYear() &&
    zonedLeft.getMonth() === zonedRight.getMonth() &&
    zonedLeft.getDate() === zonedRight.getDate()
  )
}

// Replace getDayWorkingHours function to use the new isSameDay function
function getDayWorkingHours(date: Date, settings: IWorkingHoursSettings): IFixedHours | ISpecialDate | ISpecialDateEvent | null {
  // Convert the input date to the correct timezone
  const zonedDate = toZonedTime(date, TIMEZONE)
  
  // Debug logging
  console.log('getDayWorkingHours inputs:', {
    originalDate: date.toISOString(),
    zonedDate: zonedDate.toISOString(),
    dayOfWeek: zonedDate.getDay(),
    timezone: TIMEZONE
  })
  
  // First check for special date events (new priority system)
  if (settings.specialDateEvents) {
    for (const event of settings.specialDateEvents) {
      for (const eventDate of event.dates) {
        if (isSameDay(new Date(eventDate), date)) {
          console.log('Found matching special date event:', event)
          return event
        }
      }
    }
  }

  // Then check legacy special dates
  const specialDateSetting = settings.specialDates?.find((sd) => isSameDay(new Date(sd.date), date))
  if (specialDateSetting) {
    console.log('Found matching special date:', specialDateSetting)
    return specialDateSetting
  }

  // Finally check fixed hours for the day of week
  // This is the key fix - we need to use the local day of week from the zoned date
  const dayOfWeek = zonedDate.getDay() // 0 = Sunday, 1 = Monday, etc.
  
  console.log('Looking for fixed day setting with dayOfWeek:', dayOfWeek)
  console.log('Available fixed hours settings:', settings.fixedHours?.map(fh => ({ dayOfWeek: fh.dayOfWeek, isActive: fh.isActive })))
  
  const fixedDaySetting = settings.fixedHours?.find((fh) => fh.dayOfWeek === dayOfWeek)
  
  // Debug logging
  if (fixedDaySetting) {
    console.log('Found matching fixed day setting:', {
      dayOfWeek,
      startTime: fixedDaySetting.startTime,
      endTime: fixedDaySetting.endTime,
      isActive: fixedDaySetting.isActive
    })
  } else {
    console.log('No matching day setting found for day of week:', dayOfWeek)
  }
  
  return fixedDaySetting || null
}

export async function getAvailableTimeSlots(
  dateString: string,
  treatmentId: string,
  selectedDurationId?: string,
): Promise<{ success: boolean; timeSlots?: TimeSlot[]; error?: string; workingHoursNote?: string }> {
  try {
    await dbConnect()
    
    // Debug logging
    console.log('getAvailableTimeSlots inputs:', {
      dateString,
      treatmentId,
      selectedDurationId
    })
    
    // Create a timezone-aware date from the dateString
    // First create a UTC date from the string (noon to avoid DST issues)
    const selectedDateUTC = new Date(`${dateString}T12:00:00.000Z`)

    if (isNaN(selectedDateUTC.getTime())) {
      return { success: false, error: "bookings.errors.invalidDate" }
    }

    // Convert to our target timezone
    const selectedDateInTZ = toZonedTime(selectedDateUTC, TIMEZONE)
    
    // Debug logging
    console.log('Date conversions:', {
      dateString,
      selectedDateUTC: selectedDateUTC.toISOString(),
      selectedDateInTZ: selectedDateInTZ.toISOString(),
      selectedDateInTZ_dayOfWeek: selectedDateInTZ.getDay()
    })

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

    // Debug logging
    console.log('Working hours settings:', {
      fixedHoursCount: settings.fixedHours?.length,
      specialDatesCount: settings.specialDates?.length,
      specialDateEventsCount: settings.specialDateEvents?.length,
      slotIntervalMinutes: settings.slotIntervalMinutes
    })

    const daySettings = getDayWorkingHours(selectedDateUTC, settings)
    
    // Debug logging
    console.log('Day settings result:', {
      found: !!daySettings,
      isActive: daySettings?.isActive,
      startTime: daySettings?.startTime,
      endTime: daySettings?.endTime
    })
    
    if (!daySettings || !daySettings.isActive) {
      return {
        success: true,
        timeSlots: [],
        workingHoursNote: daySettings?.notes || "bookings.messages.closedOnSelectedDate",
      }
    }

    // Get current time in the correct timezone
    const now = new Date()
    const nowInTZ = toZonedTime(now, TIMEZONE)
    
    // Check if selected date is today in the target timezone
    const isToday = isSameDay(selectedDateUTC, now)
    
    // Debug logging
    console.log('Time calculations:', {
      now: now.toISOString(),
      nowInTZ: nowInTZ.toISOString(),
      isToday,
      cutoffTime: daySettings.cutoffTime
    })
    
    // Check if cutoff time has been reached for today
    let isCutoffTimeReached = false
    if (isToday && 'cutoffTime' in daySettings && daySettings.cutoffTime) {
      const [cutoffHour, cutoffMinute] = daySettings.cutoffTime.split(":").map(Number)
      
      // Create a Date representing the cutoff time today in the target timezone
      const cutoffTimeToday = new Date(nowInTZ)
      cutoffTimeToday.setHours(cutoffHour, cutoffMinute, 0, 0)
      
      // Compare current time to cutoff time
      isCutoffTimeReached = nowInTZ >= cutoffTimeToday
      
      // Debug logging
      console.log('Cutoff time check:', {
        cutoffHour,
        cutoffMinute,
        cutoffTimeToday: cutoffTimeToday.toISOString(),
        isCutoffTimeReached
      })
    }
    
    // If today and past cutoff time, no slots are available
    if (isToday && isCutoffTimeReached) {
      return {
        success: true,
        timeSlots: [],
        workingHoursNote: `לא ניתן לבצע הזמנות ליום זה לאחר שעה ${('cutoffTime' in daySettings) ? daySettings.cutoffTime : '18:00'}.`
      }
    }
    
    // Create time slots based on working hours
    const timeSlots: TimeSlot[] = []
    const slotInterval = settings.slotIntervalMinutes || 30

    // Parse working hours start and end times
    const [startHour, startMinute] = daySettings.startTime.split(":").map(Number)
    const [endHour, endMinute] = daySettings.endTime.split(":").map(Number)

    // Debug logging
    console.log('Working hours configuration:', {
      startTime: daySettings.startTime,
      endTime: daySettings.endTime,
      nowFormatted: formatInTimeZone(nowInTZ, TIMEZONE, 'HH:mm'),
      timezone: TIMEZONE
    })
    
    // Calculate minimum booking time 
    const minimumBookingAdvanceHours = 
      ('minimumBookingAdvanceHours' in daySettings && daySettings.minimumBookingAdvanceHours !== undefined) 
        ? daySettings.minimumBookingAdvanceHours 
        : settings.minimumBookingLeadTimeHours ?? 2;

    // Convert hours to minutes for easier calculation
    let startTimeMinutes = (startHour * 60) + startMinute
    let endTimeMinutes = (endHour * 60) + endMinute

    // Handle cases where end time is on the next day (e.g., for 24-hour places)
    if (endTimeMinutes <= startTimeMinutes) {
      endTimeMinutes += 24 * 60
    }

    // Get current time components directly from nowInTZ
    const nowHourTZ = nowInTZ.getHours()
    const nowMinuteTZ = nowInTZ.getMinutes()
    const nowTimeMinutes = (nowHourTZ * 60) + nowMinuteTZ

    // Minimum booking time in minutes from midnight
    const minimumBookingTimeMinutes = nowTimeMinutes + (minimumBookingAdvanceHours * 60)

    console.log('Time calculations in minutes:', {
      startTimeMinutes,
      endTimeMinutes,
      nowTimeMinutes,
      minimumBookingTimeMinutes,
      treatmentDurationMinutes,
      lastPossibleStartTimeMinutes: endTimeMinutes - treatmentDurationMinutes,
      lastPossibleStartTime: `${String(Math.floor((endTimeMinutes - treatmentDurationMinutes) / 60) % 24).padStart(2, '0')}:${String((endTimeMinutes - treatmentDurationMinutes) % 60).padStart(2, '0')}`,
      isToday
    })

    // Generate slots
    for (let currentMinutes = startTimeMinutes; currentMinutes <= endTimeMinutes; currentMinutes += slotInterval) {
      // Convert back to hours and minutes
      let slotHour = Math.floor(currentMinutes / 60) % 24
      let slotMinute = currentMinutes % 60
      
      // Format the time as HH:MM
      const timeStr = `${String(slotHour).padStart(2, '0')}:${String(slotMinute).padStart(2, '0')}`
      
      let isSlotAvailable = true

      // We now allow starting at the end time exactly
      // For example, if closing is at 22:00, we allow a booking at 22:00
      // No need to check if treatment extends beyond working hours anymore
      
      // For today, check if the slot time is after the minimum booking time
      if (isToday && currentMinutes < minimumBookingTimeMinutes) {
        isSlotAvailable = false
      }

      if (isSlotAvailable) {
        const slot: TimeSlot = {
          time: timeStr,
          isAvailable: true,
        }

        // Add price surcharge if applicable
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
    }
    
    // Debug logging
    console.log('Generated time slots:', {
      totalSlots: timeSlots.length,
      availableSlots: timeSlots.filter(slot => slot.isAvailable).length,
      firstSlot: timeSlots.length > 0 ? timeSlots[0].time : null,
      lastSlot: timeSlots.length > 0 ? timeSlots[timeSlots.length - 1].time : null
    })
    
    // Add informative note about cutoff time
    let workingHoursNote = daySettings.notes
    if (!isToday && 'cutoffTime' in daySettings && daySettings.cutoffTime) {
      const cutoffTimeNote = `הזמנות ליום זה יתאפשרו עד השעה ${daySettings.cutoffTime} באותו היום.`
      workingHoursNote = workingHoursNote ? `${workingHoursNote} ${cutoffTimeNote}` : cutoffTimeNote
    }
    
    return { success: true, timeSlots, workingHoursNote }
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
        12,
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
  const requestId = `booking_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  const startTime = Date.now()
  
  try {
    logger.info(`[${requestId}] Starting booking creation`, { 
      timestamp: new Date().toISOString(),
      payload: payload ? "provided" : "missing"
    })

    // Validation phase
    const validationStart = Date.now()
    const validationResult = CreateBookingPayloadSchema.safeParse(payload)
    const validationTime = Date.now() - validationStart
    
    if (!validationResult.success) {
      logger.warn(`[${requestId}] Validation failed`, {
        validationTime: `${validationTime}ms`,
        errors: validationResult.error.issues.map(issue => ({
          path: issue.path,
          message: issue.message
        }))
      })
      return { success: false, issues: validationResult.error.issues }
    }
    
    logger.info(`[${requestId}] Validation passed`, { validationTime: `${validationTime}ms` })
    const validatedPayload = validationResult.data

    // Database connection phase
    const dbConnectStart = Date.now()
    await dbConnect()
    const dbConnectTime = Date.now() - dbConnectStart
    
    logger.info(`[${requestId}] Database connected`, { 
      dbConnectTime: `${dbConnectTime}ms`,
      userId: validatedPayload.userId
    })

    // Data loading phase
    const dataLoadStart = Date.now()
    logger.info(`[${requestId}] Loading initial data`, { phase: "data-loading" })

    const [treatmentResult, userResult] = await Promise.allSettled([
      Treatment.findById(validatedPayload.treatmentId).lean(),
      User.findById(validatedPayload.userId).lean()
    ])

    const dataLoadTime = Date.now() - dataLoadStart
    
    if (treatmentResult.status === "rejected" || userResult.status === "rejected") {
      logger.error(`[${requestId}] Failed to load initial data`, {
        dataLoadTime: `${dataLoadTime}ms`,
        treatmentError: treatmentResult.status === "rejected" ? treatmentResult.reason : null,
        userError: userResult.status === "rejected" ? userResult.reason : null
      })
      return { success: false, error: "bookings.errors.dataLoadFailed" }
    }

    const treatment = treatmentResult.value as ITreatment | null
    const user = userResult.value

    if (!treatment || !treatment.isActive) {
      logger.warn(`[${requestId}] Treatment not found or inactive`, { 
        treatmentId: validatedPayload.treatmentId,
        treatmentFound: !!treatment,
        treatmentActive: treatment?.isActive
      })
      return { success: false, error: "bookings.errors.treatmentNotFound" }
    }

    if (!user) {
      logger.warn(`[${requestId}] User not found`, { userId: validatedPayload.userId })
      return { success: false, error: "bookings.errors.userNotFound" }
    }

    logger.info(`[${requestId}] Initial data loaded successfully`, { 
      dataLoadTime: `${dataLoadTime}ms`,
      treatmentName: treatment.name,
      userName: user.name,
      isGuest: user.isGuest
    })

    // Price calculation phase
    const priceCalcStart = Date.now()
    logger.info(`[${requestId}] Starting price calculation`, { phase: "price-calculation" })
    
    const priceCalculationPayload = {
      treatmentId: validatedPayload.treatmentId,
      selectedDurationId: validatedPayload.selectedDurationId,
      bookingDateTime: new Date(validatedPayload.bookingDateTime),
      couponCode: validatedPayload.appliedCouponCode,
      giftVoucherCode: validatedPayload.selectedGiftVoucherId 
        ? (await GiftVoucher.findById(validatedPayload.selectedGiftVoucherId).select('code').lean())?.code
        : undefined,
      userSubscriptionId: validatedPayload.selectedUserSubscriptionId,
      userId: validatedPayload.userId,
    }

    const calculatedPriceResult = await calculateBookingPrice(priceCalculationPayload)
    const priceCalcTime = Date.now() - priceCalcStart

    if (!calculatedPriceResult.success) {
      logger.error(`[${requestId}] Price calculation failed`, {
        priceCalcTime: `${priceCalcTime}ms`,
        error: calculatedPriceResult.error
      })
      return { success: false, error: calculatedPriceResult.error }
    }

    logger.info(`[${requestId}] Price calculation completed`, { 
      priceCalcTime: `${priceCalcTime}ms`,
      finalAmount: calculatedPriceResult.priceDetails?.finalAmount,
      basePrice: calculatedPriceResult.priceDetails?.basePrice
    })

    // Additional data loading phase
    const additionalDataStart = Date.now()
    let address: IAddress | null = null
    
    if (validatedPayload.addressId) {
      address = await Address.findById(validatedPayload.addressId).lean()
      if (!address) {
        logger.warn(`[${requestId}] Address not found`, { addressId: validatedPayload.addressId })
        return { success: false, error: "bookings.errors.addressNotFound" }
      }
    }

    const additionalDataTime = Date.now() - additionalDataStart
    logger.info(`[${requestId}] Additional data loaded`, { 
      additionalDataTime: `${additionalDataTime}ms`,
      hasAddress: !!address
    })

    // Transaction phase
    const transactionStart = Date.now()
    logger.info(`[${requestId}] Starting transaction`, { phase: "transaction" })

    const mongooseDbSession = await mongoose.startSession()
    let bookingResult: IBooking | null = null
    let updatedVoucherDetails: IGiftVoucher | null = null

    await mongooseDbSession.withTransaction(async () => {
      // Get next booking number
      const bookingNumberStart = Date.now()
      const bookingNumber = await getNextSequenceValue("booking")
      const bookingNumberTime = Date.now() - bookingNumberStart
      
      logger.info(`[${requestId}] Booking number generated`, { 
        bookingNumber,
        generationTime: `${bookingNumberTime}ms`
      })

      // Create booking object
      const newBooking = new Booking({
        bookingNumber,
        userId: new mongoose.Types.ObjectId(validatedPayload.userId),
        treatmentId: new mongoose.Types.ObjectId(validatedPayload.treatmentId),
        selectedDurationId: validatedPayload.selectedDurationId
          ? new mongoose.Types.ObjectId(validatedPayload.selectedDurationId)
          : undefined,
        bookingDateTime: new Date(validatedPayload.bookingDateTime),
        status: "pending_confirmation" as BookingStatus,
        source: validatedPayload.source,
        notes: validatedPayload.notes,
        therapistGenderPreference: validatedPayload.therapistGenderPreference,
        addressSnapshot: address
          ? {
              fullAddress: constructFullAddressHelper(address),
              addressLine1: address.addressLine1,
              addressLine2: address.addressLine2,
              city: address.city,
              state: address.state,
              postalCode: address.postalCode,
              country: address.country,
              latitude: address.latitude,
              longitude: address.longitude,
            }
          : undefined,
        priceDetails: calculatedPriceResult.priceDetails!,
        paymentDetails: {
          paymentStatus: calculatedPriceResult.priceDetails!.finalAmount === 0 ? "not_required" : "pending",
          paymentMethodId: validatedPayload.selectedPaymentMethodId
            ? new mongoose.Types.ObjectId(validatedPayload.selectedPaymentMethodId)
            : undefined,
        },
        userPreferences: {
          agreeToTerms: validatedPayload.agreeToTerms,
          agreeToMarketing: validatedPayload.agreeToMarketing,
        },
        isFlexibleTime: validatedPayload.isFlexibleTime,
        flexibilityRangeHours: validatedPayload.flexibilityRangeHours,
        isBookingForSomeoneElse: validatedPayload.isBookingForSomeoneElse,
        recipientDetails: validatedPayload.isBookingForSomeoneElse
          ? {
              name: validatedPayload.recipientName!,
              phone: validatedPayload.recipientPhone!,
              email: validatedPayload.recipientEmail!,
              birthDate: validatedPayload.recipientBirthDate
                ? new Date(validatedPayload.recipientBirthDate)
                : undefined,
            }
          : undefined,
      })

      // Save booking
      const bookingSaveStart = Date.now()
      bookingResult = await newBooking.save({ session: mongooseDbSession })
      const bookingSaveTime = Date.now() - bookingSaveStart
      
      logger.info(`[${requestId}] Booking saved`, { 
        bookingSaveTime: `${bookingSaveTime}ms`,
        bookingId: bookingResult._id,
        bookingNumber: bookingResult.bookingNumber
      })

      // Handle voucher/subscription logic
      if (validatedPayload.priceDetails.appliedGiftVoucherId && validatedPayload.priceDetails.voucherAppliedAmount > 0) {
        const voucherUpdateStart = Date.now()
        const voucher = (await GiftVoucher.findById(validatedPayload.priceDetails.appliedGiftVoucherId).session(mongooseDbSession)) as IGiftVoucher | null
        
        if (!voucher) {
          logger.error(`[${requestId}] Voucher not found during redemption`, { 
            voucherId: validatedPayload.priceDetails.appliedGiftVoucherId 
          })
          throw new Error("bookings.errors.voucherNotFoundDuringCreation")
        }

        // Update voucher usage
        if (voucher.voucherType === "treatment" && validatedPayload.priceDetails.isBaseTreatmentCoveredByTreatmentVoucher) {
          voucher.status = "fully_used"
          voucher.remainingAmount = 0
          voucher.isActive = false
        } else if (voucher.voucherType === "monetary") {
          if (typeof voucher.remainingAmount !== "number" || voucher.remainingAmount < validatedPayload.priceDetails.voucherAppliedAmount) {
            throw new Error("bookings.errors.voucherInsufficientBalance")
          }
          voucher.remainingAmount -= validatedPayload.priceDetails.voucherAppliedAmount
          voucher.status = voucher.remainingAmount <= 0 ? "fully_used" : "partially_used"
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
        
        const voucherUpdateTime = Date.now() - voucherUpdateStart
        logger.info(`[${requestId}] Voucher updated`, { 
          voucherUpdateTime: `${voucherUpdateTime}ms`,
          voucherCode: voucher.code,
          remainingAmount: voucher.remainingAmount
        })
      }

      // Handle coupon logic
      if (validatedPayload.priceDetails.appliedCouponId && validatedPayload.priceDetails.couponDiscount > 0) {
        const couponUpdateStart = Date.now()
        const coupon = await Coupon.findById(validatedPayload.priceDetails.appliedCouponId).session(mongooseDbSession)
        
        if (!coupon || !coupon.isActive) {
          throw new Error("bookings.errors.couponApplyFailed")
        }
        
        coupon.timesUsed += 1
        await coupon.save({ session: mongooseDbSession })
        
        const couponUpdateTime = Date.now() - couponUpdateStart
        logger.info(`[${requestId}] Coupon updated`, { 
          couponUpdateTime: `${couponUpdateTime}ms`,
          couponCode: coupon.code,
          timesUsed: coupon.timesUsed
        })
      }

      if (bookingResult) {
        if (bookingResult.priceDetails.finalAmount === 0) {
          bookingResult.paymentDetails.paymentStatus = "not_required"
        }
        bookingResult.priceDetails = newBooking.priceDetails
        await bookingResult.save({ session: mongooseDbSession })
      }
    })

    const transactionTime = Date.now() - transactionStart
    logger.info(`[${requestId}] Transaction completed`, { 
      transactionTime: `${transactionTime}ms`
    })

    if (bookingResult) {
      // Handle guest user post-booking
      if (user?.isGuest) {
        logger.info(`[${requestId}] Guest booking completed`, { 
          guestUserId: validatedPayload.userId, 
          bookingId: bookingResult._id 
        })
      }

      // Revalidation phase
      const revalidationStart = Date.now()
      revalidatePath("/dashboard/member/book-treatment")
      revalidatePath("/dashboard/member/subscriptions")
      revalidatePath("/dashboard/member/gift-vouchers")
      revalidatePath("/dashboard/member/bookings")
      revalidatePath("/dashboard/admin/bookings")
      const revalidationTime = Date.now() - revalidationStart

      const totalTime = Date.now() - startTime
      logger.info(`[${requestId}] Booking creation completed successfully`, {
        totalTime: `${totalTime}ms`,
        revalidationTime: `${revalidationTime}ms`,
        bookingId: bookingResult._id,
        bookingNumber: bookingResult.bookingNumber,
        finalAmount: bookingResult.priceDetails.finalAmount,
        phases: {
          validation: `${validationTime}ms`,
          dbConnect: `${dbConnectTime}ms`,
          dataLoad: `${dataLoadTime}ms`,
          priceCalc: `${priceCalcTime}ms`,
          additionalData: `${additionalDataTime}ms`,
          transaction: `${transactionTime}ms`,
          revalidation: `${revalidationTime}ms`
        }
      })

      const finalBookingObject = bookingResult.toObject() as IBooking
      if (updatedVoucherDetails) {
        ;(finalBookingObject as any).updatedVoucherDetails = updatedVoucherDetails
      }

      return { success: true, booking: finalBookingObject }
    }

    logger.error(`[${requestId}] Booking creation failed - no booking result`, {
      totalTime: `${Date.now() - startTime}ms`
    })
    return { success: false, error: "bookings.errors.creationFailed" }

  } catch (error) {
    const totalTime = Date.now() - startTime
    logger.error(`[${requestId}] Booking creation failed with exception`, {
      totalTime: `${totalTime}ms`,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5) // First 5 lines of stack
      } : String(error)
    })

    if (error instanceof mongoose.Error.ValidationError) {
      const validationErrors = Object.values(error.errors).map(err => err.message)
      return { success: false, error: `Validation failed: ${validationErrors.join(', ')}` }
    }

    return { success: false, error: "bookings.errors.creationFailed" }
  }
}

export async function getUserBookings(
  userId: string,
  filters: {
    status?: string
    treatment?: string
    dateRange?: string
    search?: string
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

    const { status, treatment, dateRange, search, page = 1, limit = 10, sortBy = "bookingDateTime", sortDirection = "desc" } = filters

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

    // Add treatment filter
    if (treatment && treatment !== "all") {
      query.treatmentId = new mongoose.Types.ObjectId(treatment)
    }

    // Add date range filter
    if (dateRange && dateRange !== "all") {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      switch (dateRange) {
        case "today":
          query.bookingDateTime = {
            $gte: today,
            $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
          }
          break
        case "this_week":
          const startOfWeek = new Date(today)
          startOfWeek.setDate(today.getDate() - today.getDay())
          const endOfWeek = new Date(startOfWeek)
          endOfWeek.setDate(startOfWeek.getDate() + 7)
          query.bookingDateTime = { $gte: startOfWeek, $lt: endOfWeek }
          break
        case "this_month":
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
          query.bookingDateTime = { $gte: startOfMonth, $lt: endOfMonth }
          break
        case "last_month":
          const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
          const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 1)
          query.bookingDateTime = { $gte: startOfLastMonth, $lt: endOfLastMonth }
          break
      }
    }

    // Add search filter
    if (search && search.trim()) {
      query.$or = [
        { bookingNumber: { $regex: search.trim(), $options: "i" } },
        { recipientName: { $regex: search.trim(), $options: "i" } },
        { notes: { $regex: search.trim(), $options: "i" } }
      ]
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
      .populate<{ treatmentId: ITreatment | null }>({
        path: "treatmentId",
        select: "name durations defaultDurationMinutes pricingType fixedPrice isActive",
        // REMOVED: populate: { path: "durations" } // durations is an array of subdocuments, not refs
      })
      .populate<{ addressId: IAddress | null }>({
        path: "addressId",
        select:
          "fullAddress city street streetNumber apartmentDetails houseDetails officeDetails hotelDetails otherDetails additionalNotes addressType",
      })
      .populate<{ professionalId: Pick<IUser, "_id" | "name"> | null }>({
        path: "professionalId",
        select: "name",
      })
      .populate<{ "priceDetails.appliedCouponId": ICoupon | null }>({
        path: "priceDetails.appliedCouponId",
      })
      .populate<{ "priceDetails.appliedGiftVoucherId": IGiftVoucher | null }>({
        path: "priceDetails.appliedGiftVoucherId",
      })
      .populate<{
        "priceDetails.redeemedUserSubscriptionId":
          | (IUserSubscription & {
              subscriptionId: ISubscription
              treatmentId: ITreatment
            })
          | null
      }>({
        path: "priceDetails.redeemedUserSubscriptionId",
        populate: [
          { path: "subscriptionId", select: "name description" },
          {
            path: "treatmentId",
            select: "name pricingType defaultDurationMinutes durations",
            // REMOVED: populate: { path: "durations" } // durations is an array of subdocuments, not refs
          },
        ],
      })
      .populate<{ "paymentDetails.paymentMethodId": IPaymentMethod | null }>({
        path: "paymentDetails.paymentMethodId",
        select: "type last4 brand isDefault displayName",
      })
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    const bookings = rawBookings as unknown as PopulatedBooking[]

    return { bookings, totalPages, totalBookings }
  } catch (error) {
    logger.error("Error in getAllBookings:", { error, filters })
    throw new Error("bookings.errors.fetchBookingsFailed")
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
      revalidatePath("/dashboard/member/subscriptions")
      revalidatePath("/dashboard/member/gift-vouchers")
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

export async function getBookingInitialDataForGuest(userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
  const requestId = `guest_data_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
  const startTime = Date.now()
  
  try {
    logger.info(`[${requestId}] Loading booking initial data for guest`, { userId })
    
    // For guest users, we don't check session - just verify the user exists and is a guest
    await dbConnect()
    const userStart = Date.now()
    const user = await User.findById(userId).select("isGuest guestSessionId name email phone").lean()
    const userTime = Date.now() - userStart
    
    if (!user || !user.isGuest) {
      logger.warn(`[${requestId}] User not found or not a guest`, { 
        userId, 
        userFound: !!user, 
        isGuest: user?.isGuest,
        userLoadTime: `${userTime}ms`
      })
      return { success: false, error: "common.unauthorized" }
    }

    logger.info(`[${requestId}] Guest user verified`, { 
      userLoadTime: `${userTime}ms`,
      guestSessionId: user.guestSessionId 
    })

    const dataLoadStart = Date.now()
    const [
      treatmentsResult,
      workingHoursResult,
    ] = await Promise.allSettled([
      Treatment.find({ isActive: true }).populate("durations").lean(),
      WorkingHoursSettings.findOne().lean(),
    ])
    const dataLoadTime = Date.now() - dataLoadStart

    const getFulfilledValue = (result: PromiseSettledResult<any>, defaultValue: any = null) =>
      result.status === "fulfilled" ? result.value : defaultValue

    const activeTreatments = getFulfilledValue(treatmentsResult, [])
    const workingHoursSettings = getFulfilledValue(workingHoursResult)

    logger.info(`[${requestId}] Data loading completed`, {
      dataLoadTime: `${dataLoadTime}ms`,
      treatmentsCount: activeTreatments?.length || 0,
      hasWorkingHours: !!workingHoursSettings,
      treatmentsStatus: treatmentsResult.status,
      workingHoursStatus: workingHoursResult.status
    })

    if (!activeTreatments || !workingHoursSettings) {
      logger.error(`[${requestId}] Failed to load critical initial data for guest booking`, {
        userId,
        treatmentsFound: !!activeTreatments,
        settingsFound: !!workingHoursSettings,
        treatmentsError: treatmentsResult.status === "rejected" ? treatmentsResult.reason : null,
        workingHoursError: workingHoursResult.status === "rejected" ? workingHoursResult.reason : null,
        totalTime: `${Date.now() - startTime}ms`
      })
      return { success: false, error: "bookings.errors.initialDataLoadFailed" }
    }

    const data = {
      activeUserSubscriptions: [], // Guests don't have subscriptions
      usableGiftVouchers: [], // Guests don't have existing vouchers
      userPreferences: {
        therapistGender: "any",
        notificationMethods: ["email"],
        notificationLanguage: "he",
      },
      userAddresses: [], // Guests will enter address during booking
      userPaymentMethods: [], // Guests will add payment during booking
      activeTreatments,
      workingHoursSettings,
      currentUser: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    }

    const totalTime = Date.now() - startTime
    logger.info(`[${requestId}] Guest booking data loaded successfully`, {
      totalTime: `${totalTime}ms`,
      userLoadTime: `${userTime}ms`,
      dataLoadTime: `${dataLoadTime}ms`,
      treatmentsCount: activeTreatments.length,
      userId
    })

    return { success: true, data: JSON.parse(JSON.stringify(data)) }
  } catch (error) {
    const totalTime = Date.now() - startTime
    logger.error(`[${requestId}] Error fetching initial booking data for guest`, { 
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 3)
      } : String(error),
      userId,
      totalTime: `${totalTime}ms`
    })
    return { success: false, error: "bookings.errors.initialDataFetchFailed" }
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
      if (booking.status !== "confirmed" || booking.professionalId) {
        throw new Error("bookings.errors.bookingNotAvailableForProfessionalAssignment")
      }

      booking.professionalId = new mongoose.Types.ObjectId(professionalId)
      await booking.save({ session: mongooseDbSession })
      acceptedBooking = booking.toObject()
    })

    if (acceptedBooking) {
      revalidatePath(`/dashboard/professional/booking-management/${bookingId}`)
      revalidatePath("/dashboard/admin/bookings")

      try {
        const clientUser = await User.findById(acceptedBooking.userId)
          .select("name email phone notificationPreferences")
          .lean()
        const treatment = await Treatment.findById(acceptedBooking.treatmentId).select("name").lean()
        const professional = await User.findById(professionalId).select("name").lean()

        if (clientUser && treatment && professional) {
          const clientLang = (clientUser.notificationPreferences?.language as NotificationLanguage) || "he"
          const clientNotificationMethods = clientUser.notificationPreferences?.methods || ["email"]

          const notificationData = {
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
        logger.error("Failed to send booking professional assigned notification to client:", {
          error: notificationError,
          bookingId,
        })
      }
      return { success: true, booking: acceptedBooking }
    }
    return { success: false, error: "bookings.errors.assignProfessionalFailed" }
  } catch (error) {
    logger.error("Error in professionalAcceptBooking (assign professional):", { error, bookingId, professionalId })
    const errorMessage = error instanceof Error ? error.message : "bookings.errors.assignProfessionalFailed"
    return {
      success: false,
      error: errorMessage.startsWith("bookings.errors.") ? errorMessage : "bookings.errors.assignProfessionalFailed",
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

    try {
      const clientUser = await User.findById(booking.userId).select("name email phone notificationPreferences").lean()
      const treatment = await Treatment.findById(booking.treatmentId).select("name").lean()
      const professional = await User.findById(professionalId).select("name").lean()

      if (clientUser && treatment && professional) {
        const clientLang = (clientUser.notificationPreferences?.language as NotificationLanguage) || "he"
        const clientNotificationMethods = clientUser.notificationPreferences?.methods || ["email"]
        const notificationData = {
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

    try {
      const clientUser = await User.findById(booking.userId).select("name email phone notificationPreferences").lean()
      const treatment = await Treatment.findById(booking.treatmentId).select("name").lean()
      const professional = await User.findById(professionalId).select("name").lean()

      if (clientUser && treatment && professional) {
        const clientLang = (clientUser.notificationPreferences?.language as NotificationLanguage) || "he"
        const clientNotificationMethods = clientUser.notificationPreferences?.methods || ["email"]
        const notificationData = {
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

export async function getAllBookings(
  filters: {
    status?: string
    professional?: string
    treatment?: string
    dateRange?: string
    priceRange?: string
    address?: string
    page?: number
    limit?: number
    sortBy?: string
    sortDirection?: "asc" | "desc"
    search?: string
  } = {},
): Promise<{ bookings: PopulatedBooking[]; totalPages: number; totalBookings: number }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.roles.includes("admin")) {
    throw new Error("common.unauthorized")
  }

  try {
    await dbConnect()

    const {
      status,
      professional,
      treatment,
      dateRange,
      priceRange,
      address,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortDirection = "desc",
      search,
    } = filters

    // Build filter query
    const filterQuery: any = {}

    if (status && status !== "all") {
      filterQuery.status = status
    }

    // Professional filter
    if (professional && professional !== "all") {
      if (professional === "assigned") {
        filterQuery.professionalId = { $ne: null }
      } else if (professional === "unassigned") {
        filterQuery.professionalId = null
      }
    }

    // Date range filter
    if (dateRange && dateRange !== "all") {
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
      
      switch (dateRange) {
        case "today":
          filterQuery.bookingDateTime = {
            $gte: startOfDay,
            $lt: endOfDay
          }
          break
        case "tomorrow":
          const tomorrowStart = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
          const tomorrowEnd = new Date(tomorrowStart.getTime() + 24 * 60 * 60 * 1000)
          filterQuery.bookingDateTime = {
            $gte: tomorrowStart,
            $lt: tomorrowEnd
          }
          break
        case "this_week":
          const thisWeekStart = new Date(startOfDay.getTime() - startOfDay.getDay() * 24 * 60 * 60 * 1000)
          const thisWeekEnd = new Date(thisWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
          filterQuery.bookingDateTime = {
            $gte: thisWeekStart,
            $lt: thisWeekEnd
          }
          break
        case "next_week":
          const nextWeekStart = new Date(startOfDay.getTime() + (7 - startOfDay.getDay()) * 24 * 60 * 60 * 1000)
          const nextWeekEnd = new Date(nextWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
          filterQuery.bookingDateTime = {
            $gte: nextWeekStart,
            $lt: nextWeekEnd
          }
          break
        case "this_month":
          const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
          const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
          filterQuery.bookingDateTime = {
            $gte: thisMonthStart,
            $lt: thisMonthEnd
          }
          break
        case "next_month":
          const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)
          const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 1)
          filterQuery.bookingDateTime = {
            $gte: nextMonthStart,
            $lt: nextMonthEnd
          }
          break
      }
    }

    // Price range filter
    if (priceRange && priceRange !== "all") {
      const [min, max] = priceRange.includes("-") 
        ? priceRange.split("-").map(Number)
        : priceRange === "500+" 
          ? [500, Infinity]
          : [0, 0]
      
      if (max === Infinity) {
        filterQuery["priceDetails.finalAmount"] = { $gte: min }
      } else {
        filterQuery["priceDetails.finalAmount"] = { $gte: min, $lt: max }
      }
    }

    if (search) {
      const searchRegex = new RegExp(search, "i")
      filterQuery.$or = [
        { bookingNumber: searchRegex },
        { bookedByUserName: searchRegex },
        { bookedByUserEmail: searchRegex },
        { bookedByUserPhone: searchRegex },
        { recipientName: searchRegex },
        { recipientPhone: searchRegex },
      ]
    }

    // Calculate pagination
    const skip = (page - 1) * limit
    const sortOrder = sortDirection === "asc" ? 1 : -1

    // Get total count
    const totalBookings = await Booking.countDocuments(filterQuery)
    const totalPages = Math.ceil(totalBookings / limit)

    // Fetch bookings with population
    const bookings = await Booking.find(filterQuery)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .populate("userId", "name email phone dateOfBirth gender roles activeRole treatmentPreferences notificationPreferences createdAt updatedAt")
      .populate("professionalId", "name email phone specialization")
      .populate("treatmentId", "name category defaultDurationMinutes pricingType fixedPrice durations")
      .populate("addressId", "fullAddress city street streetNumber apartmentDetails houseDetails officeDetails hotelDetails otherDetails additionalNotes addressType hasPrivateParking")
      .populate("priceDetails.appliedCouponId", "code discountType discountValue")
      .populate("priceDetails.appliedGiftVoucherId", "code amount")
      .populate("priceDetails.redeemedUserSubscriptionId")
      .populate("paymentDetails.paymentMethodId", "type last4 brand displayName")
      .lean()

    const populatedBookings: PopulatedBooking[] = bookings.map((booking) => ({
      ...booking,
      _id: booking._id.toString(),
      userId: booking.userId,
      treatmentId: booking.treatmentId,
      professionalId: booking.professionalId || null,
      addressId: booking.addressId || null,
    }))

    return {
      bookings: populatedBookings,
      totalPages,
      totalBookings,
    }
  } catch (error) {
    logger.error("Error in getAllBookings:", { error, filters })
    throw new Error("bookings.errors.fetchBookingsFailed")
  }
}

export async function assignProfessionalToBooking(
  bookingId: string,
  professionalId: string,
): Promise<{ success: boolean; error?: string; booking?: IBooking }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.roles.includes("admin")) {
    return { success: false, error: "common.unauthorized" }
  }

  const mongooseDbSession = await mongoose.startSession()
  let assignedBooking: IBooking | null = null

  try {
    await mongooseDbSession.withTransaction(async () => {
      await dbConnect()

      // Verify professional exists and has professional role
      const professional = await User.findById(professionalId).session(mongooseDbSession)
      if (!professional || !professional.roles.includes("professional")) {
        throw new Error("bookings.errors.professionalNotFound")
      }

      // Find and update booking
      const booking = await Booking.findById(bookingId).session(mongooseDbSession)
      if (!booking) {
        throw new Error("bookings.errors.bookingNotFound")
      }

      if (booking.professionalId) {
        throw new Error("bookings.errors.bookingAlreadyHasProfessional")
      }

      if (["completed", "cancelled_by_user", "cancelled_by_admin", "no_show"].includes(booking.status)) {
        throw new Error("bookings.errors.bookingCannotBeAssigned")
      }

      booking.professionalId = new mongoose.Types.ObjectId(professionalId)
      booking.status = "confirmed"
      await booking.save({ session: mongooseDbSession })
      assignedBooking = booking.toObject()
    })

    if (assignedBooking) {
      revalidatePath("/dashboard/admin/bookings")
      revalidatePath(`/dashboard/professional/booking-management/${bookingId}`)

      try {
        // Send notifications to client and professional
        const [clientUser, professional, treatment] = await Promise.all([
          User.findById(assignedBooking.userId).select("name email phone notificationPreferences").lean(),
          User.findById(professionalId).select("name email phone notificationPreferences").lean(),
          Treatment.findById(assignedBooking.treatmentId).select("name").lean(),
        ])

        if (clientUser && professional && treatment) {
          // Client notification
          const clientLang = (clientUser.notificationPreferences?.language as NotificationLanguage) || "he"
          const clientNotificationMethods = clientUser.notificationPreferences?.methods || ["email"]

          const clientNotificationData = {
            type: "BOOKING_CONFIRMED_CLIENT",
            userName: clientUser.name || "לקוח/ה",
            professionalName: professional.name || "מטפל/ת",
            bookingDateTime: assignedBooking.bookingDateTime,
            treatmentName: treatment.name,
            bookingDetailsLink: `${process.env.NEXTAUTH_URL || ""}/dashboard/member/bookings?bookingId=${assignedBooking._id.toString()}`,
          }

          if (clientNotificationMethods.includes("email") && clientUser.email) {
            await notificationManager.sendNotification(
              { type: "email", value: clientUser.email, name: clientUser.name, language: clientLang },
              clientNotificationData,
            )
          }
          if (clientNotificationMethods.includes("sms") && clientUser.phone) {
            await notificationManager.sendNotification(
              { type: "phone", value: clientUser.phone, language: clientLang },
              clientNotificationData,
            )
          }

          // Professional notification
          const professionalLang = (professional.notificationPreferences?.language as NotificationLanguage) || "he"
          const professionalNotificationMethods = professional.notificationPreferences?.methods || ["email"]

          const professionalNotificationData = {
            type: "BOOKING_ASSIGNED_PROFESSIONAL",
            professionalName: professional.name || "מטפל/ת",
            clientName: clientUser.name || "לקוח/ה",
            bookingDateTime: assignedBooking.bookingDateTime,
            treatmentName: treatment.name,
            bookingDetailsLink: `${process.env.NEXTAUTH_URL || ""}/dashboard/professional/booking-management/${assignedBooking._id.toString()}`,
          }

          if (professionalNotificationMethods.includes("email") && professional.email) {
            await notificationManager.sendNotification(
              { type: "email", value: professional.email, name: professional.name, language: professionalLang },
              professionalNotificationData,
            )
          }
          if (professionalNotificationMethods.includes("sms") && professional.phone) {
            await notificationManager.sendNotification(
              { type: "phone", value: professional.phone, language: professionalLang },
              professionalNotificationData,
            )
          }
        }
      } catch (notificationError) {
        logger.error("Failed to send booking assignment notifications:", {
          error: notificationError,
          bookingId,
          professionalId,
        })
      }

      return { success: true, booking: assignedBooking }
    }

    return { success: false, error: "bookings.errors.assignProfessionalFailed" }
  } catch (error) {
    logger.error("Error in assignProfessionalToBooking:", { error, bookingId, professionalId })
    const errorMessage = error instanceof Error ? error.message : "bookings.errors.assignProfessionalFailed"
    return {
      success: false,
      error: errorMessage.startsWith("bookings.errors.") ? errorMessage : "bookings.errors.assignProfessionalFailed",
    }
  } finally {
    await mongooseDbSession.endSession()
  }
}

export async function getAvailableProfessionals(): Promise<{ success: boolean; professionals?: any[]; error?: string }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.roles.includes("admin")) {
    return { success: false, error: "common.unauthorized" }
  }

  try {
    await dbConnect()

    const professionals = await User.find({ roles: "professional" })
      .select("_id name email phone gender")
      .lean()

    return {
      success: true,
      professionals: professionals.map((p) => ({
        _id: p._id.toString(),
        name: p.name,
        email: p.email,
        phone: p.phone,
        gender: p.gender,
      })),
    }
  } catch (error) {
    logger.error("Error in getAvailableProfessionals:", { error })
    return { success: false, error: "bookings.errors.fetchProfessionalsFailed" }
  }
}

export async function updateBookingByAdmin(
  bookingId: string,
  updates: {
    status?: BookingStatus
    bookingDateTime?: Date
    recipientName?: string
    recipientPhone?: string
    recipientEmail?: string
    notes?: string
    professionalId?: string
    paymentStatus?: "pending" | "paid" | "failed" | "not_required"
  }
): Promise<{ success: boolean; error?: string; booking?: IBooking }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.roles.includes("admin")) {
    return { success: false, error: "common.unauthorized" }
  }

  try {
    await dbConnect()
    const booking = await Booking.findById(bookingId)
    if (!booking) {
      return { success: false, error: "bookings.errors.bookingNotFound" }
    }

    // Update fields if provided
    if (updates.status !== undefined) {
      booking.status = updates.status
    }
    
    if (updates.bookingDateTime) {
      booking.bookingDateTime = updates.bookingDateTime
    }
    
    if (updates.recipientName !== undefined) {
      booking.recipientName = updates.recipientName
    }
    
    if (updates.recipientPhone !== undefined) {
      booking.recipientPhone = updates.recipientPhone
    }
    
    if (updates.recipientEmail !== undefined) {
      booking.recipientEmail = updates.recipientEmail
    }
    
    if (updates.notes !== undefined) {
      booking.notes = updates.notes
    }
    
    if (updates.professionalId !== undefined) {
      if (updates.professionalId) {
        // Verify professional exists
        const professional = await User.findById(updates.professionalId)
        if (!professional || !professional.roles.includes("professional")) {
          return { success: false, error: "bookings.errors.professionalNotFound" }
        }
        booking.professionalId = new mongoose.Types.ObjectId(updates.professionalId)
      } else {
        booking.professionalId = null
      }
    }
    
    if (updates.paymentStatus !== undefined) {
      booking.paymentDetails.paymentStatus = updates.paymentStatus
    }

    await booking.save()
    
    // Revalidate relevant paths
    revalidatePath("/dashboard/admin/bookings")
    revalidatePath("/dashboard/member/bookings")
    revalidatePath("/dashboard/professional/bookings")
    
    return { success: true, booking: booking.toObject() }
  } catch (error) {
    console.error("Error updating booking:", error)
    return { success: false, error: "common.unknown" }
  }
}
