import type { BookingStatus } from "@/types/booking"

/**
 * Construct full address string from address components
 */
export function constructFullAddressHelper(address: any): string {
  if (!address) return ""

  const parts = []

  if (address.street) parts.push(address.street)
  if (address.streetNumber) parts.push(address.streetNumber)
  if (address.city) parts.push(address.city)

  return parts.join(", ")
}

/**
 * Validate booking data
 */
export function validateBookingData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data.treatmentId) errors.push("Treatment ID is required")
  if (!data.bookingDateTime) errors.push("Booking date/time is required")
  if (!data.recipientName) errors.push("Recipient name is required")
  if (!data.recipientPhone) errors.push("Recipient phone is required")

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Check if booking can be cancelled
 */
export function canCancelBooking(booking: any): boolean {
  if (!booking) return false

  const now = new Date()
  const bookingDate = new Date(booking.bookingDateTime)
  const hoursDiff = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60)

  // Can cancel if booking is at least 24 hours away and not already completed/cancelled
  return hoursDiff >= 24 && !["completed", "cancelled", "no_show"].includes(booking.status)
}

/**
 * Check if booking can be rescheduled
 */
export function canRescheduleBooking(booking: any): boolean {
  if (!booking) return false

  const now = new Date()
  const bookingDate = new Date(booking.bookingDateTime)
  const hoursDiff = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60)

  // Can reschedule if booking is at least 48 hours away and confirmed
  return hoursDiff >= 48 && ["confirmed", "in_process"].includes(booking.status)
}

/**
 * Get booking display status
 */
export function getBookingDisplayStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending_payment: "ממתין לתשלום",
    confirmed: "מאושר",
    in_process: "בתהליך",
    completed: "הושלם",
    cancelled: "בוטל",
    no_show: "לא הגיע",
    rescheduled: "נדחה",
  }

  return statusMap[status] || status
}

/**
 * Calculate booking duration in minutes
 */
export function calculateBookingDuration(
  treatmentDuration?: number,
  selectedDuration?: any
): number {
  if (selectedDuration?.minutes) return selectedDuration.minutes
  if (treatmentDuration) return treatmentDuration
  return 60 // Default 1 hour
}

/**
 * Format booking time for display
 */
export function formatBookingTime(dateTime: string | Date): string {
  const date = new Date(dateTime)
  return date.toLocaleString("he-IL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Check if booking is today
 */
export function isBookingToday(dateTime: string | Date): boolean {
  const bookingDate = new Date(dateTime)
  const today = new Date()

  return bookingDate.toDateString() === today.toDateString()
}

/**
 * Get booking time status
 */
export function getBookingTimeStatus(dateTime: string | Date): "past" | "today" | "future" {
  const bookingDate = new Date(dateTime)
  const today = new Date()

  if (bookingDate.toDateString() === today.toDateString()) return "today"
  if (bookingDate < today) return "past"
  return "future"
}

export function formatTimeSlot(date: Date, duration: number): string {
  const startTime = date.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit"
  })
  const endTime = new Date(date.getTime() + duration * 60000).toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit"
  })
  return `${startTime} - ${endTime}`
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} דקות`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) {
    return `${hours} שעות`
  }
  return `${hours} שעות ו-${remainingMinutes} דקות`
}

export function isBookingEditable(booking: any): boolean {
  const editableStatuses: BookingStatus[] = ["pending_payment", "in_process", "confirmed"]
  return editableStatuses.includes(booking.status)
} 