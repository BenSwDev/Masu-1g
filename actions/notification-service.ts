import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"
import mongoose from "mongoose"

/**
 * General Notification Service
 *
 * This file contains notification functions that are NOT related to professional booking notifications.
 * Professional booking notifications are now handled by the unified-professional-notifications system.
 */

// =====================================
// OTP FUNCTIONS
// =====================================

/**
 * Send OTP to user's phone
 */
export async function sendOTP(
  phone: string,
  language: "he" | "en" | "ru" = "he"
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    await dbConnect()

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    // Store OTP in database (simplified for now)
    // TODO: Create proper OTP verification model if needed

    // TODO: Implement SMS sending when SMS service is available
    // For now, just log the OTP for development
    logger.info(`OTP for ${phone}: ${otp}`)

    return {
      success: true,
      messageId: `dev-${Date.now()}`,
    }
  } catch (error) {
    logger.error("Error sending OTP:", error)
    return {
      success: false,
      error: "Failed to send OTP",
    }
  }
}

/**
 * Verify OTP
 */
export async function verifyOTP(
  phone: string,
  otp: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await dbConnect()

    // TODO: Implement proper OTP verification when model is available
    // For now, return success for development
    return { success: true }
  } catch (error) {
    logger.error("Error verifying OTP:", error)
    return { success: false, error: "Failed to verify OTP" }
  }
}

// =====================================
// USER NOTIFICATION PREFERENCES
// =====================================

/**
 * Get user notification preferences
 */
export async function getUserNotificationPreferences(
  userId: string
): Promise<{ success: boolean; preferences?: any; error?: string }> {
  try {
    await dbConnect()

    const User = (await import("@/lib/db/models/user")).default
    const user = await User.findById(userId).select("notificationPreferences").lean()

    if (!user) {
      return { success: false, error: "User not found" }
    }

    return {
      success: true,
      preferences: user.notificationPreferences || {
        methods: ["sms"],
        language: "he",
      },
    }
  } catch (error) {
    logger.error("Error getting user notification preferences:", error)
    return { success: false, error: "Failed to get preferences" }
  }
}

/**
 * Update user notification preferences
 */
export async function updateUserNotificationPreferences(
  userId: string,
  preferences: {
    methods?: string[]
    language?: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await dbConnect()

    const User = (await import("@/lib/db/models/user")).default

    await User.findByIdAndUpdate(userId, {
      $set: {
        notificationPreferences: preferences,
      },
    })

    return { success: true }
  } catch (error) {
    logger.error("Error updating user notification preferences:", error)
    return { success: false, error: "Failed to update preferences" }
  }
}

// =====================================
// BOOKING CONFIRMATION NOTIFICATIONS
// =====================================

/**
 * Send booking confirmation to user
 */
export async function sendBookingConfirmationToUser(
  userId: string,
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await dbConnect()

    const User = (await import("@/lib/db/models/user")).default
    const Booking = (await import("@/lib/db/models/booking")).default

    const [user, booking] = await Promise.all([
      User.findById(userId).select("name email phone notificationPreferences").lean(),
      Booking.findById(bookingId).populate("treatmentId", "name").lean(),
    ])

    if (!user || !booking) {
      return { success: false, error: "User or booking not found" }
    }

    // TODO: Implement actual notification sending when notification service is available
    logger.info(`Booking confirmation for user ${userId}, booking ${bookingId}`)

    return { success: true }
  } catch (error) {
    logger.error("Error sending booking confirmation:", error)
    return { success: false, error: "Failed to send confirmation" }
  }
}

/**
 * Send notification to user (registered user)
 */
export async function sendUserNotification(
  userId: string,
  notificationData: any
): Promise<{ success: boolean; error?: string }> {
  try {
    await dbConnect()

    const User = (await import("@/lib/db/models/user")).default
    const user = await User.findById(userId)
      .select("name email phone notificationPreferences")
      .lean()

    if (!user) {
      return { success: false, error: "User not found" }
    }

    // TODO: Implement actual notification sending
    logger.info(`User notification for ${userId}:`, notificationData)

    return { success: true }
  } catch (error) {
    logger.error("Error sending user notification:", error)
    return { success: false, error: "Failed to send notification" }
  }
}

/**
 * Send notification to guest (non-registered user)
 */
export async function sendGuestNotification(
  guestInfo: {
    name: string
    email?: string
    phone?: string
    language?: string
  },
  notificationData: any
): Promise<{ success: boolean; error?: string }> {
  try {
    // TODO: Implement actual notification sending
    logger.info(`Guest notification for ${guestInfo.name}:`, notificationData)

    return { success: true }
  } catch (error) {
    logger.error("Error sending guest notification:", error)
    return { success: false, error: "Failed to send notification" }
  }
}

// =====================================
// PROFESSIONAL RESPONSE FUNCTIONS
// =====================================

/**
 * Get professional responses for a booking
 */
export async function getProfessionalResponses(
  bookingId: string
): Promise<{ success: boolean; responses?: any[]; error?: string }> {
  try {
    await dbConnect()

    // TODO: Implement when professional response model is available
    return { success: true, responses: [] }
  } catch (error) {
    logger.error("Error getting professional responses:", error)
    return { success: false, error: "Failed to get responses" }
  }
}

/**
 * Handle professional response to booking notification
 */
export async function handleProfessionalResponse(
  responseId: string,
  action: "accept" | "decline",
  responseMethod: "sms" | "app" | "phone" = "sms"
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    await dbConnect()

    // TODO: Implement when professional response model is available
    logger.info(`Professional response: ${responseId} - ${action}`)

    return {
      success: true,
      message: `Response ${action}ed successfully`,
    }
  } catch (error) {
    logger.error("Error handling professional response:", error)
    return { success: false, error: "Failed to process response" }
  }
}

/**
 * Resend notifications to professionals (admin only)
 */
export async function resendProfessionalNotifications(
  bookingId: string
): Promise<{ success: boolean; sentCount?: number; error?: string }> {
  const session = await getServerSession(authOptions)
  if (!session?.user || !session.user.roles.includes("admin")) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    // TODO: Implement when unified notification system is available
    logger.info(`Resending professional notifications for booking ${bookingId}`)

    return { success: true, sentCount: 0 }
  } catch (error) {
    logger.error("Error resending professional notifications:", error)
    return { success: false, error: "Failed to resend notifications" }
  }
}
