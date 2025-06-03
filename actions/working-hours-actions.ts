"use server"

import { revalidatePath } from "next/cache"
import { connectDB } from "@/lib/db/mongoose"
import { WorkingHoursSettings } from "@/lib/db/models/working-hours"
import { logger } from "@/lib/logs/logger"

export async function getWorkingHoursSettings() {
  try {
    await connectDB()

    let settings = await WorkingHoursSettings.findOne().lean()

    if (!settings) {
      // Create default settings if none exist
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
          date: date.date.toISOString().split("T")[0], // Convert to YYYY-MM-DD format
        })) || [],
      createdAt: settings.createdAt?.toISOString(),
      updatedAt: settings.updatedAt?.toISOString(),
    }

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

    // Convert date strings back to Date objects for specialDates
    const processedData = {
      ...data,
      specialDates: data.specialDates.map((date) => ({
        ...date,
        date: new Date(date.date),
      })),
    }

    const settings = await WorkingHoursSettings.findOneAndUpdate({}, processedData, {
      new: true,
      upsert: true,
      runValidators: true,
    })

    revalidatePath("/dashboard/admin/working-hours")

    return { success: true, data: settings }
  } catch (error) {
    logger.error("Error updating working hours settings:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update working hours settings",
    }
  }
}
