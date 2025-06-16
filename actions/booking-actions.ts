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

import { notificationManager } from "@/lib/notifications/notification-manager"
import type {
  EmailRecipient,
  PhoneRecipient,
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
    const [treatment, settings] = await Promise.all([
      Treatment.findById(treatmentId).lean().exec() as Promise<ITreatment | null>,
      WorkingHoursSettings.findOne().lean().exec() as Promise<IWorkingHoursSettings | null>
    ])

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
    }

    // Generate slots with optimized loop
    for (let currentMinutes = startTimeMinutes; currentMinutes <= endTimeMinutes; currentMinutes += slotInterval) {
      // Convert back to hours and minutes
      const slotHour = Math.floor(currentMinutes / 60) % 24
      const slotMinute = currentMinutes % 60
      
      // Format the time as HH:MM
      const timeStr = `${String(slotHour).padStart(2, '0')}:${String(slotMinute).padStart(2, '0')}`
      
      // Check availability
      const isSlotAvailable = !isToday || currentMinutes >= minimumBookingTimeMinutes

      if (isSlotAvailable) {
        const slot: TimeSlot = {
          time: timeStr,
          isAvailable: true,
        }

        // Add price surcharge if applicable
        if (surchargeAmount > 0) {
          slot.surcharge = {
            description: surchargeDescription,
            amount: surchargeAmount,
          }
        }
        
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
        userSub.status === "active" &&
        userSub.remainingQuantity > 0 &&
        (
          // For registered users
          (userSub.userId && userId && userSub.userId.toString() === userId) || 
          // For guest subscriptions
          (userSub.userId == null && (userId == null || userId === "guest"))
        )
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
        bookedByUserEmail: bookingUser.email,
        bookedByUserPhone: bookingUser.phone,
        bookingAddressSnapshot,
        status: "pending_payment", // Will be updated to "in_process" after successful payment
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
          amount: validatedPayload.priceDetails.voucherAppliedAmount,
          orderId: newBooking._id,
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
          const { sendTreatmentBookingSuccess } = await import("@/lib/notifications/notification-manager")

          const lang = userForNotification.notificationPreferences?.language || "he"
          const methods = userForNotification.notificationPreferences?.methods || ["email"]
          const recipients: any[] = []

          if (methods.includes("email") && userForNotification.email) {
            recipients.push({ type: "email", value: userForNotification.email, name: userForNotification.name, language: lang as any })
          }
          if (methods.includes("sms") && userForNotification.phone) {
            recipients.push({ type: "phone", value: userForNotification.phone, language: lang as any })
          }

          // Send notification to recipient independently from the booker's
          // notification preferences. Only send via the channels that are
          // actually provided and avoid duplicate SMS messages when the
          // booker and recipient share the same phone number.
          if (
            finalBookingObject.recipientEmail &&
            finalBookingObject.recipientEmail !== userForNotification.email
          ) {
            recipients.push({
              type: "email",
              value: finalBookingObject.recipientEmail,
              name: finalBookingObject.recipientName || "",
              language: lang as any,
            })
          }
          if (
            finalBookingObject.recipientPhone &&
            finalBookingObject.recipientPhone !== userForNotification.phone
          ) {
            recipients.push({
              type: "phone",
              value: finalBookingObject.recipientPhone,
              language: lang as any,
            })
          }

          if (recipients.length > 0) {
            await sendTreatmentBookingSuccess(recipients, {
              recipientName: finalBookingObject.recipientName || userForNotification.name,
              bookerName: userForNotification.name,
              treatmentName: treatment.name,
              bookingDateTime: finalBookingObject.bookingDateTime,
              bookingNumber: finalBookingObject.bookingNumber,
              bookingAddress: finalBookingObject.bookingAddressSnapshot?.fullAddress || "",
              isForSomeoneElse: Boolean(
                finalBookingObject.recipientName && finalBookingObject.recipientName !== userForNotification.name,
              ),
            })
          }
        }

        logger.info(`Booking status: ${finalBookingObject.status}, Number: ${finalBookingObject.bookingNumber}`)
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
          query.status = { $in: ["in_process", "confirmed"] }
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
      if (booking.userId.toString() !== userId && cancelledByRole !== "admin") throw new Error("common.unauthorized")
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
      if (booking.status !== "in_process" || booking.professionalId) {
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

    booking.status = "confirmed" // Keep as confirmed when en route
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
    if (!["confirmed", "in_process"].includes(booking.status)) {
      return { success: false, error: "bookings.errors.bookingNotInCorrectStateForCompletion" }
    }

    booking.status = "completed"
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
        booking.professionalId = null
      }
    }
    
    if (updates.paymentStatus !== undefined) {
      booking.paymentDetails.paymentStatus = updates.paymentStatus
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
    console.error("Error updating booking:", error)
    return { success: false, error: "common.unknown" }
  }
}

export async function createGuestBooking(
  payload: unknown,
): Promise<{ success: boolean; booking?: IBooking; error?: string; issues?: z.ZodIssue[] }> {
  console.log("🔍 createGuestBooking called with payload:", JSON.stringify(payload, null, 2))
  
  const validationResult = CreateGuestBookingPayloadSchema.safeParse(payload)
  if (!validationResult.success) {
    console.log("❌ Validation failed:", validationResult.error.issues)
    logger.warn("Invalid payload for createGuestBooking:", { issues: validationResult.error.issues })
    return { success: false, error: "common.invalidInput", issues: validationResult.error.issues }
  }
  
  console.log("✅ Validation passed")
  
  const validatedPayload = validationResult.data as CreateGuestBookingPayloadType & {
    priceDetails: ClientCalculatedPriceDetails
  }

  const mongooseDbSession = await mongoose.startSession()
  let bookingResult: IBooking | null = null
  let updatedVoucherDetails: IGiftVoucher | null = null

  try {
    console.log("🔗 Connecting to database...")
    await dbConnect()
    console.log("✅ Database connected")

    // For guest bookings, use provided guest info instead of fetching user
    const guestInfo = validatedPayload.guestInfo
    if (!guestInfo || !guestInfo.name || !guestInfo.email || !guestInfo.phone) {
      console.log("❌ Missing or invalid guest info:", guestInfo)
      return { success: false, error: "bookings.errors.guestInfoRequired" }
    }
    console.log("✅ Guest info validated:", guestInfo)

    let bookingAddressSnapshot: IBookingAddressSnapshot | undefined

    if (validatedPayload.customAddressDetails) {
      if (!validatedPayload.customAddressDetails.fullAddress) {
        validatedPayload.customAddressDetails.fullAddress = constructFullAddressHelper(
          validatedPayload.customAddressDetails as Partial<IAddress>,
        )
      }
      bookingAddressSnapshot = validatedPayload.customAddressDetails
      console.log("✅ Address details processed:", bookingAddressSnapshot)
    } else {
      console.log("❌ No address provided for guest booking")
      logger.warn("No address provided for guest booking")
      return { success: false, error: "bookings.errors.addressRequired" }
    }

    console.log("🔄 Starting database transaction...")
    await mongooseDbSession.withTransaction(async () => {
      console.log("📊 Getting next booking number...")
      const nextBookingNum = await getNextSequenceValue("bookingNumber")
      const bookingNumber = nextBookingNum.toString().padStart(6, "0")
      console.log("📋 Booking number generated:", bookingNumber)

      console.log("🏗️ Creating new booking object...")
      const newBooking = new Booking({
        ...validatedPayload,
        userId: null, // Guest booking - no user association initially
        bookingNumber,
        bookedByUserName: guestInfo.name,
        bookedByUserEmail: guestInfo.email,
        bookedByUserPhone: guestInfo.phone,
        recipientName: validatedPayload.recipientName || guestInfo.name,
        recipientPhone: validatedPayload.recipientPhone || guestInfo.phone,
        recipientEmail: validatedPayload.recipientEmail || guestInfo.email,
        recipientBirthDate: validatedPayload.recipientBirthDate,
        recipientGender: validatedPayload.recipientGender,
        bookingAddressSnapshot,
        status: "pending_payment", // Will be updated to "in_process" after successful payment
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

      console.log("💾 Saving booking to database...")
      await newBooking.save({ session: mongooseDbSession })
      console.log("✅ Booking saved successfully with ID:", newBooking._id)
      bookingResult = newBooking

      // Handle gift voucher redemption for guest bookings
      if (validatedPayload.priceDetails.appliedGiftVoucherId && validatedPayload.priceDetails.voucherAppliedAmount > 0) {
        console.log("🎁 Processing gift voucher redemption...")
        const voucher = await GiftVoucher.findById(validatedPayload.priceDetails.appliedGiftVoucherId).session(mongooseDbSession)
        if (!voucher || !voucher.isActive) throw new Error("bookings.errors.voucherRedemptionFailed")
        
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
          amount: validatedPayload.priceDetails.voucherAppliedAmount,
          orderId: newBooking._id,
          description: `Booking ${bookingNumber}`,
        })
        
        await voucher.save({ session: mongooseDbSession })
        console.log("✅ Gift voucher updated")
        updatedVoucherDetails = voucher
      }

      // Handle coupon application for guest bookings
      if (validatedPayload.priceDetails.appliedCouponId && validatedPayload.priceDetails.couponDiscount > 0) {
        console.log("🏷️ Processing coupon application...")
        const coupon = await Coupon.findById(validatedPayload.priceDetails.appliedCouponId).session(mongooseDbSession)
        if (!coupon || !coupon.isActive) throw new Error("bookings.errors.couponApplyFailed")
        coupon.timesUsed += 1
        await coupon.save({ session: mongooseDbSession })
        console.log("✅ Coupon updated")
      }

      // Handle subscription redemption for guest bookings
      if (
        validatedPayload.priceDetails.redeemedUserSubscriptionId &&
        validatedPayload.priceDetails.isBaseTreatmentCoveredBySubscription
      ) {
        console.log("📋 Processing subscription redemption...")
        const userSub = await UserSubscription.findById(
          validatedPayload.priceDetails.redeemedUserSubscriptionId,
        ).session(mongooseDbSession)
        if (!userSub || userSub.remainingQuantity < 1 || userSub.status !== "active") {
          throw new Error("bookings.errors.subscriptionRedemptionFailed")
        }
        userSub.remainingQuantity -= 1
        if (userSub.remainingQuantity === 0) userSub.status = "depleted"
        await userSub.save({ session: mongooseDbSession })
        console.log("✅ Subscription updated")
      }

      if (bookingResult) {
        if (bookingResult.priceDetails.finalAmount === 0) {
          bookingResult.paymentDetails.paymentStatus = "not_required"
        }
        bookingResult.priceDetails = newBooking.priceDetails
        await bookingResult.save({ session: mongooseDbSession })
        console.log("✅ Final booking updates saved")
      }
    })
    console.log("✅ Database transaction completed successfully")

    if (bookingResult) {
      console.log("🔄 Revalidating paths...")
      // Revalidate relevant paths
      revalidatePath("/dashboard/admin/bookings")

      const finalBookingObject = bookingResult.toObject() as IBooking
      if (updatedVoucherDetails) {
        ;(finalBookingObject as any).updatedVoucherDetails = updatedVoucherDetails
      }

      // Send booking success notifications
      try {
        console.log("📧 Sending booking success notifications...")
        const treatment = await Treatment.findById(finalBookingObject.treatmentId).select("name").lean()

        if (treatment) {
          const { sendTreatmentBookingSuccess } = await import("@/lib/notifications/notification-manager")
          
          const isBookingForSomeoneElse = Boolean(validatedPayload.guestInfo.isBookingForSomeoneElse)
          const bookerName = `${guestInfo.name}`
          const recipientName = isBookingForSomeoneElse 
            ? `${validatedPayload.recipientName}` 
            : bookerName
          
          const bookingAddress = finalBookingObject.bookingAddressSnapshot?.fullAddress || "כתובת לא זמינה"
          
          // Prepare notification recipients
          const recipients = []
          
          // Add booker notification
          const bookerNotificationMethod = validatedPayload.guestInfo.bookerNotificationMethod || "email"
          const bookerNotificationLanguage = validatedPayload.guestInfo.bookerNotificationLanguage || "he"
          
          if (bookerNotificationMethod === "email" || bookerNotificationMethod === "both") {
            recipients.push({
              type: "email" as const,
              value: guestInfo.email,
              name: bookerName,
              language: bookerNotificationLanguage,
            })
          }
          
          if (bookerNotificationMethod === "sms" || bookerNotificationMethod === "both") {
            recipients.push({
              type: "phone" as const,
              value: guestInfo.phone,
              language: bookerNotificationLanguage,
            })
          }
          
          // Add recipient notification if booking for someone else
          if (isBookingForSomeoneElse && validatedPayload.recipientEmail && validatedPayload.recipientPhone) {
            const recipientNotificationMethod = validatedPayload.guestInfo.recipientNotificationMethod || "email"
            const recipientNotificationLanguage = validatedPayload.guestInfo.recipientNotificationLanguage || "he"
            
            if (recipientNotificationMethod === "email" || recipientNotificationMethod === "both") {
              recipients.push({
                type: "email" as const,
                value: validatedPayload.recipientEmail,
                name: recipientName,
                language: recipientNotificationLanguage,
              })
            }
            
            if (recipientNotificationMethod === "sms" || recipientNotificationMethod === "both") {
              recipients.push({
                type: "phone" as const,
                value: validatedPayload.recipientPhone,
                language: recipientNotificationLanguage,
              })
            }
          }
          
          // Send notifications
          if (recipients.length > 0) {
            if (isBookingForSomeoneElse) {
              // Send separate notifications for booker and recipient
              const bookerRecipients = recipients.filter(r => 
                r.value === guestInfo.email || r.value === guestInfo.phone
              )
              const recipientRecipients = recipients.filter(r => 
                r.value === validatedPayload.recipientEmail || r.value === validatedPayload.recipientPhone
              )
              
              // Send notification to booker (special message for booking for someone else)
              if (bookerRecipients.length > 0) {
                const bookerNotificationResults = await sendTreatmentBookingSuccess(bookerRecipients, {
                  recipientName: bookerName, // For booker message
                  bookerName: bookerName,
                  treatmentName: treatment.name,
                  bookingDateTime: finalBookingObject.bookingDateTime,
                  bookingNumber: finalBookingObject.bookingNumber,
                  bookingAddress: bookingAddress,
                  isForSomeoneElse: false, // This will trigger the "booking completed" message
                  isBookerForSomeoneElse: true, // Special flag to indicate this is booker who booked for someone else
                  actualRecipientName: recipientName, // The person they booked for
                })
                console.log("✅ Booker notifications sent:", bookerNotificationResults)
              }
              
              // Send notification to recipient
              if (recipientRecipients.length > 0) {
                const recipientNotificationResults = await sendTreatmentBookingSuccess(recipientRecipients, {
                  recipientName: recipientName,
                  bookerName: bookerName,
                  treatmentName: treatment.name,
                  bookingDateTime: finalBookingObject.bookingDateTime,
                  bookingNumber: finalBookingObject.bookingNumber,
                  bookingAddress: bookingAddress,
                  isForSomeoneElse: true, // Recipient gets "someone booked for you" message
                })
                console.log("✅ Recipient notifications sent:", recipientNotificationResults)
              }
            } else {
              // Single notification for self-booking
              const notificationResults = await sendTreatmentBookingSuccess(recipients, {
                recipientName: recipientName,
                bookerName: undefined,
                treatmentName: treatment.name,
                bookingDateTime: finalBookingObject.bookingDateTime,
                bookingNumber: finalBookingObject.bookingNumber,
                bookingAddress: bookingAddress,
                isForSomeoneElse: false,
              })
              console.log("✅ Self-booking notifications sent:", notificationResults)
            }
          }

          logger.info(`Guest booking status: ${finalBookingObject.status}, Number: ${finalBookingObject.bookingNumber}`)
        }
      } catch (notificationError) {
        console.log("⚠️ Failed to send notification:", notificationError)
        logger.error("Failed to send notification for guest booking:", {
          bookingId: finalBookingObject._id.toString(),
          error: notificationError instanceof Error ? notificationError.message : String(notificationError),
        })
      }

      logger.info(`Guest booking created successfully`, {
        bookingId: finalBookingObject._id.toString(),
        bookingNumber: finalBookingObject.bookingNumber,
        guestEmail: guestInfo.email,
      })

      console.log("🎉 Guest booking process completed successfully!")
      return { success: true, booking: finalBookingObject }
    }

    console.log("❌ No booking result returned from transaction")
    return { success: false, error: "bookings.errors.creationFailed" }
  } catch (error) {
    await mongooseDbSession.abortTransaction()
    console.error("💥 Error creating guest booking:", error)
    logger.error("Error creating guest booking:", {
      error: error instanceof Error ? error.message : String(error),
      guestInfo: validatedPayload.guestInfo,
    })
    return { success: false, error: error instanceof Error ? error.message : "bookings.errors.creationFailed" }
  } finally {
    await mongooseDbSession.endSession()
    console.log("🔚 Database session ended")
  }
}

export async function getGuestBookingInitialData(): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    await dbConnect()

    const [
      treatmentsResult,
      workingHoursResult,
    ] = await Promise.allSettled([
      Treatment.find({ isActive: true }).populate("durations").lean(),
      WorkingHoursSettings.findOne().lean(),
    ])

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
  email: string
  phone: string
  birthDate?: Date
  gender?: "male" | "female" | "other"
}): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    console.log("🔍 Creating guest user with info:", guestInfo)
    console.log("🔍 Guest info type check:", {
      firstName: typeof guestInfo.firstName,
      lastName: typeof guestInfo.lastName,
      email: typeof guestInfo.email,
      phone: typeof guestInfo.phone,
      birthDate: typeof guestInfo.birthDate,
      gender: typeof guestInfo.gender
    })
    console.log("🔍 Guest info values:", {
      firstName: guestInfo.firstName,
      lastName: guestInfo.lastName,
      email: guestInfo.email,
      phone: guestInfo.phone,
      birthDate: guestInfo.birthDate,
      gender: guestInfo.gender
    })
    await dbConnect()

    // Check if user already exists with this email or phone
    const existingUser = await User.findOne({
      $or: [
        { email: guestInfo.email },
        { phone: guestInfo.phone }
      ]
    })

    if (existingUser) {
      console.log("✅ Found existing user:", existingUser._id.toString())
      console.log("🔍 Existing user roles:", existingUser.roles)
      
      // Clean up invalid roles and ensure guest role is present
      const validRoles = existingUser.roles.filter((role: string) => 
        ['member', 'professional', 'partner', 'admin', 'guest'].includes(role)
      )
      
      if (!validRoles.includes(UserRole.GUEST)) {
        validRoles.push(UserRole.GUEST)
      }
      
      // Update roles if they changed
      if (JSON.stringify(validRoles) !== JSON.stringify(existingUser.roles)) {
        existingUser.roles = validRoles
        console.log("🔧 Updating user roles from:", existingUser.roles, "to:", validRoles)
        await existingUser.save()
        console.log("✅ Updated user roles successfully")
      }
      
      return { success: true, userId: existingUser._id.toString() }
    }

    // Create new guest user
    const guestUser = new User({
      name: `${guestInfo.firstName} ${guestInfo.lastName}`,
      email: guestInfo.email,
      phone: guestInfo.phone,
      gender: guestInfo.gender || "other",
      dateOfBirth: guestInfo.birthDate,
      password: Math.random().toString(36).substring(2, 15), // Random password for guest
      roles: [UserRole.GUEST],
      activeRole: UserRole.GUEST,
      emailVerified: null,
      phoneVerified: null,
    })

    await guestUser.save()
    
    console.log("✅ Guest user created successfully:", guestUser._id.toString())
    logger.info("Guest user created successfully", {
      userId: guestUser._id.toString(),
      email: guestInfo.email,
    })

    return { success: true, userId: guestUser._id.toString() }
  } catch (error) {
    console.error("❌ Error creating guest user:", error)
    logger.error("Error creating guest user:", { error, guestInfo })
    
    // Return more specific error message
    if (error instanceof Error) {
      if (error.message.includes('duplicate key')) {
        return { success: false, error: "User with this email or phone already exists" }
      }
      if (error.message.includes('validation')) {
        return { success: false, error: "Invalid user data provided" }
      }
      return { success: false, error: error.message }
    }
    
    return { success: false, error: "Failed to create guest user" }
  }
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
    console.log("💾 Saving abandoned booking for user:", userId, "step:", formData.currentStep)
    await dbConnect()

    // Check if there's already an abandoned booking for this user
    const existingAbandoned = await Booking.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      status: "pending_payment"
    }).sort({ createdAt: -1 })

    if (existingAbandoned) {
      // Update existing abandoned booking
      existingAbandoned.formState = {
        currentStep: formData.currentStep,
        guestInfo: formData.guestInfo,
        guestAddress: formData.guestAddress,
        bookingOptions: formData.bookingOptions,
        calculatedPrice: formData.calculatedPrice,
        savedAt: new Date(),
      }
      
      // Update other fields if they exist
      if (formData.guestInfo?.firstName && formData.guestInfo?.lastName) {
        existingAbandoned.bookedByUserName = `${formData.guestInfo.firstName} ${formData.guestInfo.lastName}`
        existingAbandoned.bookedByUserEmail = formData.guestInfo.email || ""
        existingAbandoned.bookedByUserPhone = formData.guestInfo.phone || ""
      }
      
      if (formData.bookingOptions?.selectedTreatmentId) {
        existingAbandoned.treatmentId = new mongoose.Types.ObjectId(formData.bookingOptions.selectedTreatmentId)
      }
      
      if (formData.bookingOptions?.selectedDurationId) {
        existingAbandoned.selectedDurationId = new mongoose.Types.ObjectId(formData.bookingOptions.selectedDurationId)
      }
      
      if (formData.bookingOptions?.bookingDate && formData.bookingOptions?.bookingTime) {
        const date = new Date(formData.bookingOptions.bookingDate)
        const [hours, minutes] = formData.bookingOptions.bookingTime.split(":").map(Number)
        date.setHours(hours, minutes, 0, 0)
        existingAbandoned.bookingDateTime = date
      }

      await existingAbandoned.save()
      
      console.log("✅ Updated existing abandoned booking:", existingAbandoned._id.toString())
      return { success: true, bookingId: existingAbandoned._id.toString() }
    }

    // Create new abandoned booking record with minimal required fields
    const abandonedBooking = new Booking({
      userId: new mongoose.Types.ObjectId(userId),
      bookingNumber: `ABANDONED-${Date.now()}`,
      status: "pending_payment",
      bookedByUserName: formData.guestInfo?.firstName ? `${formData.guestInfo.firstName} ${formData.guestInfo.lastName}` : "Guest User",
      bookedByUserEmail: formData.guestInfo?.email || "",
      bookedByUserPhone: formData.guestInfo?.phone || "",
      recipientName: formData.guestInfo?.isBookingForSomeoneElse 
        ? `${formData.guestInfo.recipientFirstName} ${formData.guestInfo.recipientLastName}`
        : formData.guestInfo?.firstName ? `${formData.guestInfo.firstName} ${formData.guestInfo.lastName}` : "Guest User",
      recipientEmail: formData.guestInfo?.isBookingForSomeoneElse 
        ? formData.guestInfo.recipientEmail
        : formData.guestInfo?.email,
      recipientPhone: formData.guestInfo?.isBookingForSomeoneElse 
        ? formData.guestInfo.recipientPhone
        : formData.guestInfo?.phone,
      recipientBirthDate: formData.guestInfo?.isBookingForSomeoneElse 
        ? formData.guestInfo.recipientBirthDate
        : formData.guestInfo?.birthDate,
      recipientGender: formData.guestInfo?.isBookingForSomeoneElse 
        ? formData.guestInfo.recipientGender
        : formData.guestInfo?.gender,
      treatmentId: formData.bookingOptions?.selectedTreatmentId ? new mongoose.Types.ObjectId(formData.bookingOptions.selectedTreatmentId) : undefined,
      selectedDurationId: formData.bookingOptions?.selectedDurationId ? new mongoose.Types.ObjectId(formData.bookingOptions.selectedDurationId) : undefined,
      bookingDateTime: formData.bookingOptions?.bookingDate && formData.bookingOptions?.bookingTime 
        ? (() => {
            const date = new Date(formData.bookingOptions.bookingDate)
            const [hours, minutes] = formData.bookingOptions.bookingTime.split(":").map(Number)
            date.setHours(hours, minutes, 0, 0)
            return date
          })()
        : new Date(),
      therapistGenderPreference: formData.bookingOptions?.therapistGenderPreference || "any",
      source: "new_purchase",
      bookingAddressSnapshot: formData.guestAddress ? {
        fullAddress: `${formData.guestAddress.street || ""} ${formData.guestAddress.houseNumber || ""}, ${formData.guestAddress.city || ""}`,
        city: formData.guestAddress.city || "",
        street: formData.guestAddress.street || "",
        streetNumber: formData.guestAddress.houseNumber || "",
        apartment: formData.guestAddress.apartmentNumber,
        entrance: formData.guestAddress.entrance,
        floor: formData.guestAddress.floor,
        notes: formData.guestAddress.notes,
        doorName: formData.guestAddress.doorName,
        buildingName: formData.guestAddress.buildingName,
        hotelName: formData.guestAddress.hotelName,
        roomNumber: formData.guestAddress.roomNumber,
        otherInstructions: formData.guestAddress.instructions,
        hasPrivateParking: formData.guestAddress.parking || false,
      } : undefined,
      priceDetails: formData.calculatedPrice ? {
        basePrice: formData.calculatedPrice.basePrice || 0,
        surcharges: formData.calculatedPrice.surcharges || [],
        totalSurchargesAmount: formData.calculatedPrice.totalSurchargesAmount || 0,
        treatmentPriceAfterSubscriptionOrTreatmentVoucher: formData.calculatedPrice.treatmentPriceAfterSubscriptionOrTreatmentVoucher || 0,
        discountAmount: formData.calculatedPrice.couponDiscount || 0,
        voucherAppliedAmount: formData.calculatedPrice.voucherAppliedAmount || 0,
        finalAmount: formData.calculatedPrice.finalAmount || 0,
        isBaseTreatmentCoveredBySubscription: formData.calculatedPrice.isBaseTreatmentCoveredBySubscription || false,
        isBaseTreatmentCoveredByTreatmentVoucher: formData.calculatedPrice.isBaseTreatmentCoveredByTreatmentVoucher || false,
        isFullyCoveredByVoucherOrSubscription: formData.calculatedPrice.isFullyCoveredByVoucherOrSubscription || false,
      } : {
        basePrice: 0,
        surcharges: [],
        totalSurchargesAmount: 0,
        treatmentPriceAfterSubscriptionOrTreatmentVoucher: 0,
        discountAmount: 0,
        voucherAppliedAmount: 0,
        finalAmount: 0,
        isBaseTreatmentCoveredBySubscription: false,
        isBaseTreatmentCoveredByTreatmentVoucher: false,
        isFullyCoveredByVoucherOrSubscription: false,
      },
      paymentDetails: {
        paymentStatus: "pending",
      },
      professionalId: null,
      // Store form state for recovery
      formState: {
        currentStep: formData.currentStep,
        guestInfo: formData.guestInfo,
        guestAddress: formData.guestAddress,
        bookingOptions: formData.bookingOptions,
        calculatedPrice: formData.calculatedPrice,
        savedAt: new Date(),
      },
    })

    await abandonedBooking.save()
    
    console.log("✅ Created new abandoned booking:", abandonedBooking._id.toString())
    logger.info("Abandoned booking saved", {
      bookingId: abandonedBooking._id.toString(),
      userId,
      currentStep: formData.currentStep,
    })

    return { success: true, bookingId: abandonedBooking._id.toString() }
  } catch (error) {
    console.error("❌ Error saving abandoned booking:", error)
    logger.error("Error saving abandoned booking:", { error, userId, formData })
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

export async function updateBookingStatusAfterPayment(
  bookingId: string,
  paymentStatus: "success" | "failed",
  transactionId?: string
): Promise<{ success: boolean; booking?: IBooking; error?: string }> {
  try {
    await dbConnect()
    
    const booking = await Booking.findById(bookingId)
    if (!booking) {
      return { success: false, error: "Booking not found" }
    }

    if (paymentStatus === "success") {
      // Update payment status and booking status
      booking.paymentDetails.paymentStatus = "paid"
      booking.paymentDetails.transactionId = transactionId
      booking.status = "in_process" // Now in process - paid but not assigned professional
      
      // Find suitable professionals and save to booking
      const suitableProfessionals = await findSuitableProfessionals(bookingId)
      
      if (suitableProfessionals.success && suitableProfessionals.professionals) {
        // Save suitable professionals list to booking
        booking.suitableProfessionals = suitableProfessionals.professionals.map((prof: any) => ({
          professionalId: prof.userId._id,
          name: prof.userId.name,
          email: prof.userId.email,
          phone: prof.userId.phone,
          gender: prof.userId.gender,
          profileId: prof._id,
          calculatedAt: new Date()
        }))
        
        console.log(`💾 Saved ${booking.suitableProfessionals.length} suitable professionals to booking ${bookingId}`)
      }
      
      await booking.save()
      
      if (suitableProfessionals.success && suitableProfessionals.professionals && suitableProfessionals.professionals.length > 0) {
        console.log(`Found ${suitableProfessionals.professionals.length} suitable professionals for booking ${bookingId}`)
        
        // Send SMS notifications to all suitable professionals
        const { sendProfessionalNotifications } = await import("@/actions/professional-sms-actions")
        const smsResult = await sendProfessionalNotifications(bookingId)
        
        if (smsResult.success) {
          console.log(`✅ Sent SMS to ${smsResult.sentCount} professionals for booking ${bookingId}`)
        } else {
          console.error(`❌ Failed to send SMS notifications for booking ${bookingId}:`, smsResult.error)
        }
      } else {
        console.log(`⚠️ No suitable professionals found for booking ${bookingId}`)
      }
      
      // TODO: Send confirmation notifications to user
      
      revalidatePath("/dashboard/admin/bookings")
      revalidatePath("/dashboard/member/bookings")
      
      return { success: true, booking: booking.toObject() as IBooking }
    } else {
      // Payment failed - keep as pending payment
      booking.paymentDetails.paymentStatus = "failed"
      if (transactionId) {
        booking.paymentDetails.transactionId = transactionId
      }
      
      await booking.save()
      
      return { success: true, booking: booking.toObject() as IBooking }
    }
  } catch (error) {
    console.error("Error updating booking status after payment:", error)
    return { success: false, error: "Failed to update booking status" }
  }
}

export async function findSuitableProfessionals(
  bookingId: string
): Promise<{ success: boolean; professionals?: any[]; error?: string }> {
  try {
    await dbConnect()
    
    const booking = await Booking.findById(bookingId)
      .populate('treatmentId')
      .populate('selectedDurationId')
    
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
    
    if (!cityName) {
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
    
    // Filter out professionals where userId is null (didn't match professional role)
    professionals = professionals.filter(prof => prof.userId !== null)
    
    // Filter by gender preference if specified
    if (genderPreference && genderPreference !== 'any') {
      professionals = professionals.filter(prof => 
        prof.userId && prof.userId.gender === genderPreference
      )
    }
    
    // Filter by duration if specified - professional must support this duration
    if (durationId) {
      professionals = professionals.filter(prof =>
        prof.treatments.some(t => 
          t.treatmentId._id.toString() === treatmentId &&
          (!t.durationId || t.durationId.toString() === durationId)
        )
      )
    }
    
    console.log(`🔍 Found ${professionals.length} suitable professionals for booking ${bookingId}:`)
    console.log(`   - Treatment: ${treatmentId}`)
    console.log(`   - City: ${cityName}`)
    console.log(`   - Gender preference: ${genderPreference || 'any'}`)
    console.log(`   - Duration: ${durationId || 'any'}`)
    
    return { success: true, professionals }
  } catch (error) {
    console.error("Error finding suitable professionals:", error)
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
      professionals: booking.suitableProfessionals.map(prof => ({
        _id: prof.professionalId.toString(),
        name: prof.name,
        email: prof.email,
        phone: prof.phone,
        gender: prof.gender,
        profileId: prof.profileId.toString(),
        calculatedAt: prof.calculatedAt
      }))
    }
  } catch (error) {
    console.error("Error getting suitable professionals:", error)
    return { success: false, error: "Failed to get suitable professionals" }
  }
}

// Send notifications to all suitable professionals
export async function sendNotificationToSuitableProfessionals(
  bookingId: string
): Promise<{ success: boolean; sentCount?: number; error?: string }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.roles.includes("admin")) {
    return { success: false, error: "common.unauthorized" }
  }

  try {
    const { sendProfessionalNotifications } = await import("@/actions/professional-sms-actions")
    return await sendProfessionalNotifications(bookingId)
  } catch (error) {
    console.error("Error sending notifications to suitable professionals:", error)
    return { success: false, error: "Failed to send notifications" }
  }
}


