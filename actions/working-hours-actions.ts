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
        })),
        specialDates: [],
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
    }))

    // Get existing settings or create new
    let settings = await WorkingHoursSettings.findOne()

    if (!settings) {
      settings = new WorkingHoursSettings({
        fixedHours: processedFixedHours,
        specialDates: [],
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

export async function addSpecialDate(specialDate: any) {
  const requestId = `add_special_date_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

  try {
    logger.info(`[${requestId}] Adding special date`, { specialDate })
    await dbConnect()

    let processedDate
    if (typeof specialDate.date === "string") {
      if (specialDate.date.includes("T")) {
        processedDate = new Date(specialDate.date)
      } else {
        processedDate = new Date(specialDate.date + "T12:00:00.000Z")
      }
    } else {
      processedDate = new Date(specialDate.date)
    }

    if (isNaN(processedDate.getTime())) {
      throw new Error(`Invalid date format: ${specialDate.date}`)
    }

    const processedSpecialDate = {
      name: specialDate.name || "",
      date: processedDate,
      isActive: Boolean(specialDate.isActive),
      startTime: specialDate.startTime || "09:00",
      endTime: specialDate.endTime || "17:00",
      hasPriceAddition: Boolean(specialDate.hasPriceAddition),
      priceAddition:
        specialDate.hasPriceAddition && specialDate.priceAddition
          ? specialDate.priceAddition
          : { amount: 0, type: "fixed" },
      notes: specialDate.notes?.trim() || "",
    }

    // Get existing settings or create new
    let settings = await WorkingHoursSettings.findOne()

    if (!settings) {
      // Create default fixed hours
      const defaultFixedHours = Array.from({ length: 7 }, (_, i) => ({
        dayOfWeek: i,
        isActive: false,
        startTime: "09:00",
        endTime: "17:00",
        hasPriceAddition: false,
        priceAddition: { amount: 0, type: "fixed" },
        notes: "",
      }))

      settings = new WorkingHoursSettings({
        fixedHours: defaultFixedHours,
        specialDates: [processedSpecialDate],
      })
    } else {
      settings.specialDates.push(processedSpecialDate)
    }

    await settings.save()

    logger.info(`[${requestId}] Successfully added special date`)
    revalidatePath("/dashboard/admin/working-hours")

    return { success: true, data: settings.toObject() }
  } catch (error) {
    logger.error(`[${requestId}] Error adding special date:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add special date",
    }
  }
}

export async function updateSpecialDate(index: number, specialDate: any) {
  const requestId = `update_special_date_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

  try {
    logger.info(`[${requestId}] Updating special date at index ${index}`)
    await dbConnect()

    let processedDate
    if (typeof specialDate.date === "string") {
      if (specialDate.date.includes("T")) {
        processedDate = new Date(specialDate.date)
      } else {
        processedDate = new Date(specialDate.date + "T12:00:00.000Z")
      }
    } else {
      processedDate = new Date(specialDate.date)
    }

    if (isNaN(processedDate.getTime())) {
      throw new Error(`Invalid date format: ${specialDate.date}`)
    }

    const processedSpecialDate = {
      name: specialDate.name || "",
      date: processedDate,
      isActive: Boolean(specialDate.isActive),
      startTime: specialDate.startTime || "09:00",
      endTime: specialDate.endTime || "17:00",
      hasPriceAddition: Boolean(specialDate.hasPriceAddition),
      priceAddition:
        specialDate.hasPriceAddition && specialDate.priceAddition
          ? specialDate.priceAddition
          : { amount: 0, type: "fixed" },
      notes: specialDate.notes?.trim() || "",
    }

    const settings = await WorkingHoursSettings.findOne()
    if (!settings) {
      return { success: false, error: "Settings not found" }
    }

    if (index < 0 || index >= settings.specialDates.length) {
      return { success: false, error: "Invalid special date index" }
    }

    settings.specialDates[index] = processedSpecialDate
    await settings.save()

    logger.info(`[${requestId}] Successfully updated special date`)
    revalidatePath("/dashboard/admin/working-hours")

    return { success: true, data: settings.toObject() }
  } catch (error) {
    logger.error(`[${requestId}] Error updating special date:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update special date",
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
      return { success: false, error: "Settings not found" }
    }

    if (index < 0 || index >= settings.specialDates.length) {
      return { success: false, error: "Invalid special date index" }
    }

    settings.specialDates.splice(index, 1)
    await settings.save()

    logger.info(`[${requestId}] Successfully deleted special date`)
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
export async function updateWorkingHoursSettings(data: {
  fixedHours: any[]
  specialDates: any[]
}) {
  const requestId = `update_working_hours_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

  try {
    console.log(`[${requestId}] Raw input data:`, JSON.stringify(data, null, 2))

    logger.info(`[${requestId}] Updating working hours settings`, {
      fixedHoursCount: data.fixedHours?.length,
      specialDatesCount: data.specialDates?.length,
      specialDatesRaw: data.specialDates,
    })
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

    // Convert date strings back to Date objects for specialDates
    const processedData = {
      fixedHours: data.fixedHours.map((fh) => ({
        ...fh,
        priceAddition: fh.hasPriceAddition && fh.priceAddition ? fh.priceAddition : { amount: 0, type: "fixed" },
        notes: fh.notes?.trim() || "",
      })),
      specialDates: processedSpecialDates,
    }

    console.log(`[${requestId}] Final processed data:`, JSON.stringify(processedData, null, 2))

    logger.info(`[${requestId}] Processed data for update`, {
      specialDatesProcessed: processedData.specialDates.length,
      specialDatesData: processedData.specialDates,
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
