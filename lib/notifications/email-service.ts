import nodemailer from "nodemailer"
import type { NotificationResult, EmailRecipient, NotificationData } from "./notification-types"
import { getEmailTemplate, type EmailNotificationData } from "./templates/email-templates"
import { logNotification } from "./notification-utils"
import { logger } from "@/lib/logs/logger"

/**
 * Email service implementation using NodeMailer
 * Handles email notifications with proper configuration validation and error handling
 */
export class EmailService {
  private transporter: nodemailer.Transporter
  private isDevelopment: boolean
  private isConfigured: boolean
  private fromEmail: string

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === "development"
    this.isConfigured = false
    this.fromEmail = process.env.EMAIL_FROM || "noreply@masu.co.il"
    
    // Initialize email transporter with proper validation
    this.initializeTransporter()
  }

  /**
   * Initialize email transporter with proper configuration validation
   */
  private initializeTransporter(): void {
    const host = process.env.EMAIL_SERVER_HOST
    const port = process.env.EMAIL_SERVER_PORT
    const user = process.env.EMAIL_SERVER_USER
    const password = process.env.EMAIL_SERVER_PASSWORD

    // Check if we have the minimum required configuration
    if (!host || !port || !user || !password) {
      if (!this.isDevelopment) {
        logger.warn("Email service not configured - missing required environment variables", {
          hasHost: !!host,
          hasPort: !!port,
          hasUser: !!user,
          hasPassword: !!password
        })
      }
      return
    }

    // Skip placeholder values in development
    if (this.isDevelopment && (
      host === "your-smtp-host" || 
      user === "your-email@example.com" ||
      password === "your-email-password"
    )) {
      logger.info("Development mode - Email service using placeholder values")
      return
    }

    try {
      // Create reusable transporter object using SMTP transport
      this.transporter = nodemailer.createTransporter({
        host,
        port: Number(port),
        secure: Number(port) === 465, // true for 465, false for other ports
        auth: {
          user,
          pass: password,
        },
        // Additional security options
        tls: {
          rejectUnauthorized: false // Allow self-signed certificates in development
        }
      })

      this.isConfigured = true
      
      logger.info("Email service initialized successfully", {
        host,
        port: Number(port),
        secure: Number(port) === 465,
        fromEmail: this.fromEmail,
        environment: this.isDevelopment ? "development" : "production"
      })
    } catch (error) {
      logger.error("Failed to initialize email service:", error)
      this.isConfigured = false
    }
  }

  /**
   * Send an email notification
   * @param recipient Email recipient information
   * @param data Notification data
   * @returns Result of the send operation
   */
  async sendNotification(recipient: EmailRecipient, data: NotificationData): Promise<NotificationResult> {
    const logId = `email_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    
    try {
      // Check if service is configured
      if (!this.isConfigured) {
        const error = "Email service not configured"
        logger.error(`[${logId}] ${error}`)
        return { success: false, error }
      }

      logger.info(`[${logId}] Sending email to: ${this.obscureEmail(recipient.value)}`)

      // Get the template for this notification type
      const { subject, html, text } = getEmailTemplate(
        data as EmailNotificationData, 
        recipient.language || "he", 
        recipient.name
      )

      // In development mode, just log
      if (this.isDevelopment) {
        logNotification("email", recipient.value, { subject, text, data })
        logger.info(`[${logId}] Development mode - email logged only`)
        return { success: true, messageId: `dev_email_${logId}` }
      }

      // Send mail with defined transport object
      const info = await this.transporter.sendMail({
        from: `"Masu" <${process.env.EMAIL_SERVER_USER}>`,
        to: recipient.value,
        subject,
        text,
        html,
        // Additional headers
        headers: {
          'X-Mailer': 'Masu Notification System',
          'X-Priority': '3',
        }
      })

      logger.info(`[${logId}] Email sent successfully`, { 
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response
      })

      return {
        success: true,
        messageId: info.messageId,
        details: {
          accepted: info.accepted,
          rejected: info.rejected,
          response: info.response,
          envelope: info.envelope
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown email error"
      logger.error(`[${logId}] Email send failed:`, { 
        error: errorMessage,
        recipient: this.obscureEmail(recipient.value),
        data: data.type 
      })
      
      return {
        success: false,
        error: errorMessage,
        details: error
      }
    }
  }

  /**
   * Obscure email address for logging
   * @param email Email address to obscure
   * @returns Obscured email address
   */
  private obscureEmail(email: string): string {
    if (!email.includes("@")) return email
    const [local, domain] = email.split("@")
    return `${local.substring(0, 2)}***@${domain}`
  }

  /**
   * Check if the email service is properly configured
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
      hasTransporter: !!this.transporter,
      fromEmail: this.fromEmail,
      environment: this.isDevelopment ? "development" : "production"
    }
  }

  /**
   * Verify connection configuration
   */
  async verifyConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured) {
      return { success: false, error: "Email service not configured" }
    }

    try {
      await this.transporter.verify()
      logger.info("Email service connection verified successfully")
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      logger.error("Email service connection verification failed:", error)
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Test email sending with a test message
   */
  async sendTestEmail(to: string): Promise<NotificationResult> {
    const testData = {
      type: "test" as const,
      message: "This is a test email from Masu notification system"
    }

    return this.sendNotification(
      { type: "email", value: to, language: "he" },
      testData
    )
  }
}

// Export a singleton instance
export const emailService = new EmailService()
