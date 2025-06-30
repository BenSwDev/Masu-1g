"use server"

import mongoose from "mongoose"
import { logger } from "@/lib/logs/logger"
import dbConnect from "@/lib/db/mongodb"
import Booking, { type IBooking } from "@/lib/db/models/booking"
import Treatment, { type ITreatment } from "@/lib/db/models/treatment"
import User, { type IUser } from "@/lib/db/models/user"
import Address, { type IAddress, constructFullAddress } from "@/lib/db/models/address"
import type { PopulatedBooking } from "@/types/booking"
import type { Booking as BookingCore, BookingAddress } from "@/types/core"
import Counter from "@/lib/db/models/counter"
import ProfessionalProfile from "@/lib/db/models/professional-profile"
import type { BookingStatus } from "@/types/core"

// Re-export for convenience
export { constructFullAddress }

// Re-export getNextSequenceValue from counter model
export { getNextSequenceValue } from "@/lib/db/models/counter"

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
 * Transform booking document to plain object
 */
export async function toBookingPlain(bookingDoc: any): Promise<PopulatedBooking> {
  if (!bookingDoc) {
    throw new Error("toBookingPlain received null or undefined input")
  }

  let booking: Record<string, any>
  if (typeof bookingDoc.toObject === "function") {
    booking = bookingDoc.toObject({ virtuals: true })
  } else {
    booking = { ...bookingDoc }
  }

  try {
    // Format dates
    const formatDate = (date: any) => (date ? new Date(date).toISOString() : undefined)

    return {
      _id: String(booking._id),
      bookingNumber: booking.bookingNumber,
      userId: booking.userId ? String(booking.userId) : undefined,
      treatmentId: booking.treatmentId ? String(booking.treatmentId) : undefined,
      selectedDurationId: booking.selectedDurationId
        ? String(booking.selectedDurationId)
        : undefined,
      professionalId: booking.professionalId ? String(booking.professionalId) : undefined,
      bookingDateTime: formatDate(booking.bookingDateTime),
      status: booking.status,
      bookedByUserName: booking.bookedByUserName,
      bookedByUserEmail: booking.bookedByUserEmail,
      bookedByUserPhone: booking.bookedByUserPhone,
      recipientName: booking.recipientName,
      recipientPhone: booking.recipientPhone,
      recipientEmail: booking.recipientEmail,
      recipientBirthDate: formatDate(booking.recipientBirthDate),
      recipientGender: booking.recipientGender,
      isBookingForSomeoneElse: booking.isBookingForSomeoneElse,
      bookingAddressSnapshot: booking.bookingAddressSnapshot,
      priceDetails: booking.priceDetails,
      paymentDetails: booking.paymentDetails,
      notes: booking.notes,
      createdAt: formatDate(booking.createdAt),
      updatedAt: formatDate(booking.updatedAt),
    } as unknown as PopulatedBooking
  } catch (error) {
    logger.error("Error transforming booking to plain object:", error)
    throw error
  }
}

/**
 * Generate booking number
 */
export async function generateBookingNumber(): Promise<string> {
  try {
    await dbConnect()
    const nextNum = await Counter.findOneAndUpdate(
      { _id: "bookingNumber" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    )
    return (nextNum as any).seq.toString().padStart(6, "0")
  } catch (error) {
    logger.error("Error generating booking number:", error)
    // Fallback to timestamp-based number
    return Date.now().toString().slice(-6)
  }
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

// Add missing exports that are expected by index.ts
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
