"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import Booking, { type IBooking, type BookingStatus } from "@/lib/db/models/booking"
import User, { type IUser, UserRole } from "@/lib/db/models/user"
import Review, { type IReview } from "@/lib/db/models/review"
import { logger } from "@/lib/logs/logger"
import type { PopulatedBooking } from "@/types/booking"
import { Types } from "mongoose"
import { unifiedNotificationService } from "@/lib/notifications/unified-notification-service"
import type { NotificationRecipient } from "@/lib/notifications/notification-types"

export interface GetAllBookingsFilters {
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
}

export interface GetAllBookingsResult {
  bookings: PopulatedBooking[]
  totalPages: number
  totalBookings: number
}

export interface UpdateBookingResult {
  success: boolean
  error?: string
  booking?: IBooking
}

export interface AssignProfessionalResult {
  success: boolean
  error?: string
  booking?: IBooking
}

export interface GetAvailableProfessionalsResult {
  success: boolean
  professionals?: Array<{
    _id: string
    firstName: string
    lastName: string
    email: string
    phone: string
    isActive: boolean
  }>
  error?: string
}

export interface CancelBookingResult {
  success: boolean
  error?: string
  booking?: IBooking
}

export interface RefundBookingResult {
  success: boolean
  error?: string
  booking?: IBooking
}

export interface GetBookingDetailsResult {
  success: boolean
  booking?: PopulatedBooking
  error?: string
}

export interface GetSuitableProfessionalsResult {
  success: boolean
  professionals?: Array<{
    _id: string
    firstName: string
    lastName: string
    email: string
    phone: string
    isActive: boolean
    gender?: string
  }>
  error?: string
}

export interface SendReviewReminderResult {
  success: boolean
  error?: string
}

export interface GetBookingReviewResult {
  success: boolean
  review?: {
    _id: string
    rating: number
    comment: string
    createdAt: Date
    updatedAt: Date
  }
  error?: string
}

/**
 * Gets all bookings with optional filters
 * @param filters Optional filters for bookings
 * @returns GetAllBookingsResult
 */
export async function getAllBookings(filters: GetAllBookingsFilters = {}): Promise<GetAllBookingsResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      throw new Error("Unauthorized")
    }

    await dbConnect()

    const {
      status,
      professional,
      treatment,
      dateRange,
      priceRange,
      address,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortDirection = "desc",
      search,
    } = filters

    const query: Record<string, unknown> = {}

    // Add filters to query
    if (status) query.status = status
    if (professional) query.professionalId = new Types.ObjectId(professional)
    if (treatment) query.treatmentId = new Types.ObjectId(treatment)
    if (address) query["addressSnapshot.fullAddress"] = { $regex: address, $options: "i" }

    // Handle date range filter
    if (dateRange) {
      const [startDate, endDate] = dateRange.split(",")
      if (startDate && endDate) {
        query.bookingDateTime = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        }
      }
    }

    // Handle price range filter
    if (priceRange) {
      const [minPrice, maxPrice] = priceRange.split(",")
      if (minPrice && maxPrice) {
        query["priceDetails.finalAmount"] = {
          $gte: Number(minPrice),
          $lte: Number(maxPrice),
        }
      }
    }

    // Handle search
    if (search) {
      query.$or = [
        { "recipientName": { $regex: search, $options: "i" } },
        { "recipientPhone": { $regex: search, $options: "i" } },
        { "recipientEmail": { $regex: search, $options: "i" } },
        { "addressSnapshot.fullAddress": { $regex: search, $options: "i" } },
        { "bookingNumber": { $regex: search, $options: "i" } },
      ]
    }

    // Get total count for pagination
    const totalBookings = await Booking.countDocuments(query)
    const totalPages = Math.ceil(totalBookings / limit)

    // Get bookings with pagination and sorting
    const bookings = await Booking.find(query)
      .sort({ [sortBy]: sortDirection === "desc" ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("treatmentId")
      .populate("professionalId")
      .populate("userId")
      .populate("priceDetails.appliedCouponId")
      .populate("priceDetails.appliedGiftVoucherId")
      .populate("priceDetails.redeemedUserSubscriptionId")
      .populate("paymentDetails.paymentMethodId")
      .lean()

    return {
      bookings: bookings.map(booking => ({
        ...booking,
        _id: new Types.ObjectId(booking._id.toString()),
        treatmentId: booking.treatmentId ? {
          ...booking.treatmentId,
          _id: new Types.ObjectId(booking.treatmentId._id.toString()),
        } : null,
        professionalId: booking.professionalId ? {
          ...booking.professionalId,
          _id: new Types.ObjectId(booking.professionalId._id.toString()),
        } : null,
        userId: booking.userId ? {
          ...booking.userId,
          _id: new Types.ObjectId(booking.userId._id.toString()),
        } : null,
      })) as unknown as PopulatedBooking[],
      totalPages,
      totalBookings,
    }
  } catch (error) {
    logger.error("Error fetching all bookings:", error)
    throw error
  }
}

/**
 * Gets detailed information about a specific booking
 * @param bookingId The ID of the booking to get details for
 * @returns GetBookingDetailsResult
 */
export async function getBookingDetails(bookingId: string): Promise<GetBookingDetailsResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const booking = await Booking.findById(bookingId)
      .populate("treatmentId")
      .populate("professionalId")
      .populate("userId")
      .populate("priceDetails.appliedCouponId")
      .populate("priceDetails.appliedGiftVoucherId")
      .populate("priceDetails.redeemedUserSubscriptionId")
      .populate("paymentDetails.paymentMethodId")
      .lean()

    if (!booking) {
      return { success: false, error: "Booking not found" }
    }

    return {
      success: true,
      booking: {
        ...booking,
        _id: new Types.ObjectId(booking._id.toString()),
        treatmentId: booking.treatmentId ? {
          ...booking.treatmentId,
          _id: new Types.ObjectId(booking.treatmentId._id.toString()),
        } : null,
        professionalId: booking.professionalId ? {
          ...booking.professionalId,
          _id: new Types.ObjectId(booking.professionalId._id.toString()),
        } : null,
        userId: booking.userId ? {
          ...booking.userId,
          _id: new Types.ObjectId(booking.userId._id.toString()),
        } : null,
      } as unknown as PopulatedBooking,
    }
  } catch (error) {
    logger.error("Error fetching booking details:", error)
    return { success: false, error: "Failed to fetch booking details" }
  }
}

/**
 * Updates a booking by admin
 * @param bookingId The ID of the booking to update
 * @param updates The updates to apply to the booking
 * @returns UpdateBookingResult
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
): Promise<UpdateBookingResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const booking = await Booking.findById(bookingId)
    if (!booking) {
      return { success: false, error: "Booking not found" }
    }

    // Apply updates
    if (updates.status) booking.status = updates.status
    if (updates.bookingDateTime) booking.bookingDateTime = updates.bookingDateTime
    if (updates.recipientName) booking.recipientName = updates.recipientName
    if (updates.recipientPhone) booking.recipientPhone = updates.recipientPhone
    if (updates.recipientEmail) booking.recipientEmail = updates.recipientEmail
    if (updates.notes) booking.notes = updates.notes
    if (updates.professionalId) booking.professionalId = new Types.ObjectId(updates.professionalId)
    if (updates.paymentStatus) booking.paymentDetails.paymentStatus = updates.paymentStatus

    await booking.save()
    revalidatePath("/dashboard/admin/bookings")

    return { success: true, booking }
  } catch (error) {
    logger.error("Error updating booking:", error)
    return { success: false, error: "Failed to update booking" }
  }
}

/**
 * Assigns a professional to a booking
 * @param bookingId The ID of the booking
 * @param professionalId The ID of the professional to assign
 * @returns AssignProfessionalResult
 */
export async function assignProfessionalToBooking(
  bookingId: string,
  professionalId: string,
): Promise<AssignProfessionalResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const [booking, professional] = await Promise.all([
      Booking.findById(bookingId),
      User.findOne({ _id: professionalId, roles: UserRole.PROFESSIONAL }),
    ])

    if (!booking) {
      return { success: false, error: "Booking not found" }
    }

    if (!professional) {
      return { success: false, error: "Professional not found" }
    }

    booking.professionalId = new Types.ObjectId(professionalId)
    await booking.save()
    revalidatePath("/dashboard/admin/bookings")

    return { success: true, booking }
  } catch (error) {
    logger.error("Error assigning professional to booking:", error)
    return { success: false, error: "Failed to assign professional" }
  }
}

/**
 * Cancels a booking
 * @param bookingId The ID of the booking to cancel
 * @param reason The reason for cancellation
 * @returns CancelBookingResult
 */
export async function cancelBooking(
  bookingId: string,
  reason: string,
): Promise<CancelBookingResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const booking = await Booking.findById(bookingId)
    if (!booking) {
      return { success: false, error: "Booking not found" }
    }

    if (booking.status === "cancelled" || booking.status === "refunded") {
      return { success: false, error: "Booking is already cancelled or refunded" }
    }

    booking.status = "cancelled"
    booking.cancellationReason = reason
    booking.cancelledBy = "admin"
    await booking.save()
    revalidatePath("/dashboard/admin/bookings")

    return { success: true, booking }
  } catch (error) {
    logger.error("Error cancelling booking:", error)
    return { success: false, error: "Failed to cancel booking" }
  }
}

/**
 * Refunds a booking
 * @param bookingId The ID of the booking to refund
 * @param refundAmount The amount to refund
 * @param refundTransactionId The transaction ID for the refund
 * @returns RefundBookingResult
 */
export async function refundBooking(
  bookingId: string,
  refundAmount: number,
  refundTransactionId: string,
): Promise<RefundBookingResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const booking = await Booking.findById(bookingId)
    if (!booking) {
      return { success: false, error: "Booking not found" }
    }

    if (booking.status === "refunded") {
      return { success: false, error: "Booking is already refunded" }
    }

    if (booking.paymentDetails.paymentStatus !== "paid") {
      return { success: false, error: "Booking is not paid" }
    }

    booking.status = "refunded"
    booking.refundAmount = refundAmount
    booking.refundTransactionId = refundTransactionId
    await booking.save()
    revalidatePath("/dashboard/admin/bookings")

    return { success: true, booking }
  } catch (error) {
    logger.error("Error refunding booking:", error)
    return { success: false, error: "Failed to refund booking" }
  }
}

/**
 * Gets all available professionals for booking assignment
 * @returns GetAvailableProfessionalsResult
 */
export async function getAvailableProfessionals(): Promise<GetAvailableProfessionalsResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const professionals = await User.find({
      roles: UserRole.PROFESSIONAL,
      isActive: true,
    })
      .select("name email phone")
      .lean()

    return {
      success: true,
      professionals: professionals.map(prof => {
        const [firstName, ...lastNameParts] = prof.name.split(" ")
        const lastName = lastNameParts.join(" ")
        return {
          _id: prof._id.toString(),
          firstName,
          lastName,
          email: prof.email,
          phone: prof.phone || "",
          isActive: true,
        }
      }),
    }
  } catch (error) {
    logger.error("Error fetching available professionals:", error)
    return { success: false, error: "Failed to fetch professionals" }
  }
}

/**
 * Gets all suitable professionals for a booking based on treatment and preferences
 * @param bookingId The ID of the booking
 * @returns GetSuitableProfessionalsResult
 */
export async function getSuitableProfessionals(bookingId: string): Promise<GetSuitableProfessionalsResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const booking = await Booking.findById(bookingId)
      .populate("treatmentId")
      .lean()

    if (!booking) {
      return { success: false, error: "Booking not found" }
    }

    // Get all active professionals
    const professionals = await User.find({
      roles: UserRole.PROFESSIONAL,
      isActive: true,
      // If there's a gender preference, filter by it
      ...(booking.therapistGenderPreference !== "any" && {
        gender: booking.therapistGenderPreference,
      }),
    })
      .select("name email phone gender")
      .lean()

    return {
      success: true,
      professionals: professionals.map(prof => {
        const [firstName, ...lastNameParts] = prof.name.split(" ")
        const lastName = lastNameParts.join(" ")
        return {
          _id: prof._id.toString(),
          firstName,
          lastName,
          email: prof.email,
          phone: prof.phone || "",
          isActive: true,
          gender: prof.gender,
        }
      }),
    }
  } catch (error) {
    logger.error("Error fetching suitable professionals:", error)
    return { success: false, error: "Failed to fetch suitable professionals" }
  }
}

/**
 * Removes professional assignment from a booking
 * @param bookingId The ID of the booking
 * @returns UpdateBookingResult
 */
export async function removeProfessionalAssignment(bookingId: string): Promise<UpdateBookingResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const booking = await Booking.findById(bookingId)
    if (!booking) {
      return { success: false, error: "Booking not found" }
    }

    if (!booking.professionalId) {
      return { success: false, error: "Booking has no assigned professional" }
    }

    booking.professionalId = undefined
    await booking.save()
    revalidatePath("/dashboard/admin/bookings")

    return { success: true, booking }
  } catch (error) {
    logger.error("Error removing professional assignment:", error)
    return { success: false, error: "Failed to remove professional assignment" }
  }
}

/**
 * Sends notifications to all suitable professionals for a booking
 * @param bookingId The ID of the booking
 * @returns SendReviewReminderResult
 */
export async function notifySuitableProfessionals(bookingId: string): Promise<SendReviewReminderResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const booking = await Booking.findById(bookingId)
      .populate("treatmentId")
      .lean()

    if (!booking) {
      return { success: false, error: "Booking not found" }
    }

    if (booking.professionalId) {
      return { success: false, error: "Booking already has an assigned professional" }
    }

    // Get all suitable professionals
    const professionals = await User.find({
      roles: UserRole.PROFESSIONAL,
      isActive: true,
      ...(booking.therapistGenderPreference !== "any" && {
        gender: booking.therapistGenderPreference,
      }),
    })
      .select("email phone name")
      .lean()

    // Send notifications to all professionals
    const notificationPromises = professionals.map(professional => {
      const recipients: NotificationRecipient[] = []
      
      if (professional.email) {
        recipients.push({
          type: "email",
          value: professional.email,
          name: professional.name,
          language: "en"
        })
      }
      
      if (professional.phone) {
        recipients.push({
          type: "phone",
          value: professional.phone,
          language: "en"
        })
      }

      if (recipients.length === 0) {
        return Promise.resolve({ success: false, error: "No contact information available" })
      }

      return unifiedNotificationService.sendNotificationToMultiple(
        recipients,
        {
          type: "professional-booking-notification",
          treatmentName: (booking.treatmentId as any).name,
          bookingDateTime: booking.bookingDateTime,
          address: booking.bookingAddressSnapshot?.fullAddress || "",
          price: booking.priceDetails?.finalAmount || 0,
          responseLink: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/professional/bookings/${booking._id}`
        }
      )
    })

    const results = await Promise.all(notificationPromises)
    const allSuccessful = results.every(result => 
      Array.isArray(result) ? result.every(r => r.success) : result.success
    )

    return { success: allSuccessful }
  } catch (error) {
    logger.error("Error sending notifications to professionals:", error)
    return { success: false, error: "Failed to send notifications" }
  }
}

/**
 * Sends a review reminder for a completed booking
 * @param bookingId The ID of the booking
 * @returns SendReviewReminderResult
 */
export async function sendReviewReminder(bookingId: string): Promise<SendReviewReminderResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const booking = await Booking.findById(bookingId)
      .populate("treatmentId")
      .populate("professionalId")
      .populate("userId")
      .lean()

    if (!booking) {
      return { success: false, error: "Booking not found" }
    }

    if (booking.status !== "completed") {
      return { success: false, error: "Booking is not completed" }
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ bookingId: booking._id })
    if (existingReview) {
      return { success: false, error: "Review already exists" }
    }

    // Get user contact information
    const user = await User.findById(booking.userId)
      .select("email phone name")
      .lean()

    if (!user) {
      return { success: false, error: "User not found" }
    }

    // Prepare recipients
    const recipients: NotificationRecipient[] = []
    
    if (user.email) {
      recipients.push({
        type: "email",
        value: user.email,
        name: user.name,
        language: "en"
      })
    }
    
    if (user.phone) {
      recipients.push({
        type: "phone",
        value: user.phone,
        language: "en"
      })
    }

    if (recipients.length === 0) {
      return { success: false, error: "No contact information available for user" }
    }

    // Send review reminder notification
    const results = await unifiedNotificationService.sendNotificationToMultiple(
      recipients,
      {
        type: "review-reminder",
        recipientName: user.name,
        reviewLink: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/member/bookings/${booking._id}/review`
      }
    )

    const allSuccessful = results.every(result => result.success)

    if (allSuccessful) {
      // Update booking with reminder sent timestamp
      await Booking.findByIdAndUpdate(bookingId, {
        reviewReminderSentAt: new Date(),
      })
    }

    return { success: allSuccessful }
  } catch (error) {
    logger.error("Error sending review reminder:", error)
    return { success: false, error: "Failed to send review reminder" }
  }
}

/**
 * Gets the review for a booking if it exists
 * @param bookingId The ID of the booking
 * @returns GetBookingReviewResult
 */
export async function getBookingReview(bookingId: string): Promise<GetBookingReviewResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const review = await Review.findOne({ bookingId: new Types.ObjectId(bookingId) })
      .select("rating comment createdAt updatedAt")
      .lean()

    if (!review) {
      return { success: false, error: "No review found" }
    }

    return {
      success: true,
      review: {
        _id: review._id.toString(),
        rating: review.rating,
        comment: review.comment || "",
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
      },
    }
  } catch (error) {
    logger.error("Error fetching booking review:", error)
    return { success: false, error: "Failed to fetch review" }
  }
} 