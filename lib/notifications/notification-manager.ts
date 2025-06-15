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
import { Resend } from "resend"
import twilio from "twilio"
import { getSMSTemplate } from "./templates/sms-templates"
import { getEmailTemplate } from "./templates/email-templates"

// Initialize services
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// Only initialize Twilio if both credentials are properly set and valid
let twilioClient: any = null
try {
  if (process.env.TWILIO_ACCOUNT_SID && 
      process.env.TWILIO_AUTH_TOKEN && 
      process.env.TWILIO_ACCOUNT_SID.startsWith('AC')) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  }
} catch (error) {
  logger.warn("Failed to initialize Twilio client", { error })
  twilioClient = null
}

const FROM_EMAIL = process.env.EMAIL_FROM || "noreply@masu.com"
const FROM_PHONE = process.env.TWILIO_PHONE_NUMBER || ""

/**
 * Notification manager to handle different notification types
 */
export class NotificationManager {
  private static instance: NotificationManager
  private isDevelopment: boolean
  private twilioClient: any | null = null

  private constructor() {
    this.isDevelopment = process.env.NODE_ENV === "development"
    try {
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
      } else {
        logger.warn("Twilio credentials not configured")
      }
    } catch (error) {
      logger.warn("Failed to initialize Twilio client", { error })
    }
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

  async sendEmailNotification(
    to: string,
    subject: string,
    content: NotificationContent,
    language: Language = "he",
  ): Promise<boolean> {
    try {
      if (!process.env.RESEND_API_KEY) {
        logger.warn("RESEND_API_KEY not configured, skipping email notification")
        return false
      }

      const resend = new Resend(process.env.RESEND_API_KEY)

      const htmlContent = await this.generateEmailTemplate(content, language)

      const result = await resend.emails.send({
        from: process.env.FROM_EMAIL || "noreply@masu.co.il",
        to,
        subject,
        html: htmlContent,
      })

      if (result.error) {
        logger.error("Email notification failed", { error: result.error, to, subject })
        return false
      }

      logger.info("Email notification sent successfully", { to, subject, messageId: result.data?.id })
      return true
    } catch (error) {
      logger.error("Email notification failed", { error, to, subject })
      return false
    }
  }

  async sendSMSNotification(
    to: string,
    content: NotificationContent,
    language: Language = "he",
  ): Promise<boolean> {
    try {
      if (!this.twilioClient) {
        logger.warn("Twilio not configured, skipping SMS notification")
        return false
      }

      const message = this.generateSMSMessage(content, language)

      const result = await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to,
      })

      logger.info("SMS notification sent successfully", { to, messageId: result.sid })
      return true
    } catch (error) {
      logger.error("SMS notification failed", { error, to })
      return false
    }
  }
}

// Export a singleton instance
export const notificationManager = new NotificationManager()

/**
 * Send notification via email
 */
async function sendEmailNotification(
  recipient: string,
  data: NotificationData,
  language: NotificationLanguage = "en",
  recipientName?: string
): Promise<NotificationResult> {
  try {
    if (!resend) {
      logger.warn("RESEND_API_KEY not configured, skipping email notification")
      return { success: false, error: "Email service not configured" }
    }

    // Convert notification data to email template data
    let emailData: any = { type: data.type }
    
    switch (data.type) {
      case "otp":
        emailData = {
          type: "otp",
          code: data.code,
          expiresIn: data.expiresIn,
        }
        break
      case "welcome":
        emailData = {
          type: "welcome",
          userName: data.name,
        }
        break
      case "password-reset":
        emailData = {
          type: "passwordReset",
          resetLink: data.resetUrl,
          userName: recipientName,
        }
        break
      case "treatment-booking-success":
        emailData = {
          type: "treatment-booking-success",
          recipientName: data.recipientName,
          bookerName: data.bookerName,
          treatmentName: data.treatmentName,
          bookingDateTime: data.bookingDateTime,
          bookingNumber: data.bookingNumber,
          bookingAddress: data.bookingAddress,
          isForSomeoneElse: data.isForSomeoneElse,
        }
        break
    }

    const template = getEmailTemplate(emailData, language, recipientName)

    const result = await resend!.emails.send({
      from: FROM_EMAIL,
      to: recipient,
      subject: template.subject,
      text: template.text,
      html: template.html,
    })

    return {
      success: true,
      messageId: result.data?.id,
      details: result,
    }
  } catch (error) {
    logger.error("Email notification failed", { error })
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown email error",
      details: error,
    }
  }
}

/**
 * Send notification via SMS
 */
async function sendSMSNotification(
  recipient: string,
  data: NotificationData,
  language: NotificationLanguage = "en"
): Promise<NotificationResult> {
  try {
    if (!twilioClient || !FROM_PHONE) {
      logger.warn("Twilio not configured, skipping SMS notification")
      return { success: false, error: "SMS service not configured" }
    }

    const message = getSMSTemplate(data, language)

    const result = await twilioClient.messages.create({
      body: message,
      from: FROM_PHONE,
      to: recipient,
    })

    return {
      success: true,
      messageId: result.sid,
      details: result,
    }
  } catch (error) {
    logger.error("SMS notification failed", { error })
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown SMS error",
      details: error,
    }
  }
}

/**
 * Send notification to a single recipient
 */
export async function sendNotification(
  recipient: NotificationRecipient,
  data: NotificationData
): Promise<NotificationResult> {
  if (recipient.type === "email") {
    return sendEmailNotification(recipient.value, data, recipient.language, recipient.name)
  } else if (recipient.type === "phone") {
    return sendSMSNotification(recipient.value, data, recipient.language)
  }

  return { success: false, error: "Invalid recipient type" }
}

/**
 * Send notification to multiple recipients
 */
export async function sendNotificationToMultiple(
  recipients: NotificationRecipient[],
  data: NotificationData
): Promise<NotificationResult[]> {
  const promises = recipients.map(recipient => sendNotification(recipient, data))
  return Promise.all(promises)
}

/**
 * Send OTP notification
 */
export async function sendOTP(
  recipients: NotificationRecipient[],
  code: string,
  expiresIn: number = 10
): Promise<NotificationResult[]> {
  const data: NotificationData = {
    type: "otp",
    code,
    expiresIn,
  }

  return sendNotificationToMultiple(recipients, data)
}

/**
 * Send welcome notification
 */
export async function sendWelcome(
  recipients: NotificationRecipient[],
  name: string
): Promise<NotificationResult[]> {
  const data: NotificationData = {
    type: "welcome",
    name,
  }

  return sendNotificationToMultiple(recipients, data)
}

/**
 * Send password reset notification
 */
export async function sendPasswordReset(
  recipients: NotificationRecipient[],
  resetUrl: string,
  expiresIn: number = 60
): Promise<NotificationResult[]> {
  const data: NotificationData = {
    type: "password-reset",
    resetUrl,
    expiresIn,
  }

  return sendNotificationToMultiple(recipients, data)
}

/**
 * Send treatment booking success notification
 */
export async function sendTreatmentBookingSuccess(
  recipients: NotificationRecipient[],
  bookingData: {
    recipientName: string
    bookerName?: string
    treatmentName: string
    bookingDateTime: Date
    bookingNumber: string
    bookingAddress: string
    isForSomeoneElse: boolean
  }
): Promise<NotificationResult[]> {
  const data: TreatmentBookingSuccessNotificationData = {
    type: "treatment-booking-success",
    recipientName: bookingData.recipientName,
    bookerName: bookingData.bookerName,
    treatmentName: bookingData.treatmentName,
    bookingDateTime: bookingData.bookingDateTime,
    bookingNumber: bookingData.bookingNumber,
    bookingAddress: bookingData.bookingAddress,
    isForSomeoneElse: bookingData.isForSomeoneElse,
  }

  return sendNotificationToMultiple(recipients, data)
}
