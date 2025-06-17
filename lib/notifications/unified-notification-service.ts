import { notificationManager } from "./notification-manager"
import type { NotificationRecipient, NotificationData, NotificationResult } from "./notification-types"
import { logger } from "@/lib/logs/logger"

interface UnifiedNotificationServiceReturn {
  sendNotification: (recipient: NotificationRecipient, data: NotificationData) => Promise<NotificationResult>
  sendNotificationToMultiple: (recipients: NotificationRecipient[], data: NotificationData) => Promise<NotificationResult[]>
  sendOTP: (recipient: NotificationRecipient, length?: number, expiryMinutes?: number) => Promise<{ code: string; expiryDate: Date; result: NotificationResult }>
  sendWelcome: (recipient: NotificationRecipient, name: string) => Promise<NotificationResult>
  sendPasswordReset: (recipient: NotificationRecipient, resetUrl: string, expiryMinutes?: number) => Promise<NotificationResult>
  sendTreatmentBookingSuccess: (recipients: NotificationRecipient[], bookingData: {
    recipientName: string
    bookerName?: string
    treatmentName: string
    bookingDateTime: Date
    bookingNumber: string
    bookingAddress: string
    isForSomeoneElse: boolean
    isBookerForSomeoneElse?: boolean
    actualRecipientName?: string
  }) => Promise<NotificationResult[]>
  sendPurchaseSuccess: (recipients: NotificationRecipient[], message: string) => Promise<NotificationResult[]>
  isEmailConfigured: boolean
  isSMSConfigured: boolean
}

/**
 * Unified notification service for sending SMS and Email with proper configuration checking
 * Handles missing RESEND_API_KEY and Twilio configuration gracefully
 */
class UnifiedNotificationService {
  private isEmailConfigured: boolean
  private isSMSConfigured: boolean

  constructor() {
    // Check if services are configured
    this.isEmailConfigured = Boolean(process.env.RESEND_API_KEY)
    this.isSMSConfigured = Boolean(
      process.env.TWILIO_ACCOUNT_SID && 
      process.env.TWILIO_AUTH_TOKEN && 
      process.env.TWILIO_ACCOUNT_SID.startsWith('AC')
    )
  }

  private logConfigurationWarning(type: 'email' | 'sms'): void {
    if (type === 'email' && !this.isEmailConfigured) {
      console.warn("RESEND_API_KEY not configured, skipping email notification")
      logger.warn("RESEND_API_KEY not configured, skipping email notification")
    } else if (type === 'sms' && !this.isSMSConfigured) {
      console.warn("Twilio not configured, skipping SMS notification")
      logger.warn("Twilio not configured, skipping SMS notification")
    }
  }

  async sendNotification(
    recipient: NotificationRecipient, 
    data: NotificationData
  ): Promise<NotificationResult> {
    try {
      // Check configuration and log warning if needed
      if (recipient.type === 'email') {
        this.logConfigurationWarning('email')
        if (!this.isEmailConfigured) {
          return { success: false, error: "Email service not configured" }
        }
      } else if (recipient.type === 'phone') {
        this.logConfigurationWarning('sms')
        if (!this.isSMSConfigured) {
          return { success: false, error: "SMS service not configured" }
        }
      }

      const result = await notificationManager.sendNotification(recipient, data)
      return result
    } catch (error) {
      logger.error("Failed to send notification:", {
        error: error instanceof Error ? error.message : String(error),
        recipientType: recipient.type,
        recipientValue: recipient.value,
        notificationType: data.type
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown notification error"
      }
    }
  }

  async sendNotificationToMultiple(
    recipients: NotificationRecipient[], 
    data: NotificationData
  ): Promise<NotificationResult[]> {
    try {
      // Filter recipients based on available services
      const filteredRecipients = recipients.filter(recipient => {
        if (recipient.type === 'email') {
          if (!this.isEmailConfigured) {
            this.logConfigurationWarning('email')
            return false
          }
        } else if (recipient.type === 'phone') {
          if (!this.isSMSConfigured) {
            this.logConfigurationWarning('sms')
            return false
          }
        }
        return true
      })

      if (filteredRecipients.length === 0) {
        logger.warn("No configured notification services available for recipients")
        return recipients.map(() => ({ success: false, error: "No configured notification services" }))
      }

      const promises = filteredRecipients.map(recipient => 
        notificationManager.sendNotification(recipient, data)
      )
      
      const results = await Promise.all(promises)
      
      // Fill in failed results for filtered out recipients
      const fullResults: NotificationResult[] = []
      let resultIndex = 0
      
      recipients.forEach(recipient => {
        const wasFiltered = (
          (recipient.type === 'email' && !this.isEmailConfigured) ||
          (recipient.type === 'phone' && !this.isSMSConfigured)
        )
        
        if (wasFiltered) {
          fullResults.push({ 
            success: false, 
            error: `${recipient.type === 'email' ? 'Email' : 'SMS'} service not configured` 
          })
        } else {
          fullResults.push(results[resultIndex])
          resultIndex++
        }
      })
      
      return fullResults
    } catch (error) {
      logger.error("Failed to send notifications to multiple recipients:", {
        error: error instanceof Error ? error.message : String(error),
        recipientCount: recipients.length,
        notificationType: data.type
      })
      return recipients.map(() => ({
        success: false,
        error: error instanceof Error ? error.message : "Unknown notification error"
      }))
    }
  }

  async sendOTP(
    recipient: NotificationRecipient,
    length: number = 6,
    expiryMinutes: number = 10
  ): Promise<{ code: string; expiryDate: Date; result: NotificationResult }> {
    try {
      // Check configuration
      if (recipient.type === 'email' && !this.isEmailConfigured) {
        this.logConfigurationWarning('email')
        const code = Array.from({ length }, () => Math.floor(Math.random() * 10)).join("")
        const expiryDate = new Date(Date.now() + expiryMinutes * 60 * 1000)
        return { 
          code, 
          expiryDate, 
          result: { success: false, error: "Email service not configured" } 
        }
      } else if (recipient.type === 'phone' && !this.isSMSConfigured) {
        this.logConfigurationWarning('sms')
        const code = Array.from({ length }, () => Math.floor(Math.random() * 10)).join("")
        const expiryDate = new Date(Date.now() + expiryMinutes * 60 * 1000)
        return { 
          code, 
          expiryDate, 
          result: { success: false, error: "SMS service not configured" } 
        }
      }

      return await notificationManager.sendOTP(recipient as any, length, expiryMinutes)
    } catch (error) {
      logger.error("Failed to send OTP:", {
        error: error instanceof Error ? error.message : String(error),
        recipientType: recipient.type,
        recipientValue: recipient.value
      })
      const code = Array.from({ length }, () => Math.floor(Math.random() * 10)).join("")
      const expiryDate = new Date(Date.now() + expiryMinutes * 60 * 1000)
      return {
        code,
        expiryDate,
        result: {
          success: false,
          error: error instanceof Error ? error.message : "Unknown OTP error"
        }
      }
    }
  }

  async sendWelcome(
    recipient: NotificationRecipient,
    name: string
  ): Promise<NotificationResult> {
    if (recipient.type !== 'email') {
      return { success: false, error: "Welcome notifications only support email" }
    }

    return this.sendNotification(recipient, { type: 'welcome', name })
  }

  async sendPasswordReset(
    recipient: NotificationRecipient,
    resetUrl: string,
    expiryMinutes: number = 60
  ): Promise<NotificationResult> {
    if (recipient.type !== 'email') {
      return { success: false, error: "Password reset notifications only support email" }
    }

    return this.sendNotification(recipient, { 
      type: 'password-reset', 
      resetUrl, 
      expiresIn: expiryMinutes 
    })
  }

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
    }
  ): Promise<NotificationResult[]> {
    return this.sendNotificationToMultiple(recipients, {
      type: 'treatment-booking-success',
      ...bookingData
    })
  }

  async sendPurchaseSuccess(
    recipients: NotificationRecipient[],
    message: string
  ): Promise<NotificationResult[]> {
    return this.sendNotificationToMultiple(recipients, {
      type: 'purchase-success',
      message
    })
  }

  get serviceStatus() {
    return {
      isEmailConfigured: this.isEmailConfigured,
      isSMSConfigured: this.isSMSConfigured
    }
  }
}

// Export a singleton instance
export const unifiedNotificationService = new UnifiedNotificationService()

// Export the service interface for convenience
export type { UnifiedNotificationServiceReturn } 