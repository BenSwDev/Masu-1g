"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import mongoose from "mongoose"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"

import Review, { type IReview } from "@/lib/db/models/review"
import Booking, { type IBooking } from "@/lib/db/models/booking"
import Treatment, { type ITreatment } from "@/lib/db/models/treatment"
import User, { type IUser } from "@/lib/db/models/user"

import { unifiedNotificationService } from "@/lib/notifications/unified-notification-service"
import type { NotificationRecipient, NotificationData } from "@/lib/notifications/notification-types"

import { logger } from "@/lib/logs/logger"
import type { CreateReviewData, UpdateReviewData, ReviewFilters, PopulatedReview } from "@/types/review"

/**
 * יצירת חוות דעת חדשה
 */
export async function createReview(data: CreateReviewData): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    // בדיקה שההזמנה קיימת ושהיא הושלמה
    const booking = await Booking.findById(data.bookingId)
      .populate("professionalId", "_id")
      .populate("treatmentId", "_id")

    if (!booking) {
      return { success: false, error: "Booking not found" }
    }

    if (booking.status !== "completed") {
      return { success: false, error: "Can only review completed treatments" }
    }

    if (booking.userId.toString() !== session.user.id) {
      return { success: false, error: "Unauthorized" }
    }

    // בדיקה שעוד לא קיימת חוות דעת להזמנה זו
    const existingReview = await Review.findOne({ bookingId: data.bookingId })
    if (existingReview) {
      return { success: false, error: "Review already exists for this booking" }
    }

    // יצירת חוות הדעת
    const review = new Review({
      bookingId: data.bookingId,
      userId: session.user.id,
      professionalId: booking.professionalId || null,
      treatmentId: booking.treatmentId,
      rating: data.rating,
      comment: data.comment || "",
    })

    await review.save()

    // Log the action
    logger.info(`Review created for booking ${data.bookingId} by user ${session.user.id}`)

    revalidatePath("/dashboard/member/reviews")
    revalidatePath("/dashboard/member/bookings")
    revalidatePath("/dashboard/admin/reviews")

    return { success: true }
  } catch (error) {
    logger.error("Error creating review:", error)
    return { success: false, error: "Failed to create review" }
  }
}

/**
 * עדכון תגובת מטפל לחוות דעת
 */
export async function updateReviewResponse(
  reviewId: string, 
  professionalResponse: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles || !session.user.roles.some(role => ["admin", "professional"].includes(role))) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const review = await Review.findById(reviewId)
    if (!review) {
      return { success: false, error: "Review not found" }
    }

    review.professionalResponse = professionalResponse
    review.updatedAt = new Date()
    await review.save()

    // Log the action
    logger.info(`Review response updated for review ${reviewId} by user ${session.user.id}`)

    revalidatePath("/dashboard/admin/reviews")
    revalidatePath("/dashboard/member/reviews")

    return { success: true }
  } catch (error) {
    logger.error("Error updating review response:", error)
    return { success: false, error: "Failed to update review response" }
  }
}

/**
 * קבלת כל חוות הדעת (למנהל)
 */
export async function getAllReviews(filters: ReviewFilters = {}): Promise<{
  reviews: PopulatedReview[]
  totalPages: number
  totalReviews: number
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles || !session.user.roles.includes("admin")) {
      throw new Error("Unauthorized")
    }

    await dbConnect()

    const page = filters.page || 1
    const limit = filters.limit || 20
    const skip = (page - 1) * limit

    // Build aggregation pipeline
    const matchStage: any = {}

    if (filters.rating) {
      matchStage.rating = filters.rating
    }

    if (filters.hasResponse !== undefined) {
      if (filters.hasResponse) {
        matchStage.professionalResponse = { $exists: true, $ne: "" }
      } else {
        matchStage.$or = [
          { professionalResponse: { $exists: false } },
          { professionalResponse: "" }
        ]
      }
    }

    if (filters.search) {
      matchStage.$or = [
        { comment: { $regex: filters.search, $options: "i" } },
        { professionalResponse: { $regex: filters.search, $options: "i" } }
      ]
    }

    const pipeline: any[] = [
      { $match: matchStage },
      {
        $lookup: {
          from: "bookings",
          localField: "bookingId",
          foreignField: "_id",
          as: "bookingId"
        }
      },
      { $unwind: "$bookingId" },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userId"
        }
      },
      { $unwind: "$userId" },
      {
        $lookup: {
          from: "treatments",
          localField: "treatmentId",
          foreignField: "_id",
          as: "treatmentId"
        }
      },
      { $unwind: "$treatmentId" },
      {
        $lookup: {
          from: "users",
          localField: "professionalId",
          foreignField: "_id",
          as: "professionalId"
        }
      },
      {
        $unwind: {
          path: "$professionalId",
          preserveNullAndEmptyArrays: true
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    ]

    const reviews = await Review.aggregate(pipeline)
    const totalReviews = await Review.countDocuments(matchStage)
    const totalPages = Math.ceil(totalReviews / limit)

    return {
      reviews: reviews as PopulatedReview[],
      totalPages,
      totalReviews
    }
  } catch (error) {
    logger.error("Error getting all reviews:", error)
    throw new Error("Failed to get reviews")
  }
}

/**
 * קבלת חוות הדעת של משתמש ספציפי
 */
export async function getUserReviews(filters: ReviewFilters = {}): Promise<{
  reviews: PopulatedReview[]
  totalPages: number
  totalReviews: number
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      throw new Error("Unauthorized")
    }

    await dbConnect()

    const page = filters.page || 1
    const limit = filters.limit || 20
    const skip = (page - 1) * limit

    // Build aggregation pipeline
    const matchStage: any = {
      userId: new mongoose.Types.ObjectId(session.user.id)
    }

    if (filters.rating) {
      matchStage.rating = filters.rating
    }

    if (filters.search) {
      matchStage.$or = [
        { comment: { $regex: filters.search, $options: "i" } },
        { professionalResponse: { $regex: filters.search, $options: "i" } }
      ]
    }

    const pipeline: any[] = [
      { $match: matchStage },
      {
        $lookup: {
          from: "bookings",
          localField: "bookingId",
          foreignField: "_id",
          as: "bookingId"
        }
      },
      { $unwind: "$bookingId" },
      {
        $lookup: {
          from: "treatments",
          localField: "treatmentId",
          foreignField: "_id",
          as: "treatmentId"
        }
      },
      { $unwind: "$treatmentId" },
      {
        $lookup: {
          from: "users",
          localField: "professionalId",
          foreignField: "_id",
          as: "professionalId"
        }
      },
      {
        $unwind: {
          path: "$professionalId",
          preserveNullAndEmptyArrays: true
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    ]

    const reviews = await Review.aggregate(pipeline)
    const totalReviews = await Review.countDocuments(matchStage)
    const totalPages = Math.ceil(totalReviews / limit)

    return {
      reviews: reviews as PopulatedReview[],
      totalPages,
      totalReviews
    }
  } catch (error) {
    logger.error("Error getting user reviews:", error)
    throw new Error("Failed to get user reviews")
  }
}

/**
 * קבלת חוות דעת לפי ID הזמנה
 */
export async function getReviewByBookingId(bookingId: string): Promise<PopulatedReview | null> {
  try {
    await dbConnect()

    const pipeline: any[] = [
      { $match: { bookingId: new mongoose.Types.ObjectId(bookingId) } },
      {
        $lookup: {
          from: "bookings",
          localField: "bookingId",
          foreignField: "_id",
          as: "bookingId"
        }
      },
      { $unwind: "$bookingId" },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userId"
        }
      },
      { $unwind: "$userId" },
      {
        $lookup: {
          from: "treatments",
          localField: "treatmentId",
          foreignField: "_id",
          as: "treatmentId"
        }
      },
      { $unwind: "$treatmentId" },
      {
        $lookup: {
          from: "users",
          localField: "professionalId",
          foreignField: "_id",
          as: "professionalId"
        }
      },
      {
        $unwind: {
          path: "$professionalId",
          preserveNullAndEmptyArrays: true
        }
      }
    ]

    const reviews = await Review.aggregate(pipeline)
    return reviews.length > 0 ? (reviews[0] as PopulatedReview) : null
  } catch (error) {
    logger.error("Error getting review by booking ID:", error)
    return null
  }
}

/**
 * קבלת הזמנות שהושלמו ללא חוות דעת
 */
export async function getCompletedBookingsWithoutReviews(): Promise<{
  bookings: any[]
  totalPages: number
  totalBookings: number
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      throw new Error("Unauthorized")
    }

    await dbConnect()

    // קבלת כל ההזמנות שהושלמו של המשתמש
    const completedBookings = await Booking.find({
      userId: session.user.id,
      status: "completed"
    }).populate("treatmentId").populate("professionalId").lean()

    // קבלת כל חוות הדעת של המשתמש
    const existingReviews = await Review.find({
      userId: session.user.id
    }).select("bookingId").lean()

    const reviewedBookingIds = new Set(
      existingReviews.map(review => review.bookingId.toString())
    )

    // סינון הזמנות שאין להן חוות דעת
    const bookingsWithoutReviews = completedBookings.filter(
      booking => !reviewedBookingIds.has(booking._id.toString())
    )

    return {
      bookings: bookingsWithoutReviews,
      totalPages: 1,
      totalBookings: bookingsWithoutReviews.length
    }
  } catch (error) {
    logger.error("Error getting completed bookings without reviews:", error)
    throw new Error("Failed to get completed bookings")
  }
}

export async function sendReviewReminder(
  bookingId: string,
  options: { sms?: boolean; email?: boolean } = {},
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const { sms = true, email = true } = options

    const booking = await Booking.findById(bookingId).populate(
      "userId",
      "name email phone notificationPreferences",
    )

    if (!booking) {
      return { success: false, error: "Booking not found" }
    }

    if (booking.status !== "completed") {
      return { success: false, error: "Booking not completed" }
    }

    const existingReview = await Review.findOne({ bookingId })
    if (existingReview) {
      return { success: false, error: "Review already exists" }
    }

    if (booking.reviewReminderSentAt) {
      return { success: false, error: "Reminder already sent" }
    }

    const lang =
      (booking.userId as any)?.notificationPreferences?.language || "he"
    const recipientName = booking.recipientName || (booking.userId as any)?.name || ""
    const reviewLink = `${process.env.NEXTAUTH_URL || ""}/dashboard/member/bookings?bookingId=${booking._id.toString()}`

    const recipients: NotificationRecipient[] = []

    if (email) {
      if (booking.recipientEmail) {
        recipients.push({ type: "email", value: booking.recipientEmail, name: recipientName, language: lang as any })
      } else if ((booking.userId as any)?.email) {
        recipients.push({ type: "email", value: (booking.userId as any).email, name: (booking.userId as any).name, language: lang as any })
      }
    }
    if (sms) {
      if (booking.recipientPhone) {
        recipients.push({ type: "phone", value: booking.recipientPhone, language: lang as any })
      } else if ((booking.userId as any)?.phone) {
        recipients.push({ type: "phone", value: (booking.userId as any).phone, language: lang as any })
      }
    }

    if (recipients.length === 0) {
      return { success: false, error: "No recipient contact" }
    }

    const data: NotificationData = {
      type: "review-reminder",
      recipientName,
      reviewLink,
    }

    await unifiedNotificationService.sendNotificationToMultiple(recipients, data)

    booking.reviewReminderSentAt = new Date()
    
    // Ensure required fields have valid values for backward compatibility
    if (!booking.treatmentCategory) {
      booking.treatmentCategory = new mongoose.Types.ObjectId()
    }
    if (typeof booking.staticTreatmentPrice !== 'number') {
      booking.staticTreatmentPrice = booking.priceDetails?.basePrice || 0
    }
    if (typeof booking.staticTherapistPay !== 'number') {
      booking.staticTherapistPay = 0
    }
    if (typeof booking.companyFee !== 'number') {
      booking.companyFee = 0
    }
    if (!booking.consents) {
      booking.consents = {
        customerAlerts: "email",
        patientAlerts: "email",
        marketingOptIn: false,
        termsAccepted: false
      }
    }
    
    await booking.save()
    revalidatePath("/dashboard/admin/bookings")

    return { success: true }
  } catch (error) {
    logger.error("Error sending review reminder:", error)
    return { success: false, error: "Failed to send review reminder" }
  }
}
