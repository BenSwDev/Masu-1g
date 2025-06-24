"use server"

import { revalidatePath } from "next/cache"
import dbConnect from "@/lib/db/mongoose"
import Treatment, { type ITreatment, type ITreatmentDuration } from "@/lib/db/models/treatment"
import { logger } from "@/lib/logs/logger"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { getTreatments as getAllTreatments } from "@/actions/treatment-actions"

/**
 * Fetches treatments with optional filtering and pagination
 */
export async function getTreatments(
  options: { page?: number; limit?: number; search?: string; category?: string; isActive?: boolean } = {},
) {
  const requestId = `get_treatments_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

  try {
    logger.info(`[${requestId}] Fetching treatments with options:`, options)
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

    const serializedTreatments = treatments.map((treatment) => ({
      ...treatment,
      _id: String(treatment._id),
      durations: treatment.durations?.map((d) => ({ ...d, _id: String(d._id) })) || [],
    }))

    logger.info(`[${requestId}] Successfully fetched ${serializedTreatments.length} treatments`)
    return {
      success: true,
      treatments: serializedTreatments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  } catch (error) {
    logger.error(`[${requestId}] Error fetching treatments:`, error)
    return { success: false, error: "Failed to fetch treatments", treatments: [], pagination: null }
  }
}

/**
 * Creates a new treatment
 */
export async function createTreatment(data: Omit<ITreatment, "_id" | "createdAt" | "updatedAt">) {
  const requestId = `create_treatment_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

  try {
    logger.info(`[${requestId}] Creating new treatment`)
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      logger.error(`[${requestId}] Unauthorized access attempt`)
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()
    const newTreatment = new Treatment(data)
    await newTreatment.save()

    const serializedTreatment = {
      ...newTreatment.toObject(),
      _id: String(newTreatment._id),
      durations: newTreatment.durations?.map((d) => ({ ...d, _id: String(d._id) })) || [],
    }

    revalidatePath("/dashboard/admin/treatments")
    logger.info(`[${requestId}] Successfully created treatment with ID: ${newTreatment._id}`)
    return { success: true, treatment: serializedTreatment }
  } catch (error: any) {
    logger.error(`[${requestId}] Error creating treatment:`, error)
    return { success: false, error: error.message || "Failed to create treatment" }
  }
}

/**
 * Updates an existing treatment
 */
export async function updateTreatment(id: string, data: Partial<ITreatment>) {
  const requestId = `update_treatment_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

  try {
    logger.info(`[${requestId}] Updating treatment ${id}`)
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      logger.error(`[${requestId}] Unauthorized access attempt`)
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()
    const treatment = await Treatment.findByIdAndUpdate(id, data, { new: true })
    if (!treatment) {
      logger.error(`[${requestId}] Treatment not found: ${id}`)
      return { success: false, error: "Treatment not found" }
    }

    const serializedTreatment = {
      ...treatment.toObject(),
      _id: String(treatment._id),
      durations: treatment.durations?.map((d) => ({ ...d, _id: String(d._id) })) || [],
    }

    revalidatePath("/dashboard/admin/treatments")
    logger.info(`[${requestId}] Successfully updated treatment ${id}`)
    return { success: true, treatment: serializedTreatment }
  } catch (error: any) {
    logger.error(`[${requestId}] Error updating treatment:`, error)
    return { success: false, error: error.message || "Failed to update treatment" }
  }
}

/**
 * Deletes a treatment
 */
export async function deleteTreatment(id: string) {
  const requestId = `delete_treatment_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

  try {
    logger.info(`[${requestId}] Deleting treatment ${id}`)
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      logger.error(`[${requestId}] Unauthorized access attempt`)
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()
    const treatment = await Treatment.findByIdAndDelete(id)
    if (!treatment) {
      logger.error(`[${requestId}] Treatment not found: ${id}`)
      return { success: false, error: "Treatment not found" }
    }

    revalidatePath("/dashboard/admin/treatments")
    revalidatePath("/dashboard/member/subscriptions/purchase")
    logger.info(`[${requestId}] Successfully deleted treatment ${id}`)
    return { success: true }
  } catch (error) {
    logger.error(`[${requestId}] Error deleting treatment:`, error)
    return { success: false, error: "Failed to delete treatment" }
  }
}

/**
 * Gets a treatment by ID
 */
export async function getTreatmentById(id: string): Promise<{ 
  success: boolean; 
  treatment?: Omit<ITreatment, '_id' | 'durations'> & { 
    _id: string; 
    durations: Array<Omit<ITreatmentDuration, '_id'> & { _id: string }> 
  }; 
  error?: string 
}> {
  const requestId = `get_treatment_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

  try {
    logger.info(`[${requestId}] Fetching treatment ${id}`)
    await dbConnect()
    const treatment = await Treatment.findById(id).lean()
    if (!treatment) {
      logger.error(`[${requestId}] Treatment not found: ${id}`)
      return { success: false, error: "Treatment not found" }
    }

    const serializedTreatment = {
      ...treatment,
      _id: String(treatment._id),
      durations: treatment.durations?.map((d) => ({ ...d, _id: String(d._id) })) || [],
    }

    logger.info(`[${requestId}] Successfully fetched treatment ${id}`)
    return { success: true, treatment: serializedTreatment }
  } catch (error) {
    logger.error(`[${requestId}] Error fetching treatment:`, error)
    return { success: false, error: "Failed to fetch treatment" }
  }
}

/**
 * Toggles the active status of a treatment
 */
export async function toggleTreatmentStatus(id: string) {
  const requestId = `toggle_treatment_status_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

  try {
    logger.info(`[${requestId}] Toggling treatment status ${id}`)
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      logger.error(`[${requestId}] Unauthorized access attempt`)
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()
    const treatment = await Treatment.findById(id)
    if (!treatment) {
      logger.error(`[${requestId}] Treatment not found: ${id}`)
      return { success: false, error: "Treatment not found" }
    }

    treatment.isActive = !treatment.isActive
    treatment.updatedAt = new Date()
    await treatment.save()

    const serializedTreatment = {
      ...treatment.toObject(),
      _id: String(treatment._id),
      durations: treatment.durations?.map((d) => ({ ...d, _id: String(d._id) })) || [],
    }

    revalidatePath("/dashboard/admin/treatments")
    revalidatePath("/dashboard/member/subscriptions/purchase")
    logger.info(`[${requestId}] Successfully toggled treatment status ${id}`)
    return { success: true, treatment: serializedTreatment }
  } catch (error) {
    logger.error(`[${requestId}] Error toggling treatment status:`, error)
    return { success: false, error: "Failed to toggle treatment status" }
  }
}

export { getAllTreatments } 