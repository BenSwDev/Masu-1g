"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import Booking from "@/lib/db/models/booking"
import Review from "@/lib/db/models/review"
import { automaticReviewService } from "@/lib/services/automatic-review-service"
import { logger } from "@/lib/logs/logger"

export interface ReviewManagementStats {
  totalCompletedBookings: number
  bookingsWithReviews: number
  bookingsPendingReview: number
  reviewRequestsSent: number
  reviewResponseRate: number
  averageRating: number
  reminderStats: {
    firstRemindersSent: number
    secondRemindersSent: number
    finalRemindersSent: number
  }
}

export interface BookingWithoutReview {
  _id: string
  bookingNumber: string
  treatmentName: string
  clientName: string
  clientEmail: string
  clientPhone: string
  professionalName?: string
  bookingDateTime: Date
  treatmentCompletedAt?: Date
  reviewRequestSentAt?: Date
  status: string
  finalAmount: number
}

/**
 * קבלת סטטיסטיקות חוות דעת מפורטות
 */
export async function getReviewManagementStats(): Promise<ReviewManagementStats> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      throw new Error("Unauthorized")
    }

    const stats = await automaticReviewService.getReviewStatistics()
    return stats
  } catch (error) {
    logger.error("Error getting review management stats:", error)
    throw new Error("שגיאה בקבלת סטטיסטיקות")
  }
}

/**
 * קבלת רשימת הזמנות ללא חוות דעת
 */
export async function getBookingsWithoutReviews(
  page: number = 1,
  limit: number = 20,
  searchTerm?: string
): Promise<{
  bookings: BookingWithoutReview[]
  totalPages: number
  totalBookings: number
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      throw new Error("Unauthorized")
    }

    await dbConnect()

    const skip = (page - 1) * limit

    // Build search filter
    const searchFilter = searchTerm ? {
      $or: [
        { bookingNumber: { $regex: searchTerm, $options: "i" } },
        { "treatmentId.name": { $regex: searchTerm, $options: "i" } },
        { "userId.name": { $regex: searchTerm, $options: "i" } },
        { "userId.email": { $regex: searchTerm, $options: "i" } }
      ]
    } : {}

    // Get bookings without reviews
    const pipeline: any[] = [
      {
        $match: {
          status: { $in: ["completed", "pending_review"] },
          ...searchFilter
        }
      },
      {
        $lookup: {
          from: "reviews",
          localField: "_id",
          foreignField: "bookingId",
          as: "reviews"
        }
      },
      {
        $match: {
          "reviews.0": { $exists: false }
        }
      },
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
          localField: "userId",
          foreignField: "_id",
          as: "userId"
        }
      },
      { $unwind: "$userId" },
      {
        $lookup: {
          from: "users",
          localField: "professionalId",
          foreignField: "_id",
          as: "professionalId"
        }
      },
      {
        $project: {
          _id: 1,
          bookingNumber: 1,
          treatmentName: "$treatmentId.name",
          clientName: "$userId.name",
          clientEmail: "$userId.email",
          clientPhone: "$userId.phone",
          professionalName: { $arrayElemAt: ["$professionalId.name", 0] },
          bookingDateTime: 1,
          treatmentCompletedAt: 1,
          reviewRequestSentAt: 1,
          status: 1,
          finalAmount: "$priceDetails.finalAmount"
        }
      },
      { $sort: { treatmentCompletedAt: -1, bookingDateTime: -1 } },
      { $skip: skip },
      { $limit: limit }
    ]

    const [bookings, totalCount] = await Promise.all([
      Booking.aggregate(pipeline),
      Booking.aggregate([
        ...pipeline.slice(0, -3), // Remove skip, limit, and sort
        { $count: "total" }
      ])
    ])

    const totalBookings = totalCount.length > 0 ? totalCount[0].total : 0
    const totalPages = Math.ceil(totalBookings / limit)

    return {
      bookings,
      totalPages,
      totalBookings
    }
  } catch (error) {
    logger.error("Error getting bookings without reviews:", error)
    throw new Error("שגיאה בקבלת הזמנות")
  }
}

/**
 * שליחת בקשת חוות דעת ידנית
 */
export async function sendManualReviewRequest(
  bookingId: string,
  forceResend = false
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, message: "Unauthorized" }
    }

    const result = await automaticReviewService.sendManualReviewRequest(bookingId, forceResend)
    
    if (result.success) {
      revalidatePath("/dashboard/admin/reviews")
      revalidatePath("/dashboard/admin/bookings")
    }

    return result
  } catch (error) {
    logger.error("Error sending manual review request:", error)
    return { success: false, message: "שגיאה בשליחת בקשת חוות דעת" }
  }
}

/**
 * שליחת תזכורת לחוות דעת ידנית
 */
export async function sendManualReviewReminder(
  bookingId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, message: "Unauthorized" }
    }

    const result = await automaticReviewService.sendManualReviewReminder(bookingId)
    
    if (result.success) {
      revalidatePath("/dashboard/admin/reviews")
      revalidatePath("/dashboard/admin/bookings")
    }

    return result
  } catch (error) {
    logger.error("Error sending manual review reminder:", error)
    return { success: false, message: "שגיאה בשליחת תזכורת" }
  }
}

/**
 * שליחת בקשות חוות דעת מרובות
 */
export async function sendBulkReviewRequests(
  bookingIds: string[],
  forceResend = false
): Promise<{
  success: boolean
  results: { bookingId: string; success: boolean; message: string }[]
  successCount: number
  errorCount: number
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return {
        success: false,
        results: [],
        successCount: 0,
        errorCount: 0
      }
    }

    const results = []
    let successCount = 0
    let errorCount = 0

    for (const bookingId of bookingIds) {
      try {
        const result = await automaticReviewService.sendManualReviewRequest(bookingId, forceResend)
        results.push({ bookingId, ...result })
        
        if (result.success) {
          successCount++
        } else {
          errorCount++
        }
      } catch (error) {
        results.push({
          bookingId,
          success: false,
          message: "שגיאה בשליחת בקשת חוות דעת"
        })
        errorCount++
      }
    }

    if (successCount > 0) {
      revalidatePath("/dashboard/admin/reviews")
      revalidatePath("/dashboard/admin/bookings")
    }

    return {
      success: successCount > 0,
      results,
      successCount,
      errorCount
    }
  } catch (error) {
    logger.error("Error sending bulk review requests:", error)
    return {
      success: false,
      results: [],
      successCount: 0,
      errorCount: 1
    }
  }
}

/**
 * שליחת תזכורות מרובות
 */
export async function sendBulkReviewReminders(
  bookingIds: string[]
): Promise<{
  success: boolean
  results: { bookingId: string; success: boolean; message: string }[]
  successCount: number
  errorCount: number
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return {
        success: false,
        results: [],
        successCount: 0,
        errorCount: 0
      }
    }

    const results = []
    let successCount = 0
    let errorCount = 0

    for (const bookingId of bookingIds) {
      try {
        const result = await automaticReviewService.sendManualReviewReminder(bookingId)
        results.push({ bookingId, ...result })
        
        if (result.success) {
          successCount++
        } else {
          errorCount++
        }
      } catch (error) {
        results.push({
          bookingId,
          success: false,
          message: "שגיאה בשליחת תזכורת"
        })
        errorCount++
      }
    }

    if (successCount > 0) {
      revalidatePath("/dashboard/admin/reviews")
      revalidatePath("/dashboard/admin/bookings")
    }

    return {
      success: successCount > 0,
      results,
      successCount,
      errorCount
    }
  } catch (error) {
    logger.error("Error sending bulk review reminders:", error)
    return {
      success: false,
      results: [],
      successCount: 0,
      errorCount: 1
    }
  }
}

/**
 * הפעלת תהליך התזכורות המתוזמן
 */
export async function runScheduledReviewReminders(): Promise<{
  success: boolean
  stats: {
    processed: number
    firstReminders: number
    secondReminders: number
    finalReminders: number
    errors: number
  }
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return {
        success: false,
        stats: {
          processed: 0,
          firstReminders: 0,
          secondReminders: 0,
          finalReminders: 0,
          errors: 1
        }
      }
    }

    const stats = await automaticReviewService.sendScheduledReviewReminders()
    
    if (stats.firstReminders > 0 || stats.secondReminders > 0 || stats.finalReminders > 0) {
      revalidatePath("/dashboard/admin/reviews")
      revalidatePath("/dashboard/admin/bookings")
    }

    return {
      success: true,
      stats
    }
  } catch (error) {
    logger.error("Error running scheduled review reminders:", error)
    return {
      success: false,
      stats: {
        processed: 0,
        firstReminders: 0,
        secondReminders: 0,
        finalReminders: 0,
        errors: 1
      }
    }
  }
}

/**
 * טריגר אוטומטי לחוות דעת בהשלמת הזמנה
 */
export async function triggerAutomaticReviewOnCompletion(
  bookingId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const result = await automaticReviewService.triggerReviewRequestOnCompletion(bookingId)
    
    if (result.success) {
      revalidatePath("/dashboard/admin/reviews")
      revalidatePath("/dashboard/admin/bookings")
      revalidatePath("/dashboard/member/bookings")
    }

    return result
  } catch (error) {
    logger.error("Error triggering automatic review on completion:", error)
    return { success: false, message: "שגיאה בטריגר אוטומטי" }
  }
} 