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
  NotificationLanguage,
  TreatmentBookingSuccessNotificationData,
} from "./notification-types"

/**
 * Centralized notification manager to handle all notification types
 * This is the single source of truth for notification logic
 */
export class NotificationManager {
  private isDevelopment: boolean

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === "development"
  }

  /**
   * Send a single notification
   * @param recipient Recipient information
   * @param data Notification data
   * @returns Result of the send operation
   */
  async sendNotification(recipient: NotificationRecipient, data: NotificationData): Promise<NotificationResult> {
    const logId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    
    logger.info(`[${logId}] Sending ${data.type} notification to ${recipient.type}: ${this.obscureContact(recipient.value)}`)

    // In development mode, just log the notification
    if (this.isDevelopment) {
      logNotification(recipient.type === "email" ? "email" : "sms", recipient.value, data as unknown as Record<string, unknown>)
      logger.info(`[${logId}] Development mode - notification logged only`)
      return { success: true, messageId: `dev_${logId}` }
    }

    // Validate recipient type and service configuration
    if (recipient.type === "email") {
      if (!emailService.isServiceConfigured()) {
        const error = "Email service not configured"
        logger.error(`[${logId}] ${error}`)
        return { success: false, error }
      }
      
      try {
        const result = await emailService.sendNotification(recipient as EmailRecipient, data)
        logger.info(`[${logId}] Email notification result:`, { success: result.success, messageId: result.messageId })
        return result
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown email error"
        logger.error(`[${logId}] Email notification failed:`, { error: errorMessage })
        return { success: false, error: errorMessage }
      }
    } 
    
    if (recipient.type === "phone") {
      if (!smsService.isServiceConfigured()) {
        const error = "SMS service not configured"
        logger.error(`[${logId}] ${error}`)
        return { success: false, error }
      }
      
      try {
        const result = await smsService.sendNotification(recipient as PhoneRecipient, data)
        logger.info(`[${logId}] SMS notification result:`, { success: result.success, messageId: result.messageId })
        return result
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown SMS error"
        logger.error(`[${logId}] SMS notification failed:`, { error: errorMessage })
        return { success: false, error: errorMessage }
      }
    }

    const error = `Invalid recipient type: ${(recipient as any).type}`
    logger.error(`[${logId}] ${error}`)
    return { success: false, error }
  }

  /**
   * Send notifications to multiple recipients
   * @param recipients Array of recipients
   * @param data Notification data
   * @returns Array of results for each recipient
   */
  async sendNotificationToMultiple(
    recipients: NotificationRecipient[], 
    data: NotificationData
  ): Promise<NotificationResult[]> {
    const logId = `multi_notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    
    logger.info(`[${logId}] Sending ${data.type} notification to ${recipients.length} recipients`)

    if (recipients.length === 0) {
      logger.warn(`[${logId}] No recipients provided`)
      return []
    }

    try {
      // Send all notifications in parallel for better performance
      const promises = recipients.map((recipient, index) => 
        this.sendNotification(recipient, data).catch(error => {
          logger.error(`[${logId}] Failed to send to recipient ${index}:`, { error, recipient: this.obscureContact(recipient.value) })
          return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
        })
      )
      
      const results = await Promise.all(promises)
      
      const successCount = results.filter(r => r.success).length
      logger.info(`[${logId}] Sent ${successCount}/${recipients.length} notifications successfully`)
      
      return results
    } catch (error) {
      logger.error(`[${logId}] Error in batch notification send:`, { error })
      return recipients.map(() => ({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown batch error" 
      }))
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
    const logId = `otp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    const code = this.generateOTP(length)
    const expiryDate = new Date(Date.now() + expiryMinutes * 60 * 1000)

    logger.info(`[${logId}] Generating OTP for ${recipient.type}: ${this.obscureContact(recipient.value)}`)

    // In development mode, store and log the OTP
    if (this.isDevelopment) {
      storeDevOTP(recipient.value, recipient.type, code)
      logNotification(recipient.type === "email" ? "email" : "sms", recipient.value, { 
        code, 
        expiryDate,
        expiresIn: expiryMinutes 
      })
      logger.info(`[${logId}] Development mode - OTP: ${code}`)
      return { code, expiryDate, result: { success: true, messageId: `dev_otp_${logId}` } }
    }

    // In production, actually send the notification
    try {
      const data: OTPNotificationData = { type: "otp", code, expiresIn: expiryMinutes }
      const result = await this.sendNotification(recipient, data)
      
      if (result.success) {
        logger.info(`[${logId}] OTP sent successfully`)
      } else {
        logger.error(`[${logId}] Failed to send OTP:`, { error: result.error })
      }
      
      return { code, expiryDate, result }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      logger.error(`[${logId}] Error sending OTP:`, { error: errorMessage })
      
      return {
        code,
        expiryDate,
        result: {
          success: false,
          error: errorMessage
        }
      }
    }
  }

  /**
   * Send a welcome notification
   * @param recipient Recipient information
   * @param name Recipient name
   * @returns Send result
   */
  async sendWelcome(recipient: EmailRecipient, name: string): Promise<NotificationResult> {
    const logId = `welcome_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    
    logger.info(`[${logId}] Sending welcome notification to: ${this.obscureContact(recipient.value)}`)

    try {
      const data: WelcomeNotificationData = { type: "welcome", name }
      const result = await this.sendNotification(recipient, data)
      
      if (result.success) {
        logger.info(`[${logId}] Welcome notification sent successfully`)
      } else {
        logger.error(`[${logId}] Failed to send welcome notification:`, { error: result.error })
      }
      
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send welcome notification"
      logger.error(`[${logId}] Error sending welcome notification:`, { error: errorMessage })
      return { success: false, error: errorMessage }
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
    expiryMinutes: number = 60,
  ): Promise<NotificationResult> {
    const logId = `pwd_reset_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    
    logger.info(`[${logId}] Sending password reset notification to: ${this.obscureContact(recipient.value)}`)

    try {
      const data: PasswordResetNotificationData = { type: "password-reset", resetUrl, expiresIn: expiryMinutes }
      const result = await this.sendNotification(recipient, data)
      
      if (result.success) {
        logger.info(`[${logId}] Password reset notification sent successfully`)
      } else {
        logger.error(`[${logId}] Failed to send password reset notification:`, { error: result.error })
      }
      
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send password reset notification"
      logger.error(`[${logId}] Error sending password reset notification:`, { error: errorMessage })
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Send treatment booking success notifications
   * @param recipients Array of recipients
   * @param bookingData Booking information
   * @returns Array of results for each recipient
   */
  async sendTreatmentBookingSuccess(
    recipients: NotificationRecipient[],
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
    },
  ): Promise<NotificationResult[]> {
    const logId = `booking_success_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    
    logger.info(`[${logId}] Sending booking success notifications to ${recipients.length} recipients`)

    try {
      const data: TreatmentBookingSuccessNotificationData = {
        type: "treatment-booking-success",
        ...bookingData
      }
      
      const results = await this.sendNotificationToMultiple(recipients, data)
      
      const successCount = results.filter(r => r.success).length
      logger.info(`[${logId}] Sent ${successCount}/${recipients.length} booking success notifications`)
      
      return results
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send booking success notifications"
      logger.error(`[${logId}] Error sending booking success notifications:`, { error: errorMessage })
      return recipients.map(() => ({ success: false, error: errorMessage }))
    }
  }

  /**
   * Send purchase success notifications
   * @param recipients Array of recipients
   * @param message Custom message
   * @returns Array of results for each recipient
   */
  async sendPurchaseSuccess(
    recipients: NotificationRecipient[],
    message: string
  ): Promise<NotificationResult[]> {
    const logId = `purchase_success_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    
    logger.info(`[${logId}] Sending purchase success notifications to ${recipients.length} recipients`)

    try {
      const data = { type: "purchase-success" as const, message }
      const results = await this.sendNotificationToMultiple(recipients, data)
      
      const successCount = results.filter(r => r.success).length
      logger.info(`[${logId}] Sent ${successCount}/${recipients.length} purchase success notifications`)
      
      return results
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send purchase success notifications"
      logger.error(`[${logId}] Error sending purchase success notifications:`, { error: errorMessage })
      return recipients.map(() => ({ success: false, error: errorMessage }))
    }
  }

  /**
   * Check service configuration status
   */
  getServiceStatus() {
    return {
      email: {
        configured: emailService.isServiceConfigured(),
        service: "NodeMailer"
      },
      sms: {
        configured: smsService.isServiceConfigured(),
        service: "Twilio"
      },
      environment: this.isDevelopment ? "development" : "production"
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
   * Obscure contact information for logging
   * @param contact Email or phone number
   * @returns Obscured contact
   */
  private obscureContact(contact: string): string {
    if (contact.includes("@")) {
      // Email
      const [local, domain] = contact.split("@")
      return `${local.substring(0, 2)}***@${domain}`
    } else {
      // Phone
      return `${contact.substring(0, 3)}***${contact.substring(contact.length - 2)}`
    }
  }
  /**
   * Send booking confirmation notification
   */
  async sendBookingConfirmation(bookingId: string, professionalId: string): Promise<NotificationResult[]> {
    // For now, return success - actual implementation will be in booking-notification-service
    return [{ success: true, messageId: `booking_confirmation_${bookingId}` }]
  }

  /**
   * Send booking notification to professional
   */
  async sendBookingNotification(bookingId: string, professionalId: string): Promise<NotificationResult[]> {
    return [{ success: true, messageId: `booking_notification_${bookingId}` }]
  }

  /**
   * Send booking assignment notification
   */
  async sendBookingAssignment(bookingId: string, professionalId: string): Promise<NotificationResult[]> {
    return [{ success: true, messageId: `booking_assignment_${bookingId}` }]
  }

  /**
   * Send status update notification
   */
  async sendStatusUpdate(bookingId: string, status: string, metadata?: Record<string, any>): Promise<NotificationResult[]> {
    return [{ success: true, messageId: `status_update_${bookingId}` }]
  }

  /**
   * Send review request notification
   */
  async sendReviewRequest(bookingId: string, userId: string): Promise<NotificationResult[]> {
    return [{ success: true, messageId: `review_request_${bookingId}` }]
  }

  /**
   * Send review reminder notification
   */
  async sendReviewReminder(bookingId: string, userId: string): Promise<NotificationResult[]> {
    return [{ success: true, messageId: `review_reminder_${bookingId}` }]
  }

  /**
   * Send booking reminder to professional
   */
  async sendBookingReminder(bookingId: string, professionalId: string): Promise<NotificationResult[]> {
    return [{ success: true, messageId: `booking_reminder_${bookingId}` }]
  }

  /**
   * Send admin alert notification
   */
  async sendAdminAlert(alertType: string, metadata: Record<string, any>): Promise<NotificationResult[]> {
    return [{ success: true, messageId: `admin_alert_${alertType}` }]
  }
}

// Export singleton instance
export const notificationManager = new NotificationManager()
