"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { revalidatePath } from "next/cache"
import dbConnect from "@/lib/db/mongoose"
import Subscription, { type ISubscription } from "@/lib/db/models/subscription"
import { logger } from "@/lib/logs/logger"

/**
 * Get all available subscriptions
 */
export async function getSubscriptions(): Promise<{
  success: boolean
  subscriptions?: any[]
  error?: string
}> {
  try {
    await dbConnect()

    const subscriptions = await Subscription.find({ isActive: true })
      .populate({
        path: "treatmentId",
        select: "name category pricingType fixedPrice durations defaultDurationMinutes",
      })
      .lean()

    const serializedSubscriptions = subscriptions.map((sub: any) => ({
      ...sub,
      _id: sub._id.toString(),
      treatmentId: sub.treatmentId ? {
        ...sub.treatmentId,
        _id: sub.treatmentId._id.toString(),
      } : null,
    }))

    return { success: true, subscriptions: serializedSubscriptions }
  } catch (error) {
    logger.error("Error fetching subscriptions:", error)
    return { success: false, error: "Failed to fetch subscriptions" }
  }
}

/**
 * Get subscription by ID
 */
export async function getSubscriptionById(id: string): Promise<{
  success: boolean
  subscription?: any
  error?: string
}> {
  try {
    await dbConnect()

    const subscription = await Subscription.findById(id)
      .populate({
        path: "treatmentId",
        select: "name category pricingType fixedPrice durations defaultDurationMinutes",
      })
      .lean() as any

    if (!subscription) {
      return { success: false, error: "Subscription not found" }
    }

    const serializedSubscription = {
      ...subscription,
      _id: subscription._id.toString(),
      treatmentId: subscription.treatmentId ? {
        ...subscription.treatmentId,
        _id: subscription.treatmentId._id.toString(),
      } : null,
    }

    return { success: true, subscription: serializedSubscription }
  } catch (error) {
    logger.error("Error fetching subscription:", error)
    return { success: false, error: "Failed to fetch subscription" }
  }
}

/**
 * Admin: Create new subscription
 */
export async function createSubscription(data: {
  name: string
  description: string
  treatmentId: string
  sessionsCount: number
  price: number
  isActive: boolean
}): Promise<{
  success: boolean
  subscription?: any
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const subscription = new Subscription(data)
    await subscription.save()

    revalidatePath("/dashboard/admin/subscriptions")
    
    return { 
      success: true, 
      subscription: {
        ...subscription.toObject(),
        _id: subscription._id.toString(),
      }
    }
  } catch (error) {
    logger.error("Error creating subscription:", error)
    return { success: false, error: "Failed to create subscription" }
  }
}

/**
 * Admin: Update subscription
 */
export async function updateSubscription(id: string, data: Partial<{
  name: string
  description: string
  treatmentId: string
  sessionsCount: number
  price: number
  isActive: boolean
}>): Promise<{
  success: boolean
  subscription?: any
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const subscription = await Subscription.findByIdAndUpdate(
      id,
      data,
      { new: true, runValidators: true }
    )

    if (!subscription) {
      return { success: false, error: "Subscription not found" }
    }

    revalidatePath("/dashboard/admin/subscriptions")
    
    return { 
      success: true, 
      subscription: {
        ...subscription.toObject(),
        _id: subscription._id.toString(),
      }
    }
  } catch (error) {
    logger.error("Error updating subscription:", error)
    return { success: false, error: "Failed to update subscription" }
  }
}

/**
 * Admin: Delete subscription
 */
export async function deleteSubscription(id: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const subscription = await Subscription.findByIdAndDelete(id)

    if (!subscription) {
      return { success: false, error: "Subscription not found" }
    }

    revalidatePath("/dashboard/admin/subscriptions")
    
    return { success: true }
  } catch (error) {
    logger.error("Error deleting subscription:", error)
    return { success: false, error: "Failed to delete subscription" }
  }
}

/**
 * Get active subscriptions for purchase
 */
export async function getActiveSubscriptionsForPurchase(): Promise<{
  success: boolean
  subscriptions?: any[]
  error?: string
}> {
  try {
    await dbConnect()

    const subscriptions = await Subscription.find({ isActive: true })
      .populate({
        path: "treatmentId",
        select: "name category pricingType fixedPrice durations defaultDurationMinutes",
      })
      .lean()

    const serializedSubscriptions = subscriptions.map((sub: any) => ({
      ...sub,
      _id: sub._id.toString(),
      treatmentId: sub.treatmentId ? {
        ...sub.treatmentId,
        _id: sub.treatmentId._id.toString(),
        durations: sub.treatmentId.durations?.map((duration: any) => ({
          ...duration,
          _id: duration._id.toString(),
        })) || [],
      } : null,
    }))

    return { success: true, subscriptions: serializedSubscriptions }
  } catch (error) {
    logger.error("Error fetching active subscriptions:", { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return { success: false, error: "Failed to fetch subscriptions" }
  }
} 