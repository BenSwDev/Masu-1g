"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import mongoose from "mongoose"
import { logger } from "@/lib/logs/logger"
import { revalidatePath } from "next/cache"

// Define abandoned booking interface
interface AbandonedBooking {
  _id?: string
  userId: string
  treatmentId: string
  selectedDurationId?: string
  bookingDateTime: Date
  customAddressDetails?: any
  selectedAddressId?: string
  isBookingForSomeoneElse?: boolean
  recipientName?: string
  recipientPhone?: string
  recipientEmail?: string
  recipientBirthDate?: Date
  recipientGender?: string
  recipientNotificationMethods?: string[]
  notificationLanguage?: string
  priceDetails: any
  paymentDetails: any
  notes?: string
  consents?: any
  step: number
  abandonedAt: Date
  lastModified: Date
  expiresAt: Date
}

// Simple in-memory collection for abandoned bookings (temporary solution)
// In production, this should be a proper MongoDB collection
const abandonedBookingsCollection = new Map<string, AbandonedBooking>()

/**
 * Save abandoned booking data for later recovery
 */
export async function saveAbandonedBooking(
  userId: string,
  bookingData: Partial<AbandonedBooking>
): Promise<{ success: boolean; abandonedBookingId?: string; error?: string }> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.id !== userId) {
      return { success: false, error: "common.unauthorized" }
    }

    await dbConnect()

    const abandonedBookingId = `${userId}_${Date.now()}`
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // Expire after 24 hours

    const abandonedBooking: AbandonedBooking = {
      _id: abandonedBookingId,
      userId,
      treatmentId: bookingData.treatmentId || "",
      selectedDurationId: bookingData.selectedDurationId,
      bookingDateTime: bookingData.bookingDateTime || new Date(),
      customAddressDetails: bookingData.customAddressDetails,
      selectedAddressId: bookingData.selectedAddressId,
      isBookingForSomeoneElse: bookingData.isBookingForSomeoneElse || false,
      recipientName: bookingData.recipientName,
      recipientPhone: bookingData.recipientPhone,
      recipientEmail: bookingData.recipientEmail,
      recipientBirthDate: bookingData.recipientBirthDate,
      recipientGender: bookingData.recipientGender,
      recipientNotificationMethods: bookingData.recipientNotificationMethods,
      notificationLanguage: bookingData.notificationLanguage,
      priceDetails: bookingData.priceDetails || {},
      paymentDetails: bookingData.paymentDetails || {},
      notes: bookingData.notes,
      consents: bookingData.consents,
      step: bookingData.step || 1,
      abandonedAt: new Date(),
      lastModified: new Date(),
      expiresAt,
    }

    // Store in memory (in production, save to database)
    abandonedBookingsCollection.set(abandonedBookingId, abandonedBooking)

    // Clean up expired bookings
    cleanupExpiredAbandonedBookings()

    logger.info("Abandoned booking saved", {
      userId,
      abandonedBookingId,
      step: abandonedBooking.step,
    })

    return { success: true, abandonedBookingId }
  } catch (error) {
    logger.error("Error saving abandoned booking:", { error, userId })
    return { success: false, error: "common.unknown" }
  }
}

/**
 * Get abandoned booking data for recovery
 */
export async function getAbandonedBooking(userId: string): Promise<{
  success: boolean
  abandonedBooking?: AbandonedBooking
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.id !== userId) {
      return { success: false, error: "common.unauthorized" }
    }

    await dbConnect()

    // Clean up expired bookings first
    cleanupExpiredAbandonedBookings()

    // Find the most recent abandoned booking for this user
    let mostRecentBooking: AbandonedBooking | undefined
    let mostRecentTime = 0

    for (const [id, booking] of abandonedBookingsCollection.entries()) {
      if (booking.userId === userId && booking.abandonedAt.getTime() > mostRecentTime) {
        mostRecentBooking = booking
        mostRecentTime = booking.abandonedAt.getTime()
      }
    }

    if (!mostRecentBooking) {
      return { success: false, error: "bookings.errors.noAbandonedBookingFound" }
    }

    // Check if booking is still valid (not expired)
    if (new Date() > mostRecentBooking.expiresAt) {
      // Remove expired booking
      if (mostRecentBooking._id) {
        abandonedBookingsCollection.delete(mostRecentBooking._id)
      }
      return { success: false, error: "bookings.errors.abandonedBookingExpired" }
    }

    return { success: true, abandonedBooking: mostRecentBooking }
  } catch (error) {
    logger.error("Error getting abandoned booking:", { error, userId })
    return { success: false, error: "common.unknown" }
  }
}

/**
 * Delete abandoned booking after successful completion or manual deletion
 */
export async function deleteAbandonedBooking(
  userId: string,
  abandonedBookingId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.id !== userId) {
      return { success: false, error: "common.unauthorized" }
    }

    if (abandonedBookingId) {
      // Delete specific abandoned booking
      const booking = abandonedBookingsCollection.get(abandonedBookingId)
      if (booking && booking.userId === userId) {
        abandonedBookingsCollection.delete(abandonedBookingId)
        logger.info("Abandoned booking deleted", { userId, abandonedBookingId })
      }
    } else {
      // Delete all abandoned bookings for this user
      for (const [id, booking] of abandonedBookingsCollection.entries()) {
        if (booking.userId === userId) {
          abandonedBookingsCollection.delete(id)
        }
      }
      logger.info("All abandoned bookings deleted for user", { userId })
    }

    return { success: true }
  } catch (error) {
    logger.error("Error deleting abandoned booking:", { error, userId, abandonedBookingId })
    return { success: false, error: "common.unknown" }
  }
}

/**
 * Get all abandoned bookings (admin only)
 */
export async function getAbandonedBookings(
  filters: {
    userId?: string
    dateRange?: string
    page?: number
    limit?: number
  } = {}
): Promise<{
  success: boolean
  abandonedBookings?: AbandonedBooking[]
  totalPages?: number
  totalBookings?: number
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, error: "common.unauthorized" }
    }

    await dbConnect()

    // Clean up expired bookings first
    cleanupExpiredAbandonedBookings()

    const { userId, dateRange, page = 1, limit = 10 } = filters

    // Convert Map to Array for filtering and pagination
    let bookings = Array.from(abandonedBookingsCollection.values())

    // Apply filters
    if (userId) {
      bookings = bookings.filter(booking => booking.userId === userId)
    }

    if (dateRange) {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      switch (dateRange) {
        case "today":
          const endOfToday = new Date(today.getTime() + 24 * 60 * 60 * 1000)
          bookings = bookings.filter(
            booking => booking.abandonedAt >= today && booking.abandonedAt < endOfToday
          )
          break
        case "this_week":
          const startOfWeek = new Date(today)
          startOfWeek.setDate(today.getDate() - today.getDay())
          const endOfWeek = new Date(startOfWeek)
          endOfWeek.setDate(startOfWeek.getDate() + 7)
          bookings = bookings.filter(
            booking => booking.abandonedAt >= startOfWeek && booking.abandonedAt < endOfWeek
          )
          break
        case "this_month":
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
          bookings = bookings.filter(
            booking => booking.abandonedAt >= startOfMonth && booking.abandonedAt < endOfMonth
          )
          break
      }
    }

    // Sort by most recent first
    bookings.sort((a, b) => b.abandonedAt.getTime() - a.abandonedAt.getTime())

    const totalBookings = bookings.length
    const totalPages = Math.ceil(totalBookings / limit)

    // Apply pagination
    const startIndex = (page - 1) * limit
    const paginatedBookings = bookings.slice(startIndex, startIndex + limit)

    return {
      success: true,
      abandonedBookings: paginatedBookings,
      totalPages,
      totalBookings,
    }
  } catch (error) {
    logger.error("Error getting abandoned bookings:", { error, filters })
    return { success: false, error: "common.unknown" }
  }
}

/**
 * Update abandoned booking data
 */
export async function updateAbandonedBooking(
  userId: string,
  abandonedBookingId: string,
  updateData: Partial<AbandonedBooking>
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.id !== userId) {
      return { success: false, error: "common.unauthorized" }
    }

    const existingBooking = abandonedBookingsCollection.get(abandonedBookingId)
    if (!existingBooking || existingBooking.userId !== userId) {
      return { success: false, error: "bookings.errors.abandonedBookingNotFound" }
    }

    // Check if booking is still valid (not expired)
    if (new Date() > existingBooking.expiresAt) {
      abandonedBookingsCollection.delete(abandonedBookingId)
      return { success: false, error: "bookings.errors.abandonedBookingExpired" }
    }

    // Update the booking data
    const updatedBooking: AbandonedBooking = {
      ...existingBooking,
      ...updateData,
      lastModified: new Date(),
      // Don't allow changing these fields
      _id: existingBooking._id,
      userId: existingBooking.userId,
      abandonedAt: existingBooking.abandonedAt,
      expiresAt: existingBooking.expiresAt,
    }

    abandonedBookingsCollection.set(abandonedBookingId, updatedBooking)

    logger.info("Abandoned booking updated", {
      userId,
      abandonedBookingId,
      step: updatedBooking.step,
    })

    return { success: true }
  } catch (error) {
    logger.error("Error updating abandoned booking:", { error, userId, abandonedBookingId })
    return { success: false, error: "common.unknown" }
  }
}

/**
 * Check if user has any abandoned bookings
 */
export async function hasAbandonedBookings(userId: string): Promise<{
  success: boolean
  hasAbandoned?: boolean
  count?: number
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.id !== userId) {
      return { success: false, error: "common.unauthorized" }
    }

    // Clean up expired bookings first
    cleanupExpiredAbandonedBookings()

    let count = 0
    for (const booking of abandonedBookingsCollection.values()) {
      if (booking.userId === userId) {
        count++
      }
    }

    return {
      success: true,
      hasAbandoned: count > 0,
      count,
    }
  } catch (error) {
    logger.error("Error checking abandoned bookings:", { error, userId })
    return { success: false, error: "common.unknown" }
  }
}

/**
 * Clean up expired abandoned bookings
 */
function cleanupExpiredAbandonedBookings(): void {
  const now = new Date()
  const expiredIds: string[] = []

  for (const [id, booking] of abandonedBookingsCollection.entries()) {
    if (now > booking.expiresAt) {
      expiredIds.push(id)
    }
  }

  for (const id of expiredIds) {
    abandonedBookingsCollection.delete(id)
  }

  if (expiredIds.length > 0) {
    logger.info(`Cleaned up ${expiredIds.length} expired abandoned bookings`)
  }
}

/**
 * Get abandoned booking statistics (admin only)
 */
export async function getAbandonedBookingStats(): Promise<{
  success: boolean
  stats?: {
    total: number
    byStep: { [step: number]: number }
    byDay: { [date: string]: number }
    avgTimeToAbandon: number
  }
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, error: "common.unauthorized" }
    }

    // Clean up expired bookings first
    cleanupExpiredAbandonedBookings()

    const bookings = Array.from(abandonedBookingsCollection.values())
    const total = bookings.length

    // Group by step
    const byStep: { [step: number]: number } = {}
    bookings.forEach(booking => {
      byStep[booking.step] = (byStep[booking.step] || 0) + 1
    })

    // Group by day (last 7 days)
    const byDay: { [date: string]: number } = {}
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return date.toISOString().split("T")[0]
    })

    last7Days.forEach(date => {
      byDay[date] = 0
    })

    bookings.forEach(booking => {
      const date = booking.abandonedAt.toISOString().split("T")[0]
      if (byDay.hasOwnProperty(date)) {
        byDay[date]++
      }
    })

    // Calculate average time to abandon (in minutes)
    // This would require booking start time, for now we'll use a placeholder
    const avgTimeToAbandon = 15 // Placeholder: 15 minutes average

    return {
      success: true,
      stats: {
        total,
        byStep,
        byDay,
        avgTimeToAbandon,
      },
    }
  } catch (error) {
    logger.error("Error getting abandoned booking stats:", error)
    return { success: false, error: "common.unknown" }
  }
}
