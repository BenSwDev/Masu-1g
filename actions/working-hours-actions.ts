"use server"

import dbConnect from "@/lib/db/mongoose"
import WorkingHoursSettings, {
  type IWorkingHoursSettings,
  type ISpecialDateWorkingHours,
  type IFixedWorkingDay,
} from "@/lib/db/models/working-hours"
import { logger } from "@/lib/logs/logger"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { revalidatePath } from "next/cache"
import type { LeanDocument } from "mongoose"

// Helper to serialize: convert ObjectId to string and Date to ISO string
const serializeSpecialDate = (
  sd: ISpecialDateWorkingHours | LeanDocument<ISpecialDateWorkingHours>,
): ISpecialDateWorkingHours => ({
  ...sd,
  _id: sd._id?.toString(),
  date: sd.date instanceof Date ? sd.date.toISOString().split("T")[0] : sd.date, // Ensure YYYY-MM-DD string
})

const serializeSettings = (settings: LeanDocument<IWorkingHoursSettings>): IWorkingHoursSettings => ({
  ...settings,
  _id: settings._id.toString(),
  fixedHours: settings.fixedHours.map((fh) => ({ ...fh })), // Assuming fixedHours don't have ObjectId or Date issues
  specialDates: settings.specialDates.map(serializeSpecialDate),
  createdAt: settings.createdAt instanceof Date ? settings.createdAt.toISOString() : settings.createdAt,
  updatedAt: settings.updatedAt instanceof Date ? settings.updatedAt.toISOString() : settings.updatedAt,
})

export async function getWorkingHoursSettings(): Promise<{
  success: boolean
  settings?: IWorkingHoursSettings
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }
    await dbConnect()
    let settings = await WorkingHoursSettings.findOne().lean()

    if (!settings) {
      // Create default settings if none exist
      const defaultFixedHours: IFixedWorkingDay[] = Array.from({ length: 7 }, (_, i) => ({
        dayOfWeek: i, // 0 (Sunday) to 6 (Saturday)
        isActive: false,
        hasSurcharge: false,
        startTime: "09:00",
        endTime: "17:00",
      }))
      const newSettings = new WorkingHoursSettings({
        fixedHours: defaultFixedHours,
        specialDates: [],
      })
      await newSettings.save()
      settings = newSettings.toObject({ virtuals: true }) // Use toObject to get a plain object after save
    }

    // Ensure fixedHours are sorted by dayOfWeek before sending to client
    if (settings.fixedHours) {
      settings.fixedHours.sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    }

    return { success: true, settings: serializeSettings(settings as LeanDocument<IWorkingHoursSettings>) }
  } catch (error) {
    logger.error("Error fetching working hours settings:", error)
    return { success: false, error: "Failed to fetch working hours settings" }
  }
}

export async function updateWorkingHoursSettings(
  data: Partial<Omit<IWorkingHoursSettings, "_id" | "createdAt" | "updatedAt">> & {
    specialDates?: Array<Partial<ISpecialDateWorkingHours> & { date: string }>
  },
): Promise<{
  success: boolean
  settings?: IWorkingHoursSettings
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }
    await dbConnect()

    const { fixedHours, specialDates } = data

    // Prepare special dates: convert date strings to Date objects
    const processedSpecialDates =
      specialDates?.map((sd) => ({
        ...sd,
        date: new Date(sd.date), // Convert string to Date
        _id: sd._id || new mongoose.Types.ObjectId(), // Ensure _id for new special dates
      })) || []

    // Prepare fixed hours: ensure all 7 days are present and sorted
    let processedFixedHours = fixedHours
    if (fixedHours) {
      const days = Array.from({ length: 7 }, (_, i) => i)
      const existingDaysMap = new Map(fixedHours.map((fh) => [fh.dayOfWeek, fh]))
      processedFixedHours = days
        .map((day) => {
          const existingDay = existingDaysMap.get(day)
          return (
            existingDay || {
              dayOfWeek: day,
              isActive: false,
              hasSurcharge: false,
              startTime: "09:00",
              endTime: "17:00",
            }
          )
        })
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    }

    const updatedSettings = await WorkingHoursSettings.findOneAndUpdate(
      {}, // Assuming a single settings document
      { $set: { fixedHours: processedFixedHours, specialDates: processedSpecialDates } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).lean()

    if (!updatedSettings) {
      return { success: false, error: "Failed to update working hours settings." }
    }

    revalidatePath("/dashboard/admin/working-hours")
    return { success: true, settings: serializeSettings(updatedSettings as LeanDocument<IWorkingHoursSettings>) }
  } catch (error: any) {
    logger.error("Error updating working hours settings:", error)
    // Check for Mongoose validation error
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors)
        .map((e: any) => e.message)
        .join(", ")
      return { success: false, error: `Validation failed: ${messages}` }
    }
    return { success: false, error: error.message || "Failed to update workingHours settings" }
  }
}
