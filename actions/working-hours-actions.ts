"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth" // Corrected import path
import { dbConnect } from "@/lib/db/mongoose" // Corrected import path
import WorkingHours, { type IWorkingHours } from "@/lib/db/models/working-hours" // Corrected import path and default import
import { UserRole } from "@/lib/db/models/user" // Corrected import path

// קבלת שעות הפעילות
export async function getWorkingHours() {
  try {
    await dbConnect()

    const workingHoursDoc = await WorkingHours.findOne().lean() // Use findOne as there should be only one doc

    if (!workingHoursDoc) {
      // If no document exists, return default structure or indicate none found
      return {
        success: true,
        data: { weeklyHours: [], specialDates: [] },
      }
    }

    // Serialize the data
    const serializedData = {
      weeklyHours: workingHoursDoc.weeklyHours.map((hour: any) => ({
        ...hour,
        _id: hour._id ? hour._id.toString() : undefined, // Handle potentially missing _id for new unsaved entries
      })),
      specialDates: workingHoursDoc.specialDates.map((date: any) => ({
        ...date,
        _id: date._id.toString(),
        date: date.date.toISOString(), // Ensure date is serialized
        startTime: date.startTime ? date.startTime.toString() : null,
        endTime: date.endTime ? date.endTime.toString() : null,
      })),
    }

    return { success: true, data: serializedData }
  } catch (error) {
    console.error("Error fetching working hours:", error)
    return { success: false, error: "Failed to fetch working hours" }
  }
}

// עדכון שעות פעילות שבועיות
export async function updateWeeklyHours(weeklyHoursData: IWorkingHours["weeklyHours"]) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes(UserRole.ADMIN)) {
      throw new Error("Unauthorized")
    }

    await dbConnect()

    const workingHours = await WorkingHours.findOneAndUpdate(
      {},
      { weeklyHours: weeklyHoursData },
      { upsert: true, new: true, runValidators: true },
    ).lean()

    return {
      success: true,
      data: JSON.parse(JSON.stringify(workingHours)), // Standard serialization
    }
  } catch (error) {
    console.error("Error updating weekly hours:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update weekly hours",
    }
  }
}

// הוספת תאריך מיוחד
export async function addSpecialDate(specialDate: Omit<IWorkingHours["specialDates"][0], "_id">) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes(UserRole.ADMIN)) {
      throw new Error("Unauthorized")
    }

    await dbConnect()

    const updatePayload: any = { ...specialDate }
    if (!specialDate.startTime) delete updatePayload.startTime
    if (!specialDate.endTime) delete updatePayload.endTime
    if (
      !specialDate.priceAdjustment ||
      (specialDate.priceAdjustment.value === 0 && !specialDate.priceAdjustment.reason)
    ) {
      delete updatePayload.priceAdjustment
    }

    const workingHours = await WorkingHours.findOneAndUpdate(
      {},
      { $push: { specialDates: updatePayload } },
      { upsert: true, new: true, runValidators: true },
    ).lean()

    return {
      success: true,
      data: JSON.parse(JSON.stringify(workingHours)),
    }
  } catch (error) {
    console.error("Error adding special date:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add special date",
    }
  }
}

// עדכון תאריך מיוחד
export async function updateSpecialDate(dateId: string, specialDateData: Partial<IWorkingHours["specialDates"][0]>) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes(UserRole.ADMIN)) {
      throw new Error("Unauthorized")
    }

    await dbConnect()

    const updatePayload: any = { ...specialDateData }
    delete updatePayload._id // _id is used for matching, not for $set

    const setOperation: any = {}
    const unsetOperation: any = {}

    for (const key in updatePayload) {
      // @ts-ignore
      if (updatePayload[key] === undefined || updatePayload[key] === null || updatePayload[key] === "") {
        // @ts-ignore
        if (key === "startTime" || key === "endTime" || key === "description" || key === "priceAdjustment") {
          // @ts-ignore
          unsetOperation[`specialDates.$.${key}`] = ""
        }
      } else {
        // @ts-ignore
        setOperation[`specialDates.$.${key}`] = updatePayload[key]
      }
    }

    // Ensure priceAdjustment is properly handled for unsetting if its value is 0/empty and no reason
    if (specialDateData.hasOwnProperty("priceAdjustment")) {
      if (
        !specialDateData.priceAdjustment ||
        (specialDateData.priceAdjustment.value === 0 && !specialDateData.priceAdjustment.reason)
      ) {
        unsetOperation[`specialDates.$.priceAdjustment`] = ""
        delete setOperation[`specialDates.$.priceAdjustment`] // Ensure it's not in $set if it's being unset
      } else {
        // @ts-ignore
        setOperation[`specialDates.$.priceAdjustment`] = specialDateData.priceAdjustment
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
      const currentDoc = await WorkingHours.findOne({ "specialDates._id": dateId }).lean()
      return {
        success: true,
        data: JSON.parse(JSON.stringify(currentDoc)),
      }
    }

    const workingHours = await WorkingHours.findOneAndUpdate({ "specialDates._id": dateId }, finalUpdateOp, {
      new: true,
      runValidators: true,
    }).lean()

    return {
      success: true,
      data: JSON.parse(JSON.stringify(workingHours)),
    }
  } catch (error) {
    console.error("Error updating special date:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update special date",
    }
  }
}

// מחיקת תאריך מיוחד
export async function deleteSpecialDate(dateId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes(UserRole.ADMIN)) {
      throw new Error("Unauthorized")
    }

    await dbConnect()

    const workingHours = await WorkingHours.findOneAndUpdate(
      {}, // Match any document, assuming one config document
      { $pull: { specialDates: { _id: dateId } } },
      { new: true },
    ).lean()

    return {
      success: true,
      data: JSON.parse(JSON.stringify(workingHours)),
    }
  } catch (error) {
    console.error("Error deleting special date:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete special date",
    }
  }
}

// שינוי סטטוס פעילות של תאריך מיוחד
export async function toggleSpecialDateStatus(dateId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes(UserRole.ADMIN)) {
      throw new Error("Unauthorized")
    }

    await dbConnect()

    const currentWorkingHoursDoc = await WorkingHours.findOne({ "specialDates._id": dateId })
    if (!currentWorkingHoursDoc) {
      throw new Error("Working hours document not found or special date not found within")
    }

    const specialDate = currentWorkingHoursDoc.specialDates.find((date: any) => date._id.toString() === dateId)
    if (!specialDate) {
      throw new Error("Special date not found")
    }

    const newIsActive = !specialDate.isActive

    const workingHours = await WorkingHours.findOneAndUpdate(
      { "specialDates._id": dateId },
      { $set: { "specialDates.$.isActive": newIsActive } },
      { new: true },
    ).lean()

    return {
      success: true,
      data: JSON.parse(JSON.stringify(workingHours)),
      isActive: newIsActive,
    }
  } catch (error) {
    console.error("Error toggling special date status:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to toggle special date status",
    }
  }
}
