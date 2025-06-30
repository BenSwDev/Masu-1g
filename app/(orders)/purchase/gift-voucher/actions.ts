"use server"

import type { ITreatment } from "@/lib/db/models/treatment"
import Treatment from "@/lib/db/models/treatment"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"

// Define serialized types that match the data we receive from the server
export interface SerializedTreatmentDuration {
  _id: string
  minutes: number
  price: number
  professionalPrice: number
  isActive: boolean
}

export interface SerializedTreatment {
  _id: string
  name: string
  description?: string
  category: string
  pricingType: "fixed" | "duration_based"
  fixedPrice?: number
  durations?: SerializedTreatmentDuration[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface GetTreatmentsResult {
  success: boolean
  treatments?: SerializedTreatment[]
  error?: string
}

/**
 * Gets all active treatments for gift voucher selection
 * @returns GetTreatmentsResult
 */
export async function getTreatmentsForSelection(): Promise<GetTreatmentsResult> {
  try {
    await dbConnect()
    const treatments = await Treatment.find({ isActive: true }).sort({ name: 1 }).lean()

    return {
      success: true,
      treatments: treatments.map(treatment => ({
        _id: treatment._id.toString(),
        name: treatment.name,
        description: treatment.description || "",
        category: treatment.category,
        pricingType: treatment.pricingType,
        fixedPrice: treatment.fixedPrice,
        durations: treatment.durations?.map(d => ({
          _id: d._id?.toString() || '',
          minutes: d.minutes,
          price: d.price,
          professionalPrice: d.professionalPrice,
          isActive: d.isActive,
        })),
        isActive: treatment.isActive,
        createdAt: treatment.createdAt.toISOString(),
        updatedAt: treatment.updatedAt.toISOString(),
      })),
    }
  } catch (error) {
    logger.error("Error fetching treatments for gift voucher:", error)
    return { success: false, error: "Failed to fetch treatments" }
  }
}
