"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import Booking from "@/lib/db/models/booking"
import { logger } from "@/lib/logs/logger"
import type { PopulatedBooking } from "@/types/booking"

interface MemberBookingFilters {
  status?: string
  treatment?: string
  dateRange?: string
  search?: string
  page?: number
  limit?: number
}

interface MemberBookingData {
  bookings: PopulatedBooking[]
  urgentBookings: PopulatedBooking[]
  totalPages: number
  totalBookings: number
  statistics: {
    upcomingCount: number
    completedCount: number
    pendingPaymentCount: number
    pendingReviewCount: number
  }
}

/**
 * קבלת הזמנות משתמש עם סטטוס משופר ומידע רלוונטי ללקוח
 * כולל סינון הזמנות דחופות והצגת סטטיסטיקות
 */
export async function getMemberBookings(
  filters: MemberBookingFilters = {}
): Promise<MemberBookingData> {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    throw new Error("User not authenticated")
  }

  try {

    await dbConnect()

    const {
      status,
      treatment,
      dateRange,
      search,
      page = 1,
      limit = 20
    } = filters

    // בניית query בסיסי
    const query: any = {
      $or: [
        { userId: session.user.id },
        { recipientEmail: session.user.email }
      ]
    }

    // סינון לפי סטטוס
    if (status && status !== "all") {
      query.status = status
    }

    // סינון לפי טיפול
    if (treatment && treatment !== "all") {
      query.treatmentId = treatment
    }

    // סינון לפי תאריך
    if (dateRange && dateRange !== "all") {
      const now = new Date()
      switch (dateRange) {
        case "today":
          query.bookingDateTime = {
            $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
          }
          break
        case "this_week":
          const weekStart = new Date(now)
          weekStart.setDate(now.getDate() - now.getDay())
          query.bookingDateTime = {
            $gte: weekStart,
            $lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
          }
          break
        case "this_month":
          query.bookingDateTime = {
            $gte: new Date(now.getFullYear(), now.getMonth(), 1),
            $lt: new Date(now.getFullYear(), now.getMonth() + 1, 1)
          }
          break
        case "last_month":
          query.bookingDateTime = {
            $gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
            $lt: new Date(now.getFullYear(), now.getMonth(), 1)
          }
          break
      }
    }

    // חיפוש טקסט
    if (search) {
      query.$or = [
        { bookingNumber: { $regex: search, $options: "i" } },
        { recipientName: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } }
      ]
    }

    // חישוב pagination
    const skip = (page - 1) * limit
    const totalBookings = await Booking.countDocuments(query)
    const totalPages = Math.ceil(totalBookings / limit)

    // שליפת הזמנות עם populate
    const bookings = await Booking.find(query)
      .populate("treatmentId", "name defaultDurationMinutes pricingType durations")
      .populate("userId", "name email phone")
      .populate("professionalId", "name email phone")
      .populate("addressId", "fullAddress city street streetNumber")
      .populate("bookingAddressSnapshot")
      .sort({ bookingDateTime: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    // זיהוי הזמנות דחופות (לא תלוי בסינון)
    const urgentQuery = {
      $or: [
        { userId: session.user.id },
        { recipientEmail: session.user.email }
      ],
      status: {
        $in: ["pending_payment", "on_way", "pending_review"]
      }
    }

    const urgentBookings = await Booking.find(urgentQuery)
      .populate("treatmentId", "name defaultDurationMinutes pricingType durations")
      .populate("userId", "name email phone")
      .populate("professionalId", "name email phone")
      .populate("addressId", "fullAddress city street streetNumber")
      .populate("bookingAddressSnapshot")
      .sort({ bookingDateTime: 1 })
      .limit(5)
      .lean()

    // חישוב סטטיסטיקות
    const allUserBookings = await Booking.find({
      $or: [
        { userId: session.user.id },
        { recipientEmail: session.user.email }
      ]
    }).lean()

    const now = new Date()
    const statistics = {
      upcomingCount: allUserBookings.filter(b => 
        new Date(b.bookingDateTime) > now && 
        !["cancelled", "completed", "reviewed"].includes(b.status)
      ).length,
      completedCount: allUserBookings.filter(b => 
        ["completed", "reviewed"].includes(b.status)
      ).length,
      pendingPaymentCount: allUserBookings.filter(b => 
        b.status === "pending_payment"
      ).length,
      pendingReviewCount: allUserBookings.filter(b => 
        b.status === "pending_review"
      ).length
    }

    return {
      bookings: bookings as unknown as PopulatedBooking[],
      urgentBookings: urgentBookings as unknown as PopulatedBooking[],
      totalPages,
      totalBookings,
      statistics
    }

  } catch (error) {
    logger.error("Failed to get member bookings", { 
      error: error instanceof Error ? error.message : "Unknown error",
      userId: session?.user?.id
    })
    throw new Error("Failed to get member bookings")
  }
}

/**
 * קבלת הזמנה בודדת עם כל הפרטים
 */
export async function getMemberBookingDetails(bookingId: string): Promise<PopulatedBooking | null> {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    throw new Error("User not authenticated")
  }

  try {

    await dbConnect()

    const booking = await Booking.findOne({
      _id: bookingId,
      $or: [
        { userId: session.user.id },
        { recipientEmail: session.user.email }
      ]
    })
    .populate("treatmentId", "name defaultDurationMinutes pricingType durations")
    .populate("userId", "name email phone")
    .populate("professionalId", "name email phone")
    .populate("addressId", "fullAddress city street streetNumber")
    .populate("bookingAddressSnapshot")
    .lean()

    if (!booking) {
      return null
    }

    return booking as unknown as PopulatedBooking

  } catch (error) {
    logger.error("Failed to get member booking details", { 
      error: error instanceof Error ? error.message : "Unknown error",
      bookingId,
      userId: session?.user?.id
    })
    throw new Error("Failed to get booking details")
  }
}

/**
 * ביטול הזמנה על ידי המשתמש
 */
export async function cancelMemberBooking(
  bookingId: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    throw new Error("User not authenticated")
  }

  try {

    await dbConnect()

    const booking = await Booking.findOne({
      _id: bookingId,
      $or: [
        { userId: session.user.id },
        { recipientEmail: session.user.email }
      ]
    })

    if (!booking) {
      return { success: false, message: "הזמנה לא נמצאה" }
    }

    // בדיקה אם ניתן לבטל
    const cancelableStatuses = ["pending_professional", "confirmed"]
    if (!cancelableStatuses.includes(booking.status)) {
      return { success: false, message: "לא ניתן לבטל הזמנה זו" }
    }

    // בדיקת זמן - לא ניתן לבטל פחות משעתיים לפני
    const bookingDate = new Date(booking.bookingDateTime)
    const now = new Date()
    const hoursUntilBooking = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    if (hoursUntilBooking <= 2) {
      return { success: false, message: "לא ניתן לבטל הזמנה פחות משעתיים לפני מועד הטיפול" }
    }

    // ביטול ההזמנה
    await Booking.findByIdAndUpdate(bookingId, {
      status: "cancelled",
      cancelledAt: new Date(),
      cancellationReason: reason || "בוטל על ידי הלקוח",
      updatedAt: new Date()
    })

    logger.info("Member booking cancelled", { 
      bookingId,
      userId: session.user.id,
      reason 
    })

    return { success: true, message: "ההזמנה בוטלה בהצלחה" }

  } catch (error) {
    logger.error("Failed to cancel member booking", { 
      error: error instanceof Error ? error.message : "Unknown error",
      bookingId,
      userId: session?.user?.id
    })
    return { success: false, message: "שגיאה בביטול ההזמנה" }
  }
}

/**
 * בקשת תזכורת לחוות דעת
 */
export async function requestReviewReminder(bookingId: string): Promise<{ success: boolean; message: string }> {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    throw new Error("User not authenticated")
  }

  try {

    await dbConnect()

    const booking = await Booking.findOne({
      _id: bookingId,
      $or: [
        { userId: session.user.id },
        { recipientEmail: session.user.email }
      ],
      status: "pending_review"
    })

    if (!booking) {
      return { success: false, message: "הזמנה לא נמצאה או לא ניתן לכתוב חוות דעת" }
    }

    // עדכון זמן בקשת תזכורת
    await Booking.findByIdAndUpdate(bookingId, {
      reviewReminderRequestedAt: new Date(),
      updatedAt: new Date()
    })

    logger.info("Review reminder requested", { 
      bookingId,
      userId: session.user.id
    })

    return { success: true, message: "תזכורת לחוות דעת נשלחה" }

  } catch (error) {
    logger.error("Failed to request review reminder", { 
      error: error instanceof Error ? error.message : "Unknown error",
      bookingId,
      userId: session?.user?.id
    })
    return { success: false, message: "שגיאה בשליחת תזכורת" }
  }
} 