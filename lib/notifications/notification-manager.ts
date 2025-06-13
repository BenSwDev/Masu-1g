import { emailService } from "./email-service"
import { smsService } from "./sms-service"
import { logNotification, storeDevOTP } from "./notification-utils"
import { logger } from "@/lib/logs/logger"
import type {
  NotificationRecipient,
  EmailRecipient,
  PhoneRecipient,
  NotificationResult,
  NotificationData,
  OTPNotificationData,
  WelcomeNotificationData,
  PasswordResetNotificationData,
} from "./notification-types"

/**
 * Notification manager to handle different notification types
 */
export class NotificationManager {
  private isDevelopment: boolean

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === "development"
  }

  /**
   * Send a notification
   * @param recipient Recipient information
   * @param data Notification data
   * @returns Result of the send operation
   */
  async sendNotification(recipient: NotificationRecipient, data: NotificationData): Promise<NotificationResult> {
    logger.info(`Sending ${data.type} notification to ${recipient.type}: ${recipient.value}`)

    // In development mode, just log the notification
    if (this.isDevelopment) {
      logNotification(recipient.type === "email" ? "email" : "sms", recipient.value, data)
      return { success: true }
    }

    // Validate recipient type
    if (recipient.type === "email") {
      if (!emailService.isConfigured()) {
        logger.error("Email service not configured")
        return {
          success: false,
          error: "Email service not configured",
        }
      }
      return emailService.sendNotification(recipient as EmailRecipient, data)
    } else if (recipient.type === "phone") {
      if (!smsService.isConfigured()) {
        logger.error("SMS service not configured")
        return {
          success: false,
          error: "SMS service not configured",
        }
      }
      return smsService.sendNotification(recipient as PhoneRecipient, data)
    } else {
      logger.error(`Invalid recipient type: ${recipient.type}`)
      return {
        success: false,
        error: `Invalid recipient type: ${recipient.type}`,
      }
    }
  }

  /**
   * Send an OTP notification
   * @param recipient Recipient information
   * @param length Length of the OTP code (default: 6)
   * @param expiryMinutes Expiration time in minutes (default: 10)
   * @returns OTP code and send result
   */
  async sendOTP(
    recipient: EmailRecipient | PhoneRecipient,
    length: number = 6,
    expiryMinutes: number = 10,
  ): Promise<{ code: string; expiryDate: Date; result: NotificationResult }> {
    const code = this.generateOTP(length)
    // Calculate expiry time in UTC to ensure consistency across timezones
    const expiryDate = new Date(Date.now() + expiryMinutes * 60 * 1000)

    // In development mode, store and log the OTP
    if (this.isDevelopment) {
      // Store the OTP for verification
      storeDevOTP(recipient.value, recipient.type, code)
      
      logNotification(recipient.type === "email" ? "email" : "sms", recipient.value, { 
        code, 
        expiryDate,
        expiresIn: expiryMinutes 
      })
      return { code, expiryDate, result: { success: true } }
    }

    // In production, actually send the notification
    try {
      const data: OTPNotificationData = { type: "otp", code, expiresIn: expiryMinutes }
      if (recipient.type === "email") {
        await emailService.sendNotification(recipient, data)
      } else {
        await smsService.sendNotification(recipient, data)
      }
      return { code, expiryDate, result: { success: true } }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      const errorStack = error instanceof Error ? error.stack : undefined
      logger.error("Failed to send OTP:", {
        error: errorMessage,
        stack: errorStack,
        recipientType: recipient.type,
        recipientValue: recipient.value,
        language: recipient.language
      })
      return {
        code,
        expiryDate,
        result: {
          success: false,
          error: errorMessage,
          details: {
            type: recipient.type,
            value: recipient.value,
            language: recipient.language
          }
        },
      }
    }
  }

  /**
   * Generate a random OTP code
   * @param length Length of the OTP code
   * @returns Generated OTP code
   */
  private generateOTP(length: number): string {
    const digits = "0123456789"
    let otp = ""
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)]
    }
    return otp
  }

  /**
   * Send a welcome notification
   * @param recipient Recipient information
   * @param name Recipient name
   * @returns Send result
   */
  async sendWelcome(recipient: EmailRecipient, name: string): Promise<NotificationResult> {
    // In development mode, just log the welcome message
    if (this.isDevelopment) {
      logNotification("email", recipient.value, { type: "welcome", name })
      return { success: true }
    }

    // In production, actually send the welcome email
    try {
      const data: WelcomeNotificationData = { type: "welcome", name }
      await emailService.sendNotification(recipient, data)
      return { success: true }
    } catch (error) {
      logger.error("Failed to send welcome email:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send welcome email",
      }
    }
  }

  /**
   * Send a password reset notification
   * @param recipient Recipient information
   * @param resetUrl Password reset URL
   * @param expiryMinutes Expiration time in minutes (default: 60)
   * @returns Send result
   */
  async sendPasswordReset(
    recipient: EmailRecipient,
    resetUrl: string,
    expiryMinutes: number,
  ): Promise<NotificationResult> {
    // In development mode, just log the password reset
    if (this.isDevelopment) {
      logNotification("email", recipient.value, { type: "password-reset", resetUrl, expiresIn: expiryMinutes })
      return { success: true }
    }

    // In production, actually send the password reset email
    try {
      const data: PasswordResetNotificationData = { type: "password-reset", resetUrl, expiresIn: expiryMinutes }
      await emailService.sendNotification(recipient, data)
      return { success: true }
    } catch (error) {
      logger.error("Failed to send password reset email:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send password reset email",
      }
    }
  }
}

// Export a singleton instance
export const notificationManager = new NotificationManager()
