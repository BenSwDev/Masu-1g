export enum NotificationType {
  NEW_BOOKING_AVAILABLE = "new_booking_available",
  REVIEW_REMINDER = "review_reminder",
  BOOKING_CONFIRMED = "booking_confirmed",
  BOOKING_CANCELLED = "booking_cancelled",
  BOOKING_UPDATED = "booking_updated",
  PROFESSIONAL_ASSIGNED = "professional_assigned",
  PROFESSIONAL_UNASSIGNED = "professional_unassigned",
}

export interface NotificationData {
  type: NotificationType
  recipientId: string
  bookingId: string
  treatmentName?: string
  professionalName?: string
  bookingDateTime?: Date
  address?: string
  message?: string
} 
