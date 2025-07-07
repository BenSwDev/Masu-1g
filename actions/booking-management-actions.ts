"use server"

import { revalidatePath } from "next/cache"
import { requireAdminSession } from "@/lib/auth/require-admin-session"
import { ProfessionalMatchingService } from "@/lib/services/professional-matching-service"
import { professionalResponseService, ProfessionalResponseData } from "@/lib/services/professional-response-service"
import dbConnect from "@/lib/db/mongoose"
import Booking from "@/lib/db/models/booking"
import ProfessionalResponse from "@/lib/db/models/professional-response"
import { notificationManager } from "@/lib/notifications/notification-manager"
import { logger } from "@/lib/logs/logger"

/**
 * חיפוש מטפלים מתאימים להזמנה
 */
export async function findSuitableProfessionals(bookingId: string) {
  try {
    await requireAdminSession()
    
    const results = await ProfessionalMatchingService.findSuitableProfessionals(bookingId, {
      includePartialMatches: true,
      maxResults: 20,
      minMatchScore: 0.3
    })

    return {
      success: true,
      data: results
    }
  } catch (error) {
    logger.error("Error finding suitable professionals:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "שגיאה בחיפוש מטפלים"
    }
  }
}

/**
 * קבלת המלצות מטפלים מלאות
 */
export async function getProfessionalRecommendations(bookingId: string) {
  try {
    await requireAdminSession()
    
    const recommendations = await ProfessionalMatchingService.getRecommendations(bookingId, 10)

    return {
      success: true,
      data: recommendations
    }
  } catch (error) {
    logger.error("Error getting professional recommendations:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "שגיאה בקבלת המלצות"
    }
  }
}

/**
 * שיוך מטפל להזמנה (גם מתאים וגם לא מתאים)
 */
export async function assignProfessionalToBooking(bookingId: string, professionalId: string, force: boolean = false) {
  try {
    await requireAdminSession()
    await dbConnect()

    if (!force) {
      // בדיקת התאמה
      const validation = await ProfessionalMatchingService.validateMatch(professionalId, bookingId)
      if (!validation.isValid) {
        return {
          success: false,
          error: `מטפל לא מתאים: ${validation.issues.join(', ')}`
        }
      }
    }

    // שיוך המטפל
    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      {
        professionalId: professionalId,
        status: "confirmed",
        confirmedAt: new Date()
      },
      { new: true }
    ).populate('professionalId', 'name email phone')

    // שליחת הודעות
    await notificationManager.sendBookingAssignment(bookingId, professionalId)

    revalidatePath("/dashboard/admin/bookings")

    return {
      success: true,
      data: updatedBooking,
      message: "המטפל שויך בהצלחה"
    }
  } catch (error) {
    logger.error("Error assigning professional to booking:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "שגיאה בשיוך מטפל"
    }
  }
}

/**
 * שליחת הודעות לכל המטפלים המתאימים
 */
export async function notifyAllSuitableProfessionals(bookingId: string) {
  try {
    await requireAdminSession()
    await dbConnect()

    const booking = await Booking.findById(bookingId).lean()
    if (!booking) {
      return {
        success: false,
        error: "הזמנה לא נמצאה"
      }
    }

    // מציאת מטפלים מתאימים
    const suitableProfessionals = await ProfessionalMatchingService.findSuitableProfessionals(bookingId, {
      includePartialMatches: false,
      maxResults: 50,
      minMatchScore: 0.7
    })

    if (suitableProfessionals.length === 0) {
      return {
        success: false,
        error: "לא נמצאו מטפלים מתאימים"
      }
    }

    // עדכון רשימת המטפלים המתאימים בהזמנה
    const professionalData = suitableProfessionals.map(match => ({
      professionalId: match.professional.userId._id,
      name: match.professional.userId.name,
      email: match.professional.userId.email,
      phone: match.professional.userId.phone,
      gender: match.professional.userId.gender,
      profileId: match.professional._id,
      matchScore: match.matchScore,
      matchReasons: match.matchReasons,
      calculatedAt: new Date()
    }))

    await Booking.findByIdAndUpdate(
      bookingId,
      {
        suitableProfessionals: professionalData,
        status: "pending_professional"
      }
    )

    // שליחת הודעות
    let notificationsSent = 0
    for (const professional of suitableProfessionals) {
      try {
        await notificationManager.sendBookingNotification(
          bookingId,
          professional.professional.userId._id.toString()
        )
        notificationsSent++
      } catch (error) {
        logger.error(`Error sending notification to professional ${professional.professional.userId._id}:`, error)
      }
    }

    revalidatePath("/dashboard/admin/bookings")

    return {
      success: true,
      data: {
        totalProfessionals: suitableProfessionals.length,
        notificationsSent
      },
      message: `נשלחו הודעות ל-${notificationsSent} מטפלים`
    }
  } catch (error) {
    logger.error("Error notifying suitable professionals:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "שגיאה בשליחת הודעות"
    }
  }
}

/**
 * טיפול בתגובת מטפל
 */
export async function handleProfessionalResponse(responseId: string, responseData: ProfessionalResponseData) {
  try {
    const result = await professionalResponseService.handleProfessionalResponse(responseId, responseData)
    
    if (result.success) {
      revalidatePath("/dashboard/admin/bookings")
      return { success: true, message: result.message }
    } else {
      return { success: false, error: result.error }
    }
  } catch (error) {
    logger.error("Error in handleProfessionalResponse:", error)
    return { success: false, error: "שגיאה בטיפול בתגובת המטפל" }
  }
}

/**
 * קבלת סטטוס תגובות המטפלים להזמנה
 */
export async function getBookingResponseStatus(bookingId: string) {
  try {
    await requireAdminSession()
    
    const status = await professionalResponseService.getBookingResponseStatus(bookingId)
    
    return {
      success: true,
      data: status
    }
  } catch (error) {
    logger.error("Error getting booking response status:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "שגיאה בקבלת סטטוס תגובות"
    }
  }
}

/**
 * שליחת תזכורת למטפלים שלא הגיבו
 */
export async function sendResponseReminder(bookingId: string, professionalId: string) {
  try {
    await requireAdminSession()
    
    const result = await professionalResponseService.sendResponseReminder(bookingId, professionalId)
    
    return result
  } catch (error) {
    logger.error("Error in sendResponseReminder:", error)
    return { success: false, error: "שגיאה בשליחת התזכורת" }
  }
}

/**
 * עדכון סטטוס הזמנה ידנית
 */
export async function updateBookingStatus(bookingId: string, status: string, notes?: string) {
  try {
    await requireAdminSession()
    await dbConnect()

    const updateData: any = {
      status,
      updatedAt: new Date()
    }

    // הוספת שדות ספציפיים לפי סטטוס
    switch (status) {
      case "on_way":
        updateData.professionalArrivedAt = new Date()
        break
      case "completed":
        updateData.treatmentCompletedAt = new Date()
        break
      case "pending_review":
        updateData.reviewRequestSentAt = new Date()
        break
      case "reviewed":
        updateData.reviewCompletedAt = new Date()
        break
      case "no_professionals_available":
        updateData.noResponseFromProfessionalsAt = new Date()
        break
    }

    if (notes) {
      updateData.adminNotes = notes
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      updateData,
      { new: true }
    ).populate('professionalId', 'name email phone')

    if (!updatedBooking) {
      return {
        success: false,
        error: "הזמנה לא נמצאה"
      }
    }

    // שליחת הודעות לפי הסטטוס
    if (status === "pending_review" && updatedBooking.userId) {
      await notificationManager.sendReviewRequest(bookingId, updatedBooking.userId.toString())
    }

    revalidatePath("/dashboard/admin/bookings")

    return {
      success: true,
      data: updatedBooking,
      message: "סטטוס ההזמנה עודכן בהצלחה"
    }
  } catch (error) {
    logger.error("Error updating booking status:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "שגיאה בעדכון סטטוס"
    }
  }
}

/**
 * שליחת תזכורת לחוות דעת
 */
export async function sendReviewReminder(bookingId: string) {
  try {
    await requireAdminSession()
    await dbConnect()

    const booking = await Booking.findById(bookingId).lean()
    if (!booking) {
      return {
        success: false,
        error: "הזמנה לא נמצאה"
      }
    }

    if (booking.status !== "pending_review") {
      return {
        success: false,
        error: "ההזמנה לא במצב ממתין לחוות דעת"
      }
    }

    if (!booking.userId) {
      return {
        success: false,
        error: "מידע המשתמש לא זמין"
      }
    }

    await notificationManager.sendReviewReminder(bookingId, booking.userId.toString())

    await Booking.findByIdAndUpdate(
      bookingId,
      { reviewReminderSentAt: new Date() }
    )

    return {
      success: true,
      message: "תזכורת לחוות דעת נשלחה בהצלחה"
    }
  } catch (error) {
    logger.error("Error sending review reminder:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "שגיאה בשליחת תזכורת"
    }
  }
}

/**
 * קבלת סטטיסטיקות הזמנות מתקדמות
 */
export async function getBookingStatistics(timeRange: "today" | "week" | "month" = "today") {
  try {
    await requireAdminSession()
    await dbConnect()

    const now = new Date()
    let startDate: Date

    switch (timeRange) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
    }

    const bookings = await Booking.find({
      createdAt: { $gte: startDate }
    }).lean()

    const stats = {
      total: bookings.length,
      byStatus: {} as Record<string, number>,
      responseRates: {
        averageResponseTime: 0,
        professionalAcceptanceRate: 0,
        completionRate: 0
      },
      revenue: {
        total: 0,
        completed: 0,
        pending: 0
      }
    }

    // סטטיסטיקות לפי סטטוס
    bookings.forEach(booking => {
      const status = booking.status
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1
      
      if (booking.priceDetails?.finalAmount) {
        stats.revenue.total += booking.priceDetails.finalAmount
        
        if (booking.status === "completed") {
          stats.revenue.completed += booking.priceDetails.finalAmount
        } else if (["confirmed", "on_way", "pending_review"].includes(booking.status)) {
          stats.revenue.pending += booking.priceDetails.finalAmount
        }
      }
    })

    // חישוב שיעור קבלה והשלמה
    const confirmedBookings = bookings.filter(b => ["confirmed", "on_way", "completed", "pending_review", "reviewed"].includes(b.status))
    const completedBookings = bookings.filter(b => ["completed", "reviewed"].includes(b.status))

    stats.responseRates.professionalAcceptanceRate = bookings.length > 0 ? 
      (confirmedBookings.length / bookings.length) * 100 : 0
    stats.responseRates.completionRate = confirmedBookings.length > 0 ? 
      (completedBookings.length / confirmedBookings.length) * 100 : 0

    return {
      success: true,
      data: stats
    }
  } catch (error) {
    logger.error("Error getting booking statistics:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "שגיאה בקבלת סטטיסטיקות"
    }
  }
}

/**
 * קבלת הזמנות עם סינון מתקדם
 */
export async function getBookingsWithFilters(filters: {
  status?: string[]
  professionalId?: string
  dateRange?: { start: Date; end: Date }
  treatmentId?: string
  city?: string
  page?: number
  limit?: number
}) {
  try {
    await requireAdminSession()
    await dbConnect()

    const {
      status,
      professionalId,
      dateRange,
      treatmentId,
      city,
      page = 1,
      limit = 20
    } = filters

    const query: any = {}

    if (status && status.length > 0) {
      query.status = { $in: status }
    }

    if (professionalId) {
      query.professionalId = professionalId
    }

    if (dateRange) {
      query.bookingDateTime = {
        $gte: dateRange.start,
        $lte: dateRange.end
      }
    }

    if (treatmentId) {
      query.treatmentId = treatmentId
    }

    if (city) {
      query["bookingAddressSnapshot.city"] = city
    }

    const skip = (page - 1) * limit

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('treatmentId', 'name')
        .populate('professionalId', 'name email phone')
        .populate('userId', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Booking.countDocuments(query)
    ])

    return {
      success: true,
      data: {
        bookings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    }
  } catch (error) {
    logger.error("Error getting bookings with filters:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "שגיאה בקבלת הזמנות"
    }
  }
} 