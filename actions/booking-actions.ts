"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import mongoose, { type Types } from "mongoose"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import { getActivePaymentMethods as fetchUserActivePaymentMethods } from "@/actions/payment-method-actions"

import Booking, { type IBooking, type IPriceDetails, type IBookingAddressSnapshot } from "@/lib/db/models/booking"
import Treatment, { type ITreatment, type ITreatmentDuration } from "@/lib/db/models/treatment"
import UserSubscription, { type IUserSubscription } from "@/lib/db/models/user-subscription"
import GiftVoucher, { type IGiftVoucher } from "@/lib/db/models/gift-voucher"
import Coupon from "@/lib/db/models/coupon"
import User, { type IUser } from "@/lib/db/models/user"
import Address, { type IAddress } from "@/lib/db/models/address"
import {
  WorkingHoursSettings,
  type IWorkingHoursSettings,
  type IFixedHours,
  type ISpecialDate,
} from "@/lib/db/models/working-hours"
import { getNextSequenceValue } from "@/lib/db/models/counter" // Import the new counter function

import { logger } from "@/lib/logs/logger"
import type { TimeSlot, CalculatedPriceDetails as ClientCalculatedPriceDetails } from "@/types/booking"
import { add, format, set, addMinutes, isBefore, isAfter } from "date-fns"
import { CalculatePricePayloadSchema, CreateBookingPayloadSchema } from "@/lib/validation/booking-schemas"
import type { z } from "zod"
import type { CreateBookingPayloadType as CreateBookingPayloadSchemaType } from "@/lib/validation/booking-schemas"

import { notificationManager } from "@/lib/notifications/notification-manager"
import type {
  EmailRecipient,
  PhoneRecipient,
  BookingSuccessNotificationData,
  BookingConfirmedClientNotificationData,
  ProfessionalEnRouteClientNotificationData,
  BookingCompletedClientNotificationData,
  NotificationLanguage,
} from "@/lib/notifications/notification-types"

export interface PopulatedBooking
  extends Omit<IBooking, "treatmentId" | "addressId" | "professionalId" | "selectedDurationId"> {
  _id: Types.ObjectId
  treatmentId?: {
    _id: Types.ObjectId
    name: string
    selectedDuration?: ITreatmentDuration
  } | null
  addressId?: Pick<IAddress, "_id" | "city" | "street" | "streetNumber" | "fullAddress"> | null
  professionalId?: Pick<IUser, "_id" | "name"> | null
}

function isSameUTCDay(dateLeft: Date, dateRight: Date): boolean {
  return (
    dateLeft.getUTCFullYear() === dateRight.getUTCFullYear() &&
    dateLeft.getUTCMonth() === dateRight.getUTCMonth() &&
    dateLeft.getUTCDate() === dateRight.getUTCDate()
  )
}

function getDayWorkingHours(dateUTC: Date, settings: IWorkingHoursSettings): IFixedHours | ISpecialDate | null {
  const specialDateSetting = settings.specialDates?.find((sd) => isSameUTCDay(new Date(sd.date), dateUTC))
  if (specialDateSetting) {
    return specialDateSetting
  }
  const dayOfWeekUTC = dateUTC.getUTCDay()
  const fixedDaySetting = settings.fixedHours?.find((fh) => fh.dayOfWeek === dayOfWeekUTC)
  return fixedDaySetting || null
}

export async function getAvailableTimeSlots(
  dateString: string,
  treatmentId: string,
  selectedDurationId?: string,
): Promise<{ success: boolean; timeSlots?: TimeSlot[]; error?: string; workingHoursNote?: string }> {
  try {
    await dbConnect()
    const selectedDateUTC = new Date(`${dateString}T12:00:00.000Z`)

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

    // const now = new Date(); // This might have been the old way or implicitly server local
    // const minimumBookingLeadTimeHours = settings.minimumBookingLeadTimeHours || 2;
    // const minimumBookingTime = add(now, { hours: minimumBookingLeadTimeHours });
    const nowUtc = new Date(Date.now()) // Get current time as UTC
    const minimumBookingLeadTimeHours = settings.minimumBookingLeadTimeHours || 2 // Assuming settings is defined
    const minimumBookingTime = add(nowUtc, { hours: minimumBookingLeadTimeHours })

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

    // Fetch user details for denormalization
    const bookingUser = await User.findById(validatedPayload.userId).select("name email phone").lean()
    if (!bookingUser) {
      return { success: false, error: "bookings.errors.userNotFound" }
    }

    // Determine address snapshot
    let bookingAddressSnapshot: IBookingAddressSnapshot | undefined
    if (validatedPayload.customAddressDetails) {
      bookingAddressSnapshot = validatedPayload.customAddressDetails
    } else if (validatedPayload.selectedAddressId) {
      const selectedAddressDoc = await Address.findById(validatedPayload.selectedAddressId).lean()
      if (selectedAddressDoc) {
        bookingAddressSnapshot = {
          fullAddress: selectedAddressDoc.fullAddress,
          city: selectedAddressDoc.city,
          street: selectedAddressDoc.street,
          streetNumber: selectedAddressDoc.streetNumber,
          apartment: selectedAddressDoc.apartment,
          entrance: selectedAddressDoc.entrance,
          floor: selectedAddressDoc.floor,
          notes: selectedAddressDoc.notes,
        }
      } else {
        return { success: false, error: "bookings.errors.addressNotFound" }
      }
    } else {
      return { success: false, error: "bookings.errors.addressRequired" } // Should be caught by validation
    }

    await mongooseDbSession.withTransaction(async () => {
      // Generate unique 6-digit booking number
      const nextBookingNum = await getNextSequenceValue("bookingNumber")
      const bookingNumber = nextBookingNum.toString().padStart(6, "0")

      const newBooking = new Booking({
        ...validatedPayload,
        bookingNumber, // Add the generated booking number
        bookedByUserName: bookingUser.name,
        bookedByUserEmail: bookingUser.email,
        bookedByUserPhone: bookingUser.phone,
        bookingAddressSnapshot, // Add the address snapshot
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
        professionalId: null, // Explicitly set to null as per requirement
      })

      await newBooking.save({ session: mongooseDbSession })
      bookingResult = newBooking

      // ... (rest of the transaction logic for subscriptions, vouchers, coupons)
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

      // --- START: Send Notifications ---
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
            bookingId: finalBookingObject.bookingNumber, // Use bookingNumber for display
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
      // --- END: Send Notifications ---

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

// ... (rest of the actions: getUserBookings, cancelBooking, getBookingInitialData, etc. remain largely the same,
// but getBookingInitialData already returns currentUser which has name, email, phone)
// Make sure getBookingInitialData returns all necessary address fields if not already.

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
        select: "name durations defaultDurationMinutes pricingType",
        populate: { path: "durations" },
      })
      .populate<{ addressId: IAddress | null }>({
        // Populate full address for snapshot if needed, or use bookingAddressSnapshot
        path: "addressId",
        // select: "city street streetNumber fullAddress apartment entrance floor notes", // Select all needed fields
      })
      .populate<{ professionalId: Pick<IUser, "_id" | "name"> | null }>({
        path: "professionalId",
        select: "name",
      })
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    const bookings: PopulatedBooking[] = rawBookings.map((booking) => {
      const populatedBooking: PopulatedBooking = {
        ...(booking as any), // Cast to any to spread, then override
        _id: booking._id as Types.ObjectId,
        treatmentId: null,
        // addressId is now bookingAddressSnapshot or populated from addressId
        addressId: booking.bookingAddressSnapshot
          ? {
              // Prefer snapshot
              _id: booking.addressId || new mongoose.Types.ObjectId(), // Use original addressId if exists, else dummy
              city: booking.bookingAddressSnapshot.city,
              street: booking.bookingAddressSnapshot.street,
              streetNumber: booking.bookingAddressSnapshot.streetNumber,
              fullAddress: booking.bookingAddressSnapshot.fullAddress,
            }
          : booking.addressId
            ? {
                _id: (booking.addressId as IAddress)._id,
                city: (booking.addressId as IAddress).city,
                street: (booking.addressId as IAddress).street,
                streetNumber: (booking.addressId as IAddress).streetNumber,
                fullAddress: (booking.addressId as IAddress).fullAddress,
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

      populatedBooking.professionalId = booking.professionalId
        ? {
            _id: (booking.professionalId as any)._id as Types.ObjectId,
            name: (booking.professionalId as any).name,
          }
        : null

      return populatedBooking
    })

    return { bookings, totalPages, totalBookings }
  } catch (error) {
    logger.error("Error fetching user bookings:", { userId, filters, error })
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
      Address.find({ userId, isArchived: { $ne: true } }).lean(), // Fetch all address fields
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
      userAddresses, // This now contains full address objects
      userPaymentMethods,
      activeTreatments,
      workingHoursSettings,
      currentUser: {
        // This already contains the necessary user details
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
      // A booking is 'confirmed' upon creation by user.
      // Professional "accepts" by assigning themselves if professionalId is null.
      if (booking.status !== "confirmed" || booking.professionalId) {
        throw new Error("bookings.errors.bookingNotAvailableForProfessionalAssignment")
      }

      booking.professionalId = new mongoose.Types.ObjectId(professionalId)
      // Status remains 'confirmed', but now with a professional.
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

          const notificationData: BookingConfirmedClientNotificationData = {
            // This notification type might need adjustment or a new one for "Professional Assigned"
            type: "BOOKING_CONFIRMED_CLIENT", // Or a new type like "PROFESSIONAL_ASSIGNED_CLIENT"
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
      // Professional can only mark en-route if booking is confirmed (and assigned to them)
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
