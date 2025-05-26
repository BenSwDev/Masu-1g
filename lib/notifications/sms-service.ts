import twilio from "twilio"
import type { NotificationResult, PhoneRecipient, NotificationData } from "./notification-types"
import { getSMSTemplate } from "./templates/sms-templates"
import { logNotification } from "./notification-utils"
import { logger } from "@/lib/logs/logger"

/**
 * SMS service implementation using Twilio
 */
export class SMSService {
  private client: any
  private messagingServiceSid: string | undefined
  private isDevelopment: boolean

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === "development"
    
    // Only initialize Twilio in production mode
    if (!this.isDevelopment && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      if (!process.env.TWILIO_ACCOUNT_SID.startsWith("AC")) {
        logger.warn("Invalid Twilio Account SID format - must start with 'AC'")
        return
      }
      
      this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
      this.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID
    }
  }

  /**
   * Send an SMS notification
   * @param recipient Phone recipient information
   * @param data Notification data
   * @returns Result of the send operation
   */
  async sendNotification(recipient: PhoneRecipient, data: NotificationData): Promise<NotificationResult> {
    // Check if Twilio client is initialized
    if (!this.client || !this.messagingServiceSid) {
      return {
        success: false,
        error: "SMS service not configured",
      }
    }

    try {
      // Format phone number to ensure it includes country code
      const phoneNumber = this.formatPhoneNumber(recipient.value)

      // Get the template for this notification type
      const messageBody = getSMSTemplate(data, recipient.language || "en")

      // Log the notification in development
      logNotification("sms", phoneNumber, messageBody)

      // Send the SMS
      const message = await this.client.messages.create({
        body: messageBody,
        messagingServiceSid: this.messagingServiceSid,
        to: phoneNumber,
      })

      return {
        success: true,
        messageId: message.sid,
      }
    } catch (error) {
      console.error("SMS send error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error sending SMS",
      }
    }
  }

  /**
   * Format phone number to ensure it includes country code
   * @param phoneNumber Phone number to format
   * @returns Formatted phone number
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters except the plus sign
    let cleaned = phoneNumber.replace(/[^\d+]/g, "")

    // If there's no plus sign, assume it's a local number
    if (!cleaned.startsWith("+")) {
      // Handle Israeli numbers specifically
      if (cleaned.startsWith("0")) {
        // Israeli number starting with 0 (e.g., 0525131777)
        cleaned = "+972" + cleaned.substring(1)
      } else if (cleaned.length === 9 && /^[5-9]/.test(cleaned)) {
        // Israeli mobile number without 0 (e.g., 525131777)
        cleaned = "+972" + cleaned
      } else if (cleaned.length === 10 && cleaned.startsWith("972")) {
        // Number with 972 but no plus (e.g., 972525131777)
        cleaned = "+" + cleaned
      } else if (cleaned.length === 10 && /^[5-9]/.test(cleaned)) {
        // Israeli mobile number without country code (e.g., 5251317777)
        cleaned = "+972" + cleaned
      } else {
        // Default: assume Israeli number and add +972
        cleaned = "+972" + cleaned
      }
    } else {
      // Handle +972 numbers that might have 0 after country code
      if (cleaned.startsWith("+9720")) {
        // Remove the 0 after +972 (e.g., +9720525131777 -> +972525131777)
        cleaned = "+972" + cleaned.substring(5)
      }
    }

    // Validate Israeli mobile number format
    if (cleaned.startsWith("+972")) {
      const nationalNumber = cleaned.substring(4)
      if (nationalNumber.length !== 9 || !/^[5-9]/.test(nationalNumber)) {
        logger.warn(`Invalid Israeli mobile format: ${cleaned}`)
        throw new Error("Invalid Israeli mobile format")
      }
    }

    return cleaned
  }

  /**
   * Check if the SMS service is properly configured
   */
  isConfigured(): boolean {
    return Boolean(
      process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_MESSAGING_SERVICE_SID,
    )
  }
}

// Export a singleton instance
export const smsService = new SMSService()
