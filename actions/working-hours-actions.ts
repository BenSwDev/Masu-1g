"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { dbConnect } from "@/lib/db/mongoose"
import { WorkingHours, type IWorkingHours } from "@/lib/db/models/working-hours"
import { UserRole } from "@/lib/db/models/user"

// Helper to serialize Mongoose document to plain object, converting ObjectId to string
const serializeDocument = (doc: IWorkingHours | null) => {
  if (!doc) return null
  const plainObject = doc.toObject({
    getters: true, // Apply getters (e.g., virtuals)
    transform: (doc, ret) => {
      ret._id = ret._id.toString()
      if (ret.weeklyHours) {
        ret.weeklyHours = ret.weeklyHours.map((wh: any) => ({
          ...wh,
          _id: wh._id?.toString(),
        }))
      }
      if (ret.specialDates) {
        ret.specialDates = ret.specialDates.map((sd: any) => ({
          ...sd,
          _id: sd._id?.toString(),
          date: sd.date?.toISOString(), // Ensure date is ISO string
        }))
      }
      if (ret.createdAt) ret.createdAt = ret.createdAt.toISOString()
      if (ret.updatedAt) ret.updatedAt = ret.updatedAt.toISOString()
      return ret
    },
  })
  return plainObject
}

// Get or create working hours document
async function getOrCreateWorkingHoursDoc(): Promise<IWorkingHours> {
  await dbConnect()
  let workingHoursDoc = await WorkingHours.findOne()
  if (!workingHoursDoc) {
    workingHoursDoc = new WorkingHours({}) // Default weekly hours will be added by pre-save hook
    await workingHoursDoc.save()
  }
  return workingHoursDoc
}

// Get all working hours
export async function getWorkingHoursData() {
  try {
    await dbConnect()
    const workingHoursDoc = await getOrCreateWorkingHoursDoc()
    return { success: true, data: serializeDocument(workingHoursDoc) }
  } catch (error) {
    console.error("Error fetching working hours:", error)
    return { success: false, error: "Failed to fetch working hours" }
  }
}

// Update weekly hours
export async function updateWeeklyHours(
  weeklyHoursUpdates: IWorkingHours["weeklyHours"],
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes(UserRole.ADMIN)) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()
    const workingHoursDoc = await getOrCreateWorkingHoursDoc()

    // Update existing days or add new ones if somehow missing (though pre-save should handle defaults)
    weeklyHoursUpdates.forEach((updatedDay) => {
      const dayIndex = workingHoursDoc.weeklyHours.findIndex((d) => d.day === updatedDay.day)
      if (dayIndex > -1) {
        workingHoursDoc.weeklyHours[dayIndex] = {
          ...workingHoursDoc.weeklyHours[dayIndex],
          ...updatedDay,
          // Ensure priceAdjustment is explicitly set or unset
          priceAdjustment: updatedDay.priceAdjustment ? updatedDay.priceAdjustment : undefined,
        }
      } else {
        // This case should ideally not happen if defaults are set
        workingHoursDoc.weeklyHours.push(updatedDay)
      }
    })
    workingHoursDoc.weeklyHours.sort((a, b) => a.day - b.day) // Ensure order

    await workingHoursDoc.save()
    return { success: true, data: serializeDocument(workingHoursDoc) }
  } catch (error) {
    console.error("Error updating weekly hours:", error)
    const message = error instanceof Error ? error.message : "Failed to update weekly hours"
    return { success: false, error: message }
  }
}

// Add a special date
export async function addSpecialDate(
  specialDate: Omit<IWorkingHours["specialDates"][0], "_id" | "date"> & { date: string },
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes(UserRole.ADMIN)) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()
    const workingHoursDoc = await getOrCreateWorkingHoursDoc()

    const newSpecialDate = {
      ...specialDate,
      date: new Date(specialDate.date),
      startTime: specialDate.startTime || undefined,
      endTime: specialDate.endTime || undefined,
      priceAdjustment: specialDate.priceAdjustment ? specialDate.priceAdjustment : undefined,
    }

    workingHoursDoc.specialDates.push(newSpecialDate as any) // Cast because _id will be added by Mongoose
    await workingHoursDoc.save()
    return { success: true, data: serializeDocument(workingHoursDoc) }
  } catch (error) {
    console.error("Error adding special date:", error)
    const message = error instanceof Error ? error.message : "Failed to add special date"
    return { success: false, error: message }
  }
}

// Update a special date
export async function updateSpecialDate(
  dateId: string,
  specialDateUpdate: Partial<Omit<IWorkingHours["specialDates"][0], "_id" | "date"> & { date: string }>,
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes(UserRole.ADMIN)) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()
    const workingHoursDoc = await getOrCreateWorkingHoursDoc()

    const dateIndex = workingHoursDoc.specialDates.findIndex((sd) => sd._id?.toString() === dateId)
    if (dateIndex === -1) {
      return { success: false, error: "Special date not found" }
    }

    const currentSpecialDate = workingHoursDoc.specialDates[dateIndex]

    // Prepare update, ensuring undefined fields are handled correctly
    const updatePayload: any = { ...specialDateUpdate }
    if (specialDateUpdate.date) updatePayload.date = new Date(specialDateUpdate.date)

    // Handle optional fields: if passed as empty string or null, treat as unset (undefined)
    if (updatePayload.startTime === "" || updatePayload.startTime === null) updatePayload.startTime = undefined
    if (updatePayload.endTime === "" || updatePayload.endTime === null) updatePayload.endTime = undefined

    // If isClosed is true, ensure times are cleared
    if (updatePayload.isClosed === true) {
      updatePayload.startTime = undefined
      updatePayload.endTime = undefined
    }

    // Merge updates
    Object.assign(currentSpecialDate, updatePayload)

    // Ensure priceAdjustment is explicitly set or unset
    currentSpecialDate.priceAdjustment = updatePayload.priceAdjustment ? updatePayload.priceAdjustment : undefined

    workingHoursDoc.markModified("specialDates") // Important when modifying array elements directly
    await workingHoursDoc.save()
    return { success: true, data: serializeDocument(workingHoursDoc) }
  } catch (error) {
    console.error("Error updating special date:", error)
    const message = error instanceof Error ? error.message : "Failed to update special date"
    return { success: false, error: message }
  }
}

// Delete a special date
export async function deleteSpecialDate(dateId: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes(UserRole.ADMIN)) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()
    const workingHoursDoc = await getOrCreateWorkingHoursDoc()

    workingHoursDoc.specialDates = workingHoursDoc.specialDates.filter((sd) => sd._id?.toString() !== dateId)

    workingHoursDoc.markModified("specialDates")
    await workingHoursDoc.save()
    return { success: true, data: serializeDocument(workingHoursDoc) }
  } catch (error) {
    console.error("Error deleting special date:", error)
    const message = error instanceof Error ? error.message : "Failed to delete special date"
    return { success: false, error: message }
  }
}

// Toggle active status of a special date
export async function toggleSpecialDateActiveStatus(
  dateId: string,
): Promise<{ success: boolean; data?: any; error?: string; isActive?: boolean }> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes(UserRole.ADMIN)) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()
    const workingHoursDoc = await getOrCreateWorkingHoursDoc()

    const specialDate = workingHoursDoc.specialDates.find((sd) => sd._id?.toString() === dateId)
    if (!specialDate) {
      return { success: false, error: "Special date not found" }
    }

    specialDate.isActive = !specialDate.isActive

    workingHoursDoc.markModified("specialDates")
    await workingHoursDoc.save()
    return { success: true, data: serializeDocument(workingHoursDoc), isActive: specialDate.isActive }
  } catch (error) {
    console.error("Error toggling special date status:", error)
    const message = error instanceof Error ? error.message : "Failed to toggle special date status"
    return { success: false, error: message }
  }
}
