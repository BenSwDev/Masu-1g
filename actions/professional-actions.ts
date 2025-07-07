"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { Types } from "mongoose"
import { revalidatePath } from "next/cache"
import dbConnect from "@/lib/db/mongoose"
import User from "@/lib/db/models/user"
import Booking from "@/lib/db/models/booking"
import ProfessionalProfile from "@/lib/db/models/professional-profile"
import { ProfessionalMatchingService } from "@/lib/services/professional-matching-service"
import { logger } from "@/lib/logs/logger"
import type { PopulatedBooking } from "@/types/booking"

interface ProfessionalBookingsData {
  notifications: PopulatedBooking[]
  assigned: PopulatedBooking[]
  completed: PopulatedBooking[]
  statistics: {
    totalBookings: number
    acceptanceRate: number
    completionRate: number
    averageRating: number
    earnings: {
      today: number
      week: number
      month: number
    }
  }
}

/**
 * קבלת הזמנות מטפל מאורגנות לפי קטגוריות
 */
export async function getProfessionalBookings(professionalId: string): Promise<{
  success: boolean
  data?: ProfessionalBookingsData
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("professional")) {
      return { success: false, error: "אין הרשאה לצפות בהזמנות" }
    }

    // בדיקה שהמטפל מנסה לצפות בהזמנות שלו
    if (session.user.id !== professionalId) {
      return { success: false, error: "אין הרשאה לצפות בהזמנות של מטפל אחר" }
    }

    await dbConnect()

    // שליפת הזמנות המטפל
    const professionalBookings = await Booking.find({
      professionalId: professionalId
    })
    .populate("treatmentId", "name defaultDurationMinutes pricingType")
    .populate("userId", "name email phone")
    .populate("addressId", "fullAddress city street streetNumber")
    .populate("professionalId", "name")
    .populate("bookingAddressSnapshot")
    .sort({ createdAt: -1 })
    .lean()

    // שליפת הזמנות ממתינות למטפל
    const pendingBookings = await Booking.find({
      status: "pending_professional"
    })
    .populate("treatmentId", "name defaultDurationMinutes pricingType")
    .populate("userId", "name email phone")
    .populate("addressId", "fullAddress city street streetNumber")
    .populate("bookingAddressSnapshot")
    .sort({ createdAt: -1 })
    .lean()

    // קטגוריזציה של הזמנות
    const notifications: PopulatedBooking[] = []
    const assigned: PopulatedBooking[] = []
    const completed: PopulatedBooking[] = []

    // עיבוד הזמנות המטפל הקיימות
    for (const booking of professionalBookings) {
      const populatedBooking = booking as unknown as PopulatedBooking

      // הזמנות מאושרות - הזמנות שהמטפל קיבל
      if (["confirmed", "on_way"].includes(booking.status)) {
        assigned.push(populatedBooking)
      }
      // הזמנות שהושלמו
      else if (["completed", "pending_review", "reviewed"].includes(booking.status)) {
        completed.push(populatedBooking)
      }
    }

    // בדיקת התאמה להזמנות ממתינות
    for (const booking of pendingBookings) {
      try {
        // בדיקה האם המטפל מתאים להזמנה זו
        const suitableProfessionals = await ProfessionalMatchingService.findSuitableProfessionals(
          booking._id.toString(),
          { minMatchScore: 0.7 }
        )
        
        // בדיקה האם המטפל הנוכחי ברשימת המתאימים
        const isProfessionalSuitable = suitableProfessionals.some(
          match => match.professional.userId._id.toString() === professionalId
        )

        if (isProfessionalSuitable) {
          notifications.push(booking as unknown as PopulatedBooking)
        }
      } catch (error) {
        logger.error("Error checking professional suitability:", error)
        // במקרה של שגיאה, נוסיף את ההזמנה בכל זאת
        notifications.push(booking as unknown as PopulatedBooking)
      }
    }

    // חישוב סטטיסטיקות
    const statistics = await calculateProfessionalStatistics(professionalId)

    return {
      success: true,
      data: {
        notifications,
        assigned,
        completed,
        statistics
      }
    }
  } catch (error) {
    logger.error("Error fetching professional bookings:", error)
    return {
      success: false,
      error: "שגיאה בשליפת הזמנות המטפל"
    }
  }
}

/**
 * חישוב סטטיסטיקות מטפל
 */
async function calculateProfessionalStatistics(professionalId: string) {
  try {
    const now = new Date()
    
    // תחילת היום
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    // תחילת השבוע
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    // תחילת החודש
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // כל הזמנות המטפל
    const allBookings = await Booking.find({
      professionalId: professionalId
    }).lean()

    // הזמנות החודש
    const monthlyBookings = allBookings.filter(booking => 
      booking.createdAt >= startOfMonth
    )

    // הזמנות שהושלמו
    const completedBookings = allBookings.filter(booking => 
      ["completed", "reviewed"].includes(booking.status)
    )

    // חישוב שיעור קבלה (מתוך כל התגובות)
    const totalResponses = allBookings.length
    const acceptedBookings = allBookings.filter(booking => 
      booking.professionalId?.toString() === professionalId
    )
    const acceptanceRate = totalResponses > 0 ? (acceptedBookings.length / totalResponses) * 100 : 0

    // חישוב שיעור השלמה
    const assignedBookings = allBookings.filter(booking => 
      ["confirmed", "on_way", "completed", "reviewed"].includes(booking.status)
    )
    const completionRate = assignedBookings.length > 0 ? (completedBookings.length / assignedBookings.length) * 100 : 0

    // חישוב דירוג ממוצע (מתוך ביקורות)
    const reviewedBookings = completedBookings.filter(booking => 
      (booking as any).clientReview?.rating
    )
    const averageRating = reviewedBookings.length > 0 ? 
      reviewedBookings.reduce((sum, booking) => sum + ((booking as any).clientReview?.rating || 0), 0) / reviewedBookings.length : 0

    // חישוב הכנסות
    const todayEarnings = completedBookings
      .filter(booking => (booking as any).treatmentCompletedAt && (booking as any).treatmentCompletedAt >= startOfDay)
      .reduce((sum, booking) => sum + (booking.priceDetails?.totalProfessionalPayment || 0), 0)

    const weekEarnings = completedBookings
      .filter(booking => (booking as any).treatmentCompletedAt && (booking as any).treatmentCompletedAt >= startOfWeek)
      .reduce((sum, booking) => sum + (booking.priceDetails?.totalProfessionalPayment || 0), 0)

    const monthEarnings = completedBookings
      .filter(booking => (booking as any).treatmentCompletedAt && (booking as any).treatmentCompletedAt >= startOfMonth)
      .reduce((sum, booking) => sum + (booking.priceDetails?.totalProfessionalPayment || 0), 0)

    return {
      totalBookings: monthlyBookings.length,
      acceptanceRate: Math.round(acceptanceRate),
      completionRate: Math.round(completionRate),
      averageRating: Math.round(averageRating * 10) / 10,
      earnings: {
        today: todayEarnings,
        week: weekEarnings,
        month: monthEarnings
      }
    }
  } catch (error) {
    logger.error("Error calculating professional statistics:", error)
    return {
      totalBookings: 0,
      acceptanceRate: 0,
      completionRate: 0,
      averageRating: 0,
      earnings: {
        today: 0,
        week: 0,
        month: 0
      }
    }
  }
}

/**
 * קבלת פרטי מטפל
 */
export async function getProfessionalProfile(professionalId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("professional")) {
      return { success: false, error: "אין הרשאה לצפות בפרטי מטפל" }
    }

    if (session.user.id !== professionalId) {
      return { success: false, error: "אין הרשאה לצפות בפרטי מטפל אחר" }
    }

    await dbConnect()

    const professional = await ProfessionalProfile.findOne({ userId: professionalId })
      .populate("userId", "name email phone")
      .lean()

    if (!professional) {
      return { success: false, error: "מטפל לא נמצא" }
    }

    return {
      success: true,
      data: professional
    }
  } catch (error) {
    logger.error("Error fetching professional profile:", error)
    return {
      success: false,
      error: "שגיאה בשליפת פרטי המטפל"
    }
  }
} 