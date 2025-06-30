"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { logger } from "@/lib/logs/logger"
import dbConnect from "@/lib/db/mongodb"
import Booking from "@/lib/db/models/booking"
import Treatment from "@/lib/db/models/treatment"
import Address from "@/lib/db/models/address"
import User from "@/lib/db/models/user"
import ProfessionalProfile from "@/lib/db/models/professional-profile"
import Coupon from "@/lib/db/models/coupon"
import GiftVoucher from "@/lib/db/models/gift-voucher"
import Subscription from "@/lib/db/models/subscription"
import { calculateBookingPrice } from "./booking-pricing"
import type { BookingStatus } from "@/types/core"
import mongoose from "mongoose"
import UserSubscription, { type IUserSubscription } from "@/lib/db/models/user-subscription"
import { revalidatePath } from "next/cache"
import type { PopulatedBooking } from "@/types/booking"

/**
 * Get initial data for booking form (authenticated users)
 */
export async function getBookingInitialData(userId: string): Promise<{
  success: boolean
  data?: any
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.id !== userId) {
      return { success: false, error: "common.unauthorized" }
    }

    await dbConnect()

    // Get user data
    const user = await User.findById(userId)
      .select("name email phone addresses")
      .populate("addresses")
      .lean()

    if (!user) {
      return { success: false, error: "bookings.errors.userNotFound" }
    }

    // Get active treatments
    const treatments = await Treatment.find({ isActive: true })
      .select("name description durations pricingType fixedPrice category")
      .lean()

    // Get user's active subscriptions
    const userSubscriptions = await UserSubscription.find({
      userId: new mongoose.Types.ObjectId(userId),
      status: "active",
      remainingQuantity: { $gt: 0 },
    })
      .populate("subscriptionId", "name description")
      .populate("treatmentId", "name pricingType")
      .lean()

    // Get user's active gift vouchers
    const giftVouchers = await GiftVoucher.find({
      recipientUserId: new mongoose.Types.ObjectId(userId),
      isActive: true,
      $or: [{ expiryDate: { $gte: new Date() } }, { expiryDate: { $exists: false } }],
    })
      .select("code voucherType amount remainingAmount treatmentId description")
      .lean()

    // Get active coupons
    const coupons = await Coupon.find({
      isActive: true,
      $or: [{ validUntil: { $gte: new Date() } }, { validUntil: { $exists: false } }],
    })
      .select("code discountType discountValue description")
      .lean()

    return {
      success: true,
      data: {
        user,
        treatments,
        userSubscriptions,
        giftVouchers,
        coupons,
        surcharges: [
          {
            type: "evening",
            name: "????? ???",
            amount: 20,
            description: "????? ???? ????? ????? ????",
          },
          {
            type: "weekend",
            name: "????? ??? ????",
            amount: 30,
            description: "????? ???? ????? ???? ?????",
          },
          { type: "holiday", name: "????? ??", amount: 50, description: "????? ???? ????? ???" },
        ],
      },
    }
  } catch (error) {
    logger.error("Error fetching booking initial data:", { error, userId })
    return { success: false, error: "common.unknown" }
  }
}

/**
 * Update booking status after payment confirmation
 */
export async function updateBookingStatusAfterPayment(
  bookingId: string,
  paymentStatus: "paid" | "failed",
  transactionId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await dbConnect()

    const booking = await Booking.findById(bookingId)
    if (!booking) {
      return { success: false, error: "bookings.errors.bookingNotFound" }
    }

    if (paymentStatus === "paid") {
      booking.paymentDetails.paymentStatus = "paid"
      booking.paymentDetails.transactionId = transactionId
      booking.status = "in_process"
    } else {
      booking.paymentDetails.paymentStatus = "failed"
      booking.status = "cancelled"
      booking.cancellationReason = "Payment failed"
    }

    await booking.save()

    // Revalidate relevant paths
    revalidatePath("/dashboard/member/bookings")
    revalidatePath("/dashboard/admin/bookings")

    logger.info("Booking status updated after payment", {
      bookingId,
      paymentStatus,
      newStatus: booking.status,
    })

    return { success: true }
  } catch (error) {
    logger.error("Error updating booking status after payment:", {
      error,
      bookingId,
      paymentStatus,
    })
    return { success: false, error: "common.unknown" }
  }
}

/**
 * Professional accept booking (legacy function)
 */
export async function professionalAcceptBooking(
  bookingId: string,
  professionalId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("professional")) {
      return { success: false, error: "common.unauthorized" }
    }

    if (session.user.id !== professionalId) {
      return { success: false, error: "common.unauthorized" }
    }

    await dbConnect()

    const booking = await Booking.findById(bookingId)
    if (!booking) {
      return { success: false, error: "bookings.errors.bookingNotFound" }
    }

    if (booking.status !== "in_process") {
      return { success: false, error: "bookings.errors.bookingNotAvailableForAcceptance" }
    }

    booking.professionalId = new mongoose.Types.ObjectId(professionalId)
    booking.status = "confirmed"
    await booking.save()

    // Revalidate relevant paths
    revalidatePath("/dashboard/professional/bookings")
    revalidatePath("/dashboard/admin/bookings")

    logger.info("Booking accepted by professional", { bookingId, professionalId })

    return { success: true }
  } catch (error) {
    logger.error("Error accepting booking:", { error, bookingId, professionalId })
    return { success: false, error: "common.unknown" }
  }
}

/**
 * Find suitable professionals for a booking
 */
export async function findSuitableProfessionals(
  treatmentId: string,
  bookingDateTime: Date,
  addressCity: string
): Promise<{
  success: boolean
  professionals?: any[]
  error?: string
}> {
  try {
    await dbConnect()

    // Get treatment to check requirements
    const treatment = await Treatment.findById(treatmentId).lean()
    if (!treatment) {
      return { success: false, error: "bookings.errors.treatmentNotFound" }
    }

    // Find professionals who can perform this treatment
    const professionals = await User.find({
      roles: "professional",
      isActive: true,
      "professionalProfile.isAvailable": true,
      "professionalProfile.serviceAreas": { $in: [addressCity] },
      "professionalProfile.specializations": { $in: [treatment.category] },
    })
      .select("name phone professionalProfile")
      .lean()

    // Filter by availability (basic check - would need more sophisticated logic)
    const availableProfessionals = professionals.filter(prof => {
      // Basic availability check - in production this would check actual calendar
      return (prof as any).professionalProfile?.workingHours?.some((schedule: any) => {
        const bookingDay = bookingDateTime.getDay()
        const bookingHour = bookingDateTime.getHours()

        return (
          schedule.dayOfWeek === bookingDay &&
          bookingHour >= schedule.startHour &&
          bookingHour < schedule.endHour
        )
      })
    })

    return {
      success: true,
      professionals: availableProfessionals,
    }
  } catch (error) {
    logger.error("Error finding suitable professionals:", {
      error,
      treatmentId,
      bookingDateTime,
      addressCity,
    })
    return { success: false, error: "common.unknown" }
  }
}

/**
 * Get suitable professionals for existing booking
 */
export async function getSuitableProfessionalsForBooking(bookingId: string): Promise<{
  success: boolean
  professionals?: any[]
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, error: "common.unauthorized" }
    }

    await dbConnect()

    const booking = await Booking.findById(bookingId).populate("treatmentId").lean()

    if (!booking) {
      return { success: false, error: "bookings.errors.bookingNotFound" }
    }

    const addressCity = booking.bookingAddressSnapshot?.city || ""

    return await findSuitableProfessionals(
      booking.treatmentId.toString(),
      booking.bookingDateTime,
      addressCity
    )
  } catch (error) {
    logger.error("Error getting suitable professionals for booking:", {
      error,
      bookingId,
    })
    return { success: false, error: "common.unknown" }
  }
}

/**
 * Send notification to suitable professionals
 */
export async function sendNotificationToSuitableProfessionals(
  bookingId: string
): Promise<{ success: boolean; notifiedCount?: number; error?: string }> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, error: "common.unauthorized" }
    }

    const { success, professionals, error } = await getSuitableProfessionalsForBooking(bookingId)

    if (!success || !professionals) {
      return { success: false, error: error || "No suitable professionals found" }
    }

    // In production, this would send actual notifications (SMS, email, push)
    // For now, we'll just log the notification
    let notifiedCount = 0

    for (const professional of professionals) {
      try {
        // Placeholder for actual notification sending
        logger.info("Notification sent to professional", {
          bookingId,
          professionalId: professional._id,
          professionalName: professional.name,
        })
        notifiedCount++
      } catch (notificationError) {
        logger.error("Failed to notify professional:", {
          error: notificationError,
          professionalId: professional._id,
        })
      }
    }

    return { success: true, notifiedCount }
  } catch (error) {
    logger.error("Error sending notifications to professionals:", { error, bookingId })
    return { success: false, error: "common.unknown" }
  }
}

/**
 * Get available professionals (simplified version)
 */
export async function getAvailableProfessionals(): Promise<{
  success: boolean
  professionals?: any[]
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, error: "common.unauthorized" }
    }

    await dbConnect()

    const professionals = await User.find({
      roles: "professional",
      isActive: true,
      "professionalProfile.isAvailable": true,
    })
      .select("name email phone professionalProfile")
      .lean()

    return {
      success: true,
      professionals,
    }
  } catch (error) {
    logger.error("Error getting available professionals:", error)
    return { success: false, error: "common.unknown" }
  }
}
