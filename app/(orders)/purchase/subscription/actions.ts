"use server"

import type { ISubscription } from "@/lib/db/models/subscription"
import type { ITreatment } from "@/lib/db/models/treatment"
import Subscription from "@/lib/db/models/subscription"
import Treatment from "@/lib/db/models/treatment"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"

// Define serialized types that match the data we receive from the server
export interface SerializedSubscription {
  _id: string
  name: string
  description: string
  quantity: number
  bonusQuantity: number
  validityMonths: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

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
  description: string
  category: string
  pricingType: "fixed" | "duration_based"
  fixedPrice?: number
  durations?: SerializedTreatmentDuration[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface GetActiveSubscriptionsResult {
  success: boolean
  subscriptions?: SerializedSubscription[]
  error?: string
}

export interface GetTreatmentsResult {
  success: boolean
  treatments?: SerializedTreatment[]
  error?: string
}

/**
 * Gets all active subscriptions available for purchase
 * @returns GetActiveSubscriptionsResult
 */
export async function getActiveSubscriptionsForPurchase(): Promise<GetActiveSubscriptionsResult> {
  try {
    await dbConnect()
    const subscriptions = await Subscription.find({ isActive: true })
      .sort({ createdAt: -1 })
      .lean()

    return {
      success: true,
      subscriptions: subscriptions.map(sub => ({
        _id: sub._id.toString(),
        name: sub.name,
        description: sub.description,
        quantity: sub.quantity,
        bonusQuantity: sub.bonusQuantity,
        validityMonths: sub.validityMonths,
        isActive: sub.isActive,
        createdAt: sub.createdAt.toISOString(),
        updatedAt: sub.updatedAt.toISOString(),
      })),
    }
  } catch (error) {
    logger.error("Error fetching active subscriptions:", error)
    return { success: false, error: "Failed to fetch subscriptions" }
  }
}

/**
 * Gets all active treatments
 * @param filters Optional filters for treatments
 * @returns GetTreatmentsResult
 */
export async function getTreatments(filters: { isActive?: boolean } = {}): Promise<GetTreatmentsResult> {
  try {
    await dbConnect()
    const query: Record<string, unknown> = {}
    if (typeof filters.isActive === "boolean") {
      query.isActive = filters.isActive
    }

    const treatments = await Treatment.find(query)
      .sort({ name: 1 })
      .lean()

    return {
      success: true,
      treatments: treatments.map(treatment => ({
        _id: treatment._id.toString(),
        name: treatment.name,
        description: treatment.description,
        category: treatment.category,
        pricingType: treatment.pricingType,
        fixedPrice: treatment.fixedPrice,
        durations: treatment.durations?.map(d => ({
          _id: d._id.toString(),
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
    logger.error("Error fetching treatments:", error)
    return { success: false, error: "Failed to fetch treatments" }
  }
} 
