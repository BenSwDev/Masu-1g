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
 * This is a wrapper around the centralized notification manager
 */
class UnifiedNotificationService {
  private isEmailConfigured: boolean
  private isSMSConfigured: boolean

  constructor() {
    // Get service status from notification manager
    const status = notificationManager.getServiceStatus()
    this.isEmailConfigured = status.email.configured
    this.isSMSConfigured = status.sms.configured

    // Only log initialization in development or if there are configuration issues
    if (status.environment === "development" || !this.isEmailConfigured || !this.isSMSConfigured) {
      logger.info("Unified notification service initialized", {
        emailConfigured: this.isEmailConfigured,
        smsConfigured: this.isSMSConfigured,
        environment: status.environment
      })
    }
  }

  private logConfigurationWarning(type: 'email' | 'sms'): void {
    if (type === 'email' && !this.isEmailConfigured) {
      logger.warn("Email service not configured - check EMAIL_SERVER_* environment variables")
    } else if (type === 'sms' && !this.isSMSConfigured) {
      logger.warn("SMS service not configured - check TWILIO_* environment variables")
    }
  }

  async sendNotification(
    recipient: NotificationRecipient, 
    data: NotificationData
  ): Promise<NotificationResult> {
    try {
      // Check configuration and log warning if needed
      if (recipient.type === 'email') {
        if (!this.isEmailConfigured) {
          this.logConfigurationWarning('email')
          return { success: false, error: "Email service not configured" }
        }
      } else if (recipient.type === 'phone') {
        if (!this.isSMSConfigured) {
          this.logConfigurationWarning('sms')
          return { success: false, error: "SMS service not configured" }
        }
      }

      // Use the centralized notification manager
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

      // Use the centralized notification manager
      const results = await notificationManager.sendNotificationToMultiple(filteredRecipients, data)
      
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
      logger.error("Failed to send multiple notifications:", {
        error: error instanceof Error ? error.message : String(error),
        recipientCount: recipients.length,
        notificationType: data.type
      })
      return recipients.map(() => ({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown batch notification error" 
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

      // Use the centralized notification manager
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
    try {
      if (recipient.type === 'email' && !this.isEmailConfigured) {
        this.logConfigurationWarning('email')
        return { success: false, error: "Email service not configured" }
      }

      // Use the centralized notification manager
      return await notificationManager.sendWelcome(recipient as any, name)
    } catch (error) {
      logger.error("Failed to send welcome notification:", {
        error: error instanceof Error ? error.message : String(error),
        recipientType: recipient.type,
        recipientValue: recipient.value
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown welcome error"
      }
    }
  }

  async sendPasswordReset(
    recipient: NotificationRecipient, 
    resetUrl: string, 
    expiryMinutes: number = 60
  ): Promise<NotificationResult> {
    try {
      if (recipient.type === 'email' && !this.isEmailConfigured) {
        this.logConfigurationWarning('email')
        return { success: false, error: "Email service not configured" }
      }

      // Use the centralized notification manager
      return await notificationManager.sendPasswordReset(recipient as any, resetUrl, expiryMinutes)
    } catch (error) {
      logger.error("Failed to send password reset notification:", {
        error: error instanceof Error ? error.message : String(error),
        recipientType: recipient.type,
        recipientValue: recipient.value
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown password reset error"
      }
    }
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
    try {
      // Use the centralized notification manager
      return await notificationManager.sendTreatmentBookingSuccess(recipients, bookingData)
    } catch (error) {
      logger.error("Failed to send booking success notifications:", {
        error: error instanceof Error ? error.message : String(error),
        recipientCount: recipients.length
      })
      return recipients.map(() => ({
        success: false,
        error: error instanceof Error ? error.message : "Unknown booking success error"
      }))
    }
  }

  async sendPurchaseSuccess(
    recipients: NotificationRecipient[], 
    message: string
  ): Promise<NotificationResult[]> {
    try {
      // Use the centralized notification manager
      return await notificationManager.sendPurchaseSuccess(recipients, message)
    } catch (error) {
      logger.error("Failed to send purchase success notifications:", {
        error: error instanceof Error ? error.message : String(error),
        recipientCount: recipients.length
      })
      return recipients.map(() => ({
        success: false,
        error: error instanceof Error ? error.message : "Unknown purchase success error"
      }))
    }
  }

  get serviceStatus() {
    return {
      isEmailConfigured: this.isEmailConfigured,
      isSMSConfigured: this.isSMSConfigured,
      manager: notificationManager.getServiceStatus()
    }
  }

  /**
   * Refresh service configuration status
   */
  refreshStatus() {
    const status = notificationManager.getServiceStatus()
    this.isEmailConfigured = status.email.configured
    this.isSMSConfigured = status.sms.configured
    
    logger.info("Notification service status refreshed", {
      emailConfigured: this.isEmailConfigured,
      smsConfigured: this.isSMSConfigured
    })
  }
}

// Export singleton instance
export const unifiedNotificationService = new UnifiedNotificationService() 