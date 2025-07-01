"use server"

import dbConnect from "@/lib/db/mongoose"
import { Counter } from "@/lib/db/models/counter"
import { logger } from "@/lib/logs/logger"
import type { PopulatedBooking } from "@/types/booking"

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