import twilio from "twilio"
import type { NotificationResult, PhoneRecipient, NotificationData } from "./notification-types"
import { getSMSTemplate } from "./templates/sms-templates"
import { logNotification } from "./notification-utils"
import { logger } from "@/lib/logs/logger"

/**
 * SMS service implementation using Twilio
 * Handles SMS notifications with proper configuration validation and error handling
 */
class SMSService {
  private client: ReturnType<typeof twilio> | null
  private fromNumber: string | undefined
  private messagingServiceSid: string | undefined
  private isDevelopment: boolean
  private isConfigured: boolean

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === "development"
    this.isConfigured = false
    this.client = null
    
    // Initialize Twilio client with proper validation
    this.initializeTwilio()
  }

  /**
   * Initialize Twilio client with proper configuration validation
   */
  private initializeTwilio(): void {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const fromNumber = process.env.TWILIO_PHONE_NUMBER
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID

    // Check if we have the minimum required configuration
    if (!accountSid || !authToken) {
      if (!this.isDevelopment) {
        logger.warn("Twilio SMS service not configured - missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN")
      }
      return
    }

    // Skip placeholder values in development
    if (this.isDevelopment && (
      accountSid === "your-twilio-account-sid" || 
      authToken === "your-twilio-auth-token"
    )) {
      logger.info("Development mode - Twilio SMS service using placeholder values")
      return
    }

    // Validate Account SID format (only show error if not in build phase)
    if (!accountSid.startsWith("AC")) {
      if (process.env.NEXT_PHASE !== "phase-production-build") {
        logger.error("Invalid Twilio Account SID format - must start with 'AC'")
      }
      return
    }

    // We need either a phone number OR a messaging service SID
    if (!fromNumber && !messagingServiceSid) {
      logger.error("Twilio SMS service requires either TWILIO_PHONE_NUMBER or TWILIO_MESSAGING_SERVICE_SID")
      return
    }

    try {
      this.client = twilio(accountSid, authToken)
      this.fromNumber = fromNumber
      this.messagingServiceSid = messagingServiceSid
      this.isConfigured = true
      
      logger.info("Twilio SMS service initialized successfully", {
        hasFromNumber: !!fromNumber,
        hasMessagingService: !!messagingServiceSid,
        environment: this.isDevelopment ? "development" : "production"
      })
    } catch (error) {
      logger.error("Failed to initialize Twilio SMS service:", error)
      this.isConfigured = false
    }
  }

  /**
   * Send an SMS notification
   * @param recipient Phone recipient information
   * @param data Notification data
   * @returns Result of the send operation
   */
  async sendNotification(recipient: PhoneRecipient, data: NotificationData): Promise<NotificationResult> {
    const logId = `sms_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    
    try {
      // Check if service is configured
      if (!this.isConfigured || !this.client) {
        const error = "SMS service not configured"
        logger.error(`[${logId}] ${error}`)
        return { success: false, error }
      }

      // Format phone number
      const phoneNumber = this.formatPhoneNumber(recipient.value)
      logger.info(`[${logId}] Sending SMS to: ${this.obscurePhone(phoneNumber)}`)

      // Get message template
      const messageBody = getSMSTemplate(data, recipient.language || "he")
      
      // In development mode, just log
      if (this.isDevelopment) {
        logNotification("sms", phoneNumber, { body: messageBody, data })
        logger.info(`[${logId}] Development mode - SMS logged only`)
        return { success: true, messageId: `dev_sms_${logId}` }
      }

      // Prepare message options
      const messageOptions: {
        body: string
        to: string
        from?: string
        messagingServiceSid?: string
      } = {
        body: messageBody,
        to: phoneNumber,
      }

      // Use messaging service if available, otherwise use from number
      if (this.messagingServiceSid) {
        messageOptions.messagingServiceSid = this.messagingServiceSid
      } else if (this.fromNumber) {
        messageOptions.from = this.fromNumber
      } else {
        const error = "No from number or messaging service configured"
        logger.error(`[${logId}] ${error}`)
        return { success: false, error }
      }

      // Send the SMS
      const message = await this.client.messages.create(messageOptions)

      logger.info(`[${logId}] SMS sent successfully`, { 
        messageId: message.sid,
        status: message.status 
      })

      return {
        success: true,
        messageId: message.sid,
        details: {
          status: message.status,
          direction: message.direction,
          price: message.price,
          priceUnit: message.priceUnit
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown SMS error"
      logger.error(`[${logId}] SMS send failed:`, { 
        error: errorMessage,
        recipient: this.obscurePhone(recipient.value),
        data: data.type 
      })
      
      return {
        success: false,
        error: errorMessage,
        details: error instanceof Error ? { message: error.message, stack: error.stack } : { error }
      }
    }
  }

  /**
   * Format phone number to ensure it includes country code
   * @param phoneNumber Phone number to format
   * @returns Formatted phone number
   */
  private formatPhoneNumber(phoneNumber: string): string {
    try {
      // Use centralized phone normalization
      const { normalizePhoneNumber, validatePhoneNumber } = require("@/lib/utils/phone-utils")
      
      const normalized = normalizePhoneNumber(phoneNumber)
      
      if (!validatePhoneNumber(normalized)) {
        logger.warn(`Invalid phone format: ${normalized}`)
        throw new Error(`Invalid phone number format: ${phoneNumber}`)
      }

      return normalized
    } catch (error) {
      logger.error("Phone number formatting error:", { phoneNumber, error })
      throw new Error(`Invalid phone number format: ${phoneNumber}`)
    }
  }

  /**
   * Obscure phone number for logging
   * @param phoneNumber Phone number to obscure
   * @returns Obscured phone number
   */
  private obscurePhone(phoneNumber: string): string {
    if (phoneNumber.length <= 6) return phoneNumber
    return `${phoneNumber.substring(0, 4)}***${phoneNumber.substring(phoneNumber.length - 2)}`
  }

  /**
   * Check if the SMS service is properly configured
   */
  isServiceConfigured(): boolean {
    return this.isConfigured
  }

  /**
   * Get service configuration status
   */
  getStatus() {
    return {
      configured: this.isConfigured,
      hasClient: !!this.client,
      hasFromNumber: !!this.fromNumber,
      hasMessagingService: !!this.messagingServiceSid,
      environment: this.isDevelopment ? "development" : "production"
    }
  }

  /**
   * Test the SMS service configuration
   */
  async testConfiguration(): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured || !this.client) {
      return { success: false, error: "SMS service not configured" }
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    if (!accountSid) {
      return { success: false, error: "TWILIO_ACCOUNT_SID not configured" }
    }

    try {
      // Try to fetch account information to verify credentials
      const account = await this.client.api.accounts(accountSid).fetch()
      logger.info("SMS service configuration test successful", { 
        accountSid: account.sid,
        status: account.status 
      })
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      logger.error("SMS service configuration test failed:", error)
      return { success: false, error: errorMessage }
    }
  }
}

// Export a singleton instance
export const smsService = new SMSService()
