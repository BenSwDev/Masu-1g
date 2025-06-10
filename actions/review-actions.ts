"use server"

import { revalidatePath } from "next/cache"
import { connectToDatabase } from "@/lib/db/mongodb"
import Review from "@/lib/db/models/review"
import Booking from "@/lib/db/models/booking"
import type { CreateReviewData, UpdateReviewData, ReviewFilters, PopulatedReview } from "@/types/review"
import { auth } from "@/lib/auth"
import { getUserFromSession } from "@/lib/auth/session"

/**
 * יצירת חוות דעת חדשה
 */
export async function createReview(data: CreateReviewData) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new Error("User not authenticated")
    }

    await connectToDatabase()

    // בדיקה שההזמנה קיימת ושהיא הושלמה
    const booking = await Booking.findById(data.bookingId)
      .populate("professionalId", "_id")
      .populate("treatmentId", "_id")

    if (!booking) {
      throw new Error("Booking not found")
    }

    if (booking.status !== "completed") {
      throw new Error("Can only review completed treatments")
    }

    if (booking.userId.toString() !== session.user.id) {
      throw new Error("Not authorized to review this booking")
    }

    // בדיקה שעוד לא קיימת חוות דעת להזמנה זו
    const existingReview = await Review.findOne({ bookingId: data.bookingId })
    if (existingReview) {
      throw new Error("Review already exists for this booking")
    }

    // יצירת חוות הדעת
    const review = new Review({
      bookingId: data.bookingId,
      userId: session.user.id,
      professionalId: booking.professionalId._id,
      treatmentId: booking.treatmentId._id,
      rating: data.rating,
      comment: data.comment
    })

    await review.save()

    revalidatePath("/dashboard/member/reviews")
    revalidatePath("/dashboard/member/bookings")
    revalidatePath("/dashboard/admin/reviews")

    return { success: true, reviewId: review._id.toString() }
  } catch (error) {
    console.error("Error creating review:", error)
    throw new Error(error instanceof Error ? error.message : "Failed to create review")
  }
}

/**
 * עדכון תגובת מטפל לחוות דעת
 */
export async function updateReviewResponse(reviewId: string, data: UpdateReviewData) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new Error("User not authenticated")
    }

    const user = await getUserFromSession()
    if (user.role !== "admin") {
      throw new Error("Not authorized")
    }

    await connectToDatabase()

    const review = await Review.findByIdAndUpdate(
      reviewId,
      { professionalResponse: data.professionalResponse },
      { new: true, runValidators: true }
    )

    if (!review) {
      throw new Error("Review not found")
    }

    revalidatePath("/dashboard/admin/reviews")

    return { success: true }
  } catch (error) {
    console.error("Error updating review response:", error)
    throw new Error(error instanceof Error ? error.message : "Failed to update review response")
  }
}

/**
 * קבלת כל חוות הדעת (למנהל)
 */
export async function getAllReviews(filters: ReviewFilters = {}) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new Error("User not authenticated")
    }

    const user = await getUserFromSession()
    if (user.role !== "admin") {
      throw new Error("Not authorized")
    }

    await connectToDatabase()

    const page = filters.page || 1
    const limit = filters.limit || 20
    const skip = (page - 1) * limit

    // בניית query עבור חיפוש וסינון
    const query: any = {}

    // סינון לפי דירוג
    if (filters.rating) {
      query.rating = filters.rating
    }

    // סינון לפי תגובת מטפל
    if (filters.hasResponse !== undefined) {
      if (filters.hasResponse) {
        query.professionalResponse = { $exists: true, $ne: "" }
      } else {
        query.$or = [
          { professionalResponse: { $exists: false } },
          { professionalResponse: "" }
        ]
      }
    }

    // קבלת חוות הדעת עם populate
    const reviews = await Review.find(query)
      .populate({
        path: "bookingId",
        select: "bookingNumber bookingDateTime status bookedByUserName bookedByUserEmail bookedByUserPhone recipientName recipientPhone recipientEmail"
      })
      .populate({
        path: "userId",
        select: "name email phone"
      })
      .populate({
        path: "professionalId", 
        select: "name email phone"
      })
      .populate({
        path: "treatmentId",
        select: "name duration"
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    // סינון נוסף לפי חיפוש טקסט
    let filteredReviews = reviews
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filteredReviews = reviews.filter((review: any) => 
        review.bookingId?.bookingNumber?.toLowerCase().includes(searchTerm) ||
        review.userId?.name?.toLowerCase().includes(searchTerm) ||
        review.professionalId?.name?.toLowerCase().includes(searchTerm) ||
        review.treatmentId?.name?.toLowerCase().includes(searchTerm) ||
        review.comment?.toLowerCase().includes(searchTerm)
      )
    }

    // ספירת סה"כ תוצאות
    const totalReviews = await Review.countDocuments(query)
    const totalPages = Math.ceil(totalReviews / limit)

    return {
      reviews: filteredReviews as PopulatedReview[],
      totalPages,
      totalReviews,
      currentPage: page
    }
  } catch (error) {
    console.error("Error fetching reviews:", error)
    throw new Error(error instanceof Error ? error.message : "Failed to fetch reviews")
  }
}

/**
 * קבלת חוות הדעת של משתמש ספציפי
 */
export async function getUserReviews(filters: ReviewFilters = {}) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new Error("User not authenticated")
    }

    await connectToDatabase()

    const page = filters.page || 1
    const limit = filters.limit || 20
    const skip = (page - 1) * limit

    const query: any = { userId: session.user.id }

    // סינון לפי דירוג
    if (filters.rating) {
      query.rating = filters.rating
    }

    const reviews = await Review.find(query)
      .populate({
        path: "bookingId",
        select: "bookingNumber bookingDateTime"
      })
      .populate({
        path: "professionalId",
        select: "name" // רק שם המטפל ללקוח
      })
      .populate({
        path: "treatmentId", 
        select: "name duration"
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const totalReviews = await Review.countDocuments(query)
    const totalPages = Math.ceil(totalReviews / limit)

    return {
      reviews: reviews as PopulatedReview[],
      totalPages,
      totalReviews,
      currentPage: page
    }
  } catch (error) {
    console.error("Error fetching user reviews:", error)
    throw new Error(error instanceof Error ? error.message : "Failed to fetch user reviews")
  }
}

/**
 * קבלת חוות דעת לפי ID הזמנה
 */
export async function getReviewByBookingId(bookingId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new Error("User not authenticated")
    }

    await connectToDatabase()

    const review = await Review.findOne({ bookingId })
      .populate({
        path: "bookingId",
        select: "bookingNumber bookingDateTime"
      })
      .populate({
        path: "professionalId",
        select: "name"
      })
      .populate({
        path: "treatmentId",
        select: "name duration"
      })
      .lean()

    return review as PopulatedReview | null
  } catch (error) {
    console.error("Error fetching review by booking ID:", error)
    throw new Error(error instanceof Error ? error.message : "Failed to fetch review")
  }
}

/**
 * קבלת הזמנות שהושלמו ללא חוות דעת
 */
export async function getCompletedBookingsWithoutReviews() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new Error("User not authenticated")
    }

    await connectToDatabase()

    // קבלת כל ההזמנות שהושלמו של המשתמש
    const completedBookings = await Booking.find({
      userId: session.user.id,
      status: "completed"
    })
    .populate("treatmentId", "name duration")
    .populate("professionalId", "name")
    .sort({ bookingDateTime: -1 })
    .lean()

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

    return bookingsWithoutReviews
  } catch (error) {
    console.error("Error fetching completed bookings without reviews:", error)
    throw new Error(error instanceof Error ? error.message : "Failed to fetch bookings")
  }
} 