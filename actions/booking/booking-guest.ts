"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongodb"
import Booking, { type IBooking } from "@/lib/db/models/booking"
import User from "@/lib/db/models/user"
import Treatment, { type ITreatment } from "@/lib/db/models/treatment"
import Address, { type IAddress } from "@/lib/db/models/address"
import UserSubscription, { type IUserSubscription } from "@/lib/db/models/user-subscription"
import GiftVoucher, { type IGiftVoucher } from "@/lib/db/models/gift-voucher"
import Coupon from "@/lib/db/models/coupon"
import mongoose from "mongoose"
import { logger } from "@/lib/logs/logger"
import { revalidatePath } from "next/cache"
import {
  CreateBookingPayloadSchema,
  type CreateBookingPayloadType,
} from "@/lib/validation/booking-schemas"
import type { z } from "zod"
import type {
  PopulatedBooking,
  CalculatedPriceDetails as ClientCalculatedPriceDetails,
} from "@/types/booking"
import type { BookingStatus } from "@/types/core"
import type { IBookingAddressSnapshot, IPriceDetails } from "@/lib/db/models/booking"
import { constructFullAddressHelper } from "@/lib/utils/booking-helpers"
import { getNextSequenceValue } from "@/lib/db/models/counter"
import { sendGuestNotification } from "@/actions/notification-service"
import bcrypt from "bcryptjs"

/**
 * Create a new guest booking (for non-authenticated users)
 */
export async function createGuestBooking(
  payload: unknown
): Promise<{ success: boolean; booking?: IBooking; error?: string; issues?: z.ZodIssue[] }> {
  const validationResult = CreateBookingPayloadSchema.safeParse(payload)
  if (!validationResult.success) {
    logger.warn("Invalid payload for createGuestBooking:", {
      issues: validationResult.error.issues,
    })
    return { success: false, error: "common.invalidInput", issues: validationResult.error.issues }
  }
  const validatedPayload = validationResult.data as CreateBookingPayloadType & {
    priceDetails: ClientCalculatedPriceDetails
    guestInfo: {
      name: string
      email: string
      phone: string
      password?: string
      language?: string
    }
  }

  const mongooseDbSession = await mongoose.startSession()
  let bookingResult: IBooking | null = null
  let updatedVoucherDetails: IGiftVoucher | null = null
  let guestUserId: string | null = null

  try {
    await dbConnect()

    // Create or find guest user
    let guestUser = await User.findOne({ email: validatedPayload.guestInfo.email }).lean()

    if (!guestUser) {
      // Create new guest user
      const hashedPassword = validatedPayload.guestInfo.password
        ? await bcrypt.hash(validatedPayload.guestInfo.password, 12)
        : undefined

      const newUser = new User({
        name: validatedPayload.guestInfo.name,
        email: validatedPayload.guestInfo.email,
        phone: validatedPayload.guestInfo.phone,
        password: hashedPassword,
        roles: ["member"],
        isGuest: true,
        language: validatedPayload.guestInfo.language || "he",
        registrationDate: new Date(),
        isActive: true,
        emailVerified: false,
        phoneVerified: false,
      })

      await newUser.save()
      guestUser = newUser.toObject() as any
      guestUserId = String(newUser._id)
    } else {
      guestUserId = String(guestUser._id)
    }

    // Ensure guestUserId is valid before proceeding
    if (!guestUserId) {
      throw new Error("Failed to create or retrieve guest user ID")
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
        ...addressDetails,
        fullAddress: addressDetails.fullAddress || constructFullAddressHelper(addressDetails),
      }
    } else {
      logger.warn("No address provided for guest booking")
      return { success: false, error: "bookings.errors.addressRequired" }
    }

    await mongooseDbSession.withTransaction(async () => {
      const nextBookingNum = await getNextSequenceValue("bookingNumber")
      const bookingNumber = nextBookingNum.toString().padStart(6, "0")

      const newBooking = new Booking({
        ...validatedPayload,
        userId: new mongoose.Types.ObjectId(guestUserId!),
        bookingNumber,
        bookedByUserName: guestUser!.name,
        bookedByUserEmail: guestUser!.email || undefined,
        bookedByUserPhone: guestUser!.phone,
        // Add recipient fields for "booking for someone else" logic
        recipientName: validatedPayload.isBookingForSomeoneElse
          ? validatedPayload.recipientName
          : guestUser!.name,
        recipientPhone: validatedPayload.isBookingForSomeoneElse
          ? validatedPayload.recipientPhone
          : guestUser!.phone,
        recipientEmail: validatedPayload.isBookingForSomeoneElse
          ? validatedPayload.recipientEmail
          : guestUser!.email || undefined,
        recipientBirthDate: validatedPayload.isBookingForSomeoneElse
          ? validatedPayload.recipientBirthDate
          : undefined,
        recipientGender: validatedPayload.isBookingForSomeoneElse
          ? validatedPayload.recipientGender
          : undefined,
        bookingAddressSnapshot,
        status: "pending_payment", // Will be updated to "in_process" after successful payment
        isGuestBooking: true,
        // Required fields with defaults for backward compatibility
        treatmentCategory: new mongoose.Types.ObjectId(), // Generate a new ObjectId as category reference
        staticTreatmentPrice:
          validatedPayload.staticPricingData?.staticTreatmentPrice ||
          validatedPayload.priceDetails.basePrice ||
          0,
        staticTherapistPay: validatedPayload.staticPricingData?.staticTherapistPay || 0,
        companyFee: validatedPayload.staticPricingData?.companyFee || 0,
        consents: validatedPayload.consents || {
          customerAlerts: "email",
          patientAlerts: "email",
          marketingOptIn: false,
          termsAccepted: true,
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
          isBaseTreatmentCoveredBySubscription:
            validatedPayload.priceDetails.isBaseTreatmentCoveredBySubscription,
          isBaseTreatmentCoveredByTreatmentVoucher:
            validatedPayload.priceDetails.isBaseTreatmentCoveredByTreatmentVoucher,
          isFullyCoveredByVoucherOrSubscription:
            validatedPayload.priceDetails.isFullyCoveredByVoucherOrSubscription,
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
          surchargesProfessionalPayment:
            validatedPayload.priceDetails.surchargesProfessionalPayment,
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

      // Handle gift voucher redemption
      if (
        validatedPayload.priceDetails.appliedGiftVoucherId &&
        validatedPayload.priceDetails.voucherAppliedAmount > 0
      ) {
        const voucher = await GiftVoucher.findById(
          validatedPayload.priceDetails.appliedGiftVoucherId
        ).session(mongooseDbSession)
        if (!voucher) throw new Error("bookings.errors.voucherNotFoundDuringCreation")
        if (!voucher.isActive && voucher.status !== "sent")
          throw new Error("bookings.errors.voucherRedemptionFailedInactive")

        // Add treatment validation for treatment vouchers
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
          description: `Guest Booking ${bookingNumber}`,
        })
        await voucher.save({ session: mongooseDbSession })
        updatedVoucherDetails = voucher.toObject() as IGiftVoucher
      }

      // Handle coupon usage
      if (
        validatedPayload.priceDetails.appliedCouponId &&
        validatedPayload.priceDetails.couponDiscount > 0
      ) {
        const coupon = await Coupon.findById(validatedPayload.priceDetails.appliedCouponId).session(
          mongooseDbSession
        )
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
      revalidatePath("/bookings/treatment")
      revalidatePath("/dashboard/admin/bookings")

      const finalBookingObject = (bookingResult as any).toObject() as IBooking
      if (updatedVoucherDetails) {
        ;(finalBookingObject as any).updatedVoucherDetails = updatedVoucherDetails
      }

      // Send booking confirmation to guest
      try {
        const treatment = await Treatment.findById(finalBookingObject.treatmentId)
          .select("name")
          .lean()
        const bookingAddress =
          finalBookingObject.bookingAddressSnapshot?.fullAddress || "????? ?? ?????"

        if (treatment && guestUser) {
          const isBookingForSomeoneElse = validatedPayload.isBookingForSomeoneElse || false

          const guestBookingData = {
            recipientName: isBookingForSomeoneElse
              ? validatedPayload.recipientName!
              : guestUser.name,
            bookerName: guestUser.name,
            treatmentName: treatment.name,
            bookingDateTime: finalBookingObject.bookingDateTime,
            bookingNumber: finalBookingObject.bookingNumber,
            bookingAddress: bookingAddress,
            isForSomeoneElse: isBookingForSomeoneElse,
          }

          await sendGuestNotification(
            {
              name: guestUser.name,
              email: guestUser.email!,
              phone: guestUser.phone,
              language: validatedPayload.guestInfo.language || "he",
            },
            {
              type: "treatment-booking-success",
              ...guestBookingData,
            }
          )

          // Send notification to recipient if booking for someone else
          if (isBookingForSomeoneElse && validatedPayload.recipientEmail) {
            await sendGuestNotification(
              {
                name: validatedPayload.recipientName!,
                email: validatedPayload.recipientEmail,
                phone: validatedPayload.recipientNotificationMethods?.includes("sms")
                  ? validatedPayload.recipientPhone
                  : undefined,
                language: validatedPayload.notificationLanguage || "he",
              },
              {
                type: "treatment-booking-success",
                ...guestBookingData,
              }
            )
          }
        }

        logger.info("Guest booking notifications sent successfully", {
          bookingId: String(finalBookingObject._id),
          guestUserId,
          isForSomeoneElse: validatedPayload.isBookingForSomeoneElse,
        })
      } catch (notificationError) {
        logger.error("Failed to send guest booking notifications:", {
          error:
            notificationError instanceof Error
              ? notificationError.message
              : String(notificationError),
          bookingId: String(finalBookingObject._id),
        })
      }

      return { success: true, booking: finalBookingObject }
    } else {
      return { success: false, error: "bookings.errors.bookingCreationFailedUnknown" }
    }
  } catch (error) {
    logger.error("Error creating guest booking:", { error, payload: validatedPayload })
    const errorMessage =
      error instanceof Error ? error.message : "bookings.errors.createBookingFailed"
    return {
      success: false,
      error: errorMessage.startsWith("bookings.errors.")
        ? errorMessage
        : "bookings.errors.createBookingFailed",
    }
  } finally {
    await mongooseDbSession.endSession()
  }
}

/**
 * Get initial data for guest booking form
 */
export async function getGuestBookingInitialData(): Promise<{
  success: boolean
  data?: any
  error?: string
}> {
  try {
    logger.info("Starting getGuestBookingInitialData")
    await dbConnect()
    logger.info("Database connected successfully")

    // Get active treatments with timeout and optimized query
    logger.info("Fetching active treatments...")
    const treatmentsPromise = Treatment.find({ isActive: true })
      .select("name description durations pricingType fixedPrice category")
      .lean()
      .maxTimeMS(15000) // 15 second timeout
      .exec()

    // Get active coupons with timeout and optimized query
    logger.info("Fetching active coupons...")
    const couponsPromise = Coupon.find({
      isActive: true,
      $or: [{ validUntil: { $gte: new Date() } }, { validUntil: { $exists: false } }],
    })
      .select("code discountType discountValue description")
      .lean()
      .maxTimeMS(15000) // 15 second timeout
      .exec()

    // Execute both queries in parallel with overall timeout
    const [treatments, coupons] = await Promise.race([
      Promise.all([treatmentsPromise, couponsPromise]),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Query timeout after 20 seconds")), 20000)
      )
    ]) as [any[], any[]]

    logger.info(`Found ${treatments.length} active treatments`)
    logger.info(`Found ${coupons.length} active coupons`)

    const result = {
      success: true,
      data: {
        treatments,
        coupons,
        surcharges: [
          {
            type: "evening",
            name: "תוספת ערב",
            amount: 20,
            description: "תוספת עבור טיפול בשעות הערב",
          },
          {
            type: "weekend",
            name: "תוספת סוף שבוע",
            amount: 30,
            description: "תוספת עבור טיפול בסוף השבוע",
          },
          { type: "holiday", name: "תוספת חג", amount: 50, description: "תוספת עבור טיפול בחג" },
        ],
      },
    }
    
    logger.info("getGuestBookingInitialData completed successfully")
    return result
  } catch (error) {
    logger.error("Error fetching guest booking initial data:", { 
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    })
    
    // Return minimal data if database queries fail
    logger.info("Returning fallback data due to database error")
    return {
      success: true,
      data: {
        treatments: [],
        coupons: [],
        surcharges: [
          {
            type: "evening",
            name: "תוספת ערב",
            amount: 20,
            description: "תוספת עבור טיפול בשעות הערב",
          },
          {
            type: "weekend",
            name: "תוספת סוף שבוע",
            amount: 30,
            description: "תוספת עבור טיפול בסוף השבוע",
          },
          { type: "holiday", name: "תוספת חג", amount: 50, description: "תוספת עבור טיפול בחג" },
        ],
      },
    }
  }
}

/**
 * Create a guest user account
 */
export async function createGuestUser(guestInfo: {
  name: string
  email: string
  phone: string
  password?: string
  language?: string
}): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    await dbConnect()

    // Check if user already exists
    const existingUser = await User.findOne({ email: guestInfo.email }).lean()
    if (existingUser) {
      return { success: true, userId: String(existingUser._id) }
    }

    // Create new guest user
    const hashedPassword = guestInfo.password
      ? await bcrypt.hash(guestInfo.password, 12)
      : undefined

    const newUser = new User({
      name: guestInfo.name,
      email: guestInfo.email,
      phone: guestInfo.phone,
      password: hashedPassword,
      roles: ["member"],
      isGuest: true,
      language: guestInfo.language || "he",
      registrationDate: new Date(),
      isActive: true,
      emailVerified: false,
      phoneVerified: false,
    })

    await newUser.save()

    return { success: true, userId: String(newUser._id) }
  } catch (error) {
    logger.error("Error creating guest user:", error)
    return { success: false, error: "common.unknown" }
  }
}

/**
 * Validate redemption code (gift voucher or coupon)
 */
export async function validateRedemptionCode(
  code: string,
  treatmentId?: string
): Promise<{
  success: boolean
  type?: "gift_voucher" | "coupon"
  details?: any
  error?: string
}> {
  try {
    await dbConnect()

    // First check if it's a gift voucher
    const giftVoucher = await GiftVoucher.findOne({
      code: code,
      isActive: true,
      $or: [{ expiryDate: { $gte: new Date() } }, { expiryDate: { $exists: false } }],
    }).lean()

    if (giftVoucher) {
      // Validate treatment match for treatment vouchers
      if (giftVoucher.voucherType === "treatment" && treatmentId) {
        if (giftVoucher.treatmentId?.toString() !== treatmentId) {
          return {
            success: false,
            error: "bookings.errors.treatmentMismatch",
          }
        }
      }

      return {
        success: true,
        type: "gift_voucher",
        details: {
          id: giftVoucher._id,
          voucherType: giftVoucher.voucherType,
          amount: giftVoucher.amount,
          remainingAmount: giftVoucher.remainingAmount || giftVoucher.amount,
          treatmentId: giftVoucher.treatmentId,
          description: giftVoucher.greetingMessage || "Gift voucher",
        },
      }
    }

    // Check if it's a coupon
    const coupon = await Coupon.findOne({
      code: code,
      isActive: true,
      $or: [{ validUntil: { $gte: new Date() } }, { validUntil: { $exists: false } }],
    }).lean()

    if (coupon) {
      // Check usage limits
      if ((coupon as any).maxUses && coupon.timesUsed >= (coupon as any).maxUses) {
        return {
          success: false,
          error: "bookings.errors.couponExhausted",
        }
      }

      return {
        success: true,
        type: "coupon",
        details: {
          id: coupon._id,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          description: coupon.description,
          maxDiscount: (coupon as any).maxDiscount,
        },
      }
    }

    return {
      success: false,
      error: "bookings.errors.invalidRedemptionCode",
    }
  } catch (error) {
    logger.error("Error validating redemption code:", error)
    return { success: false, error: "common.unknown" }
  }
}
