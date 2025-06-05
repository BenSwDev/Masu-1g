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
 * Booking Success Notification Data (for the user who booked)
 */
export interface BookingSuccessNotificationData {
  type: "BOOKING_SUCCESS"
  userName: string
  bookingId: string // For reference
  treatmentName: string
  bookingDateTime: Date
  orderDetailsLink: string // Link to user's bookings page
}

/**
 * New Booking Available Notification Data (for professionals)
 */
export interface NewBookingAvailableNotificationData {
  type: "NEW_BOOKING_AVAILABLE"
  professionalName?: string // Optional, for personalization
  bookingId: string
  treatmentName: string
  bookingDateTime: Date
  bookingAddress?: string // e.g., city or full address if available and relevant
  adminBookingDetailsLink: string // Link to admin/professional booking management page
}

/**
 * Gift Voucher Received notification data (already exists implicitly via sms-templates, let's make it explicit if needed for email)
 */
export interface GiftVoucherReceivedNotificationData {
  type: "GIFT_VOUCHER_RECEIVED" // Matches type used in gift-voucher-actions.ts for SMS
  recipientName: string
  purchaserName: string
  voucherCode: string
  greetingMessage?: string
  // Add purchaseDetailsLink if we want to send a link to the recipient to view it online
}

/**
 * Purchase Success Subscription notification data
 */
export interface PurchaseSuccessSubscriptionNotificationData {
  type: "PURCHASE_SUCCESS_SUBSCRIPTION"
  userName: string
  subscriptionName: string
  purchaseDetailsLink: string
}

/**
 * Purchase Success Gift Voucher notification data (for the purchaser)
 */
export interface PurchaseSuccessGiftVoucherNotificationData {
  type: "PURCHASE_SUCCESS_GIFT_VOUCHER"
  userName: string
  voucherType: "monetary" | "treatment"
  treatmentName?: string // If voucherType is 'treatment'
  voucherValue?: number // If voucherType is 'monetary'
  voucherCode: string
  purchaseDetailsLink: string
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
  | BookingSuccessNotificationData // New
  | NewBookingAvailableNotificationData // New
  | GiftVoucherReceivedNotificationData // Added for clarity, matches existing usage
  | PurchaseSuccessSubscriptionNotificationData // New
  | PurchaseSuccessGiftVoucherNotificationData // New

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
