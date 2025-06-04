"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import mongoose from "mongoose" // Keep mongoose for session and ObjectId if needed
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"

// Import Models directly
import Booking, { type IBooking } from "@/lib/db/models/booking"
import Treatment, { type ITreatment } from "@/lib/db/models/treatment"
import UserSubscription from "@/lib/db/models/user-subscription"
import GiftVoucher from "@/lib/db/models/gift-voucher"
import Coupon from "@/lib/db/models/coupon"
import User from "@/lib/db/models/user" // Import User model
import Address from "@/lib/db/models/address" // Import Address model
import PaymentMethod from "@/lib/db/models/payment-method" // Import PaymentMethod model
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

    const now = new Date()
    const minimumBookingTime = add(now, { hours: 2 })

    while (isBefore(currentTimeSlot, endTimeForDay)) {
      const potentialEndTime = addMinutes(currentTimeSlot, treatmentDurationMinutes)
      let isSlotAvailable = true
      if (isSameDay(selectedDate, now) && isBefore(currentTimeSlot, minimumBookingTime)) {
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

        // בדוק אם יש תוספת מחיר לזמן הזה
        if (daySettings.hasPriceAddition && daySettings.priceAddition && daySettings.priceAddition.amount > 0) {
          const surchargeAmount =
            daySettings.priceAddition.type === "fixed"
              ? daySettings.priceAddition.amount
              : (treatment.fixedPrice || 0) * (daySettings.priceAddition.amount / 100)

          if (surchargeAmount > 0) {
            slot.surcharge = {
              description: daySettings.notes || "bookings.surcharges.specialTime",
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
    } = validatedPayload

    const treatment = (await Treatment.findById(treatmentId).lean()) as ITreatment | null
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

    const priceDetails: any = {
      basePrice,
      surcharges: [],
      couponDiscount: 0,
      voucherAppliedAmount: 0,
      finalAmount: basePrice,
      isFullyCoveredByVoucherOrSubscription: false,
    }

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
            description: daySettings.notes || `bookings.surcharges.specialTime (${format(bookingDateTime, "HH:mm")})`,
            amount: surchargeAmount,
          })
          priceDetails.finalAmount += surchargeAmount
        }
      }
    }

    let currentPayableAmount = priceDetails.finalAmount

    if (userSubscriptionId) {
      const userSub = await UserSubscription.findById(userSubscriptionId).populate("subscriptionId")
      if (
        userSub &&
        userSub.userId.toString() === userId &&
        userSub.status === "active" &&
        userSub.remainingQuantity > 0
      ) {
        priceDetails.isFullyCoveredByVoucherOrSubscription = true
        priceDetails.finalAmount = 0
        currentPayableAmount = 0
        priceDetails.redeemedUserSubscriptionId = userSub._id.toString()
      } else {
        return { success: false, error: "bookings.errors.subscriptionInvalid" }
      }
    }

    if (currentPayableAmount > 0 && giftVoucherCode) {
      const voucher = await GiftVoucher.findOne({ code: giftVoucherCode, ownerUserId: userId }).lean()
      if (
        voucher &&
        voucher.isActive &&
        voucher.status !== "fully_used" &&
        voucher.status !== "expired" &&
        new Date(voucher.validUntil) >= new Date()
      ) {
        if (voucher.voucherType === "treatment" && voucher.treatmentId?.toString() === treatmentId) {
          priceDetails.voucherAppliedAmount = currentPayableAmount
          currentPayableAmount = 0
          priceDetails.appliedGiftVoucherId = voucher._id.toString()
        } else if (voucher.voucherType === "monetary" && voucher.remainingAmount && voucher.remainingAmount > 0) {
          const amountToApply = Math.min(currentPayableAmount, voucher.remainingAmount)
          priceDetails.voucherAppliedAmount = amountToApply
          currentPayableAmount -= amountToApply
          priceDetails.appliedGiftVoucherId = voucher._id.toString()
        }
      }
    }

    if (currentPayableAmount > 0 && couponCode) {
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
          discount = currentPayableAmount * (coupon.discountValue / 100)
        } else {
          discount = Math.min(currentPayableAmount, coupon.discountValue)
        }
        priceDetails.couponDiscount = discount
        currentPayableAmount -= discount
        priceDetails.appliedCouponId = coupon._id.toString()
      }
    }

    priceDetails.finalAmount = Math.max(0, currentPayableAmount)
    if (
      priceDetails.finalAmount === 0 &&
      (priceDetails.redeemedUserSubscriptionId || priceDetails.appliedGiftVoucherId)
    ) {
      priceDetails.isFullyCoveredByVoucherOrSubscription = true
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
  const validatedPayload = validationResult.data

  const session = await getServerSession(authOptions)
  if (!session || session.user.id !== validatedPayload.userId) {
    return { success: false, error: "common.unauthorized" }
  }

  const mongooseDbSession = await mongoose.startSession() // Renamed to avoid conflict
  let bookingResult: IBooking | null = null

  try {
    await dbConnect()
    await mongooseDbSession.withTransaction(async () => {
      const newBooking = new Booking({
        ...validatedPayload,
        status: "pending_professional_assignment",
      })
      await newBooking.save({ session: mongooseDbSession })
      bookingResult = newBooking

      if (validatedPayload.source === "subscription_redemption" && validatedPayload.redeemedUserSubscriptionId) {
        const userSub = await UserSubscription.findById(validatedPayload.redeemedUserSubscriptionId).session(
          mongooseDbSession,
        )
        if (!userSub || userSub.remainingQuantity < 1 || userSub.status !== "active") {
          throw new Error("bookings.errors.subscriptionRedemptionFailed")
        }
        userSub.remainingQuantity -= 1
        if (userSub.remainingQuantity === 0) userSub.status = "depleted"
        await userSub.save({ session: mongooseDbSession })
      }

      if (
        validatedPayload.source === "gift_voucher_redemption" &&
        validatedPayload.redeemedGiftVoucherId &&
        validatedPayload.priceDetails.voucherAppliedAmount > 0
      ) {
        const voucher = await GiftVoucher.findById(validatedPayload.redeemedGiftVoucherId).session(mongooseDbSession)
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
          voucher.status = voucher.remainingAmount <= 0 ? "fully_used" : "partially_used"
          if (voucher.remainingAmount <= 0) voucher.remainingAmount = 0
        }
        voucher.isActive = voucher.status === "active" || voucher.status === "partially_used"
        voucher.usageHistory = voucher.usageHistory || []
        voucher.usageHistory.push({
          date: new Date(),
          amountUsed: validatedPayload.priceDetails.voucherAppliedAmount,
          orderId: newBooking._id,
          description: `bookings.voucherUsage.redeemedForBooking ${newBooking._id.toString()}`,
        })
        await voucher.save({ session: mongooseDbSession })
      }

      if (validatedPayload.appliedCouponId && validatedPayload.priceDetails.couponDiscount > 0) {
        const coupon = await Coupon.findById(validatedPayload.appliedCouponId).session(mongooseDbSession)
        if (!coupon || !coupon.isActive) throw new Error("bookings.errors.couponApplyFailed")
        coupon.timesUsed += 1
        await coupon.save({ session: mongooseDbSession })
      }

      if (
        validatedPayload.paymentDetails.paymentStatus === "pending" &&
        validatedPayload.priceDetails.finalAmount > 0
      ) {
        if (validatedPayload.paymentDetails.paymentMethodId) {
          bookingResult!.paymentDetails.paymentStatus = "paid"
          await bookingResult!.save({ session: mongooseDbSession })
        } else {
          throw new Error("bookings.errors.paymentMethodRequired")
        }
      } else if (validatedPayload.priceDetails.finalAmount === 0) {
        bookingResult!.paymentDetails.paymentStatus = "not_required"
        await bookingResult!.save({ session: mongooseDbSession })
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
  const authSession = await getServerSession(authOptions) // Renamed to avoid conflict
  if (!authSession || authSession.user.id !== userId) {
    if (!(cancelledByRole === "admin" && authSession?.user?.roles.includes("admin"))) {
      return { success: false, error: "common.unauthorized" }
    }
  }

  const mongooseDbSession = await mongoose.startSession() // Renamed
  let success = false

  try {
    await dbConnect()
    await mongooseDbSession.withTransaction(async () => {
      const booking = await Booking.findById(bookingId).session(mongooseDbSession)
      if (!booking) throw new Error("bookings.errors.bookingNotFound")
      if (booking.userId.toString() !== userId && cancelledByRole !== "admin") throw new Error("common.unauthorized")
      if (["completed", "cancelled_by_user", "cancelled_by_admin"].includes(booking.status)) {
        throw new Error("bookings.errors.cannotCancelAlreadyProcessed")
      }

      booking.status = cancelledByRole === "user" ? "cancelled_by_user" : "cancelled_by_admin"
      booking.cancellationReason = reason
      booking.cancelledBy = cancelledByRole

      if (booking.source === "subscription_redemption" && booking.redeemedUserSubscriptionId) {
        const userSub = await UserSubscription.findById(booking.redeemedUserSubscriptionId).session(mongooseDbSession)
        if (userSub) {
          userSub.remainingQuantity += 1
          if (userSub.status === "depleted") userSub.status = "active"
          await userSub.save({ session: mongooseDbSession })
        }
      }

      if (
        booking.source === "gift_voucher_redemption" &&
        booking.redeemedGiftVoucherId &&
        booking.priceDetails.voucherAppliedAmount > 0
      ) {
        const voucher = await GiftVoucher.findById(booking.redeemedGiftVoucherId).session(mongooseDbSession)
        if (voucher) {
          if (voucher.voucherType === "treatment" && voucher.status === "fully_used") {
            voucher.status = "active"
            voucher.remainingAmount = voucher.originalAmount || voucher.amount
          } else if (voucher.voucherType === "monetary") {
            voucher.remainingAmount = (voucher.remainingAmount || 0) + booking.priceDetails.voucherAppliedAmount
            if (voucher.status === "fully_used") voucher.status = "partially_used"
            if (voucher.remainingAmount > (voucher.originalAmount || 0)) {
              voucher.remainingAmount = voucher.originalAmount || 0
            }
          }
          voucher.isActive = true
          if (voucher.usageHistory) {
            voucher.usageHistory = voucher.usageHistory.filter(
              (entry) => entry.orderId?.toString() !== booking._id.toString(),
            )
          }
          await voucher.save({ session: mongooseDbSession })
        }
      }

      if (booking.appliedCouponId && booking.priceDetails.couponDiscount > 0) {
        const coupon = await Coupon.findById(booking.appliedCouponId).session(mongooseDbSession)
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
    const authSession = await getServerSession(authOptions) // Renamed
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
        ownerUserId: userId,
        status: { $in: ["active", "partially_used", "sent"] },
        validUntil: { $gte: new Date() },
      }).lean(),
      User.findById(userId)
        .select("preferences name email phone notificationPreferences treatmentPreferences")
        .lean(), // Use imported User model
      Address.find({ userId }).lean(), // Use imported Address model
      PaymentMethod.find({ userId, isActive: true }).lean(), // Use imported PaymentMethod model
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
      logger.error("Failed to load critical initial data for booking (models check)", {
        userId,
        userExists: !!user,
        activeTreatmentsExists: !!activeTreatments,
        workingHoursSettingsExists: !!workingHoursSettings,
        // Log if models were undefined during call (though error would be earlier)
        UserSubscriptionModel: !!UserSubscription,
        GiftVoucherModel: !!GiftVoucher,
        UserModel: !!User,
        AddressModel: !!Address,
        PaymentMethodModel: !!PaymentMethod,
        TreatmentModel: !!Treatment,
        WorkingHoursSettingsModel: !!WorkingHoursSettings,
      })
      return { success: false, error: "bookings.errors.initialDataLoadFailed" }
    }

    // Ensure user.notificationPreferences and user.treatmentPreferences exist before accessing their properties
    const notificationPrefs = user.notificationPreferences || {}
    const treatmentPrefs = user.treatmentPreferences || {}

    const populatedUserSubscriptions = activeUserSubscriptions.map((sub: any) => {
      if (sub.treatmentId && sub.treatmentId.pricingType === "duration_based" && sub.selectedDurationId) {
        const treatmentDoc = sub.treatmentId as ITreatment // Assuming ITreatment is correctly defined
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
    const errorDetails: any = { userId }
    if (error instanceof Error) {
      errorDetails.name = error.name
      errorDetails.errorMessage = error.message
      errorDetails.stack = error.stack
    } else {
      try {
        errorDetails.rawErrorString = JSON.stringify(error)
      } catch (stringifyError) {
        errorDetails.rawError = error
        errorDetails.stringifyError = "Failed to stringify raw error"
      }
    }
    logger.error("Error fetching initial booking data (enhanced):", errorDetails)
    return { success: false, error: "bookings.errors.initialDataFetchFailed" }
  }
}
