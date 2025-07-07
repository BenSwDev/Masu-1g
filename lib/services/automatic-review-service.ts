"use server"

import dbConnect from '@/lib/db/mongoose'
import Booking from '@/lib/db/models/booking'
import Review from '@/lib/db/models/review'
import { BookingNotificationService } from '@/lib/notifications/booking-notification-service'
import { logger } from '@/lib/logs/logger'

export interface ReviewRequestConfig {
  // מתי לשלוח בקשת חוות דעת אחרי השלמת הטיפול (בדקות)
  initialDelayMinutes: number
  // מתי לשלוח תזכורת ראשונה (בשעות)
  firstReminderHours: number
  // מתי לשלוח תזכורת שנייה (בימים)
  secondReminderDays: number
  // מתי לשלוח תזכורת אחרונה (בימים)
  finalReminderDays: number
}

/**
 * שירות אוטומטי לניהול בקשות חוות דעת
 * מטפל בשליחה אוטומטית של בקשות וזיכורות לחוות דעת
 */
export class AutomaticReviewService {
  private notificationService: BookingNotificationService
  private config: ReviewRequestConfig

  constructor(config?: Partial<ReviewRequestConfig>) {
    this.notificationService = new BookingNotificationService()
    this.config = {
      initialDelayMinutes: 30, // 30 דקות אחרי השלמה
      firstReminderHours: 24, // יום אחרי
      secondReminderDays: 3, // 3 ימים אחרי
      finalReminderDays: 7, // שבוע אחרי
      ...config
    }
  }

  /**
   * טריגר אוטומטי כשהזמנה מסתיימת - שליחת בקשת חוות דעת ראשונית
   */
  async triggerReviewRequestOnCompletion(bookingId: string): Promise<{ success: boolean; message: string }> {
    try {
      await dbConnect()

      const booking = await Booking.findById(bookingId)
        .populate('userId')
        .populate('professionalId')

      if (!booking) {
        return { success: false, message: "הזמנה לא נמצאה" }
      }

      if (booking.status !== "completed") {
        return { success: false, message: "ההזמנה עדיין לא הושלמה" }
      }

      // בדיקה שעוד אין חוות דעת קיימת
      const existingReview = await Review.findOne({ bookingId })
      if (existingReview) {
        return { success: false, message: "חוות דעת כבר קיימת" }
      }

      // בדיקה שעוד לא נשלחה בקשת חוות דעת
      if (booking.reviewRequestSentAt) {
        return { success: false, message: "בקשת חוות דעת כבר נשלחה" }
      }

      // שליחת בקשת חוות דעת מיידית או עם עיכוב קל
      const now = new Date()
      const sendTime = new Date(now.getTime() + this.config.initialDelayMinutes * 60 * 1000)

      // עדכון הזמנה עם זמן שליחת הבקשה ומעבר לסטטוס pending_review
      await Booking.findByIdAndUpdate(bookingId, {
        status: "pending_review",
        reviewRequestSentAt: sendTime,
        updatedAt: new Date()
      })

      // שליחת ההודעה מיידית (ניתן להוסיף עיכוב בעתיד)
      const userId = (booking.userId as any)?._id || booking.userId
      const result = await this.notificationService.sendReviewRequest(bookingId, userId.toString())

      if (result.some(r => r.success)) {
        logger.info("Automatic review request sent", { bookingId, userId })
        return { success: true, message: "בקשת חוות דעת נשלחה בהצלחה" }
      } else {
        logger.error("Failed to send automatic review request", { bookingId, results: result })
        return { success: false, message: "שגיאה בשליחת בקשת חוות דעת" }
      }

    } catch (error) {
      logger.error("Error in triggerReviewRequestOnCompletion", { error, bookingId })
      return { success: false, message: "שגיאה במערכת" }
    }
  }

  /**
   * שליחת תזכורות מתוזמנות לחוות דעת
   */
  async sendScheduledReviewReminders(): Promise<{
    processed: number
    firstReminders: number
    secondReminders: number
    finalReminders: number
    errors: number
  }> {
    try {
      await dbConnect()

      const now = new Date()
      const stats = {
        processed: 0,
        firstReminders: 0,
        secondReminders: 0,
        finalReminders: 0,
        errors: 0
      }

      // מציאת הזמנות הזקוקות לתזכורות
      const bookingsNeedingReminders = await Booking.find({
        status: "pending_review",
        reviewRequestSentAt: { $exists: true, $ne: null }
      }).populate('userId')

      for (const booking of bookingsNeedingReminders) {
        try {
          stats.processed++

          // בדיקה שעוד אין חוות דעת
          const existingReview = await Review.findOne({ bookingId: booking._id })
          if (existingReview) {
            // אם יש כבר חוות דעת, עדכון הסטטוס
            await Booking.findByIdAndUpdate(booking._id, {
              status: "reviewed",
              reviewCompletedAt: new Date()
            })
            continue
          }

          if (!booking.reviewRequestSentAt || !booking.userId) {
            continue
          }

          const reviewRequestTime = new Date(booking.reviewRequestSentAt)
          const hoursSinceRequest = (now.getTime() - reviewRequestTime.getTime()) / (1000 * 60 * 60)
          const daysSinceRequest = hoursSinceRequest / 24

          let shouldSendReminder = false
          let reminderType = ""

          // בדיקה איזה סוג תזכורת לשלוח
          if (daysSinceRequest >= this.config.finalReminderDays && !booking.finalReminderSentAt) {
            shouldSendReminder = true
            reminderType = "final"
          } else if (daysSinceRequest >= this.config.secondReminderDays && !booking.secondReminderSentAt) {
            shouldSendReminder = true
            reminderType = "second"
          } else if (hoursSinceRequest >= this.config.firstReminderHours && !booking.firstReminderSentAt) {
            shouldSendReminder = true
            reminderType = "first"
          }

          if (shouldSendReminder) {
            const userId = (booking.userId as any)?._id || booking.userId
            const result = await this.notificationService.sendReviewReminder(
              (booking as any)._id.toString(), 
              userId.toString()
            )

            if (result.some(r => r.success)) {
              // עדכון זמן שליחת התזכורת
              const updateField = `${reminderType}ReminderSentAt`
              await Booking.findByIdAndUpdate((booking as any)._id, {
                [updateField]: now,
                updatedAt: now
              })

              stats[`${reminderType}Reminders` as keyof typeof stats]++
              logger.info(`${reminderType} review reminder sent`, { 
                bookingId: (booking as any)._id, 
                userId 
              })
            } else {
              stats.errors++
              logger.error(`Failed to send ${reminderType} review reminder`, { 
                bookingId: (booking as any)._id, 
                results: result 
              })
            }
          }
        } catch (error) {
          stats.errors++
          logger.error("Error processing booking for review reminder", { 
            error, 
            bookingId: (booking as any)._id 
          })
        }
      }

      logger.info("Scheduled review reminders completed", stats)
      return stats

    } catch (error) {
      logger.error("Error in sendScheduledReviewReminders", { error })
      return {
        processed: 0,
        firstReminders: 0,
        secondReminders: 0,
        finalReminders: 0,
        errors: 1
      }
    }
  }

  /**
   * קבלת סטטיסטיקות חוות דעת
   */
  async getReviewStatistics(): Promise<{
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
  }> {
    try {
      await dbConnect()

      const [
        totalCompletedBookings,
        bookingsWithReviews,
        bookingsPendingReview,
        reviewRequestsSent,
        averageRatingResult,
        reminderStats
      ] = await Promise.all([
        // סה"כ הזמנות שהושלמו
        Booking.countDocuments({ 
          status: { $in: ["completed", "reviewed", "pending_review"] } 
        }),

        // הזמנות עם חוות דעת
        Review.countDocuments(),

        // הזמנות הממתינות לחוות דעת
        Booking.countDocuments({ status: "pending_review" }),

        // בקשות חוות דעת שנשלחו
        Booking.countDocuments({ 
          reviewRequestSentAt: { $exists: true, $ne: null } 
        }),

        // דירוג ממוצע
        Review.aggregate([
          { $group: { _id: null, avgRating: { $avg: "$rating" } } }
        ]),

        // סטטיסטיקות תזכורות
        Booking.aggregate([
          {
            $group: {
              _id: null,
              firstRemindersSent: {
                $sum: { $cond: [{ $ne: ["$firstReminderSentAt", null] }, 1, 0] }
              },
              secondRemindersSent: {
                $sum: { $cond: [{ $ne: ["$secondReminderSentAt", null] }, 1, 0] }
              },
              finalRemindersSent: {
                $sum: { $cond: [{ $ne: ["$finalReminderSentAt", null] }, 1, 0] }
              }
            }
          }
        ])
      ])

      const averageRating = averageRatingResult.length > 0 ? averageRatingResult[0].avgRating : 0
      const reviewResponseRate = reviewRequestsSent > 0 ? (bookingsWithReviews / reviewRequestsSent) * 100 : 0

      const reminderStatsData = reminderStats.length > 0 ? reminderStats[0] : {
        firstRemindersSent: 0,
        secondRemindersSent: 0,
        finalRemindersSent: 0
      }

      return {
        totalCompletedBookings,
        bookingsWithReviews,
        bookingsPendingReview,
        reviewRequestsSent,
        reviewResponseRate: Math.round(reviewResponseRate * 100) / 100,
        averageRating: Math.round(averageRating * 100) / 100,
        reminderStats: reminderStatsData
      }

    } catch (error) {
      logger.error("Error getting review statistics", { error })
      throw new Error("שגיאה בקבלת סטטיסטיקות")
    }
  }

  /**
   * שליחה ידנית של בקשת חוות דעת (למנהלים)
   */
  async sendManualReviewRequest(bookingId: string, forceResend = false): Promise<{ success: boolean; message: string }> {
    try {
      await dbConnect()

      const booking = await Booking.findById(bookingId).populate('userId')

      if (!booking) {
        return { success: false, message: "הזמנה לא נמצאה" }
      }

      if (booking.status !== "completed" && booking.status !== "pending_review") {
        return { success: false, message: "ההזמנה עדיין לא הושלמה" }
      }

      // בדיקה שעוד אין חוות דעת קיימת
      const existingReview = await Review.findOne({ bookingId })
      if (existingReview) {
        return { success: false, message: "חוות דעת כבר קיימת" }
      }

      // בדיקה אם כבר נשלחה בקשה (אלא אם מאלצים שליחה מחדש)
      if (booking.reviewRequestSentAt && !forceResend) {
        return { success: false, message: "בקשת חוות דעת כבר נשלחה" }
      }

      if (!booking.userId) {
        return { success: false, message: "פרטי המשתמש לא זמינים" }
      }

      // שליחת בקשת חוות דעת
      const userId = (booking.userId as any)?._id || booking.userId
      const result = await this.notificationService.sendReviewRequest(bookingId, userId.toString())

      if (result.some(r => r.success)) {
        // עדכון הזמנה
        await Booking.findByIdAndUpdate(bookingId, {
          status: "pending_review",
          reviewRequestSentAt: new Date(),
          updatedAt: new Date()
        })

        logger.info("Manual review request sent", { bookingId, userId })
        return { success: true, message: "בקשת חוות דעת נשלחה בהצלחה" }
      } else {
        logger.error("Failed to send manual review request", { bookingId, results: result })
        return { success: false, message: "שגיאה בשליחת בקשת חוות דעת" }
      }

    } catch (error) {
      logger.error("Error in sendManualReviewRequest", { error, bookingId })
      return { success: false, message: "שגיאה במערכת" }
    }
  }

  /**
   * שליחת תזכורת ידנית
   */
  async sendManualReviewReminder(bookingId: string): Promise<{ success: boolean; message: string }> {
    try {
      await dbConnect()

      const booking = await Booking.findById(bookingId).populate('userId')

      if (!booking) {
        return { success: false, message: "הזמנה לא נמצאה" }
      }

      if (booking.status !== "pending_review") {
        return { success: false, message: "ההזמנה לא ממתינה לחוות דעת" }
      }

      // בדיקה שעוד אין חוות דעת קיימת
      const existingReview = await Review.findOne({ bookingId })
      if (existingReview) {
        return { success: false, message: "חוות דעת כבר קיימת" }
      }

      if (!booking.userId) {
        return { success: false, message: "פרטי המשתמש לא זמינים" }
      }

      // שליחת תזכורת
      const userId = (booking.userId as any)?._id || booking.userId
      const result = await this.notificationService.sendReviewReminder(bookingId, userId.toString())

      if (result.some(r => r.success)) {
        // עדכון זמן שליחת תזכורת
        await Booking.findByIdAndUpdate(bookingId, {
          reviewReminderRequestedAt: new Date(),
          updatedAt: new Date()
        })

        logger.info("Manual review reminder sent", { bookingId, userId })
        return { success: true, message: "תזכורת לחוות דעת נשלחה בהצלחה" }
      } else {
        logger.error("Failed to send manual review reminder", { bookingId, results: result })
        return { success: false, message: "שגיאה בשליחת תזכורת" }
      }

    } catch (error) {
      logger.error("Error in sendManualReviewReminder", { error, bookingId })
      return { success: false, message: "שגיאה במערכת" }
    }
  }
}

// יצירת instance גלובלי
export const automaticReviewService = new AutomaticReviewService() 