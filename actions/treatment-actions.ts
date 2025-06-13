"use server"

import dbConnect from "@/lib/db/mongoose"
import Treatment, { type ITreatment } from "@/lib/db/models/treatment"
import { logger } from "@/lib/logs/logger"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { revalidatePath } from "next/cache"

// הפונקציה הזו כבר הייתה קיימת, נוודא שהיא מתאימה
export async function getTreatments(
  options: { page?: number; limit?: number; search?: string; category?: string; isActive?: boolean } = {},
) {
  try {
    await dbConnect()
    const { page = 1, limit = 10, search, category, isActive } = options

    const query: any = {}
    if (search) {
      query.name = { $regex: search, $options: "i" }
    }
    if (category) {
      query.category = category
    }
    if (typeof isActive === "boolean") {
      query.isActive = isActive
    }

    const treatments = await Treatment.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    const total = await Treatment.countDocuments(query)

    return {
      success: true,
      treatments: treatments.map((treatment) => ({
        ...treatment,
        _id: treatment._id.toString(),
        durations: treatment.durations?.map((d) => ({ ...d, _id: d._id?.toString() })) || [],
      })) as ITreatment[],
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  } catch (error) {
    logger.error("Error fetching treatments:", error)
    return { success: false, error: "Failed to fetch treatments", treatments: [], pagination: null }
  }
}

// פונקציה חדשה או מעודכנת במיוחד עבור טופס הרכישה - מחזירה את כל הטיפולים הפעילים
export async function getActiveTreatmentsForPurchase(): Promise<{
  success: boolean
  treatments?: ITreatment[]
  error?: string
}> {
  try {
    await dbConnect()
    const treatments = await Treatment.find({ isActive: true }).lean()

    // המרת _id ו- _id של durations ל-string כדי למנוע בעיות serialization
    const serializedTreatments = treatments.map((treatment) => ({
      ...treatment,
      _id: treatment._id.toString(),
      durations:
        treatment.durations?.map((d) => ({
          ...d,
          _id: d._id?.toString(), // לוודא שגם _id פנימי הוא string
        })) || [],
      createdAt: treatment.createdAt,
      updatedAt: treatment.updatedAt,
    })) as ITreatment[]

    return { success: true, treatments: serializedTreatments }
  } catch (error) {
    logger.error("Error fetching active treatments for purchase:", error)
    return { success: false, error: "Failed to fetch active treatments" }
  }
}

export async function createTreatment(data: Omit<ITreatment, "_id" | "createdAt" | "updatedAt">) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }
    await dbConnect()
    const newTreatment = new Treatment(data)
    await newTreatment.save()
    revalidatePath("/dashboard/admin/treatments")
    return { success: true, treatment: newTreatment }
  } catch (error: any) {
    logger.error("Error creating treatment:", error)
    return { success: false, error: error.message || "Failed to create treatment" }
  }
}

export async function updateTreatment(id: string, data: Partial<ITreatment>) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }
    await dbConnect()
    const treatment = await Treatment.findByIdAndUpdate(id, data, { new: true })
    if (!treatment) {
      return { success: false, error: "Treatment not found" }
    }
    revalidatePath("/dashboard/admin/treatments")
    revalidatePath("/dashboard/member/subscriptions/purchase") // אם שינוי טיפול משפיע על רכישה
    return { success: true, treatment }
  } catch (error: any) {
    logger.error("Error updating treatment:", error)
    return { success: false, error: error.message || "Failed to update treatment" }
  }
}

export async function deleteTreatment(id: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }
    await dbConnect()
    const treatment = await Treatment.findByIdAndDelete(id)
    if (!treatment) {
      return { success: false, error: "Treatment not found" }
    }
    revalidatePath("/dashboard/admin/treatments")
    revalidatePath("/dashboard/member/subscriptions/purchase")
    return { success: true }
  } catch (error) {
    logger.error("Error deleting treatment:", error)
    return { success: false, error: "Failed to delete treatment" }
  }
}

export async function getTreatmentById(
  id: string,
): Promise<{ success: boolean; treatment?: ITreatment; error?: string }> {
  try {
    await dbConnect()
    const treatment = await Treatment.findById(id).lean()
    if (!treatment) {
      return { success: false, error: "Treatment not found" }
    }
    const serializedTreatment = {
      ...treatment,
      _id: treatment._id.toString(),
      durations: treatment.durations?.map((d) => ({ ...d, _id: d._id?.toString() })) || [],
    } as ITreatment
    return { success: true, treatment: serializedTreatment }
  } catch (error) {
    logger.error(`Error fetching treatment by ID ${id}:`, error)
    return { success: false, error: "Failed to fetch treatment" }
  }
}

export async function toggleTreatmentStatus(id: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const treatment = await Treatment.findById(id)
    if (!treatment) {
      return { success: false, error: "Treatment not found" }
    }

    treatment.isActive = !treatment.isActive
    treatment.updatedAt = new Date()
    await treatment.save()

    revalidatePath("/dashboard/admin/treatments")
    revalidatePath("/dashboard/member/subscriptions/purchase")

    return {
      success: true,
      treatment: {
        ...treatment.toObject(),
        _id: treatment._id.toString(),
        durations: treatment.durations?.map((d) => ({ ...d, _id: d._id?.toString() })) || [],
      },
    }
  } catch (error) {
    logger.error("Error toggling treatment status:", error)
    return { success: false, error: "Failed to toggle treatment status" }
  }
}

export async function duplicateTreatment(id: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const originalTreatment = await Treatment.findById(id)
    if (!originalTreatment) {
      return { success: false, error: "Treatment not found" }
    }

    const treatmentData = originalTreatment.toObject()
    delete treatmentData._id
    delete treatmentData.createdAt
    delete treatmentData.updatedAt
    treatmentData.name = `${treatmentData.name} (עותק)`

    const newTreatment = new Treatment(treatmentData)
    await newTreatment.save()

    revalidatePath("/dashboard/admin/treatments")

    return {
      success: true,
      treatment: {
        ...newTreatment.toObject(),
        _id: newTreatment._id.toString(),
        durations: newTreatment.durations?.map((d) => ({ ...d, _id: d._id?.toString() })) || [],
      },
    }
  } catch (error) {
    logger.error("Error duplicating treatment:", error)
    return { success: false, error: "Failed to duplicate treatment" }
  }
}
