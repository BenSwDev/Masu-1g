"use server"

import { revalidatePath } from "next/cache"
import { connectDB } from "@/lib/db/mongoose"
import { WorkingHoursSettings } from "@/lib/db/models/working-hours"
import { logger } from "@/lib/logs/logger" // Verified path

export async function getWorkingHoursSettings() {
  try {
    await connectDB()

    let settings = await WorkingHoursSettings.findOne().lean()

    if (!settings) {
      const defaultSettings = new WorkingHoursSettings({
        fixedHours: Array.from({ length: 7 }, (_, i) => ({
          dayOfWeek: i,
          isActive: false,
          startTime: "09:00",
          endTime: "17:00",
          hasPriceAddition: false,
          notes: "",
        })),
        specialDates: [],
      })

      settings = await defaultSettings.save()
      logger.info("Default working hours settings created:", { settingsId: settings._id?.toString() })
    }

    if (settings.fixedHours) {
      settings.fixedHours.sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    }

    const serializedSettings = {
      ...settings,
      _id: settings._id?.toString(),
      specialDates:
        settings.specialDates?.map((date) => ({
          ...date,
          date: date.date.toISOString().split("T")[0], // Ensure date is string yyyy-MM-dd
        })) || [],
      createdAt: settings.createdAt?.toISOString(),
      updatedAt: settings.updatedAt?.toISOString(),
    }

    logger.info("Fetched working hours settings for client:", {
      settingsId: serializedSettings._id,
      fixedHoursCount: serializedSettings.fixedHours?.length,
      specialDatesCount: serializedSettings.specialDates?.length,
    })
    return { success: true, data: serializedSettings }
  } catch (error) {
    logger.error("Error fetching working hours settings:", error)
    return { success: false, error: "Failed to fetch working hours settings" }
  }
}

export async function updateWorkingHoursSettings(data: {
  fixedHours: any[]
  specialDates: any[]
}) {
  try {
    await connectDB()

    logger.info("Attempting to update working hours settings with data:", { data })

    const processedData = {
      ...data,
      specialDates: data.specialDates.map((date) => ({
        ...date,
        date: new Date(date.date), // Convert string date back to Date object
      })),
    }

    const settings = await WorkingHoursSettings.findOneAndUpdate({}, processedData, {
      new: true,
      upsert: true,
      runValidators: true,
    })

    logger.info("Successfully updated working hours settings in DB:", { settingsId: settings._id?.toString() })

    revalidatePath("/dashboard/admin/working-hours")

    return { success: true, data: settings }
  } catch (error) {
    logger.error("Error updating working hours settings in DB:", {
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      errorStack: error instanceof Error ? error.stack : undefined,
      originalData: data,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update working hours settings",
    }
  }
}
