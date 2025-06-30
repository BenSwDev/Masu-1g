"use server"

import dbConnect from "@/lib/db/mongoose"
import Treatment, { type ITreatment } from "@/lib/db/models/treatment"
import Booking, { type IBooking } from "@/lib/db/models/booking"
import {
  WorkingHoursSettings,
  type IWorkingHoursSettings,
  type IFixedHours,
  type ISpecialDate,
  type ISpecialDateEvent,
} from "@/lib/db/models/working-hours"
import { logger } from "@/lib/logs/logger"
import type { TimeSlot } from "@/types/booking"
import { add, format, set, addMinutes, isBefore, isAfter } from "date-fns"
import { formatInTimeZone, toZonedTime, format as formatTz } from "date-fns-tz"
import { BookingStatus } from "@/types/core"
import type { PopulatedBooking } from "@/types/booking"

// Define the timezone we'll use throughout the app
const TIMEZONE = "Asia/Jerusalem" // Israel timezone

/**
 * Check if two dates are the same day in the target timezone
 */
function isSameDay(dateLeft: Date, dateRight: Date): boolean {
  const zonedLeft = toZonedTime(dateLeft, TIMEZONE)
  const zonedRight = toZonedTime(dateRight, TIMEZONE)

  return (
    zonedLeft.getFullYear() === zonedRight.getFullYear() &&
    zonedLeft.getMonth() === zonedRight.getMonth() &&
    zonedLeft.getDate() === zonedRight.getDate()
  )
}

/**
 * Get working hours for a specific date
 */
function getDayWorkingHours(
  date: Date,
  settings: IWorkingHoursSettings
): IFixedHours | ISpecialDate | ISpecialDateEvent | null {
  const zonedDate = toZonedTime(date, TIMEZONE)

  // First check for special date events (new priority system)
  if (settings.specialDateEvents) {
    for (const event of settings.specialDateEvents) {
      for (const eventDate of event.dates) {
        if (isSameDay(new Date(eventDate), date)) {
          return event
        }
      }
    }
  }

  // Then check legacy special dates
  const specialDateSetting = settings.specialDates?.find(sd => isSameDay(new Date(sd.date), date))
  if (specialDateSetting) {
    return specialDateSetting
  }

  // Finally check fixed hours for the day of week
  const dayOfWeek = zonedDate.getDay() // 0 = Sunday, 1 = Monday, etc.
  const fixedDaySetting = settings.fixedHours?.find(fh => fh.dayOfWeek === dayOfWeek)

  return fixedDaySetting || null
}

/**
 * Get available time slots for a specific date and treatment
 */
export async function getAvailableTimeSlots(
  dateString: string,
  treatmentId: string,
  selectedDurationId?: string
): Promise<{
  success: boolean
  timeSlots?: TimeSlot[]
  error?: string
  workingHoursNote?: string
}> {
  try {
    await dbConnect()

    // Create a timezone-aware date from the dateString
    const selectedDateUTC = new Date(`${dateString}T12:00:00.000Z`)

    if (isNaN(selectedDateUTC.getTime())) {
      return { success: false, error: "bookings.errors.invalidDate" }
    }

    // Convert to our target timezone
    const selectedDateInTZ = toZonedTime(selectedDateUTC, TIMEZONE)

    // Optimized database queries with lean() for better performance
    const [treatment, settings] = await Promise.all([
      Treatment.findById(treatmentId).lean().exec() as Promise<ITreatment | null>,
      WorkingHoursSettings.findOne().lean().exec() as Promise<IWorkingHoursSettings | null>,
    ])

    if (!treatment || !treatment.isActive) {
      return { success: false, error: "bookings.errors.treatmentNotFound" }
    }

    if (!settings) {
      return { success: false, error: "bookings.errors.workingHoursNotSet" }
    }

    // Calculate treatment duration
    let treatmentDurationMinutes = 0
    if (treatment.pricingType === "fixed") {
      treatmentDurationMinutes = treatment.defaultDurationMinutes || 60
    } else if (treatment.pricingType === "duration_based") {
      if (!selectedDurationId) return { success: false, error: "bookings.errors.durationRequired" }
      const durationObj = treatment.durations?.find(
        d => d._id.toString() === selectedDurationId && d.isActive
      )
      if (!durationObj) return { success: false, error: "bookings.errors.durationNotFound" }
      treatmentDurationMinutes = durationObj.minutes
    }

    if (treatmentDurationMinutes <= 0) {
      return { success: false, error: "bookings.errors.invalidTreatmentDuration" }
    }

    const daySettings = getDayWorkingHours(selectedDateUTC, settings)

    if (!daySettings || !daySettings.isActive) {
      return {
        success: true,
        timeSlots: [],
        workingHoursNote: daySettings?.notes || "bookings.messages.closedOnSelectedDate",
      }
    }

    // Get current time in the correct timezone
    const now = new Date()
    const nowInTZ = toZonedTime(now, TIMEZONE)

    // Check if selected date is today in the target timezone
    const isToday = isSameDay(selectedDateUTC, now)

    // Check if cutoff time has been reached for today
    let isCutoffTimeReached = false
    if (isToday && "cutoffTime" in daySettings && daySettings.cutoffTime) {
      const [cutoffHour, cutoffMinute] = daySettings.cutoffTime.split(":").map(Number)
      const cutoffTimeToday = new Date(nowInTZ)
      cutoffTimeToday.setHours(cutoffHour, cutoffMinute, 0, 0)
      isCutoffTimeReached = nowInTZ >= cutoffTimeToday
    }

    // If today and past cutoff time, no slots are available
    if (isToday && isCutoffTimeReached) {
      return {
        success: true,
        timeSlots: [],
        workingHoursNote: `לא ניתן לבצע הזמנות ליום זה לאחר שעה ${"cutoffTime" in daySettings ? daySettings.cutoffTime : "18:00"}.`,
      }
    }

    // Create time slots based on working hours
    const timeSlots: TimeSlot[] = []

    // Get existing bookings for this date to check availability
    const startOfDay = new Date(selectedDateInTZ)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(selectedDateInTZ)
    endOfDay.setHours(23, 59, 59, 999)

    const existingBookings = await Booking.find({
      bookingDateTime: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      status: { $nin: ["cancelled", "refunded"] },
    }).lean()

    // Generate time slots based on working hours
    if (
      "workingHours" in daySettings &&
      daySettings.workingHours &&
      Array.isArray(daySettings.workingHours)
    ) {
      for (const workingPeriod of daySettings.workingHours) {
        const [startHour, startMinute] = workingPeriod.startTime.split(":").map(Number)
        const [endHour, endMinute] = workingPeriod.endTime.split(":").map(Number)

        let currentTime = new Date(selectedDateInTZ)
        currentTime.setHours(startHour, startMinute, 0, 0)

        const endTime = new Date(selectedDateInTZ)
        endTime.setHours(endHour, endMinute, 0, 0)

        // Generate slots every 30 minutes (or based on treatment duration)
        const slotInterval = Math.min(30, treatmentDurationMinutes)

        while (currentTime < endTime) {
          const slotEndTime = new Date(currentTime.getTime() + treatmentDurationMinutes * 60000)

          // Check if slot end time exceeds working hours
          if (slotEndTime > endTime) {
            break
          }

          // Skip past time slots if it's today
          if (isToday && currentTime <= nowInTZ) {
            currentTime = new Date(currentTime.getTime() + slotInterval * 60000)
            continue
          }

          // Check for conflicts with existing bookings
          const hasConflict = existingBookings.some(booking => {
            const bookingStart = new Date(booking.bookingDateTime)
            const bookingEnd = new Date(
              bookingStart.getTime() + ((booking as any).treatmentDuration || 60) * 60000
            )

            return currentTime < bookingEnd && slotEndTime > bookingStart
          })

          if (!hasConflict) {
            timeSlots.push({
              time: formatTz(currentTime, "HH:mm", { timeZone: TIMEZONE }),
              isAvailable: true,
            })
          }

          currentTime = new Date(currentTime.getTime() + slotInterval * 60000)
        }
      }
    }

    return {
      success: true,
      timeSlots: timeSlots.sort((a, b) => a.time.localeCompare(b.time)),
      workingHoursNote: daySettings.notes,
    }
  } catch (error) {
    logger.error("Error getting available time slots:", { error, dateString, treatmentId })
    return { success: false, error: "bookings.errors.getTimeSlotsFailure" }
  }
}

/**
 * Check if a specific time slot is available
 */
export async function isTimeSlotAvailable(
  dateTime: Date,
  treatmentId: string,
  selectedDurationId?: string,
  excludeBookingId?: string
): Promise<{ available: boolean; reason?: string }> {
  try {
    await dbConnect()

    const treatment = await Treatment.findById(treatmentId).lean()
    if (!treatment) {
      return { available: false, reason: "Treatment not found" }
    }

    // Calculate treatment duration
    let treatmentDurationMinutes = 60
    if (treatment.pricingType === "fixed") {
      treatmentDurationMinutes = treatment.defaultDurationMinutes || 60
    } else if (treatment.pricingType === "duration_based" && selectedDurationId) {
      const durationObj = treatment.durations?.find(d => d._id.toString() === selectedDurationId)
      if (durationObj) {
        treatmentDurationMinutes = durationObj.minutes
      }
    }

    const slotEndTime = new Date(dateTime.getTime() + treatmentDurationMinutes * 60000)

    // Check for conflicting bookings
    const query: any = {
      bookingDateTime: {
        $lt: slotEndTime,
      },
      status: { $nin: ["cancelled", "refunded"] },
    }

    if (excludeBookingId) {
      query._id = { $ne: excludeBookingId }
    }

    const conflictingBookings = await Booking.find(query).lean()

    const hasConflict = conflictingBookings.some(booking => {
      const bookingStart = new Date(booking.bookingDateTime)
      const bookingEnd = new Date(
        bookingStart.getTime() + ((booking as any).treatmentDuration || 60) * 60000
      )

      return dateTime < bookingEnd && slotEndTime > bookingStart
    })

    if (hasConflict) {
      return { available: false, reason: "Time slot is already booked" }
    }

    // Check working hours
    const settings = await WorkingHoursSettings.findOne().lean()
    if (!settings) {
      return { available: false, reason: "Working hours not configured" }
    }

    const daySettings = getDayWorkingHours(dateTime, settings as unknown as IWorkingHoursSettings)
    if (!daySettings || !daySettings.isActive) {
      return { available: false, reason: "Closed on selected date" }
    }

    // Check if time falls within working hours
    if ("workingHours" in daySettings && daySettings.workingHours) {
      const timeString = formatTz(dateTime, "HH:mm", { timeZone: TIMEZONE })
      const [hour, minute] = timeString.split(":").map(Number)
      const timeInMinutes = hour * 60 + minute

      const isWithinWorkingHours = (daySettings.workingHours as any[])?.some((period: any) => {
        const [startHour, startMinute] = period.startTime.split(":").map(Number)
        const [endHour, endMinute] = period.endTime.split(":").map(Number)
        const startInMinutes = startHour * 60 + startMinute
        const endInMinutes = endHour * 60 + endMinute

        return timeInMinutes >= startInMinutes && timeInMinutes < endInMinutes
      })

      if (!isWithinWorkingHours) {
        return { available: false, reason: "Outside working hours" }
      }
    }

    return { available: true }
  } catch (error) {
    logger.error("Error checking time slot availability:", { error, dateTime, treatmentId })
    return { available: false, reason: "System error" }
  }
}

/**
 * Check for booking conflicts
 */
export async function checkBookingConflicts(
  dateTime: Date,
  durationMinutes: number,
  excludeBookingId?: string
): Promise<{ hasConflict: boolean; conflictingBookings?: any[] }> {
  try {
    await dbConnect()

    const slotEndTime = new Date(dateTime.getTime() + durationMinutes * 60000)

    const query: any = {
      bookingDateTime: {
        $lt: slotEndTime,
      },
      status: { $nin: ["cancelled", "refunded"] },
    }

    if (excludeBookingId) {
      query._id = { $ne: excludeBookingId }
    }

    const potentialConflicts = await Booking.find(query)
      .select("bookingDateTime treatmentDuration status")
      .lean()

    const conflictingBookings = potentialConflicts.filter(booking => {
      const bookingStart = new Date(booking.bookingDateTime)
      const bookingEnd = new Date(
        bookingStart.getTime() + ((booking as any).treatmentDuration || 60) * 60000
      )

      return dateTime < bookingEnd && slotEndTime > bookingStart
    })

    return {
      hasConflict: conflictingBookings.length > 0,
      conflictingBookings,
    }
  } catch (error) {
    logger.error("Error checking booking conflicts:", { error, dateTime, durationMinutes })
    return { hasConflict: true, conflictingBookings: [] }
  }
}

/**
 * Get working hours for a specific date (public function)
 */
export async function getWorkingHoursForDate(dateString: string): Promise<{
  success: boolean
  workingHours?: any
  isOpen?: boolean
  error?: string
}> {
  try {
    await dbConnect()

    const date = new Date(`${dateString}T12:00:00.000Z`)
    if (isNaN(date.getTime())) {
      return { success: false, error: "Invalid date" }
    }

    const settings = await WorkingHoursSettings.findOne().lean()
    if (!settings) {
      return { success: false, error: "Working hours not configured" }
    }

    const daySettings = getDayWorkingHours(date, settings as unknown as IWorkingHoursSettings)

    return {
      success: true,
      workingHours: daySettings,
      isOpen: daySettings?.isActive || false,
    }
  } catch (error) {
    logger.error("Error getting working hours for date:", { error, dateString })
    return { success: false, error: "System error" }
  }
}
