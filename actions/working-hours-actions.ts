"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { dbConnect } from "@/lib/db/mongoose"
import { WorkingHours, type IWorkingHours } from "@/lib/db/models/working-hours"
import { UserRole } from "@/lib/db/models/user"

// קבלת שעות הפעילות
export async function getWorkingHours() {
  try {
    await dbConnect()

    const workingHours = await WorkingHours.find().lean()

    // Serialize the data
    const serializedData = {
      weeklyHours: workingHours.map((hour) => ({
        ...hour,
        _id: hour._id.toString(),
      })),
      specialDates: workingHours
        .filter((hour) => hour.isSpecialDate)
        .map((date) => ({
          ...date,
          _id: date._id.toString(),
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
export async function updateWeeklyHours(weeklyHours: IWorkingHours["weeklyHours"]) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes(UserRole.ADMIN)) {
      throw new Error("Unauthorized")
    }

    await dbConnect()

    const workingHours = await WorkingHours.findOneAndUpdate({}, { weeklyHours }, { upsert: true, new: true })

    return {
      success: true,
      data: JSON.parse(JSON.stringify(workingHours)),
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

    const workingHours = await WorkingHours.findOneAndUpdate(
      {},
      { $push: { specialDates: updatePayload } },
      { upsert: true, new: true },
    )

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
export async function updateSpecialDate(dateId: string, specialDate: Partial<IWorkingHours["specialDates"][0]>) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes(UserRole.ADMIN)) {
      throw new Error("Unauthorized")
    }

    await dbConnect()

    // In updateSpecialDate
    const updatePayload: any = { ...specialDate, _id: dateId } // Ensure _id is preserved for matching

    // If startTime/endTime are explicitly passed as empty or null, treat as unset
    if (specialDate.startTime === "" || specialDate.startTime === null) {
      updatePayload.startTime = undefined
    }
    if (specialDate.endTime === "" || specialDate.endTime === null) {
      updatePayload.endTime = undefined
    }

    // Remove fields that are undefined to avoid setting them as null in MongoDB
    Object.keys(updatePayload).forEach((key) => {
      // @ts-ignore
      if (updatePayload[key] === undefined) {
        // @ts-ignore
        delete updatePayload[key]
      }
    })

    const setOperation: any = {}
    for (const key in updatePayload) {
      if (key !== "_id") {
        // Don't try to set _id within the subdocument via $
        setOperation[`specialDates.$.${key}`] = updatePayload[key]
      }
    }

    // If a field was marked for unsetting (e.g. startTime: undefined)
    // we need to explicitly $unset it if it exists.
    const unsetOperation: any = {}
    if (specialDate.startTime === undefined) {
      unsetOperation["specialDates.$.startTime"] = ""
    }
    if (specialDate.endTime === undefined) {
      unsetOperation["specialDates.$.endTime"] = ""
    }
    if (specialDate.priceAdjustment === undefined) {
      unsetOperation["specialDates.$.priceAdjustment"] = ""
    }

    let finalUpdateOp: any = { $set: setOperation }
    if (Object.keys(unsetOperation).length > 0) {
      finalUpdateOp = { ...finalUpdateOp, $unset: unsetOperation }
    }

    const workingHours = await WorkingHours.findOneAndUpdate({ "specialDates._id": dateId }, finalUpdateOp, {
      new: true,
    })

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
      {},
      { $pull: { specialDates: { _id: dateId } } },
      { new: true },
    )

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

    // מצא את התאריך המיוחד הנוכחי כדי לקבל את הסטטוס הנוכחי
    const currentWorkingHours = await WorkingHours.findOne({ "specialDates._id": dateId })
    if (!currentWorkingHours) {
      throw new Error("Special date not found")
    }

    const specialDate = currentWorkingHours.specialDates.find((date) => date._id.toString() === dateId)
    if (!specialDate) {
      throw new Error("Special date not found")
    }

    // הפוך את הסטטוס
    const newIsActive = !specialDate.isActive

    // עדכן את הסטטוס
    const workingHours = await WorkingHours.findOneAndUpdate(
      { "specialDates._id": dateId },
      { $set: { "specialDates.$.isActive": newIsActive } },
      { new: true },
    )

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
