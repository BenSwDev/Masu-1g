import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import mongoose from "mongoose"

import Booking, { type IBooking, type IPriceDetails, type IBookingAddressSnapshot } from "@/lib/db/models/booking"
import Treatment, { type ITreatment } from "@/lib/db/models/treatment"
import UserSubscription, { type IUserSubscription } from "@/lib/db/models/user-subscription"
import GiftVoucher, { type IGiftVoucher } from "@/lib/db/models/gift-voucher"
import Coupon from "@/lib/db/models/coupon"
import User from "@/lib/db/models/user"
import Address, { constructFullAddress as constructFullAddressHelper } from "@/lib/db/models/address"
import { getNextSequenceValue } from "@/lib/db/models/counter"

import { logger } from "@/lib/logs/logger"
import { CreateBookingPayloadSchema } from "@/lib/validation/booking-schemas"
// Notifications handled inline

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    
    // Validate the payload
    const validationResult = CreateBookingPayloadSchema.safeParse(payload)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: "common.invalidInput", 
          issues: validationResult.error.issues 
        },
        { status: 400 }
      )
    }

    const validatedPayload = validationResult.data

    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || session.user.id !== validatedPayload.userId) {
      return NextResponse.json(
        { success: false, error: "common.unauthorized" },
        { status: 401 }
      )
    }

    await dbConnect()

    const mongooseDbSession = await mongoose.startSession()
    let bookingResult: any = null

    try {
      await mongooseDbSession.withTransaction(async () => {
        // Get user info
        const bookingUser = await User.findById(validatedPayload.userId)
          .select("name email phone")
          .lean()
          
        if (!bookingUser) {
          throw new Error("bookings.errors.userNotFound")
        }

        // Handle address
        let bookingAddressSnapshot: IBookingAddressSnapshot | undefined

        if (validatedPayload.customAddressDetails) {
          if (!validatedPayload.customAddressDetails.fullAddress) {
            validatedPayload.customAddressDetails.fullAddress = constructFullAddressHelper(
              validatedPayload.customAddressDetails as any
            )
          }
          bookingAddressSnapshot = {
            fullAddress: validatedPayload.customAddressDetails.fullAddress || constructFullAddressHelper(validatedPayload.customAddressDetails),
            city: validatedPayload.customAddressDetails.city || "",
            street: validatedPayload.customAddressDetails.street || "",
            streetNumber: validatedPayload.customAddressDetails.streetNumber || "",
            addressType: (validatedPayload.customAddressDetails as any).addressType || "apartment",
            apartment: (validatedPayload.customAddressDetails as any).apartment,
            entrance: (validatedPayload.customAddressDetails as any).entrance,
            floor: (validatedPayload.customAddressDetails as any).floor,
            notes: (validatedPayload.customAddressDetails as any).notes,
            doorName: (validatedPayload.customAddressDetails as any).doorName,
            buildingName: (validatedPayload.customAddressDetails as any).buildingName,
            hotelName: (validatedPayload.customAddressDetails as any).hotelName,
            roomNumber: (validatedPayload.customAddressDetails as any).roomNumber,
            instructions: (validatedPayload.customAddressDetails as any).instructions,
            otherInstructions: (validatedPayload.customAddressDetails as any).otherInstructions,
            hasPrivateParking: (validatedPayload.customAddressDetails as any).hasPrivateParking,
          }
        } else if (validatedPayload.selectedAddressId) {
          const selectedAddressDoc = await Address.findById(validatedPayload.selectedAddressId).lean()
          
          if (!selectedAddressDoc) {
            throw new Error("bookings.errors.addressNotFound")
          }

          bookingAddressSnapshot = {
            fullAddress: selectedAddressDoc.fullAddress || constructFullAddressHelper(selectedAddressDoc),
            city: selectedAddressDoc.city,
            street: selectedAddressDoc.street,
            streetNumber: selectedAddressDoc.streetNumber,
            addressType: selectedAddressDoc.addressType,
            apartment: selectedAddressDoc.apartmentDetails?.apartmentNumber,
            entrance: selectedAddressDoc.addressType === "apartment" 
              ? selectedAddressDoc.apartmentDetails?.entrance
              : selectedAddressDoc.addressType === "house" || selectedAddressDoc.addressType === "private"
                ? selectedAddressDoc.houseDetails?.entrance
                : selectedAddressDoc.addressType === "office"
                  ? selectedAddressDoc.officeDetails?.entrance
                  : undefined,
            floor: selectedAddressDoc.addressType === "apartment"
              ? selectedAddressDoc.apartmentDetails?.floor?.toString()
              : selectedAddressDoc.addressType === "office"
                ? selectedAddressDoc.officeDetails?.floor?.toString()
                : undefined,
            notes: selectedAddressDoc.additionalNotes,
            instructions: selectedAddressDoc.addressType === "other" 
              ? selectedAddressDoc.otherDetails?.instructions 
              : undefined,
            hasPrivateParking: selectedAddressDoc.hasPrivateParking,
          }
        }

        if (!bookingAddressSnapshot?.fullAddress) {
          throw new Error("bookings.errors.addressRequired")
        }

        // Generate booking number
        const nextBookingNum = await getNextSequenceValue("bookingNumber")
        const bookingNumber = nextBookingNum.toString().padStart(6, "0")

        // Create booking
        const newBooking = new Booking({
          ...validatedPayload,
          bookingNumber,
          bookedByUserName: bookingUser.name,
          bookedByUserEmail: bookingUser.email || undefined,
          bookedByUserPhone: bookingUser.phone,
          bookingAddressSnapshot,
          status: "pending_payment",
          priceDetails: {
            basePrice: validatedPayload.priceDetails.basePrice,
            surcharges: validatedPayload.priceDetails.surcharges,
            totalSurchargesAmount: validatedPayload.priceDetails.totalSurchargesAmount,
            treatmentPriceAfterSubscriptionOrTreatmentVoucher: validatedPayload.priceDetails.treatmentPriceAfterSubscriptionOrTreatmentVoucher,
            discountAmount: validatedPayload.priceDetails.couponDiscount,
            voucherAppliedAmount: validatedPayload.priceDetails.voucherAppliedAmount,
            finalAmount: validatedPayload.priceDetails.finalAmount,
            isBaseTreatmentCoveredBySubscription: validatedPayload.priceDetails.isBaseTreatmentCoveredBySubscription,
            isBaseTreatmentCoveredByTreatmentVoucher: validatedPayload.priceDetails.isBaseTreatmentCoveredByTreatmentVoucher,
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
            paymentStatus: validatedPayload.priceDetails.finalAmount === 0
              ? "not_required"
              : validatedPayload.paymentDetails.paymentStatus || "pending",
            transactionId: validatedPayload.paymentDetails.transactionId,
          },
          professionalId: null,
        })

        await newBooking.save({ session: mongooseDbSession })
        bookingResult = newBooking

        // Handle subscription redemption
        if (validatedPayload.priceDetails.redeemedUserSubscriptionId && 
            validatedPayload.priceDetails.isBaseTreatmentCoveredBySubscription) {
          const userSub = await UserSubscription.findById(validatedPayload.priceDetails.redeemedUserSubscriptionId)
            .session(mongooseDbSession)
            
          if (!userSub || userSub.remainingQuantity < 1 || userSub.status !== "active") {
            throw new Error("bookings.errors.subscriptionRedemptionFailed")
          }
          
          userSub.remainingQuantity -= 1
          if (userSub.remainingQuantity === 0) userSub.status = "depleted"
          await userSub.save({ session: mongooseDbSession })
        }

        // Handle voucher redemption
        if (validatedPayload.priceDetails.appliedGiftVoucherId && 
            validatedPayload.priceDetails.voucherAppliedAmount > 0) {
          const voucher = await GiftVoucher.findById(validatedPayload.priceDetails.appliedGiftVoucherId)
            .session(mongooseDbSession) as IGiftVoucher | null
            
          if (!voucher) throw new Error("bookings.errors.voucherNotFoundDuringCreation")
          if (!voucher.isActive && voucher.status !== "sent") {
            throw new Error("bookings.errors.voucherRedemptionFailedInactive")
          }

          if (voucher.voucherType === "treatment" && 
              validatedPayload.priceDetails.isBaseTreatmentCoveredByTreatmentVoucher) {
            voucher.status = "fully_used"
            voucher.remainingAmount = 0
            voucher.isActive = false
          } else if (voucher.voucherType === "monetary") {
            if (typeof voucher.remainingAmount !== "number" || 
                voucher.remainingAmount < validatedPayload.priceDetails.voucherAppliedAmount) {
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
        }

        // Handle coupon
        if (validatedPayload.priceDetails.appliedCouponId && 
            validatedPayload.priceDetails.couponDiscount > 0) {
          const coupon = await Coupon.findById(validatedPayload.priceDetails.appliedCouponId)
            .session(mongooseDbSession)
            
          if (!coupon || !coupon.isActive) throw new Error("bookings.errors.couponApplyFailed")
          
          coupon.timesUsed += 1
          await coupon.save({ session: mongooseDbSession })
        }

        if (bookingResult && bookingResult.priceDetails.finalAmount === 0) {
          bookingResult.paymentDetails.paymentStatus = "not_required"
          await bookingResult.save({ session: mongooseDbSession })
        }
      })

      if (bookingResult) {
        const finalBookingObject = bookingResult.toObject() as IBooking

        // Send notifications
        try {
          const userForNotification = await User.findById(finalBookingObject.userId)
            .select("name email phone notificationPreferences")
            .lean()
          const treatment = await Treatment.findById(finalBookingObject.treatmentId)
            .select("name")
            .lean()

          if (userForNotification && treatment) {
            const { unifiedNotificationService } = await import("@/lib/notifications/unified-notification-service")
            const lang = userForNotification.notificationPreferences?.language || "he"
            const methods = userForNotification.notificationPreferences?.methods || ["sms"]
            const recipients: any[] = []

            if (methods.includes("email") && userForNotification.email) {
              recipients.push({ 
                type: "email", 
                value: userForNotification.email, 
                name: userForNotification.name, 
                language: lang 
              })
            }
            
            if (methods.includes("sms") && userForNotification.phone) {
              recipients.push({ 
                type: "phone", 
                value: userForNotification.phone, 
                language: lang 
              })
            }

            if (recipients.length > 0) {
              await unifiedNotificationService.sendTreatmentBookingSuccess(recipients, {
                recipientName: finalBookingObject.recipientName || userForNotification.name,
                bookerName: userForNotification.name,
                treatmentName: treatment.name,
                bookingDateTime: finalBookingObject.bookingDateTime,
                bookingNumber: finalBookingObject.bookingNumber,
                bookingAddress: finalBookingObject.bookingAddressSnapshot?.fullAddress || "",
                isForSomeoneElse: Boolean(
                  finalBookingObject.recipientName && 
                  finalBookingObject.recipientName !== userForNotification.name
                ),
              })
            }
          }
        } catch (notificationError) {
          logger.error("Failed to send booking notifications:", {
            error: notificationError,
            bookingId: finalBookingObject.id.toString(),
          })
        }

        return NextResponse.json({ 
          success: true, 
          booking: finalBookingObject 
        })
      }

      return NextResponse.json(
        { success: false, error: "bookings.errors.bookingCreationFailedUnknown" },
        { status: 500 }
      )

    } finally {
      await mongooseDbSession.endSession()
    }

  } catch (error) {
    logger.error("Error creating booking:", { error })
    
    if (error instanceof Error) {
      if (error.message.startsWith("bookings.errors.")) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
        )
      }
    }
    
    return NextResponse.json(
      { success: false, error: "bookings.errors.createBookingFailed" },
      { status: 500 }
    )
  }
} 