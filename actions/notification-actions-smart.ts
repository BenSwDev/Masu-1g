"use server"

import { smartNotificationService } from "@/lib/notifications/smart-notification-service"
import type { INotificationPreferences } from "@/lib/db/models/user"
import { logger } from "@/lib/logs/logger"
import type { NotificationData } from "@/lib/notifications/notification-types"

/**
 * Send OTP to user using their preferred method
 */
export async function sendOTPToUser(
  userId: string,
  length: number = 6,
  expiryMinutes: number = 10
): Promise<{
  success: boolean
  message: string
  code?: string
  expiryDate?: Date
  sentVia?: string[]
  error?: string
}> {
  try {
    const { code, expiryDate, results } = await smartNotificationService.sendOTPToUser(
      userId, 
      length, 
      expiryMinutes
    )

    const successfulMethods = results
      .map((result, index) => result.success ? (index === 0 ? 'primary' : 'secondary') : null)
      .filter(Boolean)

    const hasSuccess = results.some(r => r.success)

    if (hasSuccess) {
      logger.info(`OTP sent to user ${userId} via preferred methods`)
      return {
        success: true,
        message: "OTP sent successfully via your preferred method(s)",
        code,
        expiryDate,
        sentVia: successfulMethods as string[]
      }
    } else {
      const errorMessage = results[0]?.error || "Failed to send OTP"
      logger.error(`Failed to send OTP to user ${userId}:`, errorMessage)
      return {
        success: false,
        message: errorMessage,
        error: "SEND_FAILED"
      }
    }
  } catch (error) {
    logger.error(`Error sending OTP to user ${userId}:`, error)
    return {
      success: false,
      message: "An unexpected error occurred",
      error: "UNKNOWN_ERROR"
    }
  }
}

/**
 * Send booking confirmation to user
 */
export async function sendBookingConfirmationToUser(
  userId: string,
  bookingData: {
    recipientName: string
    bookerName?: string
    treatmentName: string
    bookingDateTime: Date
    bookingNumber: string
    bookingAddress: string
    isForSomeoneElse: boolean
  }
): Promise<{ success: boolean; message: string; sentVia?: string[]; error?: string }> {
  try {
    const notificationData: NotificationData = {
      type: "treatment-booking-success",
      ...bookingData
    }

    const results = await smartNotificationService.sendToUser(userId, notificationData)
    const hasSuccess = results.some(r => r.success)

    if (hasSuccess) {
      const sentVia = results.map((_, index) => index === 0 ? 'email' : 'sms').filter((_, index) => results[index].success)
      logger.info(`Booking confirmation sent to user ${userId}`)
      return {
        success: true,
        message: "Booking confirmation sent via your preferred method(s)",
        sentVia
      }
    } else {
      const errorMessage = results[0]?.error || "Failed to send booking confirmation"
      return {
        success: false,
        message: errorMessage,
        error: "SEND_FAILED"
      }
    }
  } catch (error) {
    logger.error(`Error sending booking confirmation to user ${userId}:`, error)
    return {
      success: false,
      message: "An unexpected error occurred",
      error: "UNKNOWN_ERROR"
    }
  }
}

/**
 * Send purchase confirmation to user
 */
export async function sendPurchaseConfirmationToUser(
  userId: string,
  message: string
): Promise<{ success: boolean; message: string; sentVia?: string[]; error?: string }> {
  try {
    const notificationData: NotificationData = {
      type: "purchase-success",
      message
    }

    const results = await smartNotificationService.sendToUser(userId, notificationData)
    const hasSuccess = results.some(r => r.success)

    if (hasSuccess) {
      const sentVia = results.map((_, index) => index === 0 ? 'email' : 'sms').filter((_, index) => results[index].success)
      logger.info(`Purchase confirmation sent to user ${userId}`)
      return {
        success: true,
        message: "Purchase confirmation sent via your preferred method(s)",
        sentVia
      }
    } else {
      const errorMessage = results[0]?.error || "Failed to send purchase confirmation"
      return {
        success: false,
        message: errorMessage,
        error: "SEND_FAILED"
      }
    }
  } catch (error) {
    logger.error(`Error sending purchase confirmation to user ${userId}:`, error)
    return {
      success: false,
      message: "An unexpected error occurred",
      error: "UNKNOWN_ERROR"
    }
  }
}

/**
 * Send notification to professional about new booking
 */
export async function sendProfessionalBookingNotification(
  professionalId: string,
  bookingData: {
    treatmentName: string
    bookingDateTime: Date
    clientName: string
    location: string
  }
): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const notificationData: NotificationData = {
      type: "professional-booking-notification",
      ...bookingData
    }

    const results = await smartNotificationService.sendToProfessional(professionalId, notificationData)
    const hasSuccess = results.some(r => r.success)

    if (hasSuccess) {
      logger.info(`Professional booking notification sent to ${professionalId}`)
      return {
        success: true,
        message: "Professional notified successfully"
      }
    } else {
      const errorMessage = results[0]?.error || "Failed to notify professional"
      return {
        success: false,
        message: errorMessage,
        error: "SEND_FAILED"
      }
    }
  } catch (error) {
    logger.error(`Error sending professional notification:`, error)
    return {
      success: false,
      message: "An unexpected error occurred",
      error: "UNKNOWN_ERROR"
    }
  }
}

/**
 * Send notification to guest (no user account)
 */
export async function sendGuestNotification(
  email: string,
  phone: string | null,
  data: NotificationData,
  language: "he" | "en" | "ru" = "he",
  name?: string
): Promise<{ success: boolean; message: string; sentVia?: string[]; error?: string }> {
  try {
    const results = await smartNotificationService.sendToGuest(email, phone, data, language, name)
    const hasSuccess = results.some(r => r.success)

    if (hasSuccess) {
      const sentVia = results.map((_, index) => index === 0 ? 'email' : 'sms').filter((_, index) => results[index].success)
      logger.info(`Guest notification sent to ${email}`)
      return {
        success: true,
        message: "Notification sent successfully",
        sentVia
      }
    } else {
      const errorMessage = results[0]?.error || "Failed to send notification"
      return {
        success: false,
        message: errorMessage,
        error: "SEND_FAILED"
      }
    }
  } catch (error) {
    logger.error(`Error sending guest notification:`, error)
    return {
      success: false,
      message: "An unexpected error occurred",
      error: "UNKNOWN_ERROR"
    }
  }
}

/**
 * Update user notification preferences
 */
export async function updateUserNotificationPreferences(
  userId: string,
  preferences: Partial<INotificationPreferences>
): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const result = await smartNotificationService.updateUserPreferences(userId, preferences)
    
    if (result.success) {
      return {
        success: true,
        message: "Notification preferences updated successfully"
      }
    } else {
      return {
        success: false,
        message: result.error || "Failed to update preferences",
        error: "UPDATE_FAILED"
      }
    }
  } catch (error) {
    logger.error(`Error updating notification preferences for user ${userId}:`, error)
    return {
      success: false,
      message: "An unexpected error occurred",
      error: "UNKNOWN_ERROR"
    }
  }
}

/**
 * Get user notification preferences
 */
export async function getUserNotificationPreferences(
  userId: string
): Promise<{ success: boolean; preferences?: INotificationPreferences; error?: string }> {
  try {
    const preferences = await smartNotificationService.getUserPreferences(userId)
    
    if (preferences) {
      return {
        success: true,
        preferences
      }
    } else {
      return {
        success: false,
        error: "User not found or preferences not set"
      }
    }
  } catch (error) {
    logger.error(`Error getting notification preferences for user ${userId}:`, error)
    return {
      success: false,
      error: "An unexpected error occurred"
    }
  }
}

/**
 * Send notification to multiple users
 */
export async function sendNotificationToMultipleUsers(
  userIds: string[],
  data: NotificationData
): Promise<{ 
  success: boolean; 
  results: { [userId: string]: { success: boolean; sentVia?: string[]; error?: string } };
  message: string;
}> {
  try {
    const results = await smartNotificationService.sendToMultipleUsers(userIds, data)
    
    const processedResults: { [userId: string]: { success: boolean; sentVia?: string[]; error?: string } } = {}
    let successCount = 0
    
    Object.entries(results).forEach(([userId, userResults]) => {
      const hasSuccess = userResults.some(r => r.success)
      if (hasSuccess) {
        successCount++
        const sentVia = userResults.map((_, index) => index === 0 ? 'email' : 'sms').filter((_, index) => userResults[index].success)
        processedResults[userId] = { success: true, sentVia }
      } else {
        const error = userResults[0]?.error || "Failed to send notification"
        processedResults[userId] = { success: false, error }
      }
    })

    return {
      success: successCount > 0,
      results: processedResults,
      message: `Sent notifications to ${successCount}/${userIds.length} users`
    }
  } catch (error) {
    logger.error(`Error sending notifications to multiple users:`, error)
    return {
      success: false,
      results: {},
      message: "An unexpected error occurred"
    }
  }
} 