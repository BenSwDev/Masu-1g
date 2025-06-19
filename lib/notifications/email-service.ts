import nodemailer from "nodemailer"
import type { NotificationResult, EmailRecipient, NotificationData } from "./notification-types"
import { getEmailTemplate, type EmailNotificationData } from "./templates/email-templates"
import { logNotification } from "./notification-utils"

/**
 * Email service implementation
 */
export class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    // Create reusable transporter object using SMTP transport
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: Number(process.env.EMAIL_SERVER_PORT),
      secure: Number(process.env.EMAIL_SERVER_PORT) === 465, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    })
  }

  /**
   * Send an email notification
   * @param recipient Email recipient information
   * @param data Notification data
   * @returns Result of the send operation
   */
  async sendNotification(recipient: EmailRecipient, data: NotificationData): Promise<NotificationResult> {
    try {
      // Get the template for this notification type
      const { subject, html, text } = getEmailTemplate(data as EmailNotificationData, recipient.language || "en", recipient.name)

      // Log the notification in development
      logNotification("email", recipient.value, { subject, text })

      console.log("Email configuration:", {
        host: process.env.EMAIL_SERVER_HOST,
        port: process.env.EMAIL_SERVER_PORT,
        user: process.env.EMAIL_SERVER_USER ? "Set" : "Not set",
        pass: process.env.EMAIL_SERVER_PASSWORD ? "Set" : "Not set",
        from: process.env.EMAIL_FROM,
      })

      // Send mail with defined transport object
      const info = await this.transporter.sendMail({
        from: `"${process.env.EMAIL_FROM || "Masu"}" <${process.env.EMAIL_SERVER_USER}>`,
        to: recipient.value,
        subject,
        text,
        html,
      })

      console.log("Email sent successfully:", info.messageId)
      return {
        success: true,
        messageId: info.messageId,
      }
    } catch (error) {
      console.error("Email send error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error sending email",
      }
    }
  }

  /**
   * Check if the email service is properly configured
   */
  isConfigured(): boolean {
    const isConfigured = Boolean(
      process.env.EMAIL_SERVER_HOST &&
        process.env.EMAIL_SERVER_PORT &&
        process.env.EMAIL_SERVER_USER &&
        process.env.EMAIL_SERVER_PASSWORD,
    )

    console.log("Email service configured:", isConfigured)
    return isConfigured
  }

  /**
   * Verify connection configuration
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify()
      console.log("Email service connection verified successfully")
      return true
    } catch (error) {
      console.error("Email service connection error:", error)
      return false
    }
  }
}

// Export a singleton instance
export const emailService = new EmailService()
