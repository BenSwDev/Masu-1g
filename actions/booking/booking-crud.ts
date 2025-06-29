"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
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
  type CreateBookingPayloadSchemaType 
} from "@/lib/validation/booking-schemas"
import type { z } from "zod"
import type { 
  PopulatedBooking, 
  BookingStatus,
  IBookingAddressSnapshot,
  IPriceDetails,
  CalculatedPriceDetails as ClientCalculatedPriceDetails
} from "@/types/booking"
import { constructFullAddressHelper, getNextSequenceValue } from "./booking-utils"
import { sendBookingConfirmationToUser, sendGuestNotification } from "@/lib/notifications/unified-service"

/**
 * Create a new booking for authenticated user
 */
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
        ...addressDetails,
        fullAddress: addressDetails.fullAddress || constructFullAddressHelper(addressDetails)
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
        bookedByUserEmail: bookingUser.email || undefined,
        bookedByUserPhone: bookingUser.phone,
        // Add recipient fields for "booking for someone else" logic
        recipientName: validatedPayload.isBookingForSomeoneElse ? validatedPayload.recipientName : bookingUser.name,
        recipientPhone: validatedPayload.isBookingForSomeoneElse ? validatedPayload.recipientPhone : bookingUser.phone,
        recipientEmail: validatedPayload.isBookingForSomeoneElse ? validatedPayload.recipientEmail : (bookingUser.email || undefined),
        recipientBirthDate: validatedPayload.isBookingForSomeoneElse ? validatedPayload.recipientBirthDate : undefined,
        recipientGender: validatedPayload.isBookingForSomeoneElse ? validatedPayload.recipientGender : undefined,
        bookingAddressSnapshot,
        status: "pending_payment", // Will be updated to "in_process" after successful payment
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

      // Handle subscription redemption
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
        
        // Add treatment validation for subscriptions
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

      // Handle gift voucher redemption
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
          description: `Booking ${bookingNumber}`,
        })
        await voucher.save({ session: mongooseDbSession })
        updatedVoucherDetails = voucher.toObject() as IGiftVoucher
      }

      // Handle coupon usage
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

      // Send booking confirmation
      try {
        const userId = validatedPayload.userId
        const isBookingForSomeoneElse = validatedPayload.isBookingForSomeoneElse || false
        
        const treatment = await Treatment.findById(finalBookingObject.treatmentId).select("name").lean()
        const bookingAddress = finalBookingObject.bookingAddressSnapshot?.fullAddress || "כתובת לא זמינה"
        
        if (treatment) {
          // Send notification to booker
          await sendBookingConfirmationToUser(userId, String(finalBookingObject._id))
          
          // Send notification to recipient if booking for someone else
          if (isBookingForSomeoneElse && validatedPayload.recipientEmail) {
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
                phone: validatedPayload.recipientNotificationMethods?.includes("sms") ? validatedPayload.recipientPhone : undefined,
                language: validatedPayload.notificationLanguage || "he"
              },
              {
                type: "treatment-booking-success",
                ...recipientBookingData,
              }
            )
          }
        }
        
        logger.info("Booking notifications sent successfully", { 
          bookingId: String(finalBookingObject._id),
          userId,
          isForSomeoneElse: isBookingForSomeoneElse
        })
        
      } catch (notificationError) {
        logger.error("Failed to send booking notifications:", {
          error: notificationError instanceof Error ? notificationError.message : String(notificationError),
          bookingId: String(finalBookingObject._id),
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

/**
 * Get booking by ID with population
 */
export async function getBookingById(bookingId: string): Promise<{
  success: boolean
  booking?: PopulatedBooking
  error?: string
}> {
  try {
    await dbConnect()

    const booking = await Booking.findById(bookingId)
      .populate<{ treatmentId: ITreatment | null }>({
        path: "treatmentId",
        select: "name durations defaultDurationMinutes pricingType fixedPrice isActive",
      })
      .populate<{ addressId: IAddress | null }>({
        path: "addressId",
        select: "fullAddress city street streetNumber apartmentDetails houseDetails officeDetails hotelDetails otherDetails additionalNotes addressType",
      })
      .populate<{ professionalId: Pick<User, "_id" | "name"> | null }>({
        path: "professionalId",
        select: "name",
      })
      .populate("priceDetails.appliedCouponId")
      .populate("priceDetails.appliedGiftVoucherId")
      .populate({
        path: "priceDetails.redeemedUserSubscriptionId",
        populate: [
          { path: "subscriptionId", select: "name description" },
          { path: "treatmentId", select: "name pricingType defaultDurationMinutes durations" },
        ],
      })
      .populate({
        path: "paymentDetails.paymentMethodId",
        select: "type last4 brand isDefault displayName",
      })
      .lean()

    if (!booking) {
      return { success: false, error: "Booking not found" }
    }

    return { success: true, booking: booking as unknown as PopulatedBooking }
  } catch (error) {
    logger.error("Error fetching booking by ID:", { error, bookingId })
    return { success: false, error: "Failed to fetch booking" }
  }
}

/**
 * Get user bookings with filters and pagination
 */
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
      })
      .populate<{ addressId: IAddress | null }>({
        path: "addressId",
        select: "fullAddress city street streetNumber apartmentDetails houseDetails officeDetails hotelDetails otherDetails additionalNotes addressType",
      })
      .populate<{ professionalId: Pick<User, "_id" | "name"> | null }>({
        path: "professionalId",
        select: "name",
      })
      .populate("priceDetails.appliedCouponId")
      .populate("priceDetails.appliedGiftVoucherId")
      .populate({
        path: "priceDetails.redeemedUserSubscriptionId",
        populate: [
          { path: "subscriptionId", select: "name description" },
          { path: "treatmentId", select: "name pricingType defaultDurationMinutes durations" },
        ],
      })
      .populate({
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
    logger.error("Error fetching user bookings:", { userId, filters, error })
    return { bookings: [], totalPages: 0, totalBookings: 0 }
  }
}

/**
 * Cancel booking with rollback of redemptions
 */
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

      // Rollback subscription redemption
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

      // Rollback gift voucher usage
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

      // Rollback coupon usage
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

/**
 * Admin update booking
 */
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
        
        if (!booking.treatmentCategory) {
          booking.treatmentCategory = treatment.category ? new mongoose.Types.ObjectId(treatment.category) : new mongoose.Types.ObjectId()
        }
      }
    }
    
    // Ensure consents field
    if (!booking.consents) {
      booking.consents = {
        customerAlerts: "email",
        patientAlerts: "email",
        marketingOptIn: false,
        termsAccepted: true
      }
    }
    
    // Ensure step field
    if (!booking.step) {
      booking.step = 7 // Complete booking
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

/**
 * Get all bookings for admin with filters
 */
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
    logger.warn("Unauthorized attempt to fetch all bookings")
    return { bookings: [], totalPages: 0, totalBookings: 0 }
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
      search, 
      page = 1, 
      limit = 10, 
      sortBy = "bookingDateTime", 
      sortDirection = "desc" 
    } = filters

    const query: any = {}

    // Status filter
    if (status && status !== "all") {
      switch (status) {
        case "pending":
          query.status = { $in: ["pending_payment", "in_process"] }
          break
        case "active":
          query.status = { $in: ["confirmed", "in_process"] }
          break
        case "completed":
          query.status = "completed"
          break
        case "cancelled":
          query.status = { $in: ["cancelled", "refunded"] }
          break
        default:
          query.status = status
          break
      }
    }

    // Professional filter
    if (professional && professional !== "all") {
      if (professional === "unassigned") {
        query.professionalId = { $exists: false }
      } else {
        query.professionalId = new mongoose.Types.ObjectId(professional)
      }
    }

    // Treatment filter
    if (treatment && treatment !== "all") {
      query.treatmentId = new mongoose.Types.ObjectId(treatment)
    }

    // Date range filter
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
      }
    }

    // Price range filter
    if (priceRange && priceRange !== "all") {
      const [min, max] = priceRange.split("-").map(Number)
      if (!isNaN(min) && !isNaN(max)) {
        query["priceDetails.finalAmount"] = { $gte: min, $lte: max }
      }
    }

    // Address filter
    if (address && address.trim()) {
      query["bookingAddressSnapshot.city"] = { $regex: address.trim(), $options: "i" }
    }

    // Search filter
    if (search && search.trim()) {
      query.$or = [
        { bookingNumber: { $regex: search.trim(), $options: "i" } },
        { recipientName: { $regex: search.trim(), $options: "i" } },
        { recipientPhone: { $regex: search.trim(), $options: "i" } },
        { recipientEmail: { $regex: search.trim(), $options: "i" } },
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
      })
      .populate<{ userId: Pick<User, "_id" | "name" | "email" | "phone"> | null }>({
        path: "userId",
        select: "name email phone",
      })
      .populate<{ professionalId: Pick<User, "_id" | "name"> | null }>({
        path: "professionalId",
        select: "name",
      })
      .populate("priceDetails.appliedCouponId")
      .populate("priceDetails.appliedGiftVoucherId")
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    const bookings = rawBookings as unknown as PopulatedBooking[]

    return { bookings, totalPages, totalBookings }
  } catch (error) {
    logger.error("Error fetching all bookings:", { filters, error })
    return { bookings: [], totalPages: 0, totalBookings: 0 }
  }
}
