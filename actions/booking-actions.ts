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
import { getNextSequenceValue } from "@/lib/db/models/counter"

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
  addressId?: Pick<
    IAddress,
    "_id" | "city" | "street" | "streetNumber" | "fullAddress" | "apartment" | "entrance" | "floor" | "notes"
  > | null
  professionalId?: Pick<IUser, "_id" | "name"> | null
}

function getDayWorkingHours(anchorDateUTC: Date, settings: IWorkingHoursSettings): IFixedHours | ISpecialDate | null {
  const specialDateSetting = settings.specialDates?.find((sd) => {
    const sdDateObj = new Date(sd.date)
    return (
      sdDateObj.getUTCFullYear() === anchorDateUTC.getUTCFullYear() &&
      sdDateObj.getUTCMonth() === anchorDateUTC.getUTCMonth() &&
      sdDateObj.getUTCDate() === anchorDateUTC.getUTCDate()
    )
  })

  if (specialDateSetting) {
    return specialDateSetting
  }

  const year = anchorDateUTC.getUTCFullYear()
  const month = anchorDateUTC.getUTCMonth()
  const day = anchorDateUTC.getUTCDate()
  const dateForDowCalc = new Date(Date.UTC(year, month, day, 12, 0, 0))
  const dayOfWeekInIsrael = dateForDowCalc.getUTCDay()

  const fixedDaySetting = settings.fixedHours?.find((fh) => fh.dayOfWeek === dayOfWeekInIsrael)
  return fixedDaySetting || null
}

export async function getAvailableTimeSlots(
  dateString: string,
  treatmentId: string,
  selectedDurationId?: string,
): Promise<{ success: boolean; timeSlots?: TimeSlot[]; error?: string; workingHoursNote?: string }> {
  try {
    await dbConnect()
    const selectedDateAnchorUTC = new Date(`${dateString}T12:00:00.000Z`)

    if (isNaN(selectedDateAnchorUTC.getTime())) {
      return { success: false, error: "bookings.errors.invalidDate" }
    }

    const treatment = await Treatment.findById(treatmentId).lean<ITreatment>()
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

    const settings = await WorkingHoursSettings.findOne().lean<IWorkingHoursSettings>()
    if (!settings) {
      return { success: false, error: "bookings.errors.workingHoursNotSet" }
    }

    const daySettings = getDayWorkingHours(selectedDateAnchorUTC, settings)

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

    let currentTimeSlotStart = set(selectedDateAnchorUTC, {
      hours: startHour,
      minutes: startMinute,
      seconds: 0,
      milliseconds: 0,
    })
    const dayEndTime = set(selectedDateAnchorUTC, {
      hours: endHour,
      minutes: endMinute,
      seconds: 0,
      milliseconds: 0,
    })

    const now = new Date()
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
          time: format(currentTimeSlotStart, "HH:mm"),
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
    logger.error("Error fetching available time slots:", { error, dateString, treatmentId })
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

    const bookingDateAnchorUTC = new Date(
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

    const treatment = await Treatment.findById(treatmentId).populate("durations").lean<ITreatment>()
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

    const settings = await WorkingHoursSettings.findOne().lean<IWorkingHoursSettings>()
    if (settings) {
      const daySettings = getDayWorkingHours(bookingDateAnchorUTC, settings)
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
      const userSub = await UserSubscription.findById(userSubscriptionId)
        .populate("subscriptionId")
        .populate<{ treatmentId: ITreatment }>({
          path: "treatmentId",
          model: "Treatment",
          populate: { path: "durations" },
        })
        .lean<IUserSubscription & { treatmentId: ITreatment }>()

      if (
        userSub &&
        userSub.userId.toString() === userId &&
        userSub.status === "active" &&
        userSub.remainingQuantity > 0
      ) {
        const subTreatment = userSub.treatmentId
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
      const voucher = await GiftVoucher.findOne({
        code: giftVoucherCode,
        status: { $in: ["active", "partially_used", "sent"] },
        validUntil: { $gte: new Date() },
      }).lean<IGiftVoucher>()

      if (voucher && voucher.isActive) {
        priceDetails.appliedGiftVoucherId = voucher._id.toString()

        if (voucher.voucherType === "treatment") {
          const treatmentMatches = voucher.treatmentId?.toString() === treatmentId
          let durationMatches = false

          if (treatment.pricingType === "duration_based") {
            if (treatment.durations && treatment.durations.length > 0) {
              if (voucher.selectedDurationId) {
                durationMatches = voucher.selectedDurationId.toString() === selectedDurationId
              } else {
                durationMatches = false
              }
            } else {
              durationMatches = false
            }
          } else {
            // Treatment is fixed price
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
      const voucherToApply = await GiftVoucher.findById(priceDetails.appliedGiftVoucherId).lean<IGiftVoucher>()
      if (
        voucherToApply &&
        voucherToApply.isActive &&
        voucherToApply.voucherType === "monetary" &&
        voucherToApply.remainingAmount &&
        voucherToApply.remainingAmount > 0 &&
        !priceDetails.isBaseTreatmentCoveredByTreatmentVoucher
      ) {
        const amountToApplyFromMonetary = Math.min(subtotalBeforeGeneralReductions, voucherToApply.remainingAmount)
        if (amountToApplyFromMonetary > 0) {
          priceDetails.voucherAppliedAmount += amountToApplyFromMonetary
          subtotalBeforeGeneralReductions -= amountToApplyFromMonetary
        }
      }
    }

    let currentTotalDue = subtotalBeforeGeneralReductions

    if (currentTotalDue > 0 && couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode }).lean<Coupon>()
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

    const bookingUser = await User.findById(validatedPayload.userId).select("name email phone").lean<IUser>()
    if (!bookingUser) {
      return { success: false, error: "bookings.errors.userNotFound" }
    }

    let bookingAddressSnapshot: IBookingAddressSnapshot | undefined
    if (validatedPayload.customAddressDetails) {
      if (
        !validatedPayload.customAddressDetails.fullAddress ||
        !validatedPayload.customAddressDetails.city ||
        !validatedPayload.customAddressDetails.street
      ) {
        logger.error("Custom address details missing required fields", {
          payload: validatedPayload.customAddressDetails,
        })
        return { success: false, error: "bookings.errors.customAddressIncomplete" }
      }
      bookingAddressSnapshot = validatedPayload.customAddressDetails
    } else if (validatedPayload.selectedAddressId) {
      const selectedAddressDoc = await Address.findById(validatedPayload.selectedAddressId).lean<IAddress>()
      if (selectedAddressDoc) {
        let fullAddress = selectedAddressDoc.fullAddress
        if (!fullAddress && selectedAddressDoc.city && selectedAddressDoc.street) {
          const parts = [
            selectedAddressDoc.street,
            selectedAddressDoc.streetNumber,
            selectedAddressDoc.apartment,
            selectedAddressDoc.city,
          ]
            .filter(Boolean)
            .join(", ")
          fullAddress = parts
          logger.warn(
            `Constructed fullAddress for snapshot as it was missing in Address doc ${selectedAddressDoc._id}: "${fullAddress}"`,
          )
        }

        if (!fullAddress || !selectedAddressDoc.city || !selectedAddressDoc.street) {
          logger.error(
            `Critical address data missing for Address ID: ${validatedPayload.selectedAddressId}. FullAddress: ${fullAddress}, City: ${selectedAddressDoc.city}, Street: ${selectedAddressDoc.street}`,
          )
          return { success: false, error: "bookings.errors.addressDataIncomplete" }
        }

        bookingAddressSnapshot = {
          fullAddress: fullAddress,
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
      bookingResult = newBooking.toObject<IBooking>() // Get plain object after save

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
        const voucher = await GiftVoucher.findById(validatedPayload.priceDetails.appliedGiftVoucherId).session(
          mongooseDbSession,
        )
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
          orderId: bookingResult!._id, // bookingResult is now IBooking, so _id is available
          description: `bookings.voucherUsage.redeemedForBooking ${bookingResult!._id.toString()}`,
          userId: new mongoose.Types.ObjectId(validatedPayload.userId),
        } as any) // Cast to any for usageHistory item if its type is complex
        await voucher.save({ session: mongooseDbSession })
        updatedVoucherDetails = voucher.toObject<IGiftVoucher>()
      }

      if (validatedPayload.priceDetails.appliedCouponId && validatedPayload.priceDetails.couponDiscount > 0) {
        const coupon = await Coupon.findById(validatedPayload.priceDetails.appliedCouponId).session(mongooseDbSession)
        if (!coupon || !coupon.isActive) throw new Error("bookings.errors.couponApplyFailed")
        coupon.timesUsed += 1
        await coupon.save({ session: mongooseDbSession })
      }

      // If bookingResult was updated (e.g. by voucher logic), ensure it's saved
      // However, newBooking already contains all details, and bookingResult is its plain object version.
      // We need to ensure the Mongoose document `newBooking` has the final paymentStatus if it changed.
      if (newBooking.priceDetails.finalAmount === 0 && newBooking.paymentDetails.paymentStatus !== "not_required") {
        newBooking.paymentDetails.paymentStatus = "not_required"
        await newBooking.save({ session: mongooseDbSession })
        bookingResult = newBooking.toObject<IBooking>() // Update bookingResult if changed
      }
    })

    if (bookingResult) {
      revalidatePath("/dashboard/member/book-treatment")
      revalidatePath("/dashboard/member/subscriptions")
      revalidatePath("/dashboard/member/gift-vouchers")
      revalidatePath("/dashboard/member/bookings")
      revalidatePath("/dashboard/admin/bookings")

      const finalBookingObject = bookingResult // Already an IBooking plain object
      if (updatedVoucherDetails) {
        ;(finalBookingObject as any).updatedVoucherDetails = updatedVoucherDetails
      }

      try {
        const userForNotification = await User.findById(finalBookingObject.userId)
          .select("name email phone notificationPreferences")
          .lean<IUser>()
        const treatmentForNotification = await Treatment.findById(finalBookingObject.treatmentId)
          .select("name")
          .lean<ITreatment>()

        if (userForNotification && treatmentForNotification) {
          const userLang = (userForNotification.notificationPreferences?.language as NotificationLanguage) || "he"
          const userNotificationMethods = userForNotification.notificationPreferences?.methods || ["email"]

          const bookingSuccessData: BookingSuccessNotificationData = {
            type: "BOOKING_SUCCESS",
            userName: finalBookingObject.recipientName || userForNotification.name || "User",
            bookingId: finalBookingObject.bookingNumber,
            treatmentName: treatmentForNotification.name,
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

    const query: mongoose.FilterQuery<IBooking> = { userId: new mongoose.Types.ObjectId(userId) }

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
        select: "name durations defaultDurationMinutes pricingType fixedPrice",
        populate: { path: "durations" },
      })
      .populate<{ addressId: IAddress | null }>("addressId") // Populate the referenced addressId
      .populate<{ professionalId: Pick<IUser, "_id" | "name"> | null }>({
        path: "professionalId",
        select: "name",
      })
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<
        Array<
          IBooking & {
            treatmentId: ITreatment | null
            addressId: IAddress | null
            professionalId: Pick<IUser, "_id" | "name"> | null
          }
        >
      >()

    const bookings: PopulatedBooking[] = rawBookings.map((booking) => {
      const populatedBooking: PopulatedBooking = {
        ...(booking as Omit<IBooking, "treatmentId" | "addressId" | "professionalId" | "selectedDurationId">), // More specific cast
        _id: booking._id as Types.ObjectId,
        treatmentId: null,
        addressId: booking.bookingAddressSnapshot
          ? {
              _id: booking.addressId?._id || new mongoose.Types.ObjectId(), // Use original addressId if exists
              city: booking.bookingAddressSnapshot.city,
              street: booking.bookingAddressSnapshot.street,
              streetNumber: booking.bookingAddressSnapshot.streetNumber,
              fullAddress: booking.bookingAddressSnapshot.fullAddress,
              apartment: booking.bookingAddressSnapshot.apartment,
              entrance: booking.bookingAddressSnapshot.entrance,
              floor: booking.bookingAddressSnapshot.floor,
              notes: booking.bookingAddressSnapshot.notes,
            }
          : booking.addressId // Fallback to populated addressId if snapshot somehow wasn't on the queried doc
            ? {
                _id: booking.addressId._id,
                city: booking.addressId.city,
                street: booking.addressId.street,
                streetNumber: booking.addressId.streetNumber,
                fullAddress: booking.addressId.fullAddress,
                apartment: booking.addressId.apartment,
                entrance: booking.addressId.entrance,
                floor: booking.addressId.floor,
                notes: booking.addressId.notes,
              }
            : null,
        professionalId: null,
      }

      if (booking.treatmentId) {
        const treatmentDoc = booking.treatmentId
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
        } else if (treatmentDoc.pricingType === "fixed") {
          populatedBooking.treatmentId.selectedDuration = {
            _id: new mongoose.Types.ObjectId(),
            minutes: treatmentDoc.defaultDurationMinutes || 0,
            price: treatmentDoc.fixedPrice || 0,
            isActive: true,
          } as ITreatmentDuration
        }
      }

      if (booking.professionalId) {
        populatedBooking.professionalId = {
          _id: booking.professionalId._id,
          name: booking.professionalId.name,
        }
      }
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
      const booking = await Booking.findById(bookingId).session(mongooseDbSession)
      if (!booking) throw new Error("bookings.errors.bookingNotFound")
      if (booking.userId.toString() !== userId && cancelledByRole !== "admin") throw new Error("common.unauthorized")
      if (["completed", "cancelled_by_user", "cancelled_by_admin", "no_show"].includes(booking.status)) {
        throw new Error("bookings.errors.cannotCancelAlreadyProcessed")
      }

      booking.status = cancelledByRole === "user" ? "cancelled_by_user" : "cancelled_by_admin"
      booking.cancellationReason = reason
      booking.cancelledBy = cancelledByRole as "user" | "admin" // Ensure type correctness

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
        const voucher = await GiftVoucher.findById(booking.priceDetails.appliedGiftVoucherId).session(mongooseDbSession)
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
      revalidatePath(`/dashboard/member/bookings`)
      revalidatePath(`/dashboard/member/book-treatment`)
      revalidatePath(`/dashboard/admin/bookings`)
      revalidatePath(`/dashboard/member/subscriptions`)
      revalidatePath(`/dashboard/member/gift-vouchers`)
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
        .populate<{ treatmentId: ITreatment }>({
          path: "treatmentId",
          model: Treatment,
          populate: { path: "durations" },
        })
        .lean<Array<IUserSubscription & { treatmentId: ITreatment }>>(),
      GiftVoucher.find({
        $or: [{ ownerUserId: userId }, { recipientEmail: authSession.user.email }],
        status: { $in: ["active", "partially_used", "sent"] },
        validUntil: { $gte: new Date() },
        isActive: true,
      })
        .populate<{ treatmentId?: ITreatment }>(
          "treatmentId",
          "name pricingType durations fixedPrice defaultDurationMinutes",
        )
        .lean<Array<IGiftVoucher & { treatmentId?: ITreatment }>>(),
      User.findById(userId)
        .select("preferences name email phone notificationPreferences treatmentPreferences")
        .lean<IUser>(),
      Address.find({ userId, isArchived: { $ne: true } }).lean<IAddress[]>(),
      fetchUserActivePaymentMethods(),
      Treatment.find({ isActive: true }).populate("durations").lean<ITreatment[]>(),
      WorkingHoursSettings.findOne().lean<IWorkingHoursSettings>(),
    ])

    const getFulfilledValue = <T,>(result: PromiseSettledResult<T>, defaultValue: T): T =>
      result.status === "fulfilled" ? result.value : defaultValue

    const activeUserSubscriptions = getFulfilledValue(userSubscriptionsResult, [])
    const usableGiftVouchers = getFulfilledValue(giftVouchersResult, [])
    const user = getFulfilledValue(userResult, null)
    const userAddresses = getFulfilledValue(addressesResult, [])

    const paymentMethodsResponse = paymentMethodsResult.status === "fulfilled" ? paymentMethodsResult.value : null
    let userPaymentMethods: any[] = []
    if (paymentMethodsResponse && paymentMethodsResponse.success && paymentMethodsResponse.paymentMethods) {
      userPaymentMethods = paymentMethodsResponse.paymentMethods
    } else if (paymentMethodsResponse && paymentMethodsResponse.error) {
      logger.warn(
        `Failed to fetch payment methods for user ${userId} in getBookingInitialData: ${paymentMethodsResponse.error}`,
      )
    } else if (paymentMethodsResult.status === "rejected") {
      logger.error(
        `Failed to fetch payment methods for user ${userId} in getBookingInitialData: ${paymentMethodsResult.reason}`,
      )
    }

    const activeTreatments = getFulfilledValue(treatmentsResult, [])
    const workingHoursSettings = getFulfilledValue(workingHoursResult, null)

    if (!user || !activeTreatments || !workingHoursSettings) {
      logger.error("Failed to load critical initial data for booking:", {
        userId,
        userFound: !!user,
        treatmentsFound: !!activeTreatments,
        settingsFound: !!workingHoursSettings,
      })
      return { success: false, error: "bookings.errors.initialDataLoadFailed" }
    }

    const notificationPrefs = user.notificationPreferences || {}
    const treatmentPrefs = user.treatmentPreferences || {}

    const populatedUserSubscriptions = activeUserSubscriptions.map((sub) => {
      if (sub.treatmentId && sub.treatmentId.pricingType === "duration_based" && sub.selectedDurationId) {
        const treatmentDoc = sub.treatmentId
        if (treatmentDoc.durations) {
          const selectedDuration = treatmentDoc.durations.find(
            (d: ITreatmentDuration) => d._id.toString() === sub.selectedDurationId!.toString(),
          )
          return { ...sub, selectedDurationDetails: selectedDuration }
        }
      }
      return sub
    })

    const enhancedUsableGiftVouchers = usableGiftVouchers.map((voucher) => {
      let displayTreatmentName = voucher.treatmentName
      let displaySelectedDurationName = voucher.selectedDurationName

      if (voucher.voucherType === "treatment" && voucher.treatmentId) {
        const treatmentDetails = voucher.treatmentId
        if (treatmentDetails) {
          if (!displayTreatmentName) displayTreatmentName = treatmentDetails.name

          if (treatmentDetails.pricingType === "duration_based" && voucher.selectedDurationId) {
            if (!displaySelectedDurationName && treatmentDetails.durations) {
              const durationDetails = treatmentDetails.durations.find(
                (d) => d._id.toString() === voucher.selectedDurationId!.toString(),
              )
              if (durationDetails) displaySelectedDurationName = `${durationDetails.minutes} min`
            }
          } else {
            displaySelectedDurationName = ""
          }
        }
      }
      return {
        ...voucher,
        treatmentName: displayTreatmentName,
        selectedDurationName: displaySelectedDurationName,
        treatmentId: voucher.treatmentId
          ? {
              _id: voucher.treatmentId._id,
              name: voucher.treatmentId.name,
              pricingType: voucher.treatmentId.pricingType,
              durations: voucher.treatmentId.durations,
              fixedPrice: voucher.treatmentId.fixedPrice,
              defaultDurationMinutes: voucher.treatmentId.defaultDurationMinutes,
            }
          : undefined,
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
      acceptedBooking = booking.toObject<IBooking>()
    })

    if (acceptedBooking) {
      revalidatePath(`/dashboard/professional/booking-management/${bookingId}`)
      revalidatePath("/dashboard/admin/bookings")

      try {
        const clientUser = await User.findById(acceptedBooking.userId)
          .select("name email phone notificationPreferences")
          .lean<IUser>()
        const treatmentForNotification = await Treatment.findById(acceptedBooking.treatmentId)
          .select("name")
          .lean<ITreatment>()
        const professionalUser = await User.findById(professionalId).select("name").lean<IUser>()

        if (clientUser && treatmentForNotification && professionalUser) {
          const clientLang = (clientUser.notificationPreferences?.language as NotificationLanguage) || "he"
          const clientNotificationMethods = clientUser.notificationPreferences?.methods || ["email"]

          const notificationData: BookingConfirmedClientNotificationData = {
            type: "BOOKING_CONFIRMED_CLIENT",
            userName: clientUser.name || "לקוח/ה",
            professionalName: professionalUser.name || "מטפל/ת",
            bookingDateTime: acceptedBooking.bookingDateTime,
            treatmentName: treatmentForNotification.name,
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
    const updatedBooking = booking.toObject<IBooking>()
    revalidatePath(`/dashboard/professional/booking-management/${bookingId}`)

    try {
      const clientUser = await User.findById(updatedBooking.userId)
        .select("name email phone notificationPreferences")
        .lean<IUser>()
      const treatmentForNotification = await Treatment.findById(updatedBooking.treatmentId)
        .select("name")
        .lean<ITreatment>()
      const professionalUser = await User.findById(professionalId).select("name").lean<IUser>()

      if (clientUser && treatmentForNotification && professionalUser) {
        const clientLang = (clientUser.notificationPreferences?.language as NotificationLanguage) || "he"
        const clientNotificationMethods = clientUser.notificationPreferences?.methods || ["email"]
        const notificationData: ProfessionalEnRouteClientNotificationData = {
          type: "PROFESSIONAL_EN_ROUTE_CLIENT",
          userName: clientUser.name || "לקוח/ה",
          professionalName: professionalUser.name || "מטפל/ת",
          bookingDateTime: updatedBooking.bookingDateTime,
          treatmentName: treatmentForNotification.name,
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

    return { success: true, booking: updatedBooking }
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
    const updatedBooking = booking.toObject<IBooking>()
    revalidatePath(`/dashboard/professional/booking-management/${bookingId}`)
    revalidatePath("/dashboard/admin/bookings")

    try {
      const clientUser = await User.findById(updatedBooking.userId)
        .select("name email phone notificationPreferences")
        .lean<IUser>()
      const treatmentForNotification = await Treatment.findById(updatedBooking.treatmentId)
        .select("name")
        .lean<ITreatment>()
      const professionalUser = await User.findById(professionalId).select("name").lean<IUser>()

      if (clientUser && treatmentForNotification && professionalUser) {
        const clientLang = (clientUser.notificationPreferences?.language as NotificationLanguage) || "he"
        const clientNotificationMethods = clientUser.notificationPreferences?.methods || ["email"]
        const notificationData: BookingCompletedClientNotificationData = {
          type: "BOOKING_COMPLETED_CLIENT",
          userName: clientUser.name || "לקוח/ה",
          professionalName: professionalUser.name || "מטפל/ת",
          treatmentName: treatmentForNotification.name,
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

    return { success: true, booking: updatedBooking }
  } catch (error) {
    logger.error("Error in professionalMarkCompleted:", { error, bookingId, professionalId })
    return { success: false, error: "bookings.errors.markCompletedFailed" }
  }
}
