"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { dbConnect } from "@/lib/db/mongoose"
import WorkingHoursModel, { type IWorkingHours } from "@/lib/db/models/working-hours" // Corrected import for default export
import { UserRole } from "@/lib/db/models/user"

// Type alias for consistency within this file, matching IWorkingHours
type WorkingHoursType = IWorkingHours

export async function getWorkingHours(): Promise<{
  success: boolean
  data: WorkingHoursType | null
  error?: string
}> {
  try {
    await dbConnect()
    const workingHours = await WorkingHoursModel.findOne().lean()
    return { success: true, data: workingHours as WorkingHoursType | null }
  } catch (error) {
    console.error("Error fetching working hours:", error)
    return { success: false, data: null, error: "Failed to fetch working hours" }
  }
}

export async function updateWeeklyHours(weeklyHours: IWorkingHours["weeklyHours"]): Promise<{
  success: boolean
  data: WorkingHoursType | null
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes(UserRole.ADMIN)) {
      return { success: false, data: null, error: "Unauthorized" }
    }

    await dbConnect()
    const updatedDoc = await WorkingHoursModel.findOneAndUpdate({}, { weeklyHours }, { upsert: true, new: true }).lean()
    return { success: true, data: updatedDoc as WorkingHoursType | null }
  } catch (error) {
    console.error("Error updating weekly hours:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to update weekly hours"
    return { success: false, data: null, error: errorMessage }
  }
}

export async function addSpecialDate(specialDate: Omit<IWorkingHours["specialDates"][0], "_id">): Promise<{
  success: boolean
  data: WorkingHoursType | null
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes(UserRole.ADMIN)) {
      return { success: false, data: null, error: "Unauthorized" }
    }

    await dbConnect()
    const updatePayload: any = { ...specialDate }
    // Mongoose handles undefined fields correctly by not setting them if not in schema or no default

    const updatedDoc = await WorkingHoursModel.findOneAndUpdate(
      {},
      { $push: { specialDates: updatePayload } },
      { upsert: true, new: true },
    ).lean()
    return { success: true, data: updatedDoc as WorkingHoursType | null }
  } catch (error) {
    console.error("Error adding special date:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to add special date"
    return { success: false, data: null, error: errorMessage }
  }
}

export async function updateSpecialDate(
  dateId: string,
  specialDateData: Partial<IWorkingHours["specialDates"][0]>,
): Promise<{
  success: boolean
  data: WorkingHoursType | null
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes(UserRole.ADMIN)) {
      return { success: false, data: null, error: "Unauthorized" }
    }

    await dbConnect()
    const updatePayload: any = { ...specialDateData }
    delete updatePayload._id // _id is used for query, not in $set

    const setOperation: any = {}
    const unsetOperation: any = {}

    for (const key in updatePayload) {
      if (Object.prototype.hasOwnProperty.call(updatePayload, key)) {
        // @ts-ignore
        if (updatePayload[key] === undefined) {
          // @ts-ignore
          unsetOperation[`specialDates.$.${key}`] = ""
        } else {
          // @ts-ignore
          setOperation[`specialDates.$.${key}`] = updatePayload[key]
        }
      }
    }

    const finalUpdateOp: any = {}
    if (Object.keys(setOperation).length > 0) {
      finalUpdateOp.$set = setOperation
    }
    if (Object.keys(unsetOperation).length > 0) {
      finalUpdateOp.$unset = unsetOperation
    }

    if (Object.keys(finalUpdateOp).length === 0) {
      const currentDoc = await WorkingHoursModel.findOne({ "specialDates._id": dateId }).lean()
      return { success: true, data: currentDoc as WorkingHoursType | null }
    }

    const updatedDoc = await WorkingHoursModel.findOneAndUpdate({ "specialDates._id": dateId }, finalUpdateOp, {
      new: true,
    }).lean()

    if (!updatedDoc) {
      return { success: false, data: null, error: "Special date not found for update" }
    }
    return { success: true, data: updatedDoc as WorkingHoursType | null }
  } catch (error) {
    console.error("Error updating special date:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to update special date"
    return { success: false, data: null, error: errorMessage }
  }
}

export async function deleteSpecialDate(dateId: string): Promise<{
  success: boolean
  data: WorkingHoursType | null
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes(UserRole.ADMIN)) {
      return { success: false, data: null, error: "Unauthorized" }
    }

    await dbConnect()
    const updatedDoc = await WorkingHoursModel.findOneAndUpdate(
      {},
      { $pull: { specialDates: { _id: dateId } } },
      { new: true },
    ).lean()
    return { success: true, data: updatedDoc as WorkingHoursType | null }
  } catch (error) {
    console.error("Error deleting special date:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to delete special date"
    return { success: false, data: null, error: errorMessage }
  }
}

export async function toggleSpecialDateStatus(dateId: string): Promise<{
  success: boolean
  data: WorkingHoursType | null
  isActive?: boolean
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes(UserRole.ADMIN)) {
      return { success: false, data: null, error: "Unauthorized" }
    }

    await dbConnect()
    const currentWorkingHours = await WorkingHoursModel.findOne({ "specialDates._id": dateId }) // Not lean, need to save
    if (!currentWorkingHours) {
      return { success: false, data: null, error: "Special date not found" }
    }

    const specialDate = currentWorkingHours.specialDates.find((date) => date._id?.toString() === dateId)
    if (!specialDate) {
      return { success: false, data: null, error: "Special date not found in document" }
    }

    const newIsActive = !specialDate.isActive

    const updatedDoc = await WorkingHoursModel.findOneAndUpdate(
      { "specialDates._id": dateId },
      { $set: { "specialDates.$.isActive": newIsActive } },
      { new: true },
    ).lean()

    return { success: true, data: updatedDoc as WorkingHoursType | null, isActive: newIsActive }
  } catch (error) {
    console.error("Error toggling special date status:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to toggle special date status"
    return { success: false, data: null, error: errorMessage }
  }
}
