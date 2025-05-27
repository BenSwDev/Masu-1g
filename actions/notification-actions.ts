"use server"

import { validateEmail, validatePhone } from "@/lib/auth/auth"
import { notificationManager } from "@/lib/notifications/notification-manager"
import type { EmailRecipient, PhoneRecipient, NotificationLanguage } from "@/lib/notifications/notification-types"
import { obscureEmail, obscurePhone } from "@/lib/notifications/notification-utils"
import dbConnect from "@/lib/db/mongoose"
import User from "@/lib/db/models/user"
import { logger } from "@/lib/logs/logger"
import VerificationQueries from "@/lib/db/queries/verification-queries"
import VerificationToken from "@/lib/db/models/verification-token"
import { getDevOTP, clearDevOTP } from "@/lib/notifications/notification-utils"
import type { IUser } from "@/lib/db/models/user"
import type { Document } from "mongoose"
import { hashPassword } from "@/lib/auth/auth"

// In-memory OTP storage (in production, should use Redis or similar)
const otpStore = new Map<string, { code: string; expiryDate: Date; attempts: number }>()

/**
 * Generate and send OTP to email or phone
 */
export async function generateAndSendOTP(
  identifier: string,
  identifierType: "email" | "phone",
  language: NotificationLanguage = "en",
): Promise<{
  success: boolean
  message: string
  obscuredIdentifier?: string
  expiryMinutes?: number
  error?: string
}> {
  const otpId = `otp_gen_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

  try {
    logger.info(
      `[${otpId}] Generating OTP for ${identifierType}: ${
        identifierType === "email"
          ? `${identifier.substring(0, 3)}***${identifier.split("@")[1]}`
          : `${identifier.substring(0, 5)}***${identifier.substring(identifier.length - 3)}`
      }, language: ${language}`,
    )

    // Validate the identifier
    if (identifierType === "email" && !validateEmail(identifier)) {
      logger.warn(`[${otpId}] Invalid email address: ${identifier.substring(0, 3)}***${identifier.split("@")[1]}`)
      return {
        success: false,
        message: "Invalid email address",
        error: "INVALID_EMAIL",
      }
    } else if (identifierType === "phone" && !validatePhone(identifier)) {
      logger.warn(`[${otpId}] Invalid phone number: ${identifier.substring(0, 5)}***`)
      return {
        success: false,
        message: "Invalid phone number",
        error: "INVALID_PHONE",
      }
    }

    // In development mode, skip user verification and database connection
    if (process.env.NODE_ENV === "development") {
      // Create recipient object
      const recipient: EmailRecipient | PhoneRecipient =
        identifierType === "email"
          ? {
              type: "email",
              value: identifier,
              language,
            }
          : {
              type: "phone",
              value: identifier,
              language,
            }

      logger.info(`[${otpId}] Sending OTP to recipient type: ${identifierType} (development mode)`)
      const { code, expiryDate, result } = await notificationManager.sendOTP(recipient, 6, 10)
      logger.info(`[${otpId}] OTP send result: ${result.success ? "Success" : "Failed"}`)

      if (!result.success) {
        logger.error(`[${otpId}] Failed to send OTP:`, result.error)
        return {
          success: false,
          message: result.error || "Failed to send OTP",
          error: "SEND_FAILED",
        }
      }

      return {
        success: true,
        message: "OTP sent successfully",
        obscuredIdentifier: identifierType === "email" ? obscureEmail(identifier) : obscurePhone(identifier),
        expiryMinutes: 10,
      }
    }

    // Production mode - check if user exists
    await dbConnect()
    logger.info(`[${otpId}] Database connection established`)

    // עדכון חיפוש משתמש לפי טלפון - תמיכה בפורמטים שונים
    let user
    if (identifierType === "email") {
      user = await User.findOne({ email: identifier.toLowerCase() }).lean()
    } else {
      // טיפול במספרי טלפון עם או בלי 0 בהתחלה
      if (identifier.startsWith("+")) {
        // מצא את המיקום של הספרה הראשונה אחרי קידומת המדינה
        let countryCodeEndIndex = 1 // אחרי ה-+
        while (countryCodeEndIndex < identifier.length && /\d/.test(identifier[countryCodeEndIndex])) {
          countryCodeEndIndex++
        }

        // חלץ את קידומת המדינה והמספר עצמו
        const countryCode = identifier.substring(0, countryCodeEndIndex)
        let nationalNumber = identifier.substring(countryCodeEndIndex)

        // הסר תווים שאינם ספרות
        nationalNumber = nationalNumber.replace(/\D/g, "")

        // צור גרסאות עם ובלי 0 בהתחלה
        const withZero = countryCode + "0" + nationalNumber
        const withoutZero = countryCode + nationalNumber

        // חפש את שתי הגרסאות
        user = await User.findOne({
          $or: [
            { phone: withZero },
            { phone: withoutZero },
            { phone: identifier }, // הגרסה המקורית
          ],
        }).lean()
      } else {
        user = await User.findOne({ phone: identifier }).lean()
      }
    }

    if (!user) {
      logger.warn(
        `[${otpId}] User not found for: ${
          identifierType === "email"
            ? `${identifier.substring(0, 3)}***${identifier.split("@")[1]}`
            : `${identifier.substring(0, 5)}***${identifier.substring(identifier.length - 3)}`
        }`,
      )
      return {
        success: false,
        message: "User not found",
        error: "USER_NOT_FOUND",
      }
    }

    logger.info(`[${otpId}] User found: ${user._id}, name: ${user.name}`)

    // Check for existing OTP and throttle if needed
    const storeKey = `${identifierType}:${identifier}`
    const existingOTP = otpStore.get(storeKey)
    if (existingOTP) {
      const now = new Date()
      const timeDiff = (now.getTime() - existingOTP.expiryDate.getTime()) / 1000

      // If last OTP was generated less than 60 seconds ago
      if (timeDiff > -540 && timeDiff < 0) {
        // 9 minutes elapsed from 10 minute expiry
        logger.warn(
          `[${otpId}] OTP request throttled for: ${
            identifierType === "email"
              ? `${identifier.substring(0, 3)}***${identifier.split("@")[1]}`
              : `${identifier.substring(0, 5)}***${identifier.substring(identifier.length - 3)}`
          }`,
        )
        return {
          success: false,
          message: "Please wait before requesting a new code",
          error: "THROTTLED",
          obscuredIdentifier: identifierType === "email" ? obscureEmail(identifier) : obscurePhone(identifier),
        }
      }
    }

    // Create recipient object
    const recipient: EmailRecipient | PhoneRecipient =
      identifierType === "email"
        ? {
            type: "email",
            value: identifier,
            language,
            name: user.name,
          }
        : {
            type: "phone",
            value: identifier,
            language,
          }

    logger.info(`[${otpId}] Sending OTP to recipient type: ${identifierType}`)
    const { code, expiryDate, result } = await notificationManager.sendOTP(recipient, 6, 10)
    logger.info(`[${otpId}] OTP send result: ${result.success ? "Success" : "Failed"}`)

    if (!result.success) {
      logger.error(`[${otpId}] Failed to send OTP:`, result.error)
      return {
        success: false,
        message: result.error || "Failed to send OTP",
        error: "SEND_FAILED",
      }
    }

    // Store OTP in database
    await VerificationQueries.createOTP(identifier, identifierType, code, 10)
    logger.info(`[${otpId}] OTP stored in database, expires in 10 minutes`)

    // Return success response
    return {
      success: true,
      message: "OTP sent successfully",
      obscuredIdentifier: identifierType === "email" ? obscureEmail(identifier) : obscurePhone(identifier),
      expiryMinutes: 10,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const errorStack = error instanceof Error ? error.stack : undefined
    logger.error(`[${otpId}] Error generating OTP:`, {
      error: errorMessage,
      stack: errorStack,
      identifierType,
      identifier: identifierType === "email" 
        ? `${identifier.substring(0, 3)}***${identifier.split("@")[1]}`
        : `${identifier.substring(0, 5)}***${identifier.substring(identifier.length - 3)}`,
      language
    })
    return {
      success: false,
      message: "An unexpected error occurred",
      error: "UNKNOWN_ERROR"
    }
  }
}

/**
 * Verify OTP code
 */
export async function verifyOTP(
  identifier: string,
  identifierType: "email" | "phone",
  code: string,
): Promise<{
  success: boolean
  message: string
  error?: string
  userId?: string
}> {
  const otpId = `otp_verify_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

  try {
    logger.info(`[${otpId}] Verifying OTP for ${identifierType}: ${identifier}`)

    // In development mode, use the development OTP storage
    if (process.env.NODE_ENV === "development") {
      const storedCode = getDevOTP(identifier, identifierType)
      
      if (!storedCode) {
        logger.warn(`[${otpId}] No OTP found for ${identifierType}: ${identifier}`)
        return {
          success: false,
          message: "Invalid or expired code",
          error: "INVALID_OTP",
        }
      }

      if (storedCode !== code) {
        logger.warn(`[${otpId}] Invalid OTP code for ${identifierType}: ${identifier}`)
        return {
          success: false,
          message: "Invalid code",
          error: "INVALID_OTP",
        }
      }

      // Clear the OTP after successful verification
      clearDevOTP(identifier, identifierType)
      
      // In development mode, return the real user ID if exists
      try {
        await dbConnect()
        const user = await User.findOne({ [identifierType]: identifier }).select('_id').lean()
        if (!user) {
          logger.warn(`[${otpId}] Dev user not found for ${identifierType}: ${identifier}`)
          return {
            success: false,
            message: "Dev user not found",
            error: "USER_NOT_FOUND",
          }
        }
        logger.info(`[${otpId}] OTP verified successfully for ${identifierType}: ${identifier}`)
        return {
          success: true,
          message: "OTP verified successfully",
          userId: user._id.toString(),
        }
      } catch (error) {
        logger.error(`[${otpId}] Database error during user lookup:`, error)
        return {
          success: false,
          message: "Database error during verification",
          error: "DATABASE_ERROR",
        }
      }
    }

    // Production mode - use the database
    try {
      await dbConnect()
      logger.info(`[${otpId}] Database connection established`)

      // Find and verify the token in a single operation
      const token = await VerificationToken.findOneAndUpdate(
        {
          identifier,
          identifierType,
          code,
          expiresAt: { $gt: new Date() },
          attempts: { $lt: 3 } // Limit attempts
        },
        {
          $inc: { attempts: 1 },
          $set: { lastAttempt: new Date() }
        },
        { new: true }
      ).lean()

      if (!token) {
        logger.warn(`[${otpId}] Invalid or expired OTP for ${identifierType}: ${identifier}`)
        return {
          success: false,
          message: "Invalid or expired code",
          error: "INVALID_OTP",
        }
      }

      // Find user in parallel with token verification
      const user = await User.findOne({ [identifierType]: identifier }).select('_id').lean()
      if (!user) {
        logger.warn(`[${otpId}] User not found for ${identifierType}: ${identifier}`)
        return {
          success: false,
          message: "User not found",
          error: "USER_NOT_FOUND",
        }
      }

      // Delete the used token
      await VerificationToken.deleteOne({ _id: token._id })

      logger.info(`[${otpId}] OTP verified successfully for ${identifierType}: ${identifier}`)
      return {
        success: true,
        message: "OTP verified successfully",
        userId: user._id.toString(),
      }
    } catch (error) {
      logger.error(`[${otpId}] Error during OTP verification:`, error)
      return {
        success: false,
        message: "Error during verification",
        error: "VERIFICATION_ERROR",
      }
    }
  } catch (error) {
    logger.error(`[${otpId}] Unexpected error during OTP verification:`, error)
    return {
      success: false,
      message: "Unexpected error during verification",
      error: "UNEXPECTED_ERROR",
    }
  }
}

/**
 * Send a welcome email to a new user
 */
export async function sendWelcomeEmail(
  email: string,
  name: string,
  language: NotificationLanguage = "en",
): Promise<{
  success: boolean
  message: string
}> {
  const welcomeId = `welcome_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

  try {
    logger.info(
      `[${welcomeId}] Sending welcome email to: ${email.substring(0, 3)}***${email.split("@")[1]}, name: ${name}`,
    )

    const recipient: EmailRecipient = {
      type: "email",
      value: email,
      language,
      name,
    }

    const result = await notificationManager.sendWelcome(recipient, name)
    logger.info(`[${welcomeId}] Welcome email result: ${result.success ? "Success" : "Failed"}`)

    return {
      success: result.success,
      message: result.success ? "Welcome email sent" : result.error || "Failed to send welcome email",
    }
  } catch (error) {
    logger.error(`[${welcomeId}] Error sending welcome email:`, error)
    return {
      success: false,
      message: "An unexpected error occurred",
    }
  }
}

/**
 * Send a test notification (for development/testing purposes)
 */
export async function sendTestNotification(
  recipient: string,
  type: "email" | "phone",
  notificationType: "otp" | "welcome" | "password-reset" | "appointment" | "custom",
  language: NotificationLanguage = "en",
  customMessage?: string,
): Promise<{
  success: boolean
  message: string
  details?: any
}> {
  const testId = `test_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

  try {
    logger.info(
      `[${testId}] Sending test ${notificationType} notification to ${type}: ${
        type === "email"
          ? `${recipient.substring(0, 3)}***${recipient.split("@")[1]}`
          : `${recipient.substring(0, 3)}***${recipient.substring(recipient.length - 3)}`
      }`,
    )

    // Validate recipient
    if (type === "email" && !validateEmail(recipient)) {
      logger.warn(`[${testId}] Invalid email address format`)
      return {
        success: false,
        message: "Invalid email address",
      }
    } else if (type === "phone" && !validatePhone(recipient)) {
      logger.warn(`[${testId}] Invalid phone number format`)
      return {
        success: false,
        message: "Invalid phone number",
      }
    }

    // Create recipient object
    const recipientObj =
      type === "email"
        ? { type: "email" as const, value: recipient, language }
        : { type: "phone" as const, value: recipient, language }

    let result
    let details

    // Send appropriate notification type
    switch (notificationType) {
      case "otp":
        logger.info(`[${testId}] Sending test OTP`)
        const otpResult = await notificationManager.sendOTP(recipientObj, 6, 10)
        result = otpResult.result
        details = { code: otpResult.code, expiryDate: otpResult.expiryDate }
        break

      case "welcome":
        logger.info(`[${testId}] Sending test welcome message`)
        if (type === "email") {
          result = await notificationManager.sendWelcome(recipientObj as EmailRecipient, "Test User")
        } else {
          result = { success: false, error: "Cannot send welcome to phone" }
        }
        break

      case "password-reset":
        logger.info(`[${testId}] Sending test password reset`)
        if (type === "email") {
          result = await notificationManager.sendPasswordReset(
            recipientObj as EmailRecipient,
            `${process.env.NEXTAUTH_URL}/reset-password?token=test-token`,
            60,
          )
        } else {
          result = { success: false, error: "Cannot send password reset to phone" }
        }
        break

      case "appointment":
        logger.info(`[${testId}] Sending test appointment reminder`)
        const appointmentDate = new Date()
        appointmentDate.setDate(appointmentDate.getDate() + 2) // 2 days from now

        result = await notificationManager.sendAppointmentReminder(
          recipientObj,
          appointmentDate,
          "Test Service",
          "Test Location",
        )
        break

      case "custom":
        logger.info(`[${testId}] Sending test custom notification`)
        result = await notificationManager.sendCustom(
          recipientObj,
          customMessage || "This is a test custom notification",
          "Test Notification",
          "Test Title",
        )
        break

      default:
        logger.warn(`[${testId}] Invalid notification type: ${notificationType}`)
        return {
          success: false,
          message: "Invalid notification type",
        }
    }

    logger.info(`[${testId}] Test notification result: ${result.success ? "Success" : "Failed"}`)
    return {
      success: result.success,
      message: result.success ? "Test notification sent" : result.error || "Failed to send test notification",
      details,
    }
  } catch (error) {
    logger.error(`[${testId}] Error sending test notification:`, error)
    return {
      success: false,
      message: "An unexpected error occurred",
    }
  }
}

// Update the sendOTP function to handle both email and phone recipients
export async function sendOTP(
  identifier: string,
  identifierType: "email" | "phone",
  language: NotificationLanguage = "en",
): Promise<{
  success: boolean
  message: string
  error?: string
}> {
  const otpId = `otp_gen_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

  try {
    logger.info(`[${otpId}] Sending OTP to ${identifierType}: ${identifier}`)

    // Create recipient object based on type
    let recipient: EmailRecipient | PhoneRecipient
    if (identifierType === "email") {
      recipient = { type: "email", value: identifier, language }
    } else {
      recipient = { type: "phone", value: identifier, language }
    }

    // Generate and send OTP
    const { code, expiryDate, result } = await notificationManager.sendOTP(recipient)

    if (!result.success) {
      logger.error(`[${otpId}] Failed to send OTP:`, result.error)
      return {
        success: false,
        message: "Failed to send OTP",
        error: result.error,
      }
    }

    logger.info(`[${otpId}] OTP send result: Success`)
    return {
      success: true,
      message: "OTP sent successfully",
    }
  } catch (error) {
    logger.error(`[${otpId}] Error sending OTP:`, error)
    return {
      success: false,
      message: "An unexpected error occurred",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
