"use server"

import { revalidatePath } from "next/cache"
import dbConnect from "@/lib/db/mongoose"
import { WorkingHoursSettings } from "@/lib/db/models/working-hours"
import { logger } from "@/lib/logs/logger"

export async function getWorkingHoursSettings() {
  const requestId = `get_working_hours_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

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

export async function updateWorkingHoursSettings(data: {
  fixedHours: any[]
  specialDates: any[]
}) {
  const requestId = `update_working_hours_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

  try {
    logger.info(`[${requestId}] Updating working hours settings`)
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

    // Convert date strings back to Date objects for specialDates
    const processedData = {
      ...data,
      fixedHours: data.fixedHours.map((fh) => ({
        ...fh,
        // וודא שpriceAddition קיים תמיד
        priceAddition: fh.hasPriceAddition && fh.priceAddition ? fh.priceAddition : { amount: 0, type: "fixed" },
        // נקה הערות אם הן ריקות
        notes: fh.notes?.trim() || "",
      })),
      specialDates: data.specialDates.map((date) => {
        return {
          ...date,
          date: new Date(date.date),
          priceAddition:
            date.hasPriceAddition && date.priceAddition ? date.priceAddition : { amount: 0, type: "fixed" },
          notes: date.notes?.trim() || "",
        }
      }),
    }

    logger.info(`[${requestId}] Processed data for update`)

    const settings = await WorkingHoursSettings.findOneAndUpdate({}, processedData, {
      new: true,
      upsert: true,
      runValidators: true,
    })

    if (!settings) {
      logger.error(`[${requestId}] Failed to update/create settings`)
      return { success: false, error: "Failed to update working hours settings" }
    }

    logger.info(`[${requestId}] Successfully updated working hours settings with ID: ${settings._id}`)

    revalidatePath("/dashboard/admin/working-hours")

    return { success: true, data: settings }
  } catch (error) {
    logger.error(`[${requestId}] Error updating working hours settings:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update working hours settings",
    }
  }
}
