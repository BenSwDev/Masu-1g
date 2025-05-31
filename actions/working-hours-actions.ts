"use server"

import dbConnect from "@/lib/db/mongoose"
import WorkingHoursSettings from "@/lib/db/models/working-hours"
import type { FixedHourSetting, SpecialDateSetting, WorkingHoursSettingsDocument } from "@/lib/db/models/working-hours"
import { revalidatePath } from "next/cache"
import { logger } from "@/lib/logs/logger"
import { getCurrentUser } from "@/lib/auth/auth"

interface FixedHourInput extends Omit<FixedHourSetting, "day"> {
  day?: number // day might not be part of the input from client for fixed hours array index implies day
}
interface SpecialDateInput extends SpecialDateSetting {}

interface ActionResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// Helper to create default fixed hours
const createDefaultFixedHours = (): FixedHourSetting[] => {
  return Array(7)
    .fill(null)
    .map((_, index) => ({
      day: index,
      isActive: false,
      startTime: "09:00",
      endTime: "17:00",
      hasPriceOverride: false,
      priceOverrideType: "amount",
      priceOverrideAmount: undefined,
      priceOverridePercentage: undefined,
      notes: "",
    }))
}

export async function getWorkingHoursSettingsAction(): Promise<ActionResponse<WorkingHoursSettingsDocument>> {
  const user = await getCurrentUser()
  if (!user || user.activeRole !== "admin") {
    logger.warn("[WorkingHoursActions] Unauthorized attempt to get settings by user:", user?.id)
    return { success: false, error: "Unauthorized" }
  }

  try {
    await dbConnect()
    let settings = await WorkingHoursSettings.findOne().lean<WorkingHoursSettingsDocument>()

    if (!settings) {
      logger.info("[WorkingHoursActions] No settings found, creating default settings.")
      const defaultFixedHours = createDefaultFixedHours()
      // Create new settings with defaults
      settings = await WorkingHoursSettings.create({
        fixedHours: defaultFixedHours,
        specialDates: [],
      })
      // Fetch the created document to ensure it's a plain object if create returns a Mongoose object
      settings = await WorkingHoursSettings.findById(settings._id).lean<WorkingHoursSettingsDocument>()
      if (!settings) {
        // Should not happen if create was successful
        logger.error("[WorkingHoursActions] Failed to retrieve newly created default settings.")
        return { success: false, error: "Failed to initialize settings" }
      }
    } else {
      // Ensure fixedHours has 7 days, sorted, and with all fields
      const completeFixedHours: FixedHourSetting[] = []
      const existingDays = new Map(settings.fixedHours.map((fh) => [fh.day, fh]))
      for (let i = 0; i < 7; i++) {
        if (existingDays.has(i)) {
          const existingDay = existingDays.get(i)!
          completeFixedHours.push({
            day: i,
            isActive: existingDay.isActive || false,
            startTime: existingDay.startTime || "09:00",
            endTime: existingDay.endTime || "17:00",
            hasPriceOverride: existingDay.hasPriceOverride || false,
            priceOverrideType: existingDay.priceOverrideType || "amount",
            priceOverrideAmount: existingDay.priceOverrideAmount,
            priceOverridePercentage: existingDay.priceOverridePercentage,
            notes: existingDay.notes || "",
          })
        } else {
          completeFixedHours.push({
            day: i,
            isActive: false,
            startTime: "09:00",
            endTime: "17:00",
            hasPriceOverride: false,
            priceOverrideType: "amount",
            priceOverrideAmount: undefined,
            priceOverridePercentage: undefined,
            notes: "",
          })
        }
      }
      settings.fixedHours = completeFixedHours

      // Ensure special dates have Date objects
      settings.specialDates = settings.specialDates.map((sd) => ({
        ...sd,
        date: sd.date ? new Date(sd.date) : new Date(), // Ensure date is a Date object
      }))
    }

    // Sort fixedHours by day just in case they are not stored in order (though model pre-save should handle it)
    settings.fixedHours.sort((a, b) => a.day - b.day)

    // Convert Mongoose document to plain object if not already done by .lean()
    // For .lean(), dates are already Date objects, _id is an ObjectId, etc.
    // We need to ensure the structure matches what the client expects, especially for dates.
    const plainSettings = JSON.parse(JSON.stringify(settings)) // Deep clone and convert complex types

    return { success: true, data: plainSettings }
  } catch (error) {
    logger.error("[WorkingHoursActions] Error fetching working hours settings:", error)
    return { success: false, error: "Failed to fetch settings" }
  }
}

export async function updateWorkingHoursSettingsAction(payload: {
  fixedHours: FixedHourInput[]
  specialDates: SpecialDateInput[]
}): Promise<ActionResponse<WorkingHoursSettingsDocument>> {
  const user = await getCurrentUser()
  if (!user || user.activeRole !== "admin") {
    logger.warn("[WorkingHoursActions] Unauthorized attempt to update settings by user:", user?.id)
    return { success: false, error: "Unauthorized" }
  }

  try {
    await dbConnect()

    const { fixedHours, specialDates } = payload

    // Ensure fixedHours has day property correctly set if it's based on array index
    const processedFixedHours: FixedHourSetting[] = fixedHours.map((fh, index) => ({
      day: fh.day !== undefined ? fh.day : index, // Use provided day or index
      isActive: fh.isActive || false,
      startTime: fh.startTime || "09:00",
      endTime: fh.endTime || "17:00",
      hasPriceOverride: fh.hasPriceOverride || false,
      priceOverrideType: fh.priceOverrideType || "amount",
      priceOverrideAmount: fh.priceOverrideAmount,
      priceOverridePercentage: fh.priceOverridePercentage,
      notes: fh.notes || "",
    }))

    // Ensure special dates have Date objects
    const processedSpecialDates = specialDates.map((sd) => ({
      ...sd,
      date: sd.date ? new Date(sd.date) : new Date(), // Ensure date is a Date object
    }))

    const updatedSettings = await WorkingHoursSettings.findOneAndUpdate(
      {}, // Find the single settings document
      { $set: { fixedHours: processedFixedHours, specialDates: processedSpecialDates } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).lean<WorkingHoursSettingsDocument>()

    if (!updatedSettings) {
      logger.error("[WorkingHoursActions] Failed to update or create working hours settings.")
      return { success: false, error: "Failed to update settings" }
    }

    revalidatePath("/dashboard/admin/working-hours")
    revalidatePath("/api/working-hours") // If you have an API route using this

    const plainSettings = JSON.parse(JSON.stringify(updatedSettings))

    logger.info("[WorkingHoursActions] Working hours settings updated successfully by user:", user.id)
    return { success: true, data: plainSettings }
  } catch (error: any) {
    logger.error("[WorkingHoursActions] Error updating working hours settings:", error)
    if (error.name === "ValidationError") {
      return { success: false, error: `Validation failed: ${error.message}` }
    }
    return { success: false, error: "Failed to update settings due to an internal error." }
  }
}
