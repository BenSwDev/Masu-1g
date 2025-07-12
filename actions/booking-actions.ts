"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import mongoose from "mongoose"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"

import Booking, { 
  type IBooking, 
  type IPriceDetails, 
  type IBookingAddressSnapshot, 
  type BookingStatus,
  type IBookingConsents,
  type IEnhancedPaymentDetails,
  type IBookingReview,
  type IProfessionalShare
} from "@/lib/db/models/booking"
import Treatment, { type ITreatment } from "@/lib/db/models/treatment"
import UserSubscription, { type IUserSubscription } from "@/lib/db/models/user-subscription"
import Subscription from "@/lib/db/models/subscription"
import GiftVoucher, { type IGiftVoucher } from "@/lib/db/models/gift-voucher"
import Coupon from "@/lib/db/models/coupon"
import User, { type IUser, UserRole } from "@/lib/db/models/user"
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
import bookingLogger from "@/lib/logs/booking-logger"
import type {
  TimeSlot,
  CalculatedPriceDetails as ClientCalculatedPriceDetails,
  PopulatedBooking,
} from "@/types/booking"
import { add, format, set, addMinutes, isBefore, isAfter } from "date-fns"
import { formatInTimeZone, toZonedTime, format as formatTz } from "date-fns-tz"
import { CalculatePricePayloadSchema, CreateBookingPayloadSchema, CreateGuestBookingPayloadSchema } from "@/lib/validation/booking-schemas"
import type { z } from "zod"
import type { CreateBookingPayloadType as CreateBookingPayloadSchemaType, CreateGuestBookingPayloadType } from "@/lib/validation/booking-schemas"

import { unifiedNotificationService } from "@/lib/notifications/unified-notification-service"
import { smartNotificationService } from "@/lib/notifications/smart-notification-service"
import { sendUserNotification, sendGuestNotification, sendBookingConfirmationToUser } from "@/actions/notification-service"
import type {
  EmailRecipient,
  PhoneRecipient,
  NotificationLanguage,
  NotificationData,
  ProfessionalBookingNotificationData,
} from "@/lib/notifications/notification-types"

import type { ICoupon } from "@/lib/db/models/coupon"
import type { ISubscription } from "@/lib/db/models/subscription"
import type { IPaymentMethod } from "@/lib/db/models/payment-method"

import { getActivePaymentMethods as fetchUserActivePaymentMethods } from "@/actions/payment-method-actions"

// Add import for event system
import { eventBus, createBookingEvent } from "@/lib/events/booking-event-system"
import type { RedemptionCode } from "@/types/booking"

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
  
  // First check for special date events (new priority system)
  if (settings.specialDateEvents) {
    for (const event of settings.specialDateEvents) {
      for (const eventDate of event.dates) {
        if (isSameDay(new Date(eventDate), date)) {
          return event
        }
      }
    }
  }

  // Then check legacy special dates
  const specialDateSetting = settings.specialDates?.find((sd) => isSameDay(new Date(sd.date), date))
  if (specialDateSetting) {
    return specialDateSetting
  }

  // Finally check fixed hours for the day of week
  const dayOfWeek = zonedDate.getDay() // 0 = Sunday, 1 = Monday, etc.
  const fixedDaySetting = settings.fixedHours?.find((fh) => fh.dayOfWeek === dayOfWeek)
  
  return fixedDaySetting || null
}

export async function getAvailableTimeSlots(
  dateString: string,
  treatmentId: string,
  selectedDurationId?: string,
): Promise<{ success: boolean; timeSlots?: TimeSlot[]; error?: string; workingHoursNote?: string }> {
  try {
    await dbConnect()
    
    // Create a timezone-aware date from the dateString
    const selectedDateUTC = new Date(`${dateString}T12:00:00.000Z`)

    if (isNaN(selectedDateUTC.getTime())) {
      return { success: false, error: "bookings.errors.invalidDate" }
    }

    // Convert to our target timezone
    const selectedDateInTZ = toZonedTime(selectedDateUTC, TIMEZONE)

    // Optimized database queries with lean() for better performance
    const treatment = await Treatment.findById(treatmentId).lean() as ITreatment | null
    const settings = await (WorkingHoursSettings as any).findOne().lean() as IWorkingHoursSettings | null

    if (!treatment || !treatment.isActive) {
      return { success: false, error: "bookings.errors.treatmentNotFound" }
    }

    if (!settings) {
      return { success: false, error: "bookings.errors.workingHoursNotSet" }
    }

    // Calculate treatment duration
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

    const daySettings = getDayWorkingHours(selectedDateUTC, settings)
    const dayOfWeek = selectedDateInTZ.getDay()
    
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
    
    // Check if cutoff time has been reached for today
    let isCutoffTimeReached = false
    if (isToday && 'cutoffTime' in daySettings && daySettings.cutoffTime) {
      const [cutoffHour, cutoffMinute] = daySettings.cutoffTime.split(":").map(Number)
      const cutoffTimeToday = new Date(nowInTZ)
      cutoffTimeToday.setHours(cutoffHour, cutoffMinute, 0, 0)
      isCutoffTimeReached = nowInTZ >= cutoffTimeToday
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
    const nowTimeMinutes = (nowInTZ.getHours() * 60) + nowInTZ.getMinutes()
    const minimumBookingTimeMinutes = nowTimeMinutes + (minimumBookingAdvanceHours * 60)

    // Pre-calculate surcharge details for better performance
    let surchargeAmount = 0
    let surchargeDescription = ""
    let surchargeStartTimeMinutes: number | null = null
    let surchargeEndTimeMinutes: number | null = null
    
    if (daySettings.hasPriceAddition && daySettings.priceAddition && daySettings.priceAddition.amount > 0) {
      const basePriceForSurchargeCalc =
        treatment.pricingType === "fixed"
          ? treatment.fixedPrice || 0
          : treatment.durations?.find((d) => d._id.toString() === selectedDurationId)?.price || 0

      surchargeAmount =
        daySettings.priceAddition.type === "fixed"
          ? daySettings.priceAddition.amount
          : basePriceForSurchargeCalc * (daySettings.priceAddition.amount / 100)

      surchargeDescription = daySettings.priceAddition.description || daySettings.notes || "bookings.surcharges.specialTime"
      
      // Calculate surcharge time range
      if (daySettings.priceAddition.priceAdditionStartTime) {
        const [startHour, startMinute] = daySettings.priceAddition.priceAdditionStartTime.split(":").map(Number)
        surchargeStartTimeMinutes = (startHour * 60) + startMinute
      } else {
        surchargeStartTimeMinutes = startTimeMinutes // Default to start of working hours
      }
      
      if (daySettings.priceAddition.priceAdditionEndTime) {
        const [endHour, endMinute] = daySettings.priceAddition.priceAdditionEndTime.split(":").map(Number)
        surchargeEndTimeMinutes = (endHour * 60) + endMinute
      } else {
        surchargeEndTimeMinutes = endTimeMinutes // Default to end of working hours
      }
    }

    // ✅ תיקון: בדיקת הזמנות קיימות למניעת דאבל בוקינג
    const startOfDay = new Date(selectedDateUTC)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(selectedDateUTC)
    endOfDay.setHours(23, 59, 59, 999)
    
    const existingBookings = await Booking.find({
      bookingDateTime: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      status: { $in: ["pending_professional", "confirmed", "professional_en_route", "in_progress"] },
      treatmentId: treatmentId
    }).select('bookingDateTime').lean()
    
    // יצירת סט של שעות תפוסות לביצועים מיטביים
    const bookedTimeSlots = new Set(
      existingBookings.map(booking => {
        const bookingTime = new Date(booking.bookingDateTime)
        const hours = String(bookingTime.getHours()).padStart(2, '0')
        const minutes = String(bookingTime.getMinutes()).padStart(2, '0')
        return `${hours}:${minutes}`
      })
    )

    // Generate slots with optimized loop
    for (let currentMinutes = startTimeMinutes; currentMinutes <= endTimeMinutes; currentMinutes += slotInterval) {
      // Convert back to hours and minutes
      const slotHour = Math.floor(currentMinutes / 60) % 24
      const slotMinute = currentMinutes % 60
      
      // Format the time as HH:MM
      const timeStr = `${String(slotHour).padStart(2, '0')}:${String(slotMinute).padStart(2, '0')}`
      
      // Check availability - both time-based and booking conflicts
      const isTimeAvailable = !isToday || currentMinutes >= minimumBookingTimeMinutes
      const isSlotNotBooked = !bookedTimeSlots.has(timeStr)
      const isSlotAvailable = isTimeAvailable && isSlotNotBooked

      if (isSlotAvailable) {
        const slot: TimeSlot = {
          time: timeStr,
          isAvailable: true,
        }

        // Check if current slot is within surcharge time range
        const isInSurchargeRange = surchargeAmount > 0 && 
          surchargeStartTimeMinutes !== null && 
          surchargeEndTimeMinutes !== null &&
          currentMinutes >= surchargeStartTimeMinutes && 
          currentMinutes <= surchargeEndTimeMinutes

        // Add price surcharge if applicable and within time range
        if (isInSurchargeRange) {
          slot.surcharge = {
            description: surchargeDescription,
            amount: surchargeAmount,
          }
        }

        // Note: Evening surcharges are now handled through working hours settings with time ranges
        
        timeSlots.push(slot)
      }
    }
    
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
      guestPhone,
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
      // Initialize financial breakdown
      totalProfessionalPayment: 0,
      totalOfficeCommission: 0,
      baseProfessionalPayment: 0,
      surchargesProfessionalPayment: 0,
    }

    const settings = await (WorkingHoursSettings as any).findOne().lean() as IWorkingHoursSettings | null
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
        let isInSurchargeRange = false // ✅ Default to false - surcharge must be explicitly in range
        
        if (daySettings.priceAddition.priceAdditionStartTime && daySettings.priceAddition.priceAdditionEndTime) {
          // Both start and end times are specified - check exact range
          const [startHour, startMinute] = daySettings.priceAddition.priceAdditionStartTime.split(":").map(Number)
          const [endHour, endMinute] = daySettings.priceAddition.priceAdditionEndTime.split(":").map(Number)
          
          const surchargeStartMinutes = (startHour * 60) + startMinute
          const surchargeEndMinutes = (endHour * 60) + endMinute
          
          // Handle case where end time might be next day (e.g., 22:00 to 02:00)
          if (surchargeEndMinutes < surchargeStartMinutes) {
            // Crosses midnight
            isInSurchargeRange = bookingTimeMinutes >= surchargeStartMinutes || bookingTimeMinutes <= surchargeEndMinutes
          } else {
            // Same day range
            isInSurchargeRange = bookingTimeMinutes >= surchargeStartMinutes && bookingTimeMinutes <= surchargeEndMinutes
          }
        } else if (daySettings.priceAddition.priceAdditionStartTime) {
          // Only start time specified - from start time to end of day
          const [startHour, startMinute] = daySettings.priceAddition.priceAdditionStartTime.split(":").map(Number)
          const surchargeStartMinutes = (startHour * 60) + startMinute
          isInSurchargeRange = bookingTimeMinutes >= surchargeStartMinutes
        } else if (daySettings.priceAddition.priceAdditionEndTime) {
          // Only end time specified - from start of day to end time
          const [endHour, endMinute] = daySettings.priceAddition.priceAdditionEndTime.split(":").map(Number)
          const surchargeEndMinutes = (endHour * 60) + endMinute
          isInSurchargeRange = bookingTimeMinutes <= surchargeEndMinutes
        } else {
          // No time range specified - apply to all times
          isInSurchargeRange = true
        }
        
        if (isInSurchargeRange) {
          const surchargeBase = basePrice
          const surchargeAmount =
            daySettings.priceAddition.type === "fixed"
              ? daySettings.priceAddition.amount
              : surchargeBase * (daySettings.priceAddition.amount / 100)

          if (surchargeAmount > 0) {
            // Calculate professional share for this surcharge
            let professionalShare: IProfessionalShare | undefined = undefined
            // Check if this is a fixed hours or special date event (not legacy special date)
            if ('professionalShare' in daySettings && daySettings.professionalShare && daySettings.professionalShare.amount > 0) {
              professionalShare = {
                amount: daySettings.professionalShare.amount,
                type: daySettings.professionalShare.type
              }
            }

            priceDetails.surcharges.push({
              description:
                daySettings.priceAddition.description ||
                ('notes' in daySettings ? daySettings.notes : '') ||
                `bookings.surcharges.specialTime (${format(bookingDateTime, "HH:mm")})`,
              amount: surchargeAmount,
              ...(professionalShare && { professionalShare })
            })
            priceDetails.totalSurchargesAmount += surchargeAmount
          }
        }
      }
    }

    // Note: Evening surcharges are now handled through working hours settings with time ranges

    if (userSubscriptionId) {
      const userSub = await UserSubscription.findById(userSubscriptionId)
        .populate("subscriptionId")
        .populate({ path: "treatmentId", model: "Treatment", populate: { path: "durations" } })
        .lean() as any

      if (
        userSub &&
        userSub.status === "active" &&
        userSub.remainingQuantity > 0
      ) {
        // Enhanced ownership validation for subscriptions
        let isOwnershipValid = false
        
        if (userSub.userId && userId && userSub.userId.toString() === userId) {
          // Logged-in user owns the subscription
          isOwnershipValid = true
        } else if (!userId && userSub.guestInfo?.phone && guestPhone) {
          // Guest subscription - validate phone number
          const normalizePhone = (phone: string) => {
            let cleaned = phone.replace(/[^\d+]/g, "")
            if (!cleaned.startsWith("+")) {
              if (cleaned.startsWith("0")) {
                cleaned = "+972" + cleaned.substring(1)
              } else if (cleaned.length === 9 && /^[5-9]/.test(cleaned)) {
                cleaned = "+972" + cleaned
              } else if (cleaned.length === 10 && cleaned.startsWith("972")) {
                cleaned = "+" + cleaned
              } else {
                cleaned = "+972" + cleaned
              }
            }
            if (cleaned.startsWith("+9720")) {
              cleaned = "+972" + cleaned.substring(5)
            }
            return cleaned
          }

          const normalizedSubscriptionPhone = normalizePhone(userSub.guestInfo.phone)
          const normalizedGuestPhone = normalizePhone(guestPhone)
          
          if (normalizedSubscriptionPhone === normalizedGuestPhone) {
            isOwnershipValid = true
          }
        }
        
                if (isOwnershipValid) {
          const subTreatment = userSub.treatmentId as ITreatment
          const isTreatmentMatch = subTreatment && (subTreatment._id as any).toString() === treatmentId
          let isDurationMatch = true
          if (isTreatmentMatch && subTreatment.pricingType === "duration_based") {
            isDurationMatch = userSub.selectedDurationId
              ? userSub.selectedDurationId.toString() === selectedDurationId
              : subTreatment.durations?.some((d: any) => d._id.toString() === selectedDurationId && d.isActive) || false
          }

          if (isTreatmentMatch && isDurationMatch) {
            priceDetails.treatmentPriceAfterSubscriptionOrTreatmentVoucher = 0
            priceDetails.isBaseTreatmentCoveredBySubscription = true
            priceDetails.redeemedUserSubscriptionId = (userSub._id as any).toString()
          }
        } else {
          // ❌ Ownership validation failed - log security attempt
          logger.warn("Subscription ownership validation failed", {
            subscriptionId: userSubscriptionId,
            userId: userId,
            guestPhone: guestPhone ? "provided" : "missing",
            subscriptionUserId: userSub.userId?.toString(),
            subscriptionGuestPhone: userSub.guestInfo?.phone ? "exists" : "missing"
          })
        }
      }
    }

    if (giftVoucherCode) {
      const voucher = (await GiftVoucher.findOne({
        code: giftVoucherCode,
        status: { $in: ["active", "partially_used", "sent"] },
        validUntil: { $gte: new Date() },
      }).lean()) as IGiftVoucher | null

      if (voucher && (voucher.isActive || voucher.status === "sent")) {
        // ✅ ALL VOUCHERS ARE GIFTS - Ownership validation
        // Since ALL vouchers are gifts, validate recipient phone (ownerUserId)
        let isOwnershipValid = false
        
        if (voucher.recipientPhone) {
          // For ALL vouchers (all are gifts), validate recipient phone
          if (!userId && guestPhone) {
            // Guest redemption - check phone match
            const normalizePhone = (phone: string) => {
              let cleaned = phone.replace(/[^\d+]/g, "")
              if (!cleaned.startsWith("+")) {
                if (cleaned.startsWith("0")) {
                  cleaned = "+972" + cleaned.substring(1)
                } else if (cleaned.length === 9 && /^[5-9]/.test(cleaned)) {
                  cleaned = "+972" + cleaned
                } else if (cleaned.length === 10 && cleaned.startsWith("972")) {
                  cleaned = "+" + cleaned
                } else {
                  cleaned = "+972" + cleaned
                }
              }
              if (cleaned.startsWith("+9720")) {
                cleaned = "+972" + cleaned.substring(5)
              }
              return cleaned
            }

            const normalizedRecipientPhone = normalizePhone(voucher.recipientPhone)
            const normalizedGuestPhone = normalizePhone(guestPhone)
            
            if (normalizedRecipientPhone === normalizedGuestPhone) {
              isOwnershipValid = true
            }
          } else if (userId) {
            // For logged-in users, we'll allow it for now but should validate phone in frontend
            isOwnershipValid = true
          }
        } else {
          // If no recipient phone, we need to check ownership via ownerUserId
          // This should not happen in the new system since all vouchers should have recipient info
          logger.warn("Gift voucher without recipient phone found in calculateBookingPrice", { voucherId: voucher._id })
        }
        
        if (isOwnershipValid) {
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
        } else {
          // ❌ Ownership validation failed - log security attempt
          logger.warn("Gift voucher ownership validation failed", {
            voucherCode: giftVoucherCode,
            userId: userId,
            guestPhone: guestPhone ? "provided" : "missing",
            voucherIsGift: true, // All vouchers are gifts now
            voucherOwnerUserId: voucher.ownerUserId?.toString(),
            voucherRecipientPhone: voucher.recipientPhone ? "exists" : "missing"
          })
        }
      }
    }

    // Set the correct treatmentPriceAfterSubscriptionOrTreatmentVoucher BEFORE using it in calculations
    if (priceDetails.isBaseTreatmentCoveredBySubscription || priceDetails.isBaseTreatmentCoveredByTreatmentVoucher) {
      priceDetails.treatmentPriceAfterSubscriptionOrTreatmentVoucher = 0
    } else {
      priceDetails.treatmentPriceAfterSubscriptionOrTreatmentVoucher = basePrice
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

    // Debug logging
    logger.info("Price calculation result:", {
      basePrice: priceDetails.basePrice,
      totalSurchargesAmount: priceDetails.totalSurchargesAmount,
      treatmentPriceAfterSubscriptionOrTreatmentVoucher: priceDetails.treatmentPriceAfterSubscriptionOrTreatmentVoucher,
      subtotalBeforeGeneralReductions,
      finalAmount: priceDetails.finalAmount,
      bookingDateTime: validatedPayload.bookingDateTime,
      surcharges: priceDetails.surcharges
    })

    // Calculate professional payment and office commission
    // 1. Base treatment professional payment (המטפל מקבל את החלק שלו תמיד, גם אם הטיפול מכוסה)
    let baseProfessionalPayment = 0
    if (treatment.pricingType === "fixed" && treatment.fixedProfessionalPrice) {
      baseProfessionalPayment = treatment.fixedProfessionalPrice
    } else if (treatment.pricingType === "duration_based" && selectedDurationId) {
      const duration = treatment.durations?.find(d => d._id.toString() === selectedDurationId)
      if (duration) {
        baseProfessionalPayment = duration.professionalPrice
      }
    }

    // 2. Surcharges professional payment
    let surchargesProfessionalPayment = 0
    for (const surcharge of priceDetails.surcharges) {
      if (surcharge.professionalShare) {
        const surchargeAmount = surcharge.amount
        if (surcharge.professionalShare.type === "fixed") {
          surchargesProfessionalPayment += surcharge.professionalShare.amount
        } else if (surcharge.professionalShare.type === "percentage") {
          surchargesProfessionalPayment += surchargeAmount * (surcharge.professionalShare.amount / 100)
        }
      }
    }

    // 3. Total professional payment (המטפל מקבל את החלק שלו תמיד)
    const totalProfessionalPayment = baseProfessionalPayment + surchargesProfessionalPayment

    // 4. Office commission calculation:
    // - אם הלקוח משלם הכל: עמלת משרד = מה שהלקוח משלם - מה שהמטפל מקבל
    // - אם הטיפול מכוסה על ידי מנוי/שובר: המשרד משלם למטפל מהכיס שלו, ועמלת המשרד שלילית
    const totalOfficeCommission = priceDetails.finalAmount - totalProfessionalPayment

    // Update price details with financial breakdown
    priceDetails.totalProfessionalPayment = totalProfessionalPayment
    priceDetails.totalOfficeCommission = totalOfficeCommission // יכול להיות שלילי אם המשרד משלם מהכיס
    priceDetails.baseProfessionalPayment = baseProfessionalPayment
    priceDetails.surchargesProfessionalPayment = surchargesProfessionalPayment

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

    const bookingUser = await User.findById(validatedPayload.userId).select("name email phone").lean()
    if (!bookingUser) {
      return { success: false, error: "bookings.errors.userNotFound" }
    }

    let bookingAddressSnapshot: IBookingAddressSnapshot | undefined

    if (validatedPayload.customAddressDetails) {
      // Validate required address fields
      const addressDetails = validatedPayload.customAddressDetails
      if (!addressDetails.city?.trim() || !addressDetails.street?.trim()) {
        logger.warn("Incomplete address details provided", { addressDetails })
        return { success: false, error: "bookings.errors.incompleteAddress" }
      }

      // Use the updated constructFullAddress function if fullAddress is not provided
      if (!addressDetails.fullAddress) {
        addressDetails.fullAddress = constructFullAddressHelper(addressDetails)
      }
      
      bookingAddressSnapshot = {
        fullAddress: addressDetails.fullAddress || constructFullAddressHelper(addressDetails),
        city: addressDetails.city || "",
        street: addressDetails.street || "",
        streetNumber: addressDetails.streetNumber || "",
        addressType: (addressDetails as any).addressType || "apartment",
        apartment: (addressDetails as any).apartment,
        entrance: (addressDetails as any).entrance,
        floor: (addressDetails as any).floor,
        notes: (addressDetails as any).notes,
        doorName: (addressDetails as any).doorName,
        buildingName: (addressDetails as any).buildingName,
        hotelName: (addressDetails as any).hotelName,
        roomNumber: (addressDetails as any).roomNumber,
        instructions: (addressDetails as any).instructions,
        otherInstructions: (addressDetails as any).otherInstructions,
        hasPrivateParking: (addressDetails as any).hasPrivateParking,
      }
    } else if (validatedPayload.selectedAddressId) {
      const selectedAddressDoc = (await Address.findById(validatedPayload.selectedAddressId).lean()) as IAddress | null

      if (!selectedAddressDoc) {
        logger.error("Selected address not found during booking creation", {
          selectedAddressId: validatedPayload.selectedAddressId,
          userId: validatedPayload.userId,
        })
        return { success: false, error: "bookings.errors.addressNotFound" }
      }

      const currentFullAddress = selectedAddressDoc.fullAddress || constructFullAddressHelper(selectedAddressDoc)

      bookingAddressSnapshot = {
        fullAddress: currentFullAddress,
        city: selectedAddressDoc.city,
        street: selectedAddressDoc.street,
        streetNumber: selectedAddressDoc.streetNumber,
        addressType: selectedAddressDoc.addressType === "private" ? "house" : selectedAddressDoc.addressType,
        apartment: selectedAddressDoc.apartmentDetails?.apartmentNumber,
        entrance:
          selectedAddressDoc.addressType === "apartment"
            ? selectedAddressDoc.apartmentDetails?.entrance
            : selectedAddressDoc.addressType === "house" || selectedAddressDoc.addressType === "private"
              ? selectedAddressDoc.houseDetails?.entrance
              : selectedAddressDoc.addressType === "office"
                ? selectedAddressDoc.officeDetails?.entrance
                : undefined,
        floor:
          selectedAddressDoc.addressType === "apartment"
            ? selectedAddressDoc.apartmentDetails?.floor?.toString()
            : selectedAddressDoc.addressType === "office"
              ? selectedAddressDoc.officeDetails?.floor?.toString()
              : undefined,
        notes: selectedAddressDoc.additionalNotes,
        doorName:
          selectedAddressDoc.addressType === "house" || selectedAddressDoc.addressType === "private"
            ? selectedAddressDoc.houseDetails?.doorName
            : undefined,
        buildingName:
          selectedAddressDoc.addressType === "office" ? selectedAddressDoc.officeDetails?.buildingName : undefined,
        hotelName: selectedAddressDoc.addressType === "hotel" ? selectedAddressDoc.hotelDetails?.hotelName : undefined,
        roomNumber:
          selectedAddressDoc.addressType === "hotel" ? selectedAddressDoc.hotelDetails?.roomNumber : undefined,
        instructions:
          selectedAddressDoc.addressType === "other" ? selectedAddressDoc.otherDetails?.instructions : undefined,
        otherInstructions:
          selectedAddressDoc.addressType === "other" ? selectedAddressDoc.otherDetails?.instructions : undefined,
        hasPrivateParking: selectedAddressDoc.hasPrivateParking,
      }

      if (!bookingAddressSnapshot.fullAddress) {
        logger.error("Failed to construct a valid bookingAddressSnapshot (fullAddress still missing)", {
          selectedAddressDoc,
          constructedSnapshot: bookingAddressSnapshot,
        })
        return { success: false, error: "bookings.errors.addressSnapshotCreationFailed" }
      }
    } else {
      logger.warn("No address provided for booking", { userId: validatedPayload.userId })
      return { success: false, error: "bookings.errors.addressRequired" }
    }

    await mongooseDbSession.withTransaction(async () => {
      const nextBookingNum = await getNextSequenceValue("bookingNumber")
      const bookingNumber = nextBookingNum.toString().padStart(6, "0")

      const newBooking = new Booking({
        ...validatedPayload,
        bookingNumber,
        bookedByUserName: bookingUser.name,
        bookedByUserEmail: bookingUser.email || undefined,
        bookedByUserPhone: bookingUser.phone,
        // Add recipient fields for "booking for someone else" logic
        recipientName: validatedPayload.isBookingForSomeoneElse ? validatedPayload.recipientName : bookingUser.name,
        recipientPhone: validatedPayload.isBookingForSomeoneElse ? validatedPayload.recipientPhone : bookingUser.phone,
        recipientEmail: validatedPayload.isBookingForSomeoneElse ? validatedPayload.recipientEmail : (bookingUser.email || undefined),
        recipientBirthDate: validatedPayload.isBookingForSomeoneElse ? validatedPayload.recipientBirthDate : undefined,
        recipientGender: validatedPayload.isBookingForSomeoneElse ? validatedPayload.recipientGender : undefined,
        bookingAddressSnapshot,
        status: validatedPayload.priceDetails.finalAmount === 0 || validatedPayload.paymentDetails.paymentStatus === "paid"
          ? "pending_professional" 
          : "pending_payment", // Will be updated to "pending_professional" after successful payment
        // Required fields with defaults for backward compatibility
        treatmentCategory: new mongoose.Types.ObjectId(), // Generate a new ObjectId as category reference
        staticTreatmentPrice: validatedPayload.staticPricingData?.staticTreatmentPrice || validatedPayload.priceDetails.basePrice || 0,
        staticTherapistPay: validatedPayload.staticPricingData?.staticTherapistPay || 0,
        companyFee: validatedPayload.staticPricingData?.companyFee || 0,
        consents: validatedPayload.consents || {
          customerAlerts: "sms",
          patientAlerts: "sms",
          marketingOptIn: false,
          termsAccepted: false
        },
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
          // Financial breakdown
          totalProfessionalPayment: validatedPayload.priceDetails.totalProfessionalPayment,
          totalOfficeCommission: validatedPayload.priceDetails.totalOfficeCommission,
          baseProfessionalPayment: validatedPayload.priceDetails.baseProfessionalPayment,
          surchargesProfessionalPayment: validatedPayload.priceDetails.surchargesProfessionalPayment,
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
        professionalId: null,
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
        
        // ✅ Add treatment validation for subscriptions
        if (userSub.treatmentId) {
          const subTreatmentId = userSub.treatmentId.toString()
          if (subTreatmentId !== validatedPayload.treatmentId) {
            throw new Error("bookings.errors.treatmentMismatch")
          }
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
          
        // ✅ Add treatment validation for treatment vouchers
        if (voucher.voucherType === "treatment" && voucher.treatmentId) {
          const voucherTreatmentId = voucher.treatmentId.toString()
          if (voucherTreatmentId !== validatedPayload.treatmentId) {
            throw new Error("bookings.errors.treatmentMismatch")
          }
        }

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
          orderId: newBooking._id as any,
          description: `Booking ${bookingNumber}`,
        })
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

      const finalBookingObject = (bookingResult as any).toObject() as IBooking
      if (updatedVoucherDetails) {
        ;(finalBookingObject as any).updatedVoucherDetails = updatedVoucherDetails
      }

      // Send booking confirmation using smart notification system
      try {
        const userId = validatedPayload.userId
        const isBookingForSomeoneElse = validatedPayload.isBookingForSomeoneElse || false
        
        // Get notification preferences from payload (with defaults)
        const notificationMethods = validatedPayload.notificationMethods || ["email"]
        const recipientNotificationMethods = validatedPayload.recipientNotificationMethods || notificationMethods
        const notificationLanguage = validatedPayload.notificationLanguage || "he"
        
        const treatment = await Treatment.findById(finalBookingObject.treatmentId).select("name").lean()
        const bookingAddress = finalBookingObject.bookingAddressSnapshot?.fullAddress || "כתובת לא זמינה"
        
        if (treatment) {
          // Prepare booking data for the booker (who is the logged-in user)
          const bookerBookingData = {
            recipientName: bookingUser.name, // Always the booker's name for their own notification
            bookerName: isBookingForSomeoneElse ? bookingUser.name : undefined,
            treatmentName: treatment.name,
            bookingDateTime: finalBookingObject.bookingDateTime,
            bookingNumber: finalBookingObject.bookingNumber,
            bookingAddress: bookingAddress,
            isForSomeoneElse: false, // Always false for booker's own notification - they get "your booking" message
            isBookerForSomeoneElse: isBookingForSomeoneElse, // True if they booked for someone else
            actualRecipientName: isBookingForSomeoneElse ? validatedPayload.recipientName! : undefined,
          }

          // Send notification to booker using their notification preferences  
          await sendBookingConfirmationToUser(userId, String(finalBookingObject._id))
          
          // Send notification to recipient if booking for someone else
          if (isBookingForSomeoneElse && validatedPayload.recipientEmail) {
            // Prepare booking data for the recipient
            const recipientBookingData = {
              recipientName: validatedPayload.recipientName!,
              bookerName: bookingUser.name,
              treatmentName: treatment.name,
              bookingDateTime: finalBookingObject.bookingDateTime,
              bookingNumber: finalBookingObject.bookingNumber,
              bookingAddress: bookingAddress,
              isForSomeoneElse: true,
            }
            
            await sendGuestNotification(
              {
                name: validatedPayload.recipientName!,
                email: validatedPayload.recipientEmail,
                phone: recipientNotificationMethods.includes("sms") ? validatedPayload.recipientPhone : undefined,
                language: notificationLanguage
              },
              {
                type: "treatment-booking-success",
                ...recipientBookingData,
              }
            )
          }
        }
        
        logger.info("Booking notifications sent successfully using smart system", { 
          bookingId: String(finalBookingObject._id),
          userId,
          isForSomeoneElse: isBookingForSomeoneElse
        })
        
      } catch (notificationError) {
        // Log but don't fail the booking creation
        logger.error("Failed to send booking notifications:", {
          error: notificationError instanceof Error ? notificationError.message : String(notificationError),
          bookingId: String(finalBookingObject._id),
        })
      }
      logger.info(`Booking status: ${finalBookingObject.status}, Number: ${finalBookingObject.bookingNumber}`)
      
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
          query.status = { $in: ["pending_professional", "confirmed"] }
          query.bookingDateTime = { $gte: new Date() }
          break
        case "past":
          query.status = { $in: ["completed"] }
          break
        case "cancelled":
          query.status = { $in: ["cancelled", "refunded"] }
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error during booking fetch"
    const errorStack = error instanceof Error ? error.stack : "No stack available"
    let errorDetails: any = {} // Use 'any' for flexibility in capturing diverse error properties
    if (error && typeof error === "object") {
      // Attempt to capture all own properties, including non-enumerable ones if possible, though getOwnPropertyNames is good
      Object.getOwnPropertyNames(error).forEach((key) => {
        errorDetails[key] = (error as Record<string, any>)[key]
      })
    } else if (error) {
      errorDetails = String(error) // Fallback to string representation
    }

    logger.error("Error fetching user bookings:", {
      userId,
      filters,
      errorName: error instanceof Error ? error.name : "UnknownErrorType",
      errorMessage: errorMessage,
      errorStack: errorStack,
      errorDetails: errorDetails,
      rawErrorObjectString: String(error),
    })
    return { bookings: [], totalPages: 0, totalBookings: 0 }
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
      if (booking.userId?.toString() !== userId && cancelledByRole !== "admin") throw new Error("common.unauthorized")
      if (["completed", "cancelled", "refunded"].includes(booking.status)) {
        throw new Error("bookings.errors.cannotCancelAlreadyProcessed")
      }

      booking.status = "cancelled"
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
              (entry) => entry.orderId?.toString() !== (booking._id as any).toString(),
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

export async function getBookingInitialData(userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    logger.info("Starting getBookingInitialData", { userId })
    
    const authSession = await getServerSession(authOptions)
    if (!authSession || authSession.user.id !== userId) {
      logger.error("Unauthorized access attempt", { userId, sessionUserId: authSession?.user?.id })
      return { success: false, error: "common.unauthorized" }
    }
    
    logger.info("Connecting to database")
    await dbConnect()
    logger.info("Database connected successfully")

    logger.info("Starting parallel data fetch")
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
        ownerUserId: userId, // Only get vouchers owned by the user (for gifts, this is the recipient)
        status: { $in: ["active", "partially_used", "sent"] },
        validUntil: { $gte: new Date() },
        isActive: true,
      }).lean(),
      User.findById(userId).select("preferences name email phone notificationPreferences treatmentPreferences").lean(),
      Address.find({ userId, isArchived: { $ne: true } }).lean(),
      fetchUserActivePaymentMethods(),
      Treatment.find({ isActive: true }).populate("durations").lean(),
      (WorkingHoursSettings as any).findOne().lean() as Promise<any>,
    ])
    logger.info("Parallel data fetch completed")

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
          (t: ITreatment) => (t._id as any).toString() === voucher.treatmentId?.toString(),
        )
        if (treatmentDetails) {
          treatmentName = treatmentDetails.name
          if (treatmentDetails.pricingType === "duration_based" && voucher.selectedDurationId) {
            const durationDetails = treatmentDetails.durations?.find(
              (d: any) => d._id.toString() === voucher.selectedDurationId?.toString(),
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

    const _data = {
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

    return { success: true, data: JSON.parse(JSON.stringify(_data)) }
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
    let acceptedBooking: any = null

    await mongooseDbSession.withTransaction(async () => {
      const booking = await Booking.findById(bookingId).session(mongooseDbSession)
      if (!booking) {
        throw new Error("bookings.errors.bookingNotFound")
      }
      if (booking.status !== "pending_professional" || booking.professionalId) {
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
          const clientNotificationMethods = clientUser.notificationPreferences?.methods || ["sms"]

          const baseUrl =
            process.env.NEXT_PUBLIC_APP_URL ||
            process.env.NEXTAUTH_URL ||
            ""
          const notificationData: ProfessionalBookingNotificationData = {
            type: "BOOKING_ASSIGNED_PROFESSIONAL",
            treatmentName: treatment.name,
            bookingDateTime: acceptedBooking.bookingDateTime,
            professionalName: professional.name || "מטפל/ת",
            clientName: clientUser.name || "לקוח/ה",
            userName: clientUser.name || "לקוח/ה",
            bookingDetailsLink: `${baseUrl}/dashboard/member/bookings?bookingId=${acceptedBooking._id.toString()}`,
          }

          const recipients = []
          if (clientNotificationMethods.includes("email") && clientUser.email) {
            recipients.push({ type: "email" as const, value: clientUser.email, name: clientUser.name, language: clientLang })
          }
          if (clientNotificationMethods.includes("sms") && clientUser.phone) {
            recipients.push({ type: "phone" as const, value: clientUser.phone, language: clientLang })
          }
          
          if (recipients.length > 0) {
            await unifiedNotificationService.sendNotificationToMultiple(recipients, notificationData)
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

    booking.status = "confirmed" // Keep as confirmed when en route
    
    // Ensure required fields have valid values for backward compatibility
    if (!booking.treatmentCategory) {
      booking.treatmentCategory = new mongoose.Types.ObjectId()
    }
    if (typeof booking.staticTreatmentPrice !== 'number') {
      booking.staticTreatmentPrice = booking.priceDetails?.basePrice || 0
    }
    if (typeof booking.staticTherapistPay !== 'number') {
      booking.staticTherapistPay = 0
    }
    if (typeof booking.companyFee !== 'number') {
      booking.companyFee = 0
    }
    if (!booking.consents) {
      booking.consents = {
        customerAlerts: "email",
        patientAlerts: "email",
        marketingOptIn: false,
        termsAccepted: false
      }
    }
    
    await booking.save()
    revalidatePath(`/dashboard/professional/booking-management/${bookingId}`)

    // Professional en route notifications removed as per requirements

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
    if (!["confirmed", "pending_professional"].includes(booking.status)) {
      return { success: false, error: "bookings.errors.bookingNotInCorrectStateForCompletion" }
    }

    booking.status = "completed"
    
    // Ensure required fields have valid values for backward compatibility
    if (!booking.treatmentCategory) {
      booking.treatmentCategory = new mongoose.Types.ObjectId()
    }
    if (typeof booking.staticTreatmentPrice !== 'number') {
      booking.staticTreatmentPrice = booking.priceDetails?.basePrice || 0
    }
    if (typeof booking.staticTherapistPay !== 'number') {
      booking.staticTherapistPay = 0
    }
    if (typeof booking.companyFee !== 'number') {
      booking.companyFee = 0
    }
    if (!booking.consents) {
      booking.consents = {
        customerAlerts: "email",
        patientAlerts: "email",
        marketingOptIn: false,
        termsAccepted: false
      }
    }
    
    await booking.save()
    revalidatePath(`/dashboard/professional/booking-management/${bookingId}`)
    revalidatePath("/dashboard/admin/bookings")

    try {
      const { sendReviewReminder } = await import("@/actions/review-actions")
      await sendReviewReminder(bookingId)
    } catch (notifyError) {
      logger.error("Failed to send review reminder:", notifyError)
    }


    return { success: true, booking: booking.toObject() }
  } catch (error) {
    logger.error("Error in professionalMarkCompleted:", { error, bookingId, professionalId })
    return { success: false, error: "bookings.errors.markCompletedFailed" }
  }
}

export async function getBookingById(bookingId: string): Promise<{
  success: boolean
  booking?: PopulatedBooking
  error?: string
}> {
  try {
    await dbConnect()

    // Find booking by booking number (6-digit number) or by ID (ObjectId)
    let booking
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(bookingId)
    
    if (isObjectId) {
      // Search by _id
      booking = await Booking.findById(bookingId)
      .populate<{ treatmentId: ITreatment | null }>({
        path: "treatmentId",
        select: "name durations defaultDurationMinutes pricingType fixedPrice isActive",
      })
      .populate<{ addressId: IAddress | null }>({
        path: "addressId",
        select: "fullAddress city street streetNumber apartmentDetails houseDetails officeDetails hotelDetails otherDetails additionalNotes addressType",
      })
      .populate<{ professionalId: Pick<IUser, "_id" | "name"> | null }>({
        path: "professionalId",
        select: "name email phone",
      })
      .populate<{ userId: Pick<IUser, "_id" | "name" | "email" | "phone"> | null }>({
        path: "userId",
        select: "name email phone",
      })
      .lean()
    } else {
      // Search by booking number
      booking = await Booking.findOne({ bookingNumber: bookingId })
        .populate<{ treatmentId: ITreatment | null }>({
          path: "treatmentId",
          select: "name durations defaultDurationMinutes pricingType fixedPrice isActive",
        })
        .populate<{ addressId: IAddress | null }>({
          path: "addressId",
          select: "fullAddress city street streetNumber apartmentDetails houseDetails officeDetails hotelDetails otherDetails additionalNotes addressType",
        })
        .populate<{ professionalId: Pick<IUser, "_id" | "name"> | null }>({
          path: "professionalId",
          select: "name email phone",
        })
        .populate<{ userId: Pick<IUser, "_id" | "name" | "email" | "phone"> | null }>({
          path: "userId",
          select: "name email phone",
        })
        .lean()
    }

    if (!booking) {
      return { success: false, error: "Booking not found" }
    }

    const populatedBooking: PopulatedBooking = {
      ...booking,
      _id: (booking._id as any).toString(),
      userId: booking.userId || null,
      treatmentId: booking.treatmentId,
      professionalId: booking.professionalId || null,
      addressId: booking.addressId || null,
    } as PopulatedBooking

    return { success: true, booking: populatedBooking }
  } catch (error) {
    logger.error("Error fetching booking by ID:", error)
    return { success: false, error: "Failed to fetch booking" }
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
  try {
    logger.info("getAllBookings called with filters:", filters)
    
    const session = await getServerSession(authOptions)
    logger.info("Session info:", {
      userId: session?.user?.id,
      roles: session?.user?.roles,
      activeRole: session?.user?.activeRole
    })
    
    if (!session?.user?.id || !session.user.roles?.includes("admin")) {
      logger.warn("Unauthorized access attempt to getAllBookings", {
        userId: session?.user?.id,
        roles: session?.user?.roles,
      })
      return { bookings: [], totalPages: 0, totalBookings: 0 }
    }

    logger.info("Connecting to database...")
    await dbConnect()
    logger.info("Database connected successfully")

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
      _id: (booking._id as any).toString(),
      userId: booking.userId || null,
      treatmentId: booking.treatmentId as any,
      professionalId: booking.professionalId || null,
      addressId: booking.addressId || null,
    } as any as PopulatedBooking))

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
  let assignedBooking: any = null

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

      if (["completed", "cancelled", "refunded"].includes(booking.status)) {
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
          const clientNotificationMethods = clientUser.notificationPreferences?.methods || ["sms"]

          const baseUrl =
            process.env.NEXT_PUBLIC_APP_URL ||
            process.env.NEXTAUTH_URL ||
            ""
          const clientNotificationData: ProfessionalBookingNotificationData = {
            type: "BOOKING_ASSIGNED_PROFESSIONAL",
            treatmentName: treatment.name,
            bookingDateTime: assignedBooking.bookingDateTime,
            professionalName: professional.name || "מטפל/ת",
            clientName: clientUser.name || "לקוח/ה",
            userName: clientUser.name || "לקוח/ה",
            bookingDetailsLink: `${baseUrl}/dashboard/member/bookings?bookingId=${assignedBooking._id.toString()}`,
          }

          const clientRecipients = []
          if (clientNotificationMethods.includes("email") && clientUser.email) {
            clientRecipients.push({ type: "email" as const, value: clientUser.email, name: clientUser.name, language: clientLang })
          }
          if (clientNotificationMethods.includes("sms") && clientUser.phone) {
            clientRecipients.push({ type: "phone" as const, value: clientUser.phone, language: clientLang })
          }
          
          if (clientRecipients.length > 0) {
            await unifiedNotificationService.sendNotificationToMultiple(clientRecipients, clientNotificationData)
          }

          // Professional notification
          const professionalLang = (professional.notificationPreferences?.language as NotificationLanguage) || "he"
          const professionalNotificationMethods = professional.notificationPreferences?.methods || ["sms"]

          const professionalNotificationData: ProfessionalBookingNotificationData = {
            type: "BOOKING_ASSIGNED_PROFESSIONAL",
            treatmentName: treatment.name,
            bookingDateTime: assignedBooking.bookingDateTime,
            professionalName: professional.name || "מטפל/ת",
            clientName: clientUser.name || "לקוח/ה",
            bookingDetailsLink: `${process.env.NEXTAUTH_URL || ""}/dashboard/professional/booking-management/${assignedBooking._id.toString()}`,
          }

          const professionalRecipients = []
          if (professionalNotificationMethods.includes("email") && professional.email) {
            professionalRecipients.push({ type: "email" as const, value: professional.email, name: professional.name, language: professionalLang })
          }
          if (professionalNotificationMethods.includes("sms") && professional.phone) {
            professionalRecipients.push({ type: "phone" as const, value: professional.phone, language: professionalLang })
          }
          
          if (professionalRecipients.length > 0) {
            await unifiedNotificationService.sendNotificationToMultiple(professionalRecipients, professionalNotificationData)
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

    // Import ProfessionalProfile model
    const ProfessionalProfile = (await import("@/lib/db/models/professional-profile")).default

    // Get all active professionals with proper population
    const professionals = await ProfessionalProfile.find({ 
      status: 'active',
      isActive: true
    })
      .populate({
        path: 'userId',
        select: 'name email phone gender roles',
        // Only get users who have professional role
        match: { roles: 'professional' }
      })
      .lean()

    // Filter out professionals where userId is null (didn't match professional role)
    const validProfessionals = professionals.filter(prof => prof.userId !== null)

    return {
      success: true,
      professionals: validProfessionals.map((p: any) => ({
        _id: p.userId._id.toString(),
        name: p.userId.name,
        email: p.userId.email,
        phone: p.userId.phone,
        gender: p.userId.gender,
        profileId: p._id.toString(),
        city: p.workAreas?.[0]?.cityName || "לא צוין",
        distanceKm: null, // Will be calculated when needed for specific booking
        workAreas: p.workAreas,
        treatments: p.treatments
      }))
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
        booking.professionalId = undefined
      }
    }
    
    if (updates.paymentStatus !== undefined) {
      booking.paymentDetails.paymentStatus = updates.paymentStatus
    }

    // Calculate and set pricing fields if missing (backward compatibility)
    if (!booking.staticTreatmentPrice || !booking.staticTherapistPay || !booking.companyFee) {
      const treatment = await Treatment.findById(booking.treatmentId).lean()
      if (treatment) {
        let staticTreatmentPrice = 0
        let staticTherapistPay = 0
        
        if (treatment.pricingType === "fixed") {
          staticTreatmentPrice = treatment.fixedPrice || 0
          staticTherapistPay = treatment.fixedProfessionalPrice || 0
        } else if (treatment.pricingType === "duration_based" && booking.selectedDurationId) {
          const selectedDuration = treatment.durations?.find(
            (d: any) => d._id.toString() === booking.selectedDurationId?.toString()
          )
          if (selectedDuration) {
            staticTreatmentPrice = selectedDuration.price || 0
            staticTherapistPay = selectedDuration.professionalPrice || 0
          }
        }
        
        booking.staticTreatmentPrice = staticTreatmentPrice
        booking.staticTherapistPay = staticTherapistPay
        booking.companyFee = Math.max(0, staticTreatmentPrice - staticTherapistPay)
        
        // ➕ הוספת שדות חדשים אם חסרים
        if (!booking.treatmentCategory) {
          booking.treatmentCategory = treatment.category ? new mongoose.Types.ObjectId(treatment.category) : new mongoose.Types.ObjectId()
        }
      }
    }
    
    // ➕ וידוא שדות consents
    if (!booking.consents) {
      booking.consents = {
        customerAlerts: "email",
        patientAlerts: "email",
        marketingOptIn: false,
        termsAccepted: true // ברירת מחדל לאישור תנאים
      }
    }
    
    // ➕ וידוא שדה step
    if (!booking.step) {
      booking.step = 7 // הזמנה מושלמת
    }

    await booking.save()

    if (updates.status === "completed") {
      try {
        const { sendReviewReminder } = await import("@/actions/review-actions")
        await sendReviewReminder(bookingId)
      } catch (err) {
        logger.error("Failed to send review reminder:", err)
      }
    }
    
    // Revalidate relevant paths
    revalidatePath("/dashboard/admin/bookings")
    revalidatePath("/dashboard/member/bookings")
    revalidatePath("/dashboard/professional/bookings")
    
    return { success: true, booking: booking.toObject() }
  } catch (error) {
    logger.error("Error updating booking:", { 
      error: error instanceof Error ? error.message : String(error),
      bookingId: bookingId 
    })
    return { success: false, error: "common.unknown" }
  }
}

export async function createGuestBooking(
  payload: unknown,
): Promise<{ success: boolean; booking?: IBooking; error?: string; issues?: z.ZodIssue[] }> {
  const sessionId = `guest_booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  const validationResult = CreateGuestBookingPayloadSchema.safeParse(payload)
  if (!validationResult.success) {
    bookingLogger.logValidation(
      { metadata: { sessionId } }, 
      "Guest booking payload validation failed", 
      true
    )
    logger.warn("Invalid payload for createGuestBooking:", { issues: validationResult.error.issues })
    return { success: false, error: "common.invalidInput", issues: validationResult.error.issues }
  }
  
  bookingLogger.logInitiation({
    treatmentId: validationResult.data.treatmentId,
    guestEmail: validationResult.data.guestInfo?.email,
    metadata: { sessionId, source: validationResult.data.source }
  }, "Guest booking creation initiated")
  
  const validatedPayload = validationResult.data as CreateGuestBookingPayloadType & {
    priceDetails: ClientCalculatedPriceDetails
  }

  const mongooseDbSession = await mongoose.startSession()
  let bookingResult: IBooking | null = null
  let updatedVoucherDetails: IGiftVoucher | null = null

  try {
    await dbConnect()

    // For guest bookings, use provided guest info instead of fetching user
    const guestInfo = validatedPayload.guestInfo
    if (!guestInfo || !guestInfo.name || !guestInfo.phone) {
      logger.warn("Missing or invalid guest info in createGuestBooking", { guestInfo })
      return { success: false, error: "bookings.errors.guestInfoRequired" }
    }

    // Enhanced address validation
    let bookingAddressSnapshot: IBookingAddressSnapshot | undefined

    if (validatedPayload.customAddressDetails) {
      // Validate required address fields
      const addressDetails = validatedPayload.customAddressDetails
      if (!addressDetails.city?.trim() || !addressDetails.street?.trim()) {
        logger.warn("Incomplete address details provided", { addressDetails })
        return { success: false, error: "bookings.errors.incompleteAddress" }
      }

      // Use the updated constructFullAddress function if fullAddress is not provided
      if (!addressDetails.fullAddress) {
        addressDetails.fullAddress = constructFullAddressHelper(addressDetails)
      }
      
      bookingAddressSnapshot = {
        fullAddress: addressDetails.fullAddress || constructFullAddressHelper(addressDetails),
        city: addressDetails.city || "",
        street: addressDetails.street || "",
        streetNumber: addressDetails.streetNumber || "",
        addressType: (addressDetails as any).addressType || "apartment",
        apartment: (addressDetails as any).apartment,
        entrance: (addressDetails as any).entrance,
        floor: (addressDetails as any).floor,
        notes: (addressDetails as any).notes,
        doorName: (addressDetails as any).doorName,
        buildingName: (addressDetails as any).buildingName,
        hotelName: (addressDetails as any).hotelName,
        roomNumber: (addressDetails as any).roomNumber,
        instructions: (addressDetails as any).instructions,
        otherInstructions: (addressDetails as any).otherInstructions,
        hasPrivateParking: (addressDetails as any).hasPrivateParking,
      }
    } else {
      logger.warn("No address provided for guest booking")
      return { success: false, error: "bookings.errors.addressRequired" }
    }

    await mongooseDbSession.withTransaction(async () => {
      const nextBookingNum = await getNextSequenceValue("bookingNumber")
      const bookingNumber = nextBookingNum.toString().padStart(6, "0")

      // Get treatment details for proper pricing calculation
      const treatment = await Treatment.findById(validatedPayload.treatmentId).lean()
      if (!treatment) {
        throw new Error("Treatment not found")
      }

      // Calculate pricing based on treatment model logic
      let staticTreatmentPrice = 0
      let staticTherapistPay = 0
      
      if (treatment.pricingType === "fixed") {
        staticTreatmentPrice = treatment.fixedPrice || 0
        staticTherapistPay = treatment.fixedProfessionalPrice || 0
      } else if (treatment.pricingType === "duration_based" && validatedPayload.selectedDurationId) {
        const selectedDuration = treatment.durations?.find(
          (d: any) => d._id.toString() === validatedPayload.selectedDurationId
        )
        if (selectedDuration) {
          staticTreatmentPrice = selectedDuration.price || 0
          staticTherapistPay = selectedDuration.professionalPrice || 0
        }
      }

      // Company fee is the difference
      const companyFee = Math.max(0, staticTreatmentPrice - staticTherapistPay)

      // Find or create user by phone to ensure all bookings are associated with a user
      const { findOrCreateUserByPhone } = await import("@/actions/auth-actions")
      const userResult = await findOrCreateUserByPhone(guestInfo.phone, {
        name: guestInfo.name,
        email: guestInfo.email,
      })

      if (!userResult.success || !userResult.userId) {
        throw new Error("Failed to create or find user for guest booking")
      }

      const newBooking = new Booking({
        ...validatedPayload,
        userId: new mongoose.Types.ObjectId(userResult.userId), // Associate booking with user
        bookingNumber,
        bookedByUserName: guestInfo.name,
        bookedByUserEmail: validatedPayload.guestInfo.email || undefined, // Store original email, not modified one
        bookedByUserPhone: guestInfo.phone,
        // Only set recipient fields if explicitly booking for someone else
        recipientName: validatedPayload.isBookingForSomeoneElse ? validatedPayload.recipientName : guestInfo.name,
        recipientPhone: validatedPayload.isBookingForSomeoneElse ? validatedPayload.recipientPhone : guestInfo.phone,
        recipientEmail: validatedPayload.isBookingForSomeoneElse ? validatedPayload.recipientEmail : (validatedPayload.guestInfo.email || undefined),
        recipientBirthDate: validatedPayload.isBookingForSomeoneElse ? validatedPayload.recipientBirthDate : undefined,
        recipientGender: validatedPayload.isBookingForSomeoneElse ? validatedPayload.recipientGender : undefined,
        bookingAddressSnapshot,
        status: validatedPayload.priceDetails.finalAmount === 0 || validatedPayload.paymentDetails.paymentStatus === "paid"
          ? "pending_professional" 
          : "pending_payment",
        // Calculated fields based on treatment
        treatmentCategory: new mongoose.Types.ObjectId(), // Generate a new ObjectId as category reference
        staticTreatmentPrice,
        staticTherapistPay,
        companyFee,
        consents: validatedPayload.consents || {
          customerAlerts: "sms",
          patientAlerts: "sms",
          marketingOptIn: false,
          termsAccepted: true // Default to true for guest bookings
        },
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
          // Financial breakdown
          totalProfessionalPayment: validatedPayload.priceDetails.totalProfessionalPayment,
          totalOfficeCommission: validatedPayload.priceDetails.totalOfficeCommission,
          baseProfessionalPayment: validatedPayload.priceDetails.baseProfessionalPayment,
          surchargesProfessionalPayment: validatedPayload.priceDetails.surchargesProfessionalPayment,
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
        professionalId: null,
      })

      await newBooking.save({ session: mongooseDbSession })
      
      bookingLogger.logCreation({
        bookingId: String(newBooking.id),
        guestEmail: guestInfo.email,
        treatmentId: validatedPayload.treatmentId,
        amount: validatedPayload.priceDetails.finalAmount,
        metadata: { sessionId, bookingNumber }
      }, "Guest booking created successfully")
      
      logger.info("Guest booking created successfully", { bookingId: newBooking.id, bookingNumber })
      bookingResult = newBooking

      // Handle gift voucher redemption for guest bookings
      if (validatedPayload.priceDetails.appliedGiftVoucherId && validatedPayload.priceDetails.voucherAppliedAmount > 0) {
        logger.info("Processing gift voucher redemption for guest booking", { 
          voucherId: validatedPayload.priceDetails.appliedGiftVoucherId 
        })
        const voucher = await GiftVoucher.findById(validatedPayload.priceDetails.appliedGiftVoucherId).session(mongooseDbSession)
        if (!voucher || (!voucher.isActive && voucher.status !== "sent")) {
          throw new Error("bookings.errors.voucherRedemptionFailed")
        }
        
        // ✅ Add treatment validation for treatment vouchers
        if (voucher.voucherType === "treatment" && voucher.treatmentId) {
          const voucherTreatmentId = voucher.treatmentId.toString()
          if (voucherTreatmentId !== validatedPayload.treatmentId) {
            throw new Error("bookings.errors.treatmentMismatch")
          }
        }
        
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
          orderId: newBooking.id,
          description: `Booking ${bookingNumber}`,
        })
        
        await voucher.save({ session: mongooseDbSession })
        logger.info("Gift voucher updated successfully", { voucherId: voucher._id })
        updatedVoucherDetails = voucher
      }

      // Handle coupon application for guest bookings
      if (validatedPayload.priceDetails.appliedCouponId && validatedPayload.priceDetails.couponDiscount > 0) {
        logger.info("Processing coupon application for guest booking", { 
          couponId: validatedPayload.priceDetails.appliedCouponId 
        })
        const coupon = await Coupon.findById(validatedPayload.priceDetails.appliedCouponId).session(mongooseDbSession)
        if (!coupon || !coupon.isActive) throw new Error("bookings.errors.couponApplyFailed")
        coupon.timesUsed += 1
        await coupon.save({ session: mongooseDbSession })
        logger.info("Coupon updated successfully", { couponId: coupon._id })
      }

      // Handle subscription redemption for guest bookings
      if (
        validatedPayload.priceDetails.redeemedUserSubscriptionId &&
        validatedPayload.priceDetails.isBaseTreatmentCoveredBySubscription
      ) {
        logger.info("Processing subscription redemption for guest booking", { 
          subscriptionId: validatedPayload.priceDetails.redeemedUserSubscriptionId 
        })
        const userSub = await UserSubscription.findById(
          validatedPayload.priceDetails.redeemedUserSubscriptionId,
        ).session(mongooseDbSession)
        if (!userSub || userSub.remainingQuantity < 1 || userSub.status !== "active") {
          throw new Error("bookings.errors.subscriptionRedemptionFailed")
        }
        
        // ✅ Add treatment validation for subscriptions
        if (userSub.treatmentId) {
          const subTreatmentId = userSub.treatmentId.toString()
          if (subTreatmentId !== validatedPayload.treatmentId) {
            throw new Error("bookings.errors.treatmentMismatch")
          }
        }
        userSub.remainingQuantity -= 1
        if (userSub.remainingQuantity === 0) userSub.status = "depleted"
        await userSub.save({ session: mongooseDbSession })
        logger.info("Subscription updated successfully", { subscriptionId: userSub._id })
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
      // Revalidate relevant paths
      revalidatePath("/dashboard/admin/bookings")

      const finalBookingObject = (bookingResult as any).toObject() as IBooking
      if (updatedVoucherDetails) {
        ;(finalBookingObject as any).updatedVoucherDetails = updatedVoucherDetails
      }

      // Send booking success notifications
      try {
        const treatment = await Treatment.findById(finalBookingObject.treatmentId).select("name").lean()

        if (treatment) {
          const { sendGuestNotification } = await import("@/lib/notifications/guest-notification-service")
          
          // Safely get notification preferences with fallbacks
          const isBookingForSomeoneElse = Boolean(validatedPayload.isBookingForSomeoneElse)
          const bookerName = guestInfo.name
          const recipientName = isBookingForSomeoneElse ? validatedPayload.recipientName! : bookerName
          
          const bookingAddress = finalBookingObject.bookingAddressSnapshot?.fullAddress || "כתובת לא זמינה"
          
          // Get notification preferences from payload (with defaults)
          const notificationMethods = validatedPayload.notificationMethods || ["email"]
          const recipientNotificationMethods = validatedPayload.recipientNotificationMethods || notificationMethods
          const notificationLanguage = validatedPayload.notificationLanguage || "he"
          
          // Prepare booking data for the booker (guest)
          const bookerBookingData = {
            type: "treatment-booking-success" as const,
            recipientName: bookerName, // Always the booker's name for their own notification
            bookerName: undefined, // No booker name needed when notifying the booker themselves
            treatmentName: treatment.name,
            bookingDateTime: finalBookingObject.bookingDateTime,
            bookingNumber: finalBookingObject.bookingNumber,
            bookingAddress: bookingAddress,
            isForSomeoneElse: false, // Always false for booker's own notification - they get "your booking" message
            isBookerForSomeoneElse: isBookingForSomeoneElse, // True if they booked for someone else
            actualRecipientName: isBookingForSomeoneElse ? validatedPayload.recipientName! : undefined,
          }

          // Send notification to booker (guest) using smart system
          await sendGuestNotification(
            {
              name: bookerName,
              email: validatedPayload.guestInfo.email,
              phone: notificationMethods.includes("sms") ? guestInfo.phone : undefined,
              language: notificationLanguage
            },
            bookerBookingData
          )
          
          // Send notification to recipient if booking for someone else
          if (isBookingForSomeoneElse && validatedPayload.recipientEmail) {
            // Prepare booking data for the recipient
            const recipientBookingData = {
              type: "treatment-booking-success" as const,
              recipientName: validatedPayload.recipientName!,
              bookerName: bookerName,
              treatmentName: treatment.name,
              bookingDateTime: finalBookingObject.bookingDateTime,
              bookingNumber: finalBookingObject.bookingNumber,
              bookingAddress: bookingAddress,
              isForSomeoneElse: true,
            }
            
            await sendGuestNotification(
              {
                name: recipientName,
                email: validatedPayload.recipientEmail,
                phone: recipientNotificationMethods.includes("sms") ? validatedPayload.recipientPhone : undefined,
                language: notificationLanguage
              },
              recipientBookingData
            )
          }
          
          logger.info("Guest booking notifications sent successfully using smart system", { 
            bookingId: finalBookingObject._id,
            bookerMethods: notificationMethods,
            recipientMethods: isBookingForSomeoneElse ? recipientNotificationMethods : null,
            language: notificationLanguage
          })
        }
      } catch (notificationError) {
        logger.error("Failed to send notification for guest booking:", {
          bookingId: finalBookingObject._id?.toString() || "unknown",
          error: notificationError instanceof Error ? notificationError.message : String(notificationError),
        })
        // Don't fail the booking if notifications fail
      }

      // Send notifications to professionals if booking is ready for assignment
      if ((finalBookingObject.status as string) === "pending_professional") {
        try {
          const bookingIdStr = String(finalBookingObject._id)
          logger.info("Sending notifications to suitable professionals", { 
            bookingId: bookingIdStr
          })
          
          await sendNotificationToSuitableProfessionals(bookingIdStr)
          
          logger.info("Professional notifications sent successfully", { 
            bookingId: bookingIdStr
          })
        } catch (professionalNotificationError) {
          logger.error("Failed to send professional notifications:", {
            bookingId: String(finalBookingObject._id),
            error: professionalNotificationError instanceof Error 
              ? professionalNotificationError.message 
              : String(professionalNotificationError),
          })
          // Don't fail the booking if professional notifications fail
        }
      }

      logger.info("Guest booking created successfully", {
        bookingId: finalBookingObject._id?.toString() || "unknown",
        bookingNumber: finalBookingObject.bookingNumber,
        guestEmail: guestInfo.email,
        status: finalBookingObject.status,
      })

      return { success: true, booking: finalBookingObject }
    }

    logger.error("No booking result returned from transaction")
    return { success: false, error: "bookings.errors.creationFailed" }
  } catch (error) {
    // Don't manually abort transaction - withTransaction() handles this automatically
    logger.error("Error creating guest booking:", {
      error: error instanceof Error ? error.message : String(error),
      guestInfo: validatedPayload.guestInfo,
    })
    
    // Return appropriate error message
    const errorMessage = error instanceof Error ? error.message : "bookings.errors.creationFailed"
    return { 
      success: false, 
      error: errorMessage.startsWith("bookings.errors.") ? errorMessage : "bookings.errors.creationFailed" 
    }
  } finally {
    await mongooseDbSession.endSession()
  }
}

export async function getGuestBookingInitialData(): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    logger.info("Starting getGuestBookingInitialData")
    await dbConnect()
    logger.info("Database connected for guest booking")

    const [
      treatmentsResult,
      workingHoursResult,
    ] = await Promise.allSettled([
      Treatment.find({ isActive: true }).populate("durations").lean(),
      (WorkingHoursSettings as any).findOne().lean() as Promise<any>,
    ])
    logger.info("Guest booking data fetch completed")

    const getFulfilledValue = (result: PromiseSettledResult<any>, defaultValue: any = null) =>
      result.status === "fulfilled" ? result.value : defaultValue

    const treatments = getFulfilledValue(treatmentsResult, [])
    const workingHours = getFulfilledValue(workingHoursResult)

    if (!treatments || treatments.length === 0) {
      return { success: false, error: "No active treatments available" }
    }

    if (!workingHours) {
      return { success: false, error: "Working hours not configured" }
    }

    // Prepare serialized data for guest booking
    const serializedTreatments = treatments.map((treatment: any) => ({
      ...treatment,
      _id: treatment._id.toString(),
      durations: treatment.durations?.map((duration: any) => ({
        ...duration,
        _id: duration._id.toString(),
      })) || [],
    }))

    const serializedWorkingHours = {
      ...workingHours,
      _id: workingHours._id.toString(),
    }

    return {
      success: true,
      data: {
        treatments: serializedTreatments,
        activeTreatments: serializedTreatments, // Alias for compatibility
        workingHours: serializedWorkingHours,
        activeUserSubscriptions: [], // No subscriptions for guests
        usableGiftVouchers: [], // No gift vouchers for guests
        userAddresses: [], // No saved addresses for guests
        paymentMethods: [], // No saved payment methods for guests
        user: null, // No user data for guests
        userPreferences: null, // No preferences for guests
      },
    }
  } catch (error) {
    logger.error("Error getting guest booking initial data:", {
      error: error instanceof Error ? error.message : String(error),
    })
    return { success: false, error: "Failed to load booking data" }
  }
}

export async function createGuestUser(guestInfo: {
  firstName: string
  lastName: string
  email?: string
  phone: string
  birthDate?: Date
  gender?: "male" | "female"
}): Promise<{ success: boolean; userId?: string; error?: string }> {
  // שימוש בפונקציה החדשה
  const { findOrCreateUserByPhone } = await import("@/actions/auth-actions")
  
  return await findOrCreateUserByPhone(guestInfo.phone, {
    name: `${guestInfo.firstName} ${guestInfo.lastName}`,
    email: guestInfo.email,
    gender: guestInfo.gender,
    dateOfBirth: guestInfo.birthDate,
  })
}

export async function saveAbandonedBooking(
  userId: string,
  formData: {
    guestInfo?: any
    guestAddress?: any
    bookingOptions?: any
    calculatedPrice?: any
    currentStep: number
  }
): Promise<{ success: boolean; bookingId?: string; error?: string }> {
  try {
    // Validate input parameters
    if (!userId?.trim()) {
      return { success: false, error: "User ID is required" }
    }

    if (typeof formData.currentStep !== 'number' || formData.currentStep < 0) {
      return { success: false, error: "Valid current step is required" }
    }

    logger.info("Saving abandoned booking", { 
      userId, 
      currentStep: formData.currentStep 
    })
    
    await dbConnect()

    // Check if there's already an abandoned booking for this user
    const existingAbandoned = await Booking.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      status: "pending_payment"
    }).sort({ createdAt: -1 })

    if (existingAbandoned) {
      // Update existing abandoned booking safely
      const updateData: any = {
        formState: {
          currentStep: formData.currentStep,
          guestInfo: formData.guestInfo || null,
          guestAddress: formData.guestAddress || null,
          bookingOptions: formData.bookingOptions || null,
          calculatedPrice: formData.calculatedPrice || null,
          savedAt: new Date(),
        },
        // Update required fields if available
        treatmentCategory: formData.bookingOptions?.treatmentCategory || existingAbandoned.treatmentCategory,
        staticTreatmentPrice: formData.calculatedPrice?.basePrice || existingAbandoned.staticTreatmentPrice || 0,
        staticTherapistPay: formData.calculatedPrice?.therapistPay || existingAbandoned.staticTherapistPay || 0,
        companyFee: formData.calculatedPrice?.companyFee || existingAbandoned.companyFee || 0,
        consents: existingAbandoned.consents || {
          customerAlerts: "email",
          patientAlerts: "email", 
          marketingOptIn: false,
          termsAccepted: false
        }
      }
      
      // Update other fields if they exist with safe defaults
      if (formData.guestInfo?.firstName && formData.guestInfo?.lastName) {
        updateData.bookedByUserName = `${formData.guestInfo.firstName.trim()} ${formData.guestInfo.lastName.trim()}`
        updateData.bookedByUserEmail = formData.guestInfo.email?.trim() || undefined
        updateData.bookedByUserPhone = formData.guestInfo.phone?.replace(/[-\s]/g, "") || ""
      }
      
      if (formData.bookingOptions?.selectedTreatmentId) {
        try {
          updateData.treatmentId = new mongoose.Types.ObjectId(formData.bookingOptions.selectedTreatmentId)
        } catch (error) {
          logger.warn("Invalid treatment ID in abandoned booking", { 
            treatmentId: formData.bookingOptions.selectedTreatmentId 
          })
        }
      }
      
      if (formData.bookingOptions?.selectedDurationId) {
        try {
          updateData.selectedDurationId = new mongoose.Types.ObjectId(formData.bookingOptions.selectedDurationId)
        } catch (error) {
          logger.warn("Invalid duration ID in abandoned booking", { 
            durationId: formData.bookingOptions.selectedDurationId 
          })
        }
      }
      
      // Safely parse booking date and time
      if (formData.bookingOptions?.bookingDate && formData.bookingOptions?.bookingTime) {
        try {
          const date = new Date(formData.bookingOptions.bookingDate)
          const timeParts = formData.bookingOptions.bookingTime.split(":")
          if (timeParts.length >= 2) {
            const hours = parseInt(timeParts[0], 10)
            const minutes = parseInt(timeParts[1], 10)
            if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
              date.setHours(hours, minutes, 0, 0)
              updateData.bookingDateTime = date
            }
          }
        } catch (error) {
          logger.warn("Invalid date/time in abandoned booking", { 
            date: formData.bookingOptions.bookingDate,
            time: formData.bookingOptions.bookingTime 
          })
        }
      }

      // ✅ Fix: Handle address update for existing abandoned booking
      if (formData.guestAddress) {
        const addressParts = [
          formData.guestAddress.street?.trim(),
          formData.guestAddress.houseNumber?.trim(),
          formData.guestAddress.city?.trim()
        ].filter(Boolean)
        
        updateData.bookingAddressSnapshot = {
          fullAddress: addressParts.length > 0 ? addressParts.join(" ") : "כתובת לא זמינה",
          city: formData.guestAddress.city?.trim() || "לא צוין",
          street: formData.guestAddress.street?.trim() || "לא צוין",
          streetNumber: formData.guestAddress.houseNumber?.trim() || "",
          addressType: formData.guestAddress.addressType || "apartment", // ✅ Fix: Add missing addressType
          apartment: formData.guestAddress.apartmentNumber?.trim(),
          entrance: formData.guestAddress.entrance?.trim(),
          floor: formData.guestAddress.floor?.trim(),
          notes: formData.guestAddress.notes?.trim(),
          doorName: formData.guestAddress.doorName?.trim(),
          buildingName: formData.guestAddress.buildingName?.trim(),
          hotelName: formData.guestAddress.hotelName?.trim(),
          roomNumber: formData.guestAddress.roomNumber?.trim(),
          otherInstructions: formData.guestAddress.instructions?.trim(),
          hasPrivateParking: Boolean(formData.guestAddress.parking),
        }
      } else if (existingAbandoned.bookingAddressSnapshot && !existingAbandoned.bookingAddressSnapshot.addressType) {
        // ✅ Fix: Ensure existing bookingAddressSnapshot has addressType
        updateData.bookingAddressSnapshot = {
          ...existingAbandoned.bookingAddressSnapshot,
          addressType: "apartment"
        }
      }

      // Update the existing booking
      Object.assign(existingAbandoned, updateData)
      await existingAbandoned.save()
      
      logger.info("Updated existing abandoned booking", { 
        bookingId: existingAbandoned._id?.toString() || "unknown",
        currentStep: formData.currentStep 
      })
      return { success: true, bookingId: existingAbandoned._id?.toString() || "unknown" }
    }

    // Create new abandoned booking record with safe defaults
    const abandonedBookingData: any = {
      userId: new mongoose.Types.ObjectId(userId),
      bookingNumber: `ABANDONED-${Date.now()}`,
      status: "pending_payment",
      bookedByUserName: formData.guestInfo?.firstName && formData.guestInfo?.lastName 
        ? `${formData.guestInfo.firstName.trim()} ${formData.guestInfo.lastName.trim()}` 
        : "Guest User",
              bookedByUserEmail: formData.guestInfo?.email?.trim() || undefined,
      bookedByUserPhone: formData.guestInfo?.phone?.replace(/[-\s]/g, "") || "",
      recipientName: formData.guestInfo?.isBookingForSomeoneElse && formData.guestInfo.recipientFirstName && formData.guestInfo.recipientLastName
        ? `${formData.guestInfo.recipientFirstName.trim()} ${formData.guestInfo.recipientLastName.trim()}`
        : formData.guestInfo?.firstName && formData.guestInfo?.lastName 
          ? `${formData.guestInfo.firstName.trim()} ${formData.guestInfo.lastName.trim()}` 
          : "Guest User",
              recipientEmail: formData.guestInfo?.isBookingForSomeoneElse
          ? formData.guestInfo.recipientEmail?.trim()
          : (formData.guestInfo?.email?.trim() || undefined),
      recipientPhone: formData.guestInfo?.isBookingForSomeoneElse 
        ? formData.guestInfo.recipientPhone?.replace(/[-\s]/g, "")
        : formData.guestInfo?.phone?.replace(/[-\s]/g, ""),
      recipientBirthDate: formData.guestInfo?.isBookingForSomeoneElse 
        ? formData.guestInfo.recipientBirthDate
        : formData.guestInfo?.birthDate,
      recipientGender: formData.guestInfo?.isBookingForSomeoneElse 
        ? formData.guestInfo.recipientGender
        : formData.guestInfo?.gender,
      therapistGenderPreference: formData.bookingOptions?.therapistGenderPreference || "any",
      source: "new_purchase",
      bookingDateTime: new Date(),
      // Required fields for new schema
      treatmentCategory: formData.bookingOptions?.treatmentCategory || new mongoose.Types.ObjectId(),
      staticTreatmentPrice: formData.calculatedPrice?.basePrice || 0,
      staticTherapistPay: formData.calculatedPrice?.therapistPay || 0,
      companyFee: formData.calculatedPrice?.companyFee || 0,
      consents: {
        customerAlerts: "email",
        patientAlerts: "email", 
        marketingOptIn: false,
        termsAccepted: false
      },
      priceDetails: {
        basePrice: formData.calculatedPrice?.basePrice || 0,
        surcharges: Array.isArray(formData.calculatedPrice?.surcharges) ? formData.calculatedPrice.surcharges : [],
        totalSurchargesAmount: formData.calculatedPrice?.totalSurchargesAmount || 0,
        treatmentPriceAfterSubscriptionOrTreatmentVoucher: formData.calculatedPrice?.treatmentPriceAfterSubscriptionOrTreatmentVoucher || 0,
        discountAmount: formData.calculatedPrice?.couponDiscount || 0,
        voucherAppliedAmount: formData.calculatedPrice?.voucherAppliedAmount || 0,
        finalAmount: formData.calculatedPrice?.finalAmount || 0,
        isBaseTreatmentCoveredBySubscription: Boolean(formData.calculatedPrice?.isBaseTreatmentCoveredBySubscription),
        isBaseTreatmentCoveredByTreatmentVoucher: Boolean(formData.calculatedPrice?.isBaseTreatmentCoveredByTreatmentVoucher),
        isFullyCoveredByVoucherOrSubscription: Boolean(formData.calculatedPrice?.isFullyCoveredByVoucherOrSubscription),
      },
      paymentDetails: {
        paymentStatus: "pending",
      },
      professionalId: null,
      // Store form state for recovery
      formState: {
        currentStep: formData.currentStep,
        guestInfo: formData.guestInfo || null,
        guestAddress: formData.guestAddress || null,
        bookingOptions: formData.bookingOptions || null,
        calculatedPrice: formData.calculatedPrice || null,
        savedAt: new Date(),
      },
    }

    // Add optional fields with validation
    if (formData.bookingOptions?.selectedTreatmentId) {
      try {
        abandonedBookingData.treatmentId = new mongoose.Types.ObjectId(formData.bookingOptions.selectedTreatmentId)
      } catch (error) {
        logger.warn("Invalid treatment ID, skipping", { treatmentId: formData.bookingOptions.selectedTreatmentId })
      }
    }

    if (formData.bookingOptions?.selectedDurationId) {
      try {
        abandonedBookingData.selectedDurationId = new mongoose.Types.ObjectId(formData.bookingOptions.selectedDurationId)
      } catch (error) {
        logger.warn("Invalid duration ID, skipping", { durationId: formData.bookingOptions.selectedDurationId })
      }
    }

    // Safely handle booking date and time
    if (formData.bookingOptions?.bookingDate && formData.bookingOptions?.bookingTime) {
      try {
        const date = new Date(formData.bookingOptions.bookingDate)
        const timeParts = formData.bookingOptions.bookingTime.split(":")
        if (timeParts.length >= 2) {
          const hours = parseInt(timeParts[0], 10)
          const minutes = parseInt(timeParts[1], 10)
          if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
            date.setHours(hours, minutes, 0, 0)
            abandonedBookingData.bookingDateTime = date
          }
        }
      } catch (error) {
        logger.warn("Invalid date/time, using current time", { 
          date: formData.bookingOptions.bookingDate,
          time: formData.bookingOptions.bookingTime 
        })
      }
    }

    // Safely handle address
    if (formData.guestAddress) {
      const addressParts = [
        formData.guestAddress.street?.trim(),
        formData.guestAddress.houseNumber?.trim(),
        formData.guestAddress.city?.trim()
      ].filter(Boolean)
      
      abandonedBookingData.bookingAddressSnapshot = {
        fullAddress: addressParts.length > 0 ? addressParts.join(" ") : "כתובת לא זמינה",
        city: formData.guestAddress.city?.trim() || "לא צוין",
        street: formData.guestAddress.street?.trim() || "לא צוין",
        streetNumber: formData.guestAddress.houseNumber?.trim() || "",
        addressType: formData.guestAddress.addressType || "apartment", // ✅ Fix: Add missing addressType
        apartment: formData.guestAddress.apartmentNumber?.trim(),
        entrance: formData.guestAddress.entrance?.trim(),
        floor: formData.guestAddress.floor?.trim(),
        notes: formData.guestAddress.notes?.trim(),
        doorName: formData.guestAddress.doorName?.trim(),
        buildingName: formData.guestAddress.buildingName?.trim(),
        hotelName: formData.guestAddress.hotelName?.trim(),
        roomNumber: formData.guestAddress.roomNumber?.trim(),
        otherInstructions: formData.guestAddress.instructions?.trim(),
        hasPrivateParking: Boolean(formData.guestAddress.parking),
      }
    } else {
      // Provide default address if none provided
      abandonedBookingData.bookingAddressSnapshot = {
        fullAddress: "כתובת לא זמינה",
        city: "לא צוין",
        street: "לא צוין",
        addressType: "apartment", // ✅ Fix: Add missing addressType for default address
      }
    }

    const abandonedBooking = new Booking(abandonedBookingData)
    await abandonedBooking.save()
    
    logger.info("Created new abandoned booking", { 
      bookingId: abandonedBooking._id?.toString() || "unknown",
      currentStep: formData.currentStep 
    })
    return { success: true, bookingId: abandonedBooking._id?.toString() || "unknown" }
  } catch (error) {
    logger.error("Error saving abandoned booking:", { 
      error: error instanceof Error ? error.message : String(error),
      userId,
      currentStep: formData.currentStep 
    })
    
    return { success: false, error: "Failed to save abandoned booking" }
  }
}

export async function getAbandonedBooking(userId: string): Promise<{ 
  success: boolean
  booking?: any
  error?: string 
}> {
  try {
    await dbConnect()

    // Find the most recent abandoned booking for this user within 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    const abandonedBooking = await Booking.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      status: "pending_payment",
      createdAt: { $gte: twentyFourHoursAgo }
    }).sort({ createdAt: -1 }).lean()

    if (!abandonedBooking) {
      return { success: false, error: "No recent abandoned booking found" }
    }

    return { success: true, booking: abandonedBooking }
  } catch (error) {
    logger.error("Error getting abandoned booking:", { error, userId })
    return { success: false, error: "Failed to get abandoned booking" }
  }
}

// Add rollback function before updateBookingStatusAfterPayment
async function rollbackBookingRedemptions(booking: IBooking, session: any): Promise<void> {
  logger.info("Rolling back booking redemptions due to payment failure", { bookingId: (booking._id as any).toString() })

  // Rollback subscription redemption
  if (booking.priceDetails.redeemedUserSubscriptionId && booking.priceDetails.isBaseTreatmentCoveredBySubscription) {
    const userSub = await UserSubscription.findById(booking.priceDetails.redeemedUserSubscriptionId).session(session)
    if (userSub) {
      userSub.remainingQuantity += 1
      if (userSub.status === "depleted") userSub.status = "active"
      await userSub.save({ session })
      logger.info("Rolled back subscription redemption", { subscriptionId: userSub._id, newQuantity: userSub.remainingQuantity })
    }
  }

  // Rollback gift voucher redemption
  if (booking.priceDetails.appliedGiftVoucherId && booking.priceDetails.voucherAppliedAmount > 0) {
    const voucher = await GiftVoucher.findById(booking.priceDetails.appliedGiftVoucherId).session(session) as IGiftVoucher | null
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
        voucher.status = voucher.remainingAmount > 0 
          ? voucher.remainingAmount < (voucher.originalAmount || voucher.amount) 
            ? "partially_used" 
            : "active"
          : "fully_used"
        voucher.isActive = voucher.remainingAmount > 0
      }

      // Remove from usage history
      if (voucher.usageHistory) {
        voucher.usageHistory = voucher.usageHistory.filter(
          entry => entry.orderId?.toString() !== (booking._id as any).toString()
        )
      }
      await voucher.save({ session })
      logger.info("Rolled back voucher redemption", { voucherId: voucher._id, newAmount: voucher.remainingAmount })
    }
  }

  // Rollback coupon usage
  if (booking.priceDetails.appliedCouponId && booking.priceDetails.discountAmount > 0) {
    const coupon = await Coupon.findById(booking.priceDetails.appliedCouponId).session(session)
    if (coupon && coupon.timesUsed > 0) {
      coupon.timesUsed -= 1
      await coupon.save({ session })
      logger.info("Rolled back coupon usage", { couponId: coupon._id, newTimesUsed: coupon.timesUsed })
    }
  }
}

export async function updateBookingStatusAfterPayment(
  bookingId: string,
  paymentStatus: "success" | "failed",
  transactionId?: string
): Promise<{ success: boolean; booking?: IBooking; error?: string }> {
  const mongooseDbSession = await mongoose.startSession()
  
  try {
    logger.info("Starting updateBookingStatusAfterPayment", { bookingId, paymentStatus })
    
    // Add timeout to database connection
    const dbConnectPromise = dbConnect()
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database connection timeout')), 15000)
    )
    
    await Promise.race([dbConnectPromise, timeoutPromise])
    logger.info("Database connection established", { bookingId })
    
    await mongooseDbSession.withTransaction(async () => {
    bookingLogger.logPayment({
      bookingId,
      paymentStatus,
      metadata: { transactionId }
    }, `Processing payment ${paymentStatus} for booking`)
    
      // Find booking by booking number (6-digit number) or by ID (ObjectId)
      let booking
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(bookingId)
      
      if (isObjectId) {
        // Search by _id
        booking = await Booking.findById(bookingId).session(mongooseDbSession)
      } else {
        // Search by booking number
        booking = await Booking.findOne({ bookingNumber: bookingId }).session(mongooseDbSession)
      }
      
    if (!booking) {
      bookingLogger.logError({ bookingId }, "Booking not found", "Payment processing failed - booking not found")
        throw new Error("Booking not found")
    }

    if (paymentStatus === "success") {
        // Payment successful - update status to paid
      booking.paymentDetails.paymentStatus = "paid"
      booking.paymentDetails.transactionId = transactionId
      booking.status = "pending_professional" // Now pending professional assignment
      
      // Find suitable professionals and save to booking
        const suitableProfessionalsResult = await findSuitableProfessionals(bookingId)
      
        if (suitableProfessionalsResult.success && suitableProfessionalsResult.professionals) {
        // Save suitable professionals list to booking
          booking.suitableProfessionals = suitableProfessionalsResult.professionals.map((prof: any) => ({
          professionalId: prof.userId._id,
          name: prof.userId.name,
          email: prof.userId.email,
          phone: prof.userId.phone,
          gender: prof.userId.gender,
          profileId: prof._id,
          calculatedAt: new Date()
        }))
        
        logger.info("Saved suitable professionals to booking", { 
          bookingId, 
            professionalCount: booking.suitableProfessionals?.length || 0
        })
      }
      
      // Ensure required fields have valid values for backward compatibility
      if (!booking.treatmentCategory) {
        booking.treatmentCategory = new mongoose.Types.ObjectId()
      }
      if (typeof booking.staticTreatmentPrice !== 'number') {
        booking.staticTreatmentPrice = booking.priceDetails?.basePrice || 0
      }
      if (typeof booking.staticTherapistPay !== 'number') {
        booking.staticTherapistPay = 0
      }
      if (typeof booking.companyFee !== 'number') {
        booking.companyFee = 0
      }
      if (!booking.consents) {
        booking.consents = {
          customerAlerts: "email",
          patientAlerts: "email",
          marketingOptIn: false,
          termsAccepted: false
        }
      }
      
        await booking.save({ session: mongooseDbSession })
      
        if (suitableProfessionalsResult.success && suitableProfessionalsResult.professionals && suitableProfessionalsResult.professionals.length > 0) {
        logger.info("Found suitable professionals for booking", { 
          bookingId,
            professionalCount: suitableProfessionalsResult.professionals.length 
          })
      } else {
        logger.warn("No suitable professionals found for booking", { bookingId })
      }
      
    } else {
        // Payment failed - ROLLBACK ALL REDEMPTIONS AND CANCEL BOOKING
        await rollbackBookingRedemptions(booking, mongooseDbSession)
        
        booking.status = "cancelled"
        booking.cancellationReason = "Payment failed"
        booking.cancelledBy = "admin" // Use admin instead of system
      booking.paymentDetails.paymentStatus = "failed"
      if (transactionId) {
        booking.paymentDetails.transactionId = transactionId
      }
      
      // Ensure required fields have valid values for backward compatibility
      if (!booking.treatmentCategory) {
        booking.treatmentCategory = new mongoose.Types.ObjectId()
      }
      if (typeof booking.staticTreatmentPrice !== 'number') {
        booking.staticTreatmentPrice = booking.priceDetails?.basePrice || 0
      }
      if (typeof booking.staticTherapistPay !== 'number') {
        booking.staticTherapistPay = 0
      }
      if (typeof booking.companyFee !== 'number') {
        booking.companyFee = 0
      }
      if (!booking.consents) {
        booking.consents = {
          customerAlerts: "email",
          patientAlerts: "email",
          marketingOptIn: false,
          termsAccepted: false
        }
      }
      
        await booking.save({ session: mongooseDbSession })
        
        logger.info("Payment failed - booking cancelled and redemptions rolled back", { 
          bookingId,
          originalStatus: "pending_payment"
        })
      }
    })
    
    // Get updated booking by booking number or ID
    let updatedBooking
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(bookingId)
    
    if (isObjectId) {
      updatedBooking = await Booking.findById(bookingId)
    } else {
      updatedBooking = await Booking.findOne({ bookingNumber: bookingId })
    }
    
    // Send automatic notifications to suitable professionals after successful payment
    if (paymentStatus === "success" && updatedBooking) {
      try {
        const { sendAutomaticProfessionalNotifications } = await import("@/actions/unified-professional-notifications")
        const notificationResult = await sendAutomaticProfessionalNotifications(bookingId)
        
        if (notificationResult.success) {
          logger.info("Sent automatic notifications to suitable professionals", { 
            bookingId,
            sentCount: notificationResult.sentCount 
          })
        } else {
          logger.error("Failed to send automatic notifications to professionals", { 
            bookingId,
            error: notificationResult.error 
          })
        }
      } catch (error) {
        logger.error("Error sending automatic notifications", { 
          bookingId,
          error: error instanceof Error ? error.message : String(error) 
        })
      }
    }
    
    revalidatePath("/dashboard/admin/bookings")
    revalidatePath("/dashboard/member/bookings")
    revalidatePath("/dashboard/member/subscriptions")
    revalidatePath("/dashboard/member/gift-vouchers")
    
    return { success: true, booking: updatedBooking?.toObject() as IBooking }
      
      } catch (error) {
    logger.error("Error updating booking status after payment:", {
      bookingId,
      paymentStatus,
      error: error instanceof Error ? error.message : String(error)
    })
    return { success: false, error: "Failed to update booking status" }
  } finally {
    await mongooseDbSession.endSession()
  }
}

export async function findSuitableProfessionals(
  bookingId: string
): Promise<{ success: boolean; professionals?: any[]; error?: string }> {
  try {
    await dbConnect()
    
    // Find booking by booking number (6-digit number) or by ID (ObjectId)
    let booking
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(bookingId)
    
    if (isObjectId) {
      // Search by _id
      booking = await Booking.findById(bookingId)
      .populate('treatmentId')
      .populate('selectedDurationId')
    } else {
      // Search by booking number
      booking = await Booking.findOne({ bookingNumber: bookingId })
        .populate('treatmentId')
        .populate('selectedDurationId')
    }
    
    if (!booking) {
      return { success: false, error: "Booking not found" }
    }

    // Import models
    const ProfessionalProfile = (await import("@/lib/db/models/professional-profile")).default
    const User = (await import("@/lib/db/models/user")).default
    
    // Extract booking details
    const treatmentId = booking.treatmentId._id.toString()
    const cityName = booking.bookingAddressSnapshot?.city
    const genderPreference = booking.therapistGenderPreference
    const durationId = booking.selectedDurationId?._id.toString()
    
    console.log("Finding suitable professionals for booking:", {
      bookingId,
      treatmentId,
      cityName,
      genderPreference: genderPreference || 'any',
      durationId: durationId || 'any'
    })
    
    if (!cityName) {
      console.error("Booking city not found for booking:", bookingId)
      return { success: false, error: "Booking city not found" }
    }

    // Build query for suitable professionals - INCLUDING ALL REQUIRED CRITERIA
    const query: any = {
      // Professional must be active in our system
      status: 'active',
      isActive: true,
      // Professional must offer this treatment
      'treatments.treatmentId': new mongoose.Types.ObjectId(treatmentId)
    }
    
    // Add city coverage check - professional must cover this city
    query.$or = [
      { 'workAreas.cityName': cityName },
      { 'workAreas.coveredCities': cityName }
    ]
    
    console.log("Professional search query:", JSON.stringify(query, null, 2))
    
    // Find professionals with all criteria
    let professionals = await ProfessionalProfile.find(query)
      .populate({
        path: 'userId',
        select: 'name email phone gender roles',
        model: User,
        // CRITICAL: Only users with professional role
        match: { roles: 'professional' }
      })
      .populate('treatments.treatmentId')
      .lean()
    
    console.log(`Found ${professionals.length} professionals matching basic criteria`)
    
    // Filter out professionals where userId is null (didn't match professional role)
    professionals = professionals.filter(prof => prof.userId !== null)
    console.log(`After filtering for professional role: ${professionals.length} professionals`)
    
    // Filter by gender preference if specified
    if (genderPreference && genderPreference !== 'any') {
      const beforeGenderFilter = professionals.length
      professionals = professionals.filter(prof => {
        const user = prof.userId as any
        return user && user.gender === genderPreference
      })
      console.log(`After gender filter (${genderPreference}): ${professionals.length} professionals (was ${beforeGenderFilter})`)
    }
    
    // Filter by duration if specified - professional must support this duration
    if (durationId) {
      const beforeDurationFilter = professionals.length
      professionals = professionals.filter(prof =>
        prof.treatments.some(t => 
          t.treatmentId._id.toString() === treatmentId &&
          (!t.durationId || t.durationId.toString() === durationId)
        )
      )
      console.log(`After duration filter: ${professionals.length} professionals (was ${beforeDurationFilter})`)
    }
    
    logger.info("Found suitable professionals for booking", {
      bookingId,
      professionalCount: professionals.length,
      treatmentId,
      cityName,
      genderPreference: genderPreference || 'any',
      durationId: durationId || 'any'
    })
    
    // Return formatted results with city and distance info
    const formattedProfessionals = professionals.map(prof => {
      const user = prof.userId as any
      
      // Find the work area that matches the booking city
      const matchingWorkArea = prof.workAreas?.find(area => 
        area.cityName === cityName || area.coveredCities?.includes(cityName)
      )
      
      // Calculate distance if coordinates are available
      let distanceKm = null
      if (matchingWorkArea && 'coordinates' in matchingWorkArea && matchingWorkArea.coordinates && 
          booking.bookingAddressSnapshot && 'coordinates' in booking.bookingAddressSnapshot && 
          booking.bookingAddressSnapshot.coordinates) {
        const workAreaCoords = matchingWorkArea.coordinates as any
        const bookingCoords = booking.bookingAddressSnapshot.coordinates as any
        
        if (workAreaCoords.lat && workAreaCoords.lng && bookingCoords.lat && bookingCoords.lng) {
          const lat1 = workAreaCoords.lat
          const lon1 = workAreaCoords.lng
          const lat2 = bookingCoords.lat
          const lon2 = bookingCoords.lng
          
          // Haversine formula for distance calculation
          const R = 6371 // Earth's radius in km
          const dLat = (lat2 - lat1) * Math.PI / 180
          const dLon = (lon2 - lon1) * Math.PI / 180
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2)
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
          distanceKm = Math.round(R * c)
        }
      }
      
      return {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        profileId: prof._id.toString(),
        city: matchingWorkArea?.cityName || cityName,
        distanceKm: distanceKm,
        workAreas: prof.workAreas,
        treatments: prof.treatments
      }
    })
    
    return { 
      success: true, 
      professionals: formattedProfessionals
    }
  } catch (error) {
    logger.error("Error finding suitable professionals:", {
      bookingId,
      error: error instanceof Error ? error.message : String(error)
    })
    console.error("Error in findSuitableProfessionals:", error)
    return { success: false, error: "Failed to find suitable professionals" }
  }
}

// Get suitable professionals for a booking from the saved list
export async function getSuitableProfessionalsForBooking(
  bookingId: string
): Promise<{ success: boolean; professionals?: any[]; error?: string }> {
  try {
    await dbConnect()
    
    const booking = await Booking.findById(bookingId)
    if (!booking) {
      return { success: false, error: "Booking not found" }
    }

    if (!booking.suitableProfessionals || booking.suitableProfessionals.length === 0) {
      // If no saved list, calculate fresh
      return await findSuitableProfessionals(bookingId)
    }

    return { 
      success: true, 
      professionals: booking.suitableProfessionals.map((prof: any) => ({
        _id: prof.professionalId.toString(),
        name: prof.name,
        email: prof.email,
        phone: prof.phone,
        gender: prof.gender,
        profileId: prof.profileId.toString(),
        city: (prof as any).city || "לא צוין",
        distanceKm: (prof as any).distanceKm || null,
        calculatedAt: prof.calculatedAt
      }))
    }
  } catch (error) {
    logger.error("Error getting suitable professionals:", {
      bookingId,
      error: error instanceof Error ? error.message : String(error)
    })
    return { success: false, error: "Failed to get suitable professionals" }
  }
}

// Send notifications to all suitable professionals - UNIFIED SYSTEM
export async function sendNotificationToSuitableProfessionals(
  bookingId: string
): Promise<{ success: boolean; sentCount?: number; error?: string }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.roles.includes("admin")) {
    return { success: false, error: "common.unauthorized" }
  }

  try {
    // Use the unified notification system
    const { sendAutomaticProfessionalNotifications } = await import("@/actions/unified-professional-notifications")
    return await sendAutomaticProfessionalNotifications(bookingId)
  } catch (error) {
    logger.error("Error sending notifications to suitable professionals:", {
      bookingId,
      error: error instanceof Error ? error.message : String(error)
    })
    return { success: false, error: "Failed to send notifications" }
  }
}

/**
 * Unified redemption code validation and identification
 */
export async function validateRedemptionCode(
  code: string,
  userId?: string
): Promise<{ success: boolean; redemption?: RedemptionCode; error?: string }> {
  try {
    await dbConnect()
    
    if (!code || !code.trim()) {
      return { success: false, error: "קוד מימוש נדרש" }
    }

    const trimmedCode = code.trim().toUpperCase()

    // Try to identify by code pattern and validate
    
    // 1. Check if it's a gift voucher (starts with GV)
    if (trimmedCode.startsWith('GV')) {
      const voucher = await GiftVoucher.findOne({
        code: { $regex: new RegExp(`^${trimmedCode}$`, 'i') },
        status: { $in: ["active", "partially_used", "sent"] },
        validUntil: { $gte: new Date() }
      }).populate('treatmentId', 'name pricingType fixedPrice durations').lean()

      if (voucher) {
        // Comprehensive validation
        const now = new Date()
        const isNotExpired = voucher.validUntil >= now
        const isValidStatus = ["active", "partially_used", "sent"].includes(voucher.status)
        const isActiveOrSent = voucher.isActive || voucher.status === "sent"
        
        let hasBalance = true
        if (voucher.voucherType === "monetary") {
          hasBalance = Boolean(voucher.remainingAmount && voucher.remainingAmount > 0)
        } else if (voucher.voucherType === "treatment") {
          hasBalance = voucher.status !== "fully_used"
        }
        
        const isValid = isNotExpired && isValidStatus && isActiveOrSent && hasBalance
        
        if (isValid) {
          // ✅ Skip ownership validation at code validation stage
          // Ownership will be validated later during booking creation
          
          // Ensure treatmentId is properly handled for treatment vouchers
          let enhancedVoucher = { ...voucher }
          if (voucher.voucherType === "treatment" && voucher.treatmentId) {
            // If treatmentId is populated, extract the ID and preserve the name
            if (typeof voucher.treatmentId === 'object' && (voucher.treatmentId as any)._id) {
              (enhancedVoucher as any).treatmentName = (voucher.treatmentId as any).name
              enhancedVoucher.treatmentId = (voucher.treatmentId as any)._id.toString() as any
            } else if (typeof voucher.treatmentId === 'string') {
              enhancedVoucher.treatmentId = voucher.treatmentId
            }
          }
          
          return {
            success: true,
            redemption: {
              code: trimmedCode,
              type: voucher.voucherType === "monetary" ? "monetary_voucher" : "treatment_voucher",
              isValid: true,
              data: enhancedVoucher as any
            }
          }
        } else {
          let errorMsg = "השובר לא תקף"
          if (!isNotExpired) errorMsg = "השובר פג תוקף"
          else if (!hasBalance) errorMsg = "השובר נוצל במלואו"
          else if (!isValidStatus || !isActiveOrSent) errorMsg = "השובר לא פעיל"
          
          return { success: false, error: errorMsg }
        }
      }
    }

    // 2. Check if it's a subscription code (starts with SB)
    if (trimmedCode.startsWith('SB')) {
      const userSubscription = await UserSubscription.findOne({
        code: { $regex: new RegExp(`^${trimmedCode}$`, 'i') },
        remainingQuantity: { $gt: 0 },
        status: "active",
        expiryDate: { $gte: new Date() }
      }).populate('subscriptionId').populate('treatmentId', 'name pricingType fixedPrice durations').lean()

      if (userSubscription) {
        // ✅ Enhanced ownership validation for subscriptions
        if (userId && userSubscription.userId && userSubscription.userId.toString() !== userId) {
          return { success: false, error: "המנוי לא שייך למשתמש זה" }
        }
        
        // ✅ Skip ownership validation at code validation stage
        // Ownership will be validated later during booking creation
        
        // Ensure treatmentId is properly handled
        let enhancedSubscription = { ...userSubscription }
        if (userSubscription.treatmentId) {
          // If treatmentId is populated, extract the ID and preserve the name
          if (typeof userSubscription.treatmentId === 'object' && (userSubscription.treatmentId as any)._id) {
            (enhancedSubscription as any).treatmentName = (userSubscription.treatmentId as any).name
            enhancedSubscription.treatmentId = (userSubscription.treatmentId as any)._id.toString() as any
          } else if (typeof userSubscription.treatmentId === 'string') {
            enhancedSubscription.treatmentId = userSubscription.treatmentId
          }
        }
        
        return {
          success: true,
          redemption: {
            code: trimmedCode,
            type: "subscription",
            isValid: true,
            data: enhancedSubscription as any
          }
        }
      }
    }

    // 3. Check if it's a partner coupon (starts with PC)
    if (trimmedCode.startsWith('PC')) {
      const coupon = await Coupon.findOne({ 
        code: { $regex: new RegExp(`^${trimmedCode}$`, 'i') },
        isActive: true,
        assignedPartnerId: { $exists: true, $ne: null }
      }).lean()
      
      if (coupon) {
        const now = new Date()
        const isValidDate = new Date(coupon.validFrom) <= now && new Date(coupon.validUntil) >= now
        const hasUsageLeft = coupon.usageLimit === 0 || coupon.timesUsed < coupon.usageLimit
        
        if (isValidDate && hasUsageLeft) {
          return {
            success: true,
            redemption: {
              code: trimmedCode,
              type: "partner_coupon",
              isValid: true,
              data: coupon as any
            }
          }
        } else {
          return { success: false, error: isValidDate ? "הקופון הגיע למכסת השימוש" : "הקופון פג תוקף" }
        }
      }
    }

    // 4. Check if it's a regular coupon (doesn't start with GV, SB, or PC)
    if (!trimmedCode.startsWith('GV') && !trimmedCode.startsWith('SB') && !trimmedCode.startsWith('PC')) {
      const coupon = await Coupon.findOne({ 
        code: { $regex: new RegExp(`^${trimmedCode}$`, 'i') },
        isActive: true,
        $or: [
          { assignedPartnerId: { $exists: false } },
          { assignedPartnerId: null }
        ]
      }).lean()
      
      if (coupon) {
        const now = new Date()
        const isValidDate = new Date(coupon.validFrom) <= now && new Date(coupon.validUntil) >= now
        const hasUsageLeft = coupon.usageLimit === 0 || coupon.timesUsed < coupon.usageLimit
        
        if (isValidDate && hasUsageLeft) {
          return {
            success: true,
            redemption: {
              code: trimmedCode,
              type: "coupon",
              isValid: true,
              data: coupon as any
            }
          }
        } else {
          return { success: false, error: isValidDate ? "הקופון הגיע למכסת השימוש" : "הקופון פג תוקף" }
        }
      }
    }

    return { success: false, error: "קוד מימוש לא נמצא או לא תקף" }

  } catch (error) {
    logger.error("Error validating redemption code:", { error, code })
    return { success: false, error: "שגיאה בבדיקת קוד המימוש" }
  }
}

export async function unassignProfessionalFromBooking(
  bookingId: string,
): Promise<{ success: boolean; error?: string; booking?: IBooking }> {
  try {
    await dbConnect()

    const booking = await Booking.findById(bookingId)
    if (!booking) {
      return { success: false, error: "bookings.errors.bookingNotFound" }
    }

    // Check if booking can be unassigned
    if (["completed", "cancelled", "refunded"].includes(booking.status)) {
      return { success: false, error: "bookings.errors.cannotUnassignCompletedBooking" }
    }

    // Unassign the professional
    booking.professionalId = undefined
    booking.status = "confirmed" // Reset to confirmed status
    await booking.save()

    logger.info("Professional unassigned from booking", { 
      bookingId, 
      previousProfessionalId: booking.professionalId 
    })

    // Revalidate relevant paths
    revalidatePath("/dashboard/admin/bookings")
    revalidatePath("/dashboard/professional")

    return { success: true, booking }
  } catch (error) {
    logger.error("Error unassigning professional from booking", { bookingId, error })
    return { success: false, error: "bookings.errors.unassignFailed" }
  }
}


