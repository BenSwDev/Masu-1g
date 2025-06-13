// Base notification data interface
export interface BaseNotificationData {
  type: string
}

// OTP notification data
export interface OTPNotificationData extends BaseNotificationData {
  type: "otp"
  code: string
  expiresIn: number
}

// Welcome notification data
export interface WelcomeNotificationData extends BaseNotificationData {
  type: "welcome"
  name: string
}

// Password reset notification data
export interface PasswordResetNotificationData extends BaseNotificationData {
  type: "password-reset"
  resetUrl: string
  expiresIn: number
}

// Treatment booking success notification data
export interface TreatmentBookingSuccessNotificationData extends BaseNotificationData {
  type: "treatment-booking-success"
  recipientName: string
  bookerName?: string // Only if different from recipient
  treatmentName: string
  bookingDateTime: Date
  bookingNumber: string
  bookingAddress: string
  isForSomeoneElse: boolean
  isBookerForSomeoneElse?: boolean // Special flag for booker who booked for someone else
  actualRecipientName?: string // The person they booked for (when isBookerForSomeoneElse is true)
}

// Union type for all notification data
export type NotificationData =
  | OTPNotificationData
  | WelcomeNotificationData
  | PasswordResetNotificationData
  | TreatmentBookingSuccessNotificationData

// Notification result interface
export interface NotificationResult {
  success: boolean
  messageId?: string
  error?: string
  details?: any
}

// Language type
export type NotificationLanguage = "he" | "en" | "ru"

// Email recipient interface
export interface EmailRecipient {
  type: "email"
  value: string
  name?: string
  language: NotificationLanguage
}

// Phone recipient interface
export interface PhoneRecipient {
  type: "phone"
  value: string
  language: NotificationLanguage
}

// Union type for all recipients
export type NotificationRecipient = EmailRecipient | PhoneRecipient
