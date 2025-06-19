"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { revalidatePath } from "next/cache"
import dbConnect from "@/lib/db/mongoose"
import Treatment, { type ITreatment } from "@/lib/db/models/treatment"
import { logger } from "@/lib/logs/logger"

/**
 * Get all active treatments
 */
export async function getTreatments(): Promise<{
  success: boolean
  treatments?: any[]
  error?: string
}> {
  try {
    await dbConnect()

    const treatments = await Treatment.find({ isActive: true })
      .lean()

    const serializedTreatments = treatments.map((treatment) => ({
      ...treatment,
      _id: treatment._id.toString(),
      durations: treatment.durations?.map((duration) => ({
        ...duration,
        _id: duration._id.toString(),
      })) || [],
    }))

    return { success: true, treatments: serializedTreatments }
  } catch (error) {
    logger.error("Error fetching treatments:", error)
    return { success: false, error: "Failed to fetch treatments" }
  }
}

/**
 * Get treatment by ID
 */
export async function getTreatmentById(id: string): Promise<{
  success: boolean
  treatment?: any
  error?: string
}> {
  try {
    await dbConnect()

    const treatment = await Treatment.findById(id).lean()

    if (!treatment) {
      return { success: false, error: "Treatment not found" }
    }

    const serializedTreatment = {
      ...treatment,
      _id: treatment._id.toString(),
      durations: treatment.durations?.map((duration) => ({
        ...duration,
        _id: duration._id.toString(),
      })) || [],
    }

    return { success: true, treatment: serializedTreatment }
  } catch (error) {
    logger.error("Error fetching treatment:", error)
    return { success: false, error: "Failed to fetch treatment" }
  }
}

/**
 * Admin: Create new treatment
 */
export async function createTreatment(data: {
  name: string
  description?: string
  category: string
  pricingType: "fixed" | "duration_based"
  fixedPrice?: number
  defaultDurationMinutes?: number
  durations?: Array<{
    minutes: number
    price: number
    isActive: boolean
  }>
  isActive: boolean
}): Promise<{
  success: boolean
  treatment?: any
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const treatment = new Treatment(data)
    await treatment.save()

    revalidatePath("/dashboard/admin/treatments")
    
    return { 
      success: true, 
      treatment: {
        ...treatment.toObject(),
        _id: (treatment._id as any).toString(),
      }
    }
  } catch (error) {
    logger.error("Error creating treatment:", error)
    return { success: false, error: "Failed to create treatment" }
  }
}

/**
 * Admin: Update treatment
 */
export async function updateTreatment(id: string, data: Partial<{
  name: string
  description?: string
  category: string
  pricingType: "fixed" | "duration_based"
  fixedPrice?: number
  defaultDurationMinutes?: number
  durations?: Array<{
    minutes: number
    price: number
    isActive: boolean
  }>
  isActive: boolean
}>): Promise<{
  success: boolean
  treatment?: any
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const treatment = await Treatment.findByIdAndUpdate(
      id,
      data,
      { new: true, runValidators: true }
    )

    if (!treatment) {
      return { success: false, error: "Treatment not found" }
    }

    revalidatePath("/dashboard/admin/treatments")
    
    return { 
      success: true, 
      treatment: {
        ...treatment.toObject(),
        _id: (treatment._id as any).toString(),
      }
    }
  } catch (error) {
    logger.error("Error updating treatment:", error)
    return { success: false, error: "Failed to update treatment" }
  }
}

/**
 * Admin: Delete treatment
 */
export async function deleteTreatment(id: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const treatment = await Treatment.findByIdAndDelete(id)

    if (!treatment) {
      return { success: false, error: "Treatment not found" }
    }

    revalidatePath("/dashboard/admin/treatments")
    
    return { success: true }
  } catch (error) {
    logger.error("Error deleting treatment:", error)
    return { success: false, error: "Failed to delete treatment" }
  }
}

/**
 * Get treatments for selection (simplified)
 */
export async function getTreatmentsForSelection(): Promise<{
  success: boolean
  treatments?: Array<{
    _id: string
    name: string
    pricingType: "fixed" | "duration_based"
    fixedPrice?: number
    durations?: Array<{
      _id: string
      minutes: number
      price: number
    }>
  }>
  error?: string
}> {
  try {
    await dbConnect()

    const treatments = await Treatment.find({ isActive: true })
      .select("name pricingType fixedPrice durations")
      .lean()

    const serializedTreatments = treatments.map((treatment) => ({
      _id: treatment._id.toString(),
      name: treatment.name,
      pricingType: treatment.pricingType,
      fixedPrice: treatment.fixedPrice,
      durations: treatment.durations?.filter(d => d.isActive).map((duration) => ({
        _id: duration._id.toString(),
        minutes: duration.minutes,
        price: duration.price,
      })) || [],
    }))

    return { success: true, treatments: serializedTreatments }
  } catch (error) {
    logger.error("Error fetching treatments for selection:", error)
    return { success: false, error: "Failed to fetch treatments" }
  }
}

/**
 * Get active treatments for purchase
 */
export async function getActiveTreatmentsForPurchase(): Promise<{
  success: boolean
  treatments?: any[]
  error?: string
}> {
  try {
    await dbConnect()

    const treatments = await Treatment.find({ isActive: true })
      .select("name category pricingType fixedPrice durations defaultDurationMinutes")
      .lean()

    const serializedTreatments = treatments.map((treatment) => ({
      _id: treatment._id.toString(),
      name: treatment.name,
      category: treatment.category,
      pricingType: treatment.pricingType,
      fixedPrice: treatment.fixedPrice,
      defaultDurationMinutes: treatment.defaultDurationMinutes,
      durations: treatment.durations?.filter(d => d.isActive).map((duration) => ({
        _id: duration._id.toString(),
        minutes: duration.minutes,
        price: duration.price,
      })) || [],
    }))

    return { success: true, treatments: serializedTreatments }
  } catch (error) {
    logger.error("Error fetching active treatments for purchase:", { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return { success: false, error: "Failed to fetch treatments" }
  }
} 