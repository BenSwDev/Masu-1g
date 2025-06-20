"use server"

import { getServerSession } from "next-auth"
import mongoose from "mongoose"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"
import { revalidatePath } from "next/cache"

// Import models
import Booking, { type IBooking, type BookingStatus } from "@/lib/db/models/booking"
import User from "@/lib/db/models/user"
import { sendUserNotification, sendGuestNotification } from "@/actions/notification-service"
import type { NotificationLanguage } from "@/lib/notifications/notification-types"

/**
 * 🎯 BOOKING STATUS TRACKER
 * 
 * מערכת מעקב שינויי סטטוס הזמנה:
 * - מבוטל (cancelled) - לא נוגעים בכסף
 * - הוחזר (refunded) - הלקוח קיבל זיכוי
 * - שיוך/ביטול שיוך מטפל
 * - עדכון סטטוסים אחרים
 */

interface StatusChangeContext {
  bookingId: string
  newStatus: BookingStatus
  previousStatus?: BookingStatus
  reason?: string
  refundAmount?: number
  updatedBy: "user" | "admin" | "professional" | "system"
  additionalData?: any
}

interface StatusChangeResult {
  success: boolean
  error?: string
  statusChanged: boolean
  refundProcessed?: boolean
  notificationsSent?: number
}

export async function trackBookingStatusChange(context: StatusChangeContext): Promise<StatusChangeResult> {
  try {
    await dbConnect()
    
    logger.info("🎯 Tracking booking status change", { 
      bookingId: context.bookingId,
      from: context.previousStatus,
      to: context.newStatus,
      updatedBy: context.updatedBy
    })

    const booking = await Booking.findById(context.bookingId)
      .populate('treatmentId')
      .populate('userId')
      .populate('professionalId')
    
    if (!booking) {
      return { success: false, error: "Booking not found", statusChanged: false }
    }

    // בדיקת הרשאות
    const permissionCheck = await validateStatusChangePermissions(booking, context)
    if (!permissionCheck.allowed) {
      return { success: false, error: permissionCheck.reason, statusChanged: false }
    }

    // שמירת הסטטוס הקודם
    const previousStatus = booking.status
    context.previousStatus = previousStatus
    
    // ביצוע השינוי לפי הסטטוס החדש
    switch (context.newStatus) {
      case "cancelled":
        return await handleCancellation(booking, context)
      
      case "refunded":
        return await handleRefund(booking, context)
      
      case "confirmed":
        return await handleConfirmation(booking, context)
        
      case "completed":
        return await handleCompletion(booking, context)
        
      default:
        return await handleGenericStatusChange(booking, context)
    }

  } catch (error) {
    logger.error("❌ Error tracking booking status change:", {
      bookingId: context.bookingId,
      error: error instanceof Error ? error.message : String(error)
    })
    return { success: false, error: "Status change tracking failed", statusChanged: false }
  }
}

/**
 * בדיקת הרשאות לשינוי סטטוס
 */
async function validateStatusChangePermissions(booking: IBooking, context: StatusChangeContext): Promise<{ allowed: boolean; reason?: string }> {
  const session = await getServerSession(authOptions)
  
  switch (context.updatedBy) {
    case "admin":
      if (!session?.user?.roles?.includes("admin")) {
        return { allowed: false, reason: "Admin access required" }
      }
      break
      
    case "professional":
      if (!session?.user?.roles?.includes("professional")) {
        return { allowed: false, reason: "Professional access required" }
      }
      // וריפיקציה שהמטפל משויך להזמנה
      if (booking.professionalId?.toString() !== session.user.id) {
        return { allowed: false, reason: "Professional not assigned to this booking" }
      }
      break
      
    case "user":
      if (!session?.user?.id) {
        return { allowed: false, reason: "User authentication required" }
      }
      // וריפיקציה שהמשתמש הוא בעל ההזמנה
      if (booking.userId?.toString() !== session.user.id) {
        return { allowed: false, reason: "User not owner of this booking" }
      }
      break
      
    case "system":
      // מערכת - מותר תמיד
      break
  }
  
  return { allowed: true }
}

/**
 * טיפול בביטול הזמנה (ללא החזר כספי)
 */
async function handleCancellation(booking: IBooking, context: StatusChangeContext): Promise<StatusChangeResult> {
  try {
    const previousStatus = booking.status
    
    // עדכון סטטוס
    booking.status = "cancelled"
    booking.cancellationReason = context.reason
    booking.cancelledAt = new Date()
    booking.cancelledBy = context.updatedBy
    
    // אם היה מטפל משויך - לבטל את השיוך
    if (booking.professionalId) {
      booking.professionalId = null
    }
    
    await booking.save()
    
    // שליחת התראות
    const notificationsSent = await sendCancellationNotifications(booking, context)
    
    // רימוד נתיבים
    revalidateBookingPaths()
    
    logger.info("✅ Booking cancelled successfully", {
      bookingId: booking._id.toString(),
      previousStatus,
      cancelledBy: context.updatedBy,
      reason: context.reason
    })
    
    return {
      success: true,
      statusChanged: true,
      notificationsSent
    }
    
  } catch (error) {
    logger.error("❌ Error handling booking cancellation:", {
      bookingId: booking._id.toString(),
      error: error instanceof Error ? error.message : String(error)
    })
    return { success: false, error: "Failed to cancel booking", statusChanged: false }
  }
}

/**
 * טיפול בהחזר כספי
 */
async function handleRefund(booking: IBooking, context: StatusChangeContext): Promise<StatusChangeResult> {
  try {
    const previousStatus = booking.status
    
    // עדכון סטטוס ופרטי החזר
    booking.status = "refunded"
    booking.refundDetails = {
      refundAmount: context.refundAmount || booking.paymentDetails.amountPaid || booking.priceDetails.finalAmount,
      refundDate: new Date(),
      refundReason: context.reason || "User requested refund",
      refundMethod: "credit", // ברירת מחדל - זיכוי
      refundedBy: context.updatedBy
    }
    
    // אם היה מטפל משויך - לבטל את השיוך
    if (booking.professionalId) {
      booking.professionalId = null
    }
    
    await booking.save()
    
    // TODO: טיגור תהליך החזר כספי למערכת התשלומים
    
    // שליחת התראות
    const notificationsSent = await sendRefundNotifications(booking, context)
    
    // רימוד נתיבים
    revalidateBookingPaths()
    
    logger.info("✅ Booking refunded successfully", {
      bookingId: booking._id.toString(),
      previousStatus,
      refundAmount: booking.refundDetails.refundAmount,
      refundedBy: context.updatedBy
    })
    
    return {
      success: true,
      statusChanged: true,
      refundProcessed: true,
      notificationsSent
    }
    
  } catch (error) {
    logger.error("❌ Error handling booking refund:", {
      bookingId: booking._id.toString(),
      error: error instanceof Error ? error.message : String(error)
    })
    return { success: false, error: "Failed to process refund", statusChanged: false }
  }
}

/**
 * טיפול באישור הזמנה (שיוך מטפל)
 */
async function handleConfirmation(booking: IBooking, context: StatusChangeContext): Promise<StatusChangeResult> {
  try {
    const previousStatus = booking.status
    
    // עדכון סטטוס
    booking.status = "confirmed"
    booking.confirmedAt = new Date()
    
    // אם יש מטפל חדש - לשייך אותו
    if (context.additionalData?.professionalId) {
      booking.professionalId = new mongoose.Types.ObjectId(context.additionalData.professionalId)
    }
    
    await booking.save()
    
    // שליחת התראות
    const notificationsSent = await sendConfirmationNotifications(booking, context)
    
    // רימוד נתיבים
    revalidateBookingPaths()
    
    logger.info("✅ Booking confirmed successfully", {
      bookingId: booking._id.toString(),
      previousStatus,
      professionalId: booking.professionalId?.toString()
    })
    
    return {
      success: true,
      statusChanged: true,
      notificationsSent
    }
    
  } catch (error) {
    logger.error("❌ Error handling booking confirmation:", {
      bookingId: booking._id.toString(),
      error: error instanceof Error ? error.message : String(error)
    })
    return { success: false, error: "Failed to confirm booking", statusChanged: false }
  }
}

/**
 * טיפול בהשלמת הזמנה
 */
async function handleCompletion(booking: IBooking, context: StatusChangeContext): Promise<StatusChangeResult> {
  try {
    const previousStatus = booking.status
    
    // עדכון סטטוס
    booking.status = "completed"
    booking.completedAt = new Date()
    
    await booking.save()
    
    // שליחת התראות והזמנה לביקורת
    const notificationsSent = await sendCompletionNotifications(booking, context)
    
    // רימוד נתיבים
    revalidateBookingPaths()
    
    logger.info("✅ Booking completed successfully", {
      bookingId: booking._id.toString(),
      previousStatus
    })
    
    return {
      success: true,
      statusChanged: true,
      notificationsSent
    }
    
  } catch (error) {
    logger.error("❌ Error handling booking completion:", {
      bookingId: booking._id.toString(),
      error: error instanceof Error ? error.message : String(error)
    })
    return { success: false, error: "Failed to complete booking", statusChanged: false }
  }
}

/**
 * טיפול בשינוי סטטוס כללי
 */
async function handleGenericStatusChange(booking: IBooking, context: StatusChangeContext): Promise<StatusChangeResult> {
  try {
    const previousStatus = booking.status
    
    // עדכון סטטוס
    booking.status = context.newStatus
    
    await booking.save()
    
    // רימוד נתיבים
    revalidateBookingPaths()
    
    logger.info("✅ Booking status changed", {
      bookingId: booking._id.toString(),
      from: previousStatus,
      to: context.newStatus,
      updatedBy: context.updatedBy
    })
    
    return {
      success: true,
      statusChanged: true
    }
    
  } catch (error) {
    logger.error("❌ Error handling generic status change:", {
      bookingId: booking._id.toString(),
      error: error instanceof Error ? error.message : String(error)
    })
    return { success: false, error: "Failed to change booking status", statusChanged: false }
  }
}

/**
 * שליחת התראות ביטול
 */
async function sendCancellationNotifications(booking: IBooking, context: StatusChangeContext): Promise<number> {
  let sentCount = 0
  
  try {
    const treatment = booking.treatmentId as any
    const notificationData = {
      type: "BOOKING_CANCELLED",
      bookingNumber: booking.bookingNumber,
      treatmentName: treatment?.name || "טיפול",
      cancellationReason: context.reason || "בקשת המשתמש"
    }
    
    // התראה למזמין
    if (booking.userId) {
      const result = await sendUserNotification(
        booking.userId.toString(),
        notificationData,
        "email",
        "he" as NotificationLanguage
      )
      if (result.success) sentCount++
    } else if (booking.bookedByUserEmail) {
      const result = await sendGuestNotification(
        {
          name: booking.bookedByUserName || "",
          email: booking.bookedByUserEmail,
          phone: booking.bookedByUserPhone || ""
        },
        notificationData,
        "email",
        "he" as NotificationLanguage
      )
      if (result.success) sentCount++
    }
    
    // התראה למטפל (אם משויך)
    if (booking.professionalId) {
      const result = await sendUserNotification(
        booking.professionalId.toString(),
        { ...notificationData, type: "BOOKING_CANCELLED_PROFESSIONAL" },
        "email",
        "he" as NotificationLanguage
      )
      if (result.success) sentCount++
    }
    
  } catch (error) {
    logger.error("❌ Error sending cancellation notifications:", {
      bookingId: booking._id.toString(),
      error: error instanceof Error ? error.message : String(error)
    })
  }
  
  return sentCount
}

/**
 * שליחת התראות החזר כספי
 */
async function sendRefundNotifications(booking: IBooking, context: StatusChangeContext): Promise<number> {
  let sentCount = 0
  
  try {
    const treatment = booking.treatmentId as any
    const notificationData = {
      type: "BOOKING_REFUNDED",
      bookingNumber: booking.bookingNumber,
      treatmentName: treatment?.name || "טיפול",
      refundAmount: booking.refundDetails?.refundAmount || 0
    }
    
    // התראה למזמין
    if (booking.userId) {
      const result = await sendUserNotification(
        booking.userId.toString(),
        notificationData,
        "email",
        "he" as NotificationLanguage
      )
      if (result.success) sentCount++
    } else if (booking.bookedByUserEmail) {
      const result = await sendGuestNotification(
        {
          name: booking.bookedByUserName || "",
          email: booking.bookedByUserEmail,
          phone: booking.bookedByUserPhone || ""
        },
        notificationData,
        "email",
        "he" as NotificationLanguage
      )
      if (result.success) sentCount++
    }
    
  } catch (error) {
    logger.error("❌ Error sending refund notifications:", {
      bookingId: booking._id.toString(),
      error: error instanceof Error ? error.message : String(error)
    })
  }
  
  return sentCount
}

/**
 * שליחת התראות אישור
 */
async function sendConfirmationNotifications(booking: IBooking, context: StatusChangeContext): Promise<number> {
  let sentCount = 0
  
  try {
    const treatment = booking.treatmentId as any
    const professional = booking.professionalId as any
    
    const notificationData = {
      type: "BOOKING_CONFIRMED_FINAL",
      bookingNumber: booking.bookingNumber,
      treatmentName: treatment?.name || "טיפול",
      professionalName: professional?.name || "מטפל/ת",
      bookingDateTime: booking.bookingDateTime
    }
    
    // התראה למזמין
    if (booking.userId) {
      const result = await sendUserNotification(
        booking.userId.toString(),
        notificationData,
        "email",
        "he" as NotificationLanguage
      )
      if (result.success) sentCount++
    } else if (booking.bookedByUserEmail) {
      const result = await sendGuestNotification(
        {
          name: booking.bookedByUserName || "",
          email: booking.bookedByUserEmail,
          phone: booking.bookedByUserPhone || ""
        },
        notificationData,
        "email",
        "he" as NotificationLanguage
      )
      if (result.success) sentCount++
    }
    
    // התראה למטפל
    if (booking.professionalId) {
      const result = await sendUserNotification(
        booking.professionalId.toString(),
        { ...notificationData, type: "BOOKING_ASSIGNED_FINAL" },
        "email",
        "he" as NotificationLanguage
      )
      if (result.success) sentCount++
    }
    
  } catch (error) {
    logger.error("❌ Error sending confirmation notifications:", {
      bookingId: booking._id.toString(),
      error: error instanceof Error ? error.message : String(error)
    })
  }
  
  return sentCount
}

/**
 * שליחת התראות השלמה
 */
async function sendCompletionNotifications(booking: IBooking, context: StatusChangeContext): Promise<number> {
  let sentCount = 0
  
  try {
    const treatment = booking.treatmentId as any
    const notificationData = {
      type: "BOOKING_COMPLETED",
      bookingNumber: booking.bookingNumber,
      treatmentName: treatment?.name || "טיפול",
      reviewLink: `${process.env.NEXTAUTH_URL}/dashboard/member/bookings?review=${booking._id.toString()}`
    }
    
    // התראה למזמין עם הזמנה לביקורת
    if (booking.userId) {
      const result = await sendUserNotification(
        booking.userId.toString(),
        notificationData,
        "email",
        "he" as NotificationLanguage
      )
      if (result.success) sentCount++
    } else if (booking.bookedByUserEmail) {
      const result = await sendGuestNotification(
        {
          name: booking.bookedByUserName || "",
          email: booking.bookedByUserEmail,
          phone: booking.bookedByUserPhone || ""
        },
        notificationData,
        "email",
        "he" as NotificationLanguage
      )
      if (result.success) sentCount++
    }
    
  } catch (error) {
    logger.error("❌ Error sending completion notifications:", {
      bookingId: booking._id.toString(),
      error: error instanceof Error ? error.message : String(error)
    })
  }
  
  return sentCount
}

/**
 * רימוד נתיבים רלוונטיים
 */
function revalidateBookingPaths(): void {
  revalidatePath("/dashboard/admin/bookings")
  revalidatePath("/dashboard/member/bookings") 
  revalidatePath("/dashboard/professional/bookings")
}

/**
 * פונקציות עזר לשינויי סטטוס מהירים
 */

export async function cancelBookingWithTracking(bookingId: string, reason?: string, updatedBy: "user" | "admin" = "user"): Promise<StatusChangeResult> {
  return await trackBookingStatusChange({
    bookingId,
    newStatus: "cancelled",
    reason,
    updatedBy
  })
}

export async function refundBookingWithTracking(bookingId: string, refundAmount?: number, reason?: string, updatedBy: "admin" = "admin"): Promise<StatusChangeResult> {
  return await trackBookingStatusChange({
    bookingId,
    newStatus: "refunded",
    reason,
    refundAmount,
    updatedBy
  })
}

export async function assignProfessionalWithTracking(bookingId: string, professionalId: string, updatedBy: "admin" = "admin"): Promise<StatusChangeResult> {
  return await trackBookingStatusChange({
    bookingId,
    newStatus: "confirmed",
    updatedBy,
    additionalData: { professionalId }
  })
}

export async function completeBookingWithTracking(bookingId: string, updatedBy: "professional" | "admin" = "professional"): Promise<StatusChangeResult> {
  return await trackBookingStatusChange({
    bookingId,
    newStatus: "completed",
    updatedBy
  })
} 