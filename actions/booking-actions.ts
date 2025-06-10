"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import mongoose from "mongoose"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"

import Booking, { type IBooking, type IPriceDetails, type IBookingAddressSnapshot } from "@/lib/db/models/booking"
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
  const dayOfWeek = zonedDate.getDay() // Local day of week in the specified timezone
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
    if (isToday && daySettings.cutoffTime) {
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
        workingHoursNote: `לא ניתן לבצע הזמנות ליום זה לאחר שעה ${daySettings.cutoffTime}.`
      }
    }
    
    // Create time slots based on working hours
    const timeSlots: TimeSlot[] = []
    const slotInterval = settings.slotIntervalMinutes || 30
    
    // Parse working hours start and end times
    const [startHour, startMinute] = daySettings.startTime.split(":").map(Number)
    const [endHour, endMinute] = daySettings.endTime.split(":").map(Number)
    
    // Create dates for the start and end of working hours in the correct timezone
    const startOfDay = new Date(selectedDateInTZ)
    startOfDay.setHours(startHour, startMinute, 0, 0)
    
    const endOfDay = new Date(selectedDateInTZ)
    endOfDay.setHours(endHour, endMinute, 0, 0)
    
    // Debug logging
    console.log('Generating time slots:', {
      startTime: daySettings.startTime,
      endTime: daySettings.endTime,
      startOfDay: startOfDay.toISOString(),
      endOfDay: endOfDay.toISOString(),
      slotInterval,
      treatmentDurationMinutes
    })
    
    // Calculate minimum booking time
    const minimumBookingAdvanceHours = daySettings.minimumBookingAdvanceHours ?? settings.minimumBookingLeadTimeHours ?? 2
    const minimumBookingTime = new Date(nowInTZ.getTime() + (minimumBookingAdvanceHours * 60 * 60 * 1000))
    
    // Generate time slots
    let currentSlotTime = new Date(startOfDay)
    
    while (currentSlotTime < endOfDay) {
      // Calculate when this slot would end
      const slotEndTime = new Date(currentSlotTime.getTime() + (treatmentDurationMinutes * 60 * 1000))
      
      let isSlotAvailable = true
      
      // For today, check if the slot time is after the minimum booking time
      if (isToday && currentSlotTime < minimumBookingTime) {
        isSlotAvailable = false
      }
      
      // Check if the treatment would extend beyond working hours
      if (slotEndTime > endOfDay) {
        isSlotAvailable = false
      }
      
      if (isSlotAvailable) {
        // Format the time as HH:mm
        const timeStr = formatInTimeZone(currentSlotTime, TIMEZONE, 'HH:mm')
        
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
      
      // Move to the next time slot
      currentSlotTime = new Date(currentSlotTime.getTime() + (slotInterval * 60 * 1000))
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
    if (!isToday && daySettings.cutoffTime) {
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
      if (!validatedPayload.customAddressDetails.fullAddress) {
        validatedPayload.customAddressDetails.fullAddress = constructFullAddressHelper(
          validatedPayload.customAddressDetails as Partial<IAddress>,
        )
      }
      bookingAddressSnapshot = validatedPayload.customAddressDetails
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
        otherInstructions:
          selectedAddressDoc.addressType === "other" ? selectedAddressDoc.otherDetails?.instructions : undefined,
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
        bookedByUserEmail: bookingUser.email,
        bookedByUserPhone: bookingUser.phone,
        bookingAddressSnapshot,
        status: "confirmed",
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

      const finalBookingObject = bookingResult.toObject() as IBooking
      if (updatedVoucherDetails) {
        ;(finalBookingObject as any).updatedVoucherDetails = updatedVoucherDetails
      }

      try {
        const userForNotification = await User.findById(finalBookingObject.userId)
          .select("name email phone notificationPreferences")
          .lean()
        const treatment = await Treatment.findById(finalBookingObject.treatmentId).select("name").lean()

        if (userForNotification && treatment) {
          const userLang = (userForNotification.notificationPreferences?.language as NotificationLanguage) || "he"
          const userNotificationMethods = userForNotification.notificationPreferences?.methods || ["email"]

          const bookingSuccessData: BookingSuccessNotificationData = {
            type: "BOOKING_SUCCESS",
            userName: finalBookingObject.recipientName || userForNotification.name || "User",
            bookingId: finalBookingObject.bookingNumber,
            treatmentName: treatment.name,
            bookingDateTime: finalBookingObject.bookingDateTime,
            orderDetailsLink: `${process.env.NEXTAUTH_URL || ""}/dashboard/member/bookings?bookingId=${finalBookingObject._id.toString()}`,
          }

          if (userNotificationMethods.includes("email") && userForNotification.email) {
            const emailRecipient: EmailRecipient = {
              type: "email",
              value: userForNotification.email,
              name: userForNotification.name,
              language: userLang,
            }
            await notificationManager.sendNotification(emailRecipient, bookingSuccessData)
          }
          if (userNotificationMethods.includes("sms") && userForNotification.phone) {
            const phoneRecipient: PhoneRecipient = {
              type: "phone",
              value: userForNotification.phone,
              language: userLang,
            }
            await notificationManager.sendNotification(phoneRecipient, bookingSuccessData)
          }

          logger.info(`Booking status: ${finalBookingObject.status}, Number: ${finalBookingObject.bookingNumber}`)
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
      sortBy = "bookingDateTime",
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
