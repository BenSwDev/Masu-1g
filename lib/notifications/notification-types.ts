// Define Language type locally to avoid importing from client-side i18n
export type NotificationLanguage = "he" | "en" | "ru"

/**
 * Base notification recipient interface
 */
export interface NotificationRecipient {
  type: "email" | "phone"
  value: string
  language?: NotificationLanguage
}

/**
 * Email notification recipient
 */
export interface EmailRecipient extends NotificationRecipient {
  type: "email"
  name?: string
}

/**
 * Phone notification recipient
 */
export interface PhoneRecipient extends NotificationRecipient {
  type: "phone"
}

/**
 * OTP notification data
 */
export interface OTPNotificationData {
  type: "otp"
  code: string
  expiresIn?: number // minutes
}

/**
 * Welcome notification data
 */
export interface WelcomeNotificationData {
  type: "welcome"
  name?: string
}

/**
 * Password reset notification data
 */
export interface PasswordResetNotificationData {
  type: "password-reset"
  resetUrl: string
  expiresIn?: number // minutes
}

/**
 * Appointment notification data
 */
export interface AppointmentNotificationData {
  type: "appointment"
  date: Date
  serviceName: string
  location?: string
}

/**
 * Custom notification data
 */
export interface CustomNotificationData {
  type: "custom"
  subject?: string
  title?: string
  message: string
}

/**
 * Union type for all notification data
 */
export type NotificationData =
  | OTPNotificationData
  | WelcomeNotificationData
  | PasswordResetNotificationData
  | AppointmentNotificationData
  | CustomNotificationData

/**
 * Result of a notification send operation
 */
export interface NotificationResult {
  success: boolean
  error?: string
  details?: {
    type?: string
    value?: string
    language?: string
  }
  messageId?: string
}

/**
 * Base notification service interface
 */
export interface NotificationService {
  sendNotification(recipient: NotificationRecipient, data: NotificationData): Promise<NotificationResult>
}
