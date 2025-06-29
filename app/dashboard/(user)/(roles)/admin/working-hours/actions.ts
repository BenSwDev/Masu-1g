"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { revalidatePath } from "next/cache"
import dbConnect from "@/lib/db/mongoose"
import { WorkingHoursSettings } from "@/lib/db/models/working-hours"
import { logger } from "@/lib/logs/logger"
import type { IFixedHours, ISpecialDate, ISpecialDateEvent } from "@/lib/db/models/working-hours"

/**
 * Fetches the working hours settings from the database
 * Creates default settings if none exist
 */
export async function getWorkingHoursSettings() {
  const requestId = `get_working_hours_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

  try {
    logger.info(`[${requestId}] Fetching working hours settings`)
    await dbConnect()

    let settings = await WorkingHoursSettings.findOne().lean()

    if (!settings) {
      logger.info(`[${requestId}] No settings found, creating default`)
      const defaultSettings = new WorkingHoursSettings({
        fixedHours: Array.from({ length: 7 }, (_, i) => ({
          dayOfWeek: i,
          isActive: false,
          startTime: "09:00",
          endTime: "17:00",
          hasPriceAddition: false,
          priceAddition: { 
            amount: 0, 
            type: "fixed",
            description: "",
            priceAdditionStartTime: null,
            priceAdditionEndTime: null,
          },
          notes: "",
          minimumBookingAdvanceHours: 2,
          cutoffTime: null,
          professionalShare: { amount: 70, type: "percentage" },
        })),
        specialDates: [],
        specialDateEvents: [],
      })

      settings = await defaultSettings.save()
      logger.info(`[${requestId}] Default settings created with ID: ${settings._id}`)
    }

    // Ensure fixedHours are sorted by dayOfWeek
    if (settings.fixedHours) {
      settings.fixedHours.sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    }

    // Convert dates to strings for client
    const serializedSettings = {
      ...settings,
      _id: settings._id?.toString(),
      specialDates:
        settings.specialDates?.map((date) => ({
          ...date,
          _id: date._id?.toString(),
          date: date.date.toISOString().split("T")[0],
        })) || [],
      specialDateEvents:
        settings.specialDateEvents?.map((event) => ({
          ...event,
          _id: event._id?.toString(),
          dates: event.dates.map(date => date.toISOString().split("T")[0]),
        })) || [],
      createdAt: settings.createdAt?.toISOString(),
      updatedAt: settings.updatedAt?.toISOString(),
    }

    logger.info(`[${requestId}] Successfully fetched working hours settings`)
    return { success: true, data: serializedSettings }
  } catch (error) {
    logger.error(`[${requestId}] Error fetching working hours settings:`, error)
    return { success: false, error: "Failed to fetch working hours settings" }
  }
}

// Helper function to sanitize price addition data
function sanitizePriceAddition(priceAddition: any) {
  if (!priceAddition) return { amount: 0, type: "fixed", description: "", priceAdditionStartTime: null, priceAdditionEndTime: null }
  
  return {
    amount: Number(priceAddition.amount) || 0,
    type: priceAddition.type || "fixed",
    description: priceAddition.description || "",
    priceAdditionStartTime: priceAddition.priceAdditionStartTime || null,
    priceAdditionEndTime: priceAddition.priceAdditionEndTime || null,
  }
}

/**
 * Updates the fixed hours settings
 */
export async function updateFixedHours(fixedHours: IFixedHours[]) {
  const requestId = `update_fixed_hours_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

  try {
    logger.info(`[${requestId}] Updating fixed hours`)
    await dbConnect()

    // Sanitize and validate the data
    const sanitizedFixedHours = fixedHours.map((day) => ({
      ...day,
      priceAddition: sanitizePriceAddition(day.priceAddition),
      professionalShare: {
        amount: Number(day.professionalShare?.amount) || 70,
        type: day.professionalShare?.type || "percentage",
      },
    }))

    // Find existing settings or create new one
    let settings = await WorkingHoursSettings.findOne()
    if (!settings) {
      settings = new WorkingHoursSettings({
        fixedHours: sanitizedFixedHours,
        specialDates: [],
        specialDateEvents: [],
      })
    } else {
      settings.fixedHours = sanitizedFixedHours
    }

    await settings.save()
    revalidatePath("/dashboard/admin/working-hours")

    logger.info(`[${requestId}] Successfully updated fixed hours`)
    return { success: true }
  } catch (error) {
    logger.error(`[${requestId}] Error updating fixed hours:`, error)
    return { success: false, error: "Failed to update fixed hours" }
  }
}

/**
 * Updates the special dates settings
 */
export async function updateSpecialDates(specialDates: ISpecialDate[]) {
  const requestId = `update_special_dates_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

  try {
    logger.info(`[${requestId}] Updating special dates`)
    await dbConnect()

    const settings = await WorkingHoursSettings.findOne()
    if (!settings) {
      logger.error(`[${requestId}] No settings found`)
      return { success: false, error: "Working hours settings not found" }
    }

    // Sanitize the special dates data
    const sanitizedSpecialDates = specialDates.map((date) => ({
      ...date,
      priceAddition: sanitizePriceAddition(date.priceAddition),
    }))

    settings.specialDates = sanitizedSpecialDates
    await settings.save()

    revalidatePath("/dashboard/admin/working-hours")
    logger.info(`[${requestId}] Successfully updated special dates`)
    return { success: true }
  } catch (error) {
    logger.error(`[${requestId}] Error updating special dates:`, error)
    return { success: false, error: "Failed to update special dates" }
  }
}

/**
 * Updates the special date events settings
 */
export async function updateSpecialDateEvents(specialDateEvents: ISpecialDateEvent[]) {
  const requestId = `update_special_date_events_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

  try {
    logger.info(`[${requestId}] Updating special date events`)
    await dbConnect()

    const settings = await WorkingHoursSettings.findOne()
    if (!settings) {
      logger.error(`[${requestId}] No settings found`)
      return { success: false, error: "Working hours settings not found" }
    }

    // Sanitize the special date events data
    const sanitizedSpecialDateEvents = specialDateEvents.map((event) => ({
      ...event,
      priceAddition: sanitizePriceAddition(event.priceAddition),
      professionalShare: {
        amount: Number(event.professionalShare?.amount) || 70,
        type: event.professionalShare?.type || "percentage",
      },
    }))

    settings.specialDateEvents = sanitizedSpecialDateEvents
    await settings.save()

    revalidatePath("/dashboard/admin/working-hours")
    logger.info(`[${requestId}] Successfully updated special date events`)
    return { success: true }
  } catch (error) {
    logger.error(`[${requestId}] Error updating special date events:`, error)
    return { success: false, error: "Failed to update special date events" }
  }
}

/**
 * Deletes a special date by index
 */
export async function deleteSpecialDate(index: number) {
  const requestId = `delete_special_date_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

  try {
    logger.info(`[${requestId}] Deleting special date at index ${index}`)
    await dbConnect()

    const settings = await WorkingHoursSettings.findOne()
    if (!settings) {
      logger.error(`[${requestId}] No settings found`)
      return { success: false, error: "Working hours settings not found" }
    }

    if (!settings.specialDates || index >= settings.specialDates.length) {
      logger.error(`[${requestId}] Invalid index: ${index}`)
      return { success: false, error: "Invalid special date index" }
    }

    settings.specialDates.splice(index, 1)
    await settings.save()

    revalidatePath("/dashboard/admin/working-hours")
    logger.info(`[${requestId}] Successfully deleted special date`)
    return { success: true }
  } catch (error) {
    logger.error(`[${requestId}] Error deleting special date:`, error)
    return { success: false, error: "Failed to delete special date" }
  }
}

/**
 * Deletes a special date event by index
 */
export async function deleteSpecialDateEvent(index: number) {
  const requestId = `delete_special_date_event_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

  try {
    logger.info(`[${requestId}] Deleting special date event at index ${index}`)
    await dbConnect()

    const settings = await WorkingHoursSettings.findOne()
    if (!settings) {
      logger.error(`[${requestId}] No settings found`)
      return { success: false, error: "Working hours settings not found" }
    }

    if (!settings.specialDateEvents || index >= settings.specialDateEvents.length) {
      logger.error(`[${requestId}] Invalid index: ${index}`)
      return { success: false, error: "Invalid special date event index" }
    }

    settings.specialDateEvents.splice(index, 1)
    await settings.save()

    revalidatePath("/dashboard/admin/working-hours")
    logger.info(`[${requestId}] Successfully deleted special date event`)
    return { success: true }
  } catch (error) {
    logger.error(`[${requestId}] Error deleting special date event:`, error)
    return { success: false, error: "Failed to delete special date event" }
  }
}

/**
 * Get working hours settings
 */
export async function getWorkingHours(): Promise<{
  success: boolean
  data?: any
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    // Return default working hours for now
    const defaultWorkingHours = {
      sunday: { enabled: true, start: "09:00", end: "17:00" },
      monday: { enabled: true, start: "09:00", end: "17:00" },
      tuesday: { enabled: true, start: "09:00", end: "17:00" },
      wednesday: { enabled: true, start: "09:00", end: "17:00" },
      thursday: { enabled: true, start: "09:00", end: "17:00" },
      friday: { enabled: true, start: "09:00", end: "15:00" },
      saturday: { enabled: false, start: "09:00", end: "17:00" },
    }

    return { success: true, data: defaultWorkingHours }
  } catch (error) {
    logger.error("Error fetching working hours:", error)
    return { success: false, error: "Failed to fetch working hours" }
  }
}

/**
 * Update working hours settings
 */
export async function updateWorkingHours(workingHours: any): Promise<{
  success: boolean
  data?: any
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    // For now, just return the same working hours (no actual DB update)
    // TODO: Implement actual working hours storage
    
    revalidatePath("/dashboard/admin/working-hours")

    return { success: true, data: workingHours }
  } catch (error) {
    logger.error("Error updating working hours:", error)
    return { success: false, error: "Failed to update working hours" }
  }
} 
