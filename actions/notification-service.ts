"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import mongoose from "mongoose"
import { unifiedNotificationService } from "@/lib/notifications/unified-notification-service"
import { smartNotificationService } from "@/lib/notifications/smart-notification-service"
import { smsService } from "@/lib/notifications/sms-service"
import { logger } from "@/lib/logs/logger"
import { revalidatePath } from "next/cache"
import type { NotificationLanguage, NotificationData } from "@/lib/notifications/notification-types"
import VerificationQueries from "@/lib/db/queries/verification-queries"
import { obscureEmail, obscurePhone, getDevOTP, clearDevOTP } from "@/lib/notifications/notification-utils"
import { validateEmail, validatePhone } from "@/lib/auth/auth"

/**
 * 🚀 Unified Notification Service - Single Point of Entry
 * 
 * This service handles ALL notification needs across the entire project:
 * - OTP sending and verification
 * - User notifications (booking confirmations, welcome messages, etc.)
 * - Professional notifications (booking alerts, responses)
 * - Guest notifications (no user account required)
 * - Bulk notifications
 * 
 * Features:
 * - Smart routing based on user preferences
 * - Fallback mechanisms (email + SMS)
 * - Development mode support
 * - Comprehensive error handling
 * - Consistent API across all notification types
 */

// Type declarations for environments
declare const process: {
  env: {
    NODE_ENV?: string
    NEXT_PUBLIC_APP_URL?: string
    [key: string]: string | undefined
  }
}

// =====================================
// OTP SERVICES
// =====================================

/**
 * Generate and send OTP to email or phone
 */
export async function sendOTP(
  identifier: string,
  identifierType: "email" | "phone",
  language: NotificationLanguage = "he"
): Promise<{
  success: boolean
  message: string
  obscuredIdentifier?: string
  expiryMinutes?: number
  error?: string
}> {
  const otpId = `otp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

  try {
    logger.info(`[${otpId}] Sending OTP to ${identifierType}: ${identifier.substring(0, 3)}***`)

    // Validate identifier
    if (identifierType === "email" && !validateEmail(identifier)) {
      return { success: false, message: "Invalid email address", error: "INVALID_EMAIL" }
    }
    if (identifierType === "phone" && !validatePhone(identifier)) {
      return { success: false, message: "Invalid phone number", error: "INVALID_PHONE" }
    }

    // Development mode - skip user verification
    if (process.env.NODE_ENV === "development") {
      const recipient = identifierType === "email"
        ? { type: "email" as const, value: identifier, language }
        : { type: "phone" as const, value: identifier, language }

      const { code, expiryDate, result } = await unifiedNotificationService.sendOTP(recipient, 6, 10)

      if (!result.success) {
        logger.error(`[${otpId}] Failed to send OTP:`, result.error)
        return { success: false, message: result.error || "Failed to send OTP", error: "SEND_FAILED" }
      }

      return {
        success: true,
        message: "OTP sent successfully",
        obscuredIdentifier: identifierType === "email" ? obscureEmail(identifier) : obscurePhone(identifier),
        expiryMinutes: 10
      }
    }

    // Production mode - verify user exists
    await dbConnect()
    
    let user
    if (identifierType === "email") {
      user = await (await import("@/lib/db/models/user")).default.findOne({ email: identifier.toLowerCase() }).lean()
    } else {
      // Handle phone numbers with/without leading zero
      const User = (await import("@/lib/db/models/user")).default
      if (identifier.startsWith("+")) {
        const countryCodeMatch = identifier.match(/^(\+\d+)(.+)/)
        if (countryCodeMatch) {
          const [, countryCode, nationalNumber] = countryCodeMatch
          const cleanNumber = nationalNumber.replace(/\D/g, "")
          const withZero = countryCode + "0" + cleanNumber
          const withoutZero = countryCode + cleanNumber
          
          user = await User.findOne({
            $or: [
              { phone: withZero },
              { phone: withoutZero },
              { phone: identifier }
            ]
          }).lean()
        }
      } else {
        user = await User.findOne({ phone: identifier }).lean()
      }
    }

    if (!user) {
      logger.warn(`[${otpId}] User not found for ${identifierType}: ${identifier}`)
      return { success: false, message: "User not found", error: "USER_NOT_FOUND" }
    }

    // Create recipient and send OTP
    const recipient = identifierType === "email"
      ? { type: "email" as const, value: identifier, language, name: user.name }
      : { type: "phone" as const, value: identifier, language }

    const { code, expiryDate, result } = await unifiedNotificationService.sendOTP(recipient, 6, 10)

    if (!result.success) {
      logger.error(`[${otpId}] Failed to send OTP:`, result.error)
      return { success: false, message: result.error || "Failed to send OTP", error: "SEND_FAILED" }
    }

    // Store OTP in database
    await VerificationQueries.createOTP(identifier, identifierType, code, 10)

    return {
      success: true,
      message: "OTP sent successfully",
      obscuredIdentifier: identifierType === "email" ? obscureEmail(identifier) : obscurePhone(identifier),
      expiryMinutes: 10
    }

  } catch (error) {
    logger.error(`[${otpId}] Error sending OTP:`, error)
    return { success: false, message: "An unexpected error occurred", error: "UNKNOWN_ERROR" }
  }
}

/**
 * Verify OTP code
 */
export async function verifyOTP(
  identifier: string,
  identifierType: "email" | "phone",
  code: string
): Promise<{
  success: boolean
  message: string
  userId?: string
  error?: string
}> {
  const verifyId = `verify_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

  try {
    logger.info(`[${verifyId}] Verifying OTP for ${identifierType}: ${identifier}`)

    // Development mode
    if (process.env.NODE_ENV === "development") {
      const storedCode = getDevOTP(identifier, identifierType)
      
      if (!storedCode || storedCode !== code) {
        return { success: false, message: "Invalid or expired code", error: "INVALID_OTP" }
      }

      clearDevOTP(identifier, identifierType)

      // Get user ID in development
      try {
        await dbConnect()
        const User = (await import("@/lib/db/models/user")).default
        const user = await User.findOne({ [identifierType]: identifier }).select('_id').lean()
        
        if (!user) {
          return { success: false, message: "User not found", error: "USER_NOT_FOUND" }
        }

        return { success: true, message: "OTP verified successfully", userId: user._id.toString() }
      } catch (error) {
        return { success: false, message: "Database error during verification", error: "DATABASE_ERROR" }
      }
    }

    // Production mode
    await dbConnect()
    const VerificationToken = (await import("@/lib/db/models/verification-token")).default
    const User = (await import("@/lib/db/models/user")).default

    // Verify token
    const token = await VerificationToken.findOneAndUpdate(
      {
        identifier,
        identifierType,
        code,
        expiresAt: { $gt: new Date() },
        attempts: { $lt: 3 }
      },
      {
        $inc: { attempts: 1 },
        $set: { lastAttempt: new Date() }
      },
      { new: true }
    ).lean()

    if (!token) {
      return { success: false, message: "Invalid or expired code", error: "INVALID_OTP" }
    }

    // Find user
    const user = await User.findOne({ [identifierType]: identifier }).select('_id').lean()
    if (!user) {
      return { success: false, message: "User not found", error: "USER_NOT_FOUND" }
    }

    // Delete used token
    await VerificationToken.deleteOne({ _id: token._id })

    return { success: true, message: "OTP verified successfully", userId: user._id.toString() }

  } catch (error) {
    logger.error(`[${verifyId}] Error verifying OTP:`, error)
    return { success: false, message: "Unexpected error during verification", error: "UNEXPECTED_ERROR" }
  }
}

// =====================================
// USER NOTIFICATIONS
// =====================================

/**
 * Send notification to registered user (uses their preferences)
 */
export async function sendUserNotification(
  userId: string,
  data: NotificationData
): Promise<{ success: boolean; message: string; sentVia?: string[]; error?: string }> {
  try {
    const results = await smartNotificationService.sendToUser(userId, data)
    const hasSuccess = results.some(r => r.success)

    if (hasSuccess) {
      const sentVia = results.map((_, index) => index === 0 ? 'email' : 'sms').filter((_, index) => results[index].success)
      return { success: true, message: "Notification sent via preferred method(s)", sentVia }
    } else {
      const errorMessage = results[0]?.error || "Failed to send notification"
      return { success: false, message: errorMessage, error: "SEND_FAILED" }
    }
  } catch (error) {
    logger.error(`Error sending notification to user ${userId}:`, error)
    return { success: false, message: "An unexpected error occurred", error: "UNKNOWN_ERROR" }
  }
}

/**
 * Send OTP to user using their preferred method
 */
export async function sendUserOTP(
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
    const { code, expiryDate, results } = await smartNotificationService.sendOTPToUser(userId, length, expiryMinutes)
    const hasSuccess = results.some(r => r.success)

    if (hasSuccess) {
      const sentVia = results.map((_, index) => index === 0 ? 'primary' : 'secondary').filter((_, index) => results[index].success)
      return { success: true, message: "OTP sent via preferred method(s)", code, expiryDate, sentVia }
    } else {
      const errorMessage = results[0]?.error || "Failed to send OTP"
      return { success: false, message: errorMessage, error: "SEND_FAILED" }
    }
  } catch (error) {
    logger.error(`Error sending OTP to user ${userId}:`, error)
    return { success: false, message: "An unexpected error occurred", error: "UNKNOWN_ERROR" }
  }
}

/**
 * Send booking confirmation to user (alias for sendUserNotification)
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
    isBookerForSomeoneElse?: boolean
    actualRecipientName?: string
  }
): Promise<{ success: boolean; message: string; sentVia?: string[]; error?: string }> {
  return sendUserNotification(userId, {
    type: "treatment-booking-success",
    ...bookingData
  })
}

// =====================================
// PROFESSIONAL NOTIFICATIONS
// =====================================

/**
 * Send booking notification to suitable professionals
 */
export async function sendProfessionalBookingNotifications(
  bookingId: string
): Promise<{ success: boolean; sentCount?: number; error?: string }> {
  try {
    await dbConnect()
    
    const Booking = (await import("@/lib/db/models/booking")).default
    const ProfessionalResponse = (await import("@/lib/db/models/professional-response")).default
    
    // Get booking details
    const booking = await Booking.findById(bookingId)
      .populate('treatmentId')
      .populate('selectedDurationId')
    
    if (!booking) {
      return { success: false, error: "Booking not found" }
    }
    
    if (!["confirmed", "in_process"].includes(booking.status)) {
      return { success: false, error: "Booking is not in correct status for notifications" }
    }
    
    // Find suitable professionals
    const { findSuitableProfessionals } = await import("@/actions/booking-actions")
    const suitableResult = await findSuitableProfessionals(bookingId)
    
    if (!suitableResult.success || !suitableResult.professionals) {
      return { success: false, error: "No suitable professionals found" }
    }
    
    const professionals = suitableResult.professionals
    let sentCount = 0
    
    // Prepare notification data
    const treatmentName = booking.treatmentId?.name || "טיפול"
    const bookingDateTime = booking.bookingDateTime
    const address = `${booking.bookingAddressSnapshot?.street || ""} ${booking.bookingAddressSnapshot?.streetNumber || ""}, ${booking.bookingAddressSnapshot?.city || ""}`
    const price = booking.priceDetails?.finalAmount || 0
    
    // Send notifications to each suitable professional
    for (const professional of professionals) {
      try {
        if (!professional.userId?.phone) {
          console.log(`Professional ${professional.userId?.name} has no phone number`)
          continue
        }
        
        // Create response record
        const response = new ProfessionalResponse({
          bookingId: new mongoose.Types.ObjectId(bookingId),
          professionalId: professional.userId._id,
          phoneNumber: professional.userId.phone,
          status: "pending",
          expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
        })
        
        await response.save()

        // Prepare notification
        const responseLink = `${process.env.NEXT_PUBLIC_APP_URL}/professional/booking-response/${response._id.toString()}`
        const notificationData = {
          type: "professional-booking-notification" as const,
          treatmentName,
          bookingDateTime,
          address,
          price,
          responseLink
        }

        const userLanguage = professional.userId.preferredLanguage || "he"
        
        // Send SMS
        const smsResult = await smsService.sendNotification(
          {
            type: "phone",
            value: professional.userId.phone,
            language: userLanguage as "he" | "en" | "ru"
          },
          notificationData
        )

        if (smsResult.success) {
          response.smsMessageId = smsResult.messageId
          await response.save()
          sentCount++
          console.log(`✅ SMS sent to professional ${professional.userId.name}`)
        } else {
          console.error(`❌ Failed to send SMS to ${professional.userId.name}:`, smsResult.error)
          response.status = "expired"
          await response.save()
        }

        // Send email if available
        if (professional.userId.email) {
          await unifiedNotificationService.sendNotification(
            {
              type: "email",
              value: professional.userId.email,
              name: professional.userId.name,
              language: userLanguage as any
            },
            notificationData
          )
        }
        
      } catch (error) {
        console.error(`Error sending notification to professional ${professional.userId?.name}:`, error)
      }
    }
    
    console.log(`📱 Sent ${sentCount} notifications for booking ${bookingId}`)
    return { success: true, sentCount }
    
  } catch (error) {
    console.error("Error sending professional notifications:", error)
    return { success: false, error: "Failed to send notifications" }
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
    
    const ProfessionalResponse = (await import("@/lib/db/models/professional-response")).default
    const Booking = (await import("@/lib/db/models/booking")).default
    
    // Find response
    const response = await ProfessionalResponse.findById(responseId)
      .populate('professionalId', 'name phone')
      .populate('bookingId')
    
    if (!response) {
      return { success: false, error: "Response not found" }
    }
    
    // Validate response
    if (response.status !== "pending") {
      return { success: false, error: "Response already processed or expired" }
    }
    
    if (response.expiresAt < new Date()) {
      response.status = "expired"
      await response.save()
      return { success: false, error: "Response has expired" }
    }
    
    // Check booking availability
    const booking = response.bookingId
    if (!booking || booking.status !== "in_process" || booking.professionalId) {
      return { success: false, error: "Booking is no longer available" }
    }
    
    if (action === "accept") {
      // Accept booking
      await response.accept(responseMethod)
      
      // Assign professional
      const { assignProfessionalToBooking } = await import("@/actions/booking-actions")
      const assignResult = await assignProfessionalToBooking(
        booking._id.toString(),
        response.professionalId._id.toString()
      )
      
      if (assignResult.success) {
        // Expire other pending responses
        await ProfessionalResponse.updateMany(
          {
            bookingId: booking._id,
            _id: { $ne: response._id },
            status: "pending"
          },
          { status: "expired" }
        )
        
        revalidatePath("/dashboard/admin/bookings")
        revalidatePath("/dashboard/professional/booking-management")
        
        return { success: true, message: "ההזמנה נקבלה בהצלחה! תוכל לראות את הפרטים באפליקציה." }
      } else {
        response.status = "pending"
        await response.save()
        return { success: false, error: "Failed to assign booking" }
      }
      
    } else if (action === "decline") {
      await response.decline(responseMethod)
      return { success: true, message: "ההזמנה נדחתה. תודה על המענה המהיר." }
    }
    
    return { success: false, error: "Invalid action" }
    
  } catch (error) {
    console.error("Error handling professional response:", error)
    return { success: false, error: "Failed to process response" }
  }
}

// =====================================
// GUEST NOTIFICATIONS
// =====================================

/**
 * Send notification to guest (no user account)
 */
export async function sendGuestNotification(
  email: string,
  phone: string | null,
  data: NotificationData,
  language: NotificationLanguage = "he",
  name?: string
): Promise<{ success: boolean; message: string; sentVia?: string[]; error?: string }> {
  try {
    const results = await smartNotificationService.sendToGuest(email, phone, data, language, name)
    const hasSuccess = results.some(r => r.success)

    if (hasSuccess) {
      const sentVia = results.map((_, index) => index === 0 ? 'email' : 'sms').filter((_, index) => results[index].success)
      return { success: true, message: "Notification sent successfully", sentVia }
    } else {
      const errorMessage = results[0]?.error || "Failed to send notification"
      return { success: false, message: errorMessage, error: "SEND_FAILED" }
    }
  } catch (error) {
    logger.error("Error sending guest notification:", error)
    return { success: false, message: "An unexpected error occurred", error: "UNKNOWN_ERROR" }
  }
}

// =====================================
// BULK NOTIFICATIONS
// =====================================

/**
 * Send notification to multiple users
 */
export async function sendBulkUserNotifications(
  userIds: string[],
  data: NotificationData
): Promise<{ 
  success: boolean
  results: { [userId: string]: { success: boolean; sentVia?: string[]; error?: string } }
  message: string
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
    logger.error("Error sending bulk notifications:", error)
    return {
      success: false,
      results: {},
      message: "An unexpected error occurred"
    }
  }
}

// =====================================
// USER PREFERENCES
// =====================================

/**
 * Get user notification preferences
 */
export async function getUserNotificationPreferences(
  userId: string
): Promise<{ success: boolean; preferences?: any; error?: string }> {
  try {
    const preferences = await smartNotificationService.getUserPreferences(userId)
    
    if (preferences) {
      return { success: true, preferences }
    } else {
      return { success: false, error: "User not found or preferences not set" }
    }
  } catch (error) {
    logger.error(`Error getting notification preferences for user ${userId}:`, error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

/**
 * Update user notification preferences
 */
export async function updateUserNotificationPreferences(
  userId: string,
  preferences: any
): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const result = await smartNotificationService.updateUserPreferences(userId, preferences)
    
    if (result.success) {
      return { success: true, message: "Notification preferences updated successfully" }
    } else {
      return { success: false, message: result.error || "Failed to update preferences", error: "UPDATE_FAILED" }
    }
  } catch (error) {
    logger.error(`Error updating notification preferences for user ${userId}:`, error)
    return { success: false, message: "An unexpected error occurred", error: "UNKNOWN_ERROR" }
  }
}

// =====================================
// ADMIN FUNCTIONS
// =====================================

/**
 * Get professional responses for a booking (admin only)
 */
export async function getProfessionalResponses(
  bookingId: string
): Promise<{ success: boolean; responses?: any[]; error?: string }> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return { success: false, error: "Unauthorized" }
    }
    
    await dbConnect()
    
    const ProfessionalResponse = (await import("@/lib/db/models/professional-response")).default
    
    const responses = await ProfessionalResponse.find({
      bookingId: new mongoose.Types.ObjectId(bookingId)
    })
    .populate('professionalId', 'name phone email')
    .sort({ sentAt: -1 })
    .lean()
    
    return { success: true, responses }
    
  } catch (error) {
    console.error("Error getting professional responses:", error)
    return { success: false, error: "Failed to get responses" }
  }
}

/**
 * Resend notifications to professionals (admin only)
 */
export async function resendProfessionalNotifications(
  bookingId: string
): Promise<{ success: boolean; sentCount?: number; error?: string }> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return { success: false, error: "Unauthorized" }
    }
    
    await dbConnect()
    
    const Booking = (await import("@/lib/db/models/booking")).default
    const ProfessionalResponse = (await import("@/lib/db/models/professional-response")).default
    
    // Check booking status
    const booking = await Booking.findById(bookingId)
    if (!booking || booking.status !== "confirmed" || booking.professionalId) {
      return { success: false, error: "Booking is not available for assignment" }
    }
    
    // Expire pending responses
    await ProfessionalResponse.updateMany(
      {
        bookingId: new mongoose.Types.ObjectId(bookingId),
        status: "pending"
      },
      { status: "expired" }
    )
    
    // Send new notifications
    return await sendProfessionalBookingNotifications(bookingId)
    
  } catch (error) {
    console.error("Error resending professional notifications:", error)
    return { success: false, error: "Failed to resend notifications" }
  }
}

/**
 * Expire old pending responses (cron job)
 */
export async function expireOldResponses(): Promise<{ success: boolean; expiredCount?: number; error?: string }> {
  try {
    await dbConnect()
    
    const ProfessionalResponse = (await import("@/lib/db/models/professional-response")).default
    
    const result = await ProfessionalResponse.updateMany(
      {
        status: "pending",
        expiresAt: { $lt: new Date() }
      },
      { status: "expired" }
    )
    
    console.log(`⏰ Expired ${result.modifiedCount} old professional responses`)
    return { success: true, expiredCount: result.modifiedCount }
    
  } catch (error) {
    console.error("Error expiring old responses:", error)
    return { success: false, error: "Failed to expire responses" }
  }
} 