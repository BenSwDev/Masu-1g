export interface BaseNotificationData {
  id: string
  createdAt: Date
}

export interface NewBookingAvailableNotificationData extends BaseNotificationData {
  type: "NEW_BOOKING_AVAILABLE"
  bookingId: string
  treatmentName: string
  bookingDateTime: Date
  professionalActionLink: string // שם שדה שונה
  bookingAddress?: string
  professionalName?: string // Optional: if addressing a specific group or for personalization
}

export interface BookingConfirmedClientNotificationData extends BaseNotificationData {
  type: "BOOKING_CONFIRMED_CLIENT"
  userName: string
  professionalName: string
  bookingDateTime: Date
  treatmentName: string
  bookingDetailsLink: string
}

export interface ProfessionalEnRouteClientNotificationData extends BaseNotificationData {
  type: "PROFESSIONAL_EN_ROUTE_CLIENT"
  userName: string
  professionalName: string
  bookingDateTime: Date // Optional: for context
  treatmentName: string // Optional: for context
  // estimatedArrivalTime?: string; // Consider adding later
}

export interface BookingCompletedClientNotificationData extends BaseNotificationData {
  type: "BOOKING_COMPLETED_CLIENT"
  userName: string
  professionalName: string
  treatmentName: string
  // feedbackLink?: string; // Consider adding later
}

// Add missing BookingSuccessNotificationData
export interface BookingSuccessNotificationData extends BaseNotificationData {
  type: "BOOKING_SUCCESS"
  userName: string
  bookingId: string
  treatmentName: string
  bookingDateTime: Date
  orderDetailsLink: string
}

export type NotificationData =
  | NewBookingAvailableNotificationData
  | BookingConfirmedClientNotificationData
  | ProfessionalEnRouteClientNotificationData
  | BookingCompletedClientNotificationData
  | BookingSuccessNotificationData

// Add missing recipient types
export interface EmailRecipient {
  type: "email"
  value: string
  name?: string
  language: NotificationLanguage
}

export interface PhoneRecipient {
  type: "phone"
  value: string
  language: NotificationLanguage
}

export type NotificationRecipient = EmailRecipient | PhoneRecipient

// Add missing language type
export type NotificationLanguage = "he" | "en" | "ru"
