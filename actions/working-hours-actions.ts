"use server"

import { revalidatePath } from "next/cache"
import dbConnect from "@/lib/db/mongoose"
import { WorkingHoursSettings } from "@/lib/db/models/working-hours"
import { logger } from "@/lib/logs/logger"

export async function getWorkingHoursSettings() {
  const requestId = `get_working_hours_${Date.now()}_${Math.random().toString(36).substring(2, 2, 10)}`

  try {
    logger.info(`[${requestId}] Fetching working hours settings`)
    await dbConnect()

    let settings = await WorkingHoursSettings.findOne().lean()

    if (!settings) {
      logger.info(`[${requestId}] No settings found, creating default`)
      // Create default settings if none exist
      const defaultSettings = new WorkingHoursSettings({
        fixedHours: Array.from({ length: 7 }, (_, i) => ({
          dayOfWeek: i,
          isActive: false,
          startTime: "09:00",
          endTime: "17:00",
          hasPriceAddition: false,
          priceAddition: { amount: 0, type: "fixed" },
          notes: "",
          minimumBookingAdvanceHours: 2,
          cutoffTime: null,
          professionalSharePercentage: 70,
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
          date: date.date.toISOString().split("T")[0], // Convert to YYYY-MM-DD format
        })) || [],
      specialDateEvents:
        settings.specialDateEvents?.map((event) => ({
          ...event,
          _id: event._id?.toString(),
          dates: event.dates.map(date => date.toISOString().split("T")[0]), // Convert dates array
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

// הוסף פונקציות נפרדות לעדכון fixedHours ו-specialDates

export async function updateFixedHours(fixedHours: any[]) {
  const requestId = `update_fixed_hours_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

  try {
    logger.info(`[${requestId}] Updating fixed hours only`)
    await dbConnect()

    // Validate fixedHours
    if (!fixedHours || fixedHours.length !== 7) {
      logger.error(`[${requestId}] Invalid fixedHours length: ${fixedHours?.length}`)
      return { success: false, error: "Fixed hours must contain exactly 7 days" }
    }

    // Ensure all days 0-6 are present
    for (let i = 0; i < 7; i++) {
      const dayExists = fixedHours.some((day) => day.dayOfWeek === i)
      if (!dayExists) {
        logger.error(`[${requestId}] Missing day ${i} in fixedHours`)
        return { success: false, error: `Missing day ${i} in fixed hours` }
      }
    }

    const processedFixedHours = fixedHours.map((fh) => ({
      ...fh,
      priceAddition: fh.hasPriceAddition && fh.priceAddition ? fh.priceAddition : { amount: 0, type: "fixed" },
      notes: fh.notes?.trim() || "",
      minimumBookingAdvanceHours: fh.minimumBookingAdvanceHours ?? 2,
      cutoffTime: fh.cutoffTime || null,
      professionalSharePercentage: fh.professionalSharePercentage ?? 70,
    }))

    // Get existing settings or create new
    let settings = await WorkingHoursSettings.findOne()

    if (!settings) {
      settings = new WorkingHoursSettings({
        fixedHours: processedFixedHours,
        specialDates: [],
        specialDateEvents: [],
      })
    } else {
      settings.fixedHours = processedFixedHours
    }

    await settings.save()

    logger.info(`[${requestId}] Successfully updated fixed hours`)
    revalidatePath("/dashboard/admin/working-hours")

    return { success: true, data: settings.toObject() }
  } catch (error) {
    logger.error(`[${requestId}] Error updating fixed hours:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update fixed hours",
    }
  }
}

export async function updateSpecialDates(specialDates: any[]) {
  const requestId = `update_special_dates_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

  try {
    logger.info(`[${requestId}] Updating special dates only`)
    await dbConnect()

    // Process special dates with better date handling
    const processedSpecialDates = specialDates.map((date, index) => {
      console.log(`[${requestId}] Processing special date ${index}:`, date)

      let processedDate

      // טפל בפורמטים שונים של תאריך
      if (typeof date.date === "string") {
        // אם זה string, נסה לפרש אותו
        if (date.date.includes("T")) {
          // ISO string
          processedDate = new Date(date.date)
        } else {
          // YYYY-MM-DD format - הוסף זמן UTC כדי למנוע בעיות timezone
          processedDate = new Date(date.date + "T12:00:00.000Z")
        }
      } else {
        // אם זה כבר Date object
        processedDate = new Date(date.date)
      }

      // ודא שהתאריך תקין
      if (isNaN(processedDate.getTime())) {
        console.error(`[${requestId}] Invalid date format: ${date.date}`)
        throw new Error(`Invalid date format: ${date.date}`)
      }

      const processed = {
        name: date.name || "",
        date: processedDate,
        isActive: Boolean(date.isActive),
        startTime: date.startTime || "09:00",
        endTime: date.endTime || "17:00",
        hasPriceAddition: Boolean(date.hasPriceAddition),
        priceAddition: date.hasPriceAddition && date.priceAddition ? date.priceAddition : { amount: 0, type: "fixed" },
        notes: date.notes?.trim() || "",
      }

      console.log(`[${requestId}] Processed special date ${index}:`, processed)
      return processed
    })

    // Get existing settings or create new
    let settings = await WorkingHoursSettings.findOne()

    if (!settings) {
      const defaultFixedHours = Array.from({ length: 7 }, (_, i) => ({
        dayOfWeek: i,
        isActive: false,
        startTime: "09:00",
        endTime: "17:00",
        hasPriceAddition: false,
        priceAddition: { amount: 0, type: "fixed" },
        notes: "",
        minimumBookingAdvanceHours: 2,
        cutoffTime: null,
        professionalSharePercentage: 70,
      }))

      settings = new WorkingHoursSettings({
        fixedHours: defaultFixedHours,
        specialDates: processedSpecialDates,
        specialDateEvents: [],
      })
    } else {
      settings.specialDates = processedSpecialDates
    }

    await settings.save()

    logger.info(`[${requestId}] Successfully updated special dates`)
    revalidatePath("/dashboard/admin/working-hours")

    return { success: true, data: settings.toObject() }
  } catch (error) {
    console.error(`[${requestId}] Error updating special dates:`, error)
    logger.error(`[${requestId}] Error updating special dates:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update special dates",
    }
  }
}

// New function for managing special date events
export async function updateSpecialDateEvents(specialDateEvents: any[]) {
  const requestId = `update_special_events_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

  try {
    logger.info(`[${requestId}] Updating special date events only`)
    await dbConnect()

    // Process special date events
    const processedEvents = specialDateEvents.map((event, index) => {
      console.log(`[${requestId}] Processing special event ${index}:`, event)

      // Process dates array
      const processedDates = event.dates.map((dateStr: string) => {
        let processedDate

        if (typeof dateStr === "string") {
          if (dateStr.includes("T")) {
            processedDate = new Date(dateStr)
          } else {
            processedDate = new Date(dateStr + "T12:00:00.000Z")
          }
        } else {
          processedDate = new Date(dateStr)
        }

        if (isNaN(processedDate.getTime())) {
          throw new Error(`Invalid date format in event: ${dateStr}`)
        }

        return processedDate
      })

      const processed = {
        name: event.name || "",
        description: event.description?.trim() || "",
        eventType: event.eventType || "special",
        color: event.color || "#3B82F6",
        dates: processedDates,
        isActive: Boolean(event.isActive),
        startTime: event.startTime || "09:00",
        endTime: event.endTime || "17:00",
        hasPriceAddition: Boolean(event.hasPriceAddition),
        priceAddition: event.hasPriceAddition && event.priceAddition ? event.priceAddition : { amount: 0, type: "fixed" },
        notes: event.notes?.trim() || "",
        minimumBookingAdvanceHours: event.minimumBookingAdvanceHours ?? 2,
        cutoffTime: event.cutoffTime || null,
        professionalSharePercentage: event.professionalSharePercentage ?? 70,
      }

      console.log(`[${requestId}] Processed special event ${index}:`, processed)
      return processed
    })

    // Get existing settings or create new
    let settings = await WorkingHoursSettings.findOne()

    if (!settings) {
      const defaultFixedHours = Array.from({ length: 7 }, (_, i) => ({
        dayOfWeek: i,
        isActive: false,
        startTime: "09:00",
        endTime: "17:00",
        hasPriceAddition: false,
        priceAddition: { amount: 0, type: "fixed" },
        notes: "",
        minimumBookingAdvanceHours: 2,
        cutoffTime: null,
        professionalSharePercentage: 70,
      }))

      settings = new WorkingHoursSettings({
        fixedHours: defaultFixedHours,
        specialDates: [],
        specialDateEvents: processedEvents,
      })
    } else {
      settings.specialDateEvents = processedEvents
    }

    await settings.save()

    logger.info(`[${requestId}] Successfully updated special date events`)
    revalidatePath("/dashboard/admin/working-hours")

    return { success: true, data: settings.toObject() }
  } catch (error) {
    console.error(`[${requestId}] Error updating special date events:`, error)
    logger.error(`[${requestId}] Error updating special date events:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update special date events",
    }
  }
}

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

    if (index < 0 || index >= settings.specialDates.length) {
      logger.error(`[${requestId}] Invalid index ${index} for ${settings.specialDates.length} special dates`)
      return { success: false, error: "Invalid special date index" }
    }

    settings.specialDates.splice(index, 1)
    await settings.save()

    logger.info(`[${requestId}] Successfully deleted special date at index ${index}`)
    revalidatePath("/dashboard/admin/working-hours")

    return { success: true, data: settings.toObject() }
  } catch (error) {
    logger.error(`[${requestId}] Error deleting special date:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete special date",
    }
  }
}

export async function deleteSpecialDateEvent(index: number) {
  const requestId = `delete_special_event_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

  try {
    logger.info(`[${requestId}] Deleting special date event at index ${index}`)
    await dbConnect()

    const settings = await WorkingHoursSettings.findOne()
    if (!settings) {
      logger.error(`[${requestId}] No settings found`)
      return { success: false, error: "Working hours settings not found" }
    }

    if (!settings.specialDateEvents || index < 0 || index >= settings.specialDateEvents.length) {
      logger.error(`[${requestId}] Invalid index ${index} for ${settings.specialDateEvents?.length || 0} special events`)
      return { success: false, error: "Invalid special event index" }
    }

    settings.specialDateEvents.splice(index, 1)
    await settings.save()

    logger.info(`[${requestId}] Successfully deleted special date event at index ${index}`)
    revalidatePath("/dashboard/admin/working-hours")

    return { success: true, data: settings.toObject() }
  } catch (error) {
    logger.error(`[${requestId}] Error deleting special date event:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete special date event",
    }
  }
}

export async function updateWorkingHoursSettings(data: {
  fixedHours: any[]
  specialDates: any[]
  specialDateEvents?: any[]
}) {
  const requestId = `update_working_hours_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

  try {
    logger.info(`[${requestId}] Updating complete working hours settings`)
    console.log(`[${requestId}] Request data:`, JSON.stringify(data, null, 2))

    await dbConnect()

    // Validate fixedHours
    if (!data.fixedHours || data.fixedHours.length !== 7) {
      logger.error(`[${requestId}] Invalid fixedHours length: ${data.fixedHours?.length}`)
      return { success: false, error: "Fixed hours must contain exactly 7 days" }
    }

    // Ensure all days 0-6 are present
    for (let i = 0; i < 7; i++) {
      const dayExists = data.fixedHours.some((day) => day.dayOfWeek === i)
      if (!dayExists) {
        logger.error(`[${requestId}] Missing day ${i} in fixedHours`)
        return { success: false, error: `Missing day ${i} in fixed hours` }
      }
    }

    // Process special dates with better date handling
    const processedSpecialDates = data.specialDates.map((date, index) => {
      console.log(`[${requestId}] Processing special date ${index}:`, date)

      let processedDate

      // טפל בפורמטים שונים של תאריך
      if (typeof date.date === "string") {
        // אם זה string, נסה לפרש אותו
        if (date.date.includes("T")) {
          // ISO string
          processedDate = new Date(date.date)
        } else {
          // YYYY-MM-DD format - הוסף זמן UTC כדי למנוע בעיות timezone
          processedDate = new Date(date.date + "T12:00:00.000Z")
        }
      } else {
        // אם זה כבר Date object
        processedDate = new Date(date.date)
      }

      // ודא שהתאריך תקין
      if (isNaN(processedDate.getTime())) {
        console.error(`[${requestId}] Invalid date format: ${date.date}`)
        throw new Error(`Invalid date format: ${date.date}`)
      }

      const processed = {
        name: date.name || "",
        date: processedDate,
        isActive: Boolean(date.isActive),
        startTime: date.startTime || "09:00",
        endTime: date.endTime || "17:00",
        hasPriceAddition: Boolean(date.hasPriceAddition),
        priceAddition: date.hasPriceAddition && date.priceAddition ? date.priceAddition : { amount: 0, type: "fixed" },
        notes: date.notes?.trim() || "",
      }

      console.log(`[${requestId}] Processed special date ${index}:`, processed)
      return processed
    })

    // Process special date events if provided
    const processedSpecialDateEvents = data.specialDateEvents ? data.specialDateEvents.map((event, index) => {
      console.log(`[${requestId}] Processing special event ${index}:`, event)

      // Process dates array
      const processedDates = event.dates.map((dateStr: string) => {
        let processedDate

        if (typeof dateStr === "string") {
          if (dateStr.includes("T")) {
            processedDate = new Date(dateStr)
          } else {
            processedDate = new Date(dateStr + "T12:00:00.000Z")
          }
        } else {
          processedDate = new Date(dateStr)
        }

        if (isNaN(processedDate.getTime())) {
          throw new Error(`Invalid date format in event: ${dateStr}`)
        }

        return processedDate
      })

      const processed = {
        name: event.name || "",
        description: event.description?.trim() || "",
        eventType: event.eventType || "special",
        color: event.color || "#3B82F6",
        dates: processedDates,
        isActive: Boolean(event.isActive),
        startTime: event.startTime || "09:00",
        endTime: event.endTime || "17:00",
        hasPriceAddition: Boolean(event.hasPriceAddition),
        priceAddition: event.hasPriceAddition && event.priceAddition ? event.priceAddition : { amount: 0, type: "fixed" },
        notes: event.notes?.trim() || "",
        minimumBookingAdvanceHours: event.minimumBookingAdvanceHours ?? 2,
        cutoffTime: event.cutoffTime || null,
        professionalSharePercentage: event.professionalSharePercentage ?? 70,
      }

      console.log(`[${requestId}] Processed special event ${index}:`, processed)
      return processed
    }) : []

    // Convert date strings back to Date objects for specialDates
    const processedData = {
      fixedHours: data.fixedHours.map((fh) => ({
        ...fh,
        priceAddition: fh.hasPriceAddition && fh.priceAddition ? fh.priceAddition : { amount: 0, type: "fixed" },
        notes: fh.notes?.trim() || "",
        minimumBookingAdvanceHours: fh.minimumBookingAdvanceHours ?? 2,
        cutoffTime: fh.cutoffTime || null,
        professionalSharePercentage: fh.professionalSharePercentage ?? 70,
      })),
      specialDates: processedSpecialDates,
      specialDateEvents: processedSpecialDateEvents,
    }

    console.log(`[${requestId}] Final processed data:`, JSON.stringify(processedData, null, 2))

    logger.info(`[${requestId}] Processed data for update`, {
      specialDatesProcessed: processedData.specialDates.length,
      specialEventsProcessed: processedData.specialDateEvents.length,
      specialDatesData: processedData.specialDates,
      specialEventsData: processedData.specialDateEvents,
    })

    // מחק את ההגדרות הקיימות ויצור חדשות
    await WorkingHoursSettings.deleteMany({})

    const newSettings = new WorkingHoursSettings(processedData)
    const settings = await newSettings.save()

    console.log(`[${requestId}] Saved settings:`, JSON.stringify(settings.toObject(), null, 2))

    if (!settings) {
      logger.error(`[${requestId}] Failed to update/create settings`)
      return { success: false, error: "Failed to update working hours settings" }
    }

    logger.info(`[${requestId}] Successfully updated working hours settings with ID: ${settings._id}`)

    revalidatePath("/dashboard/admin/working-hours")

    return { success: true, data: settings.toObject() }
  } catch (error) {
    console.error(`[${requestId}] Error updating working hours settings:`, error)
    logger.error(`[${requestId}] Error updating working hours settings:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update working hours settings",
    }
  }
}
