"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import Subscription from "@/lib/db/models/subscription"
import Treatment from "@/lib/db/models/treatment"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"
import { z } from "zod"
import { Types } from "mongoose"
import { Document } from "mongoose"

// Types
export interface ISubscription {
  _id: string | Types.ObjectId
  name: string
  description: string
  quantity: number
  bonusQuantity: number
  validityMonths: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  __v?: number
}

export interface GetSubscriptionsOptions {
  isActive?: boolean
  search?: string
  sort?: string
  page?: number
  limit?: number
}

export interface GetSubscriptionsResult {
  success: boolean
  subscriptions?: ISubscription[]
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
  error?: string
}

export interface CreateSubscriptionResult {
  success: boolean
  subscription?: ISubscription
  error?: string
}

export interface UpdateSubscriptionResult {
  success: boolean
  subscription?: ISubscription
  error?: string
}

export interface DeleteSubscriptionResult {
  success: boolean
  error?: string
}

interface SubscriptionDocument extends Document {
  name: string
  description: string
  quantity: number
  bonusQuantity: number
  validityMonths: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  toObject(): ISubscription
}

// Schema
const subscriptionSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  description: z.string().min(5, { message: "Description must be at least 5 characters" }),
  quantity: z.number().int().min(1, { message: "Quantity must be at least 1" }),
  bonusQuantity: z.number().int().min(0, { message: "Bonus quantity must be at least 0" }),
  validityMonths: z.number().int().min(1, { message: "Validity must be at least 1 month" }),
  isActive: z.boolean().default(true),
})

/**
 * Creates a new subscription
 * @param formData Form data containing subscription details
 * @returns CreateSubscriptionResult
 */
export async function createSubscription(formData: FormData): Promise<CreateSubscriptionResult> {
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.activeRole !== "admin") {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    // Parse form data
    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const quantity = Number.parseInt(formData.get("quantity") as string)
    const bonusQuantity = Number.parseInt(formData.get("bonusQuantity") as string)
    const validityMonths = Number.parseInt(formData.get("validityMonths") as string)
    const isActive = formData.get("isActive") === "true"

    // Validate data
    const validatedData = subscriptionSchema.parse({
      name,
      description,
      quantity,
      bonusQuantity,
      validityMonths,
      isActive,
    })

    // Create subscription
    const subscription = new Subscription(validatedData)
    await subscription.save()

    revalidatePath("/dashboard/admin/subscriptions")

    return { success: true, subscription: { ...subscription.toObject(), _id: String(subscription._id) } }
  } catch (error) {
    logger.error("Error creating subscription:", error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: "Failed to create subscription" }
  }
}

/**
 * Updates an existing subscription
 * @param id Subscription ID
 * @param formData Form data containing updated subscription details
 * @returns UpdateSubscriptionResult
 */
export async function updateSubscription(id: string, formData: FormData): Promise<UpdateSubscriptionResult> {
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.activeRole !== "admin") {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    // Parse form data
    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const quantity = Number.parseInt(formData.get("quantity") as string)
    const bonusQuantity = Number.parseInt(formData.get("bonusQuantity") as string)
    const validityMonths = Number.parseInt(formData.get("validityMonths") as string)
    const isActive = formData.get("isActive") === "true"

    // Validate data
    const validatedData = subscriptionSchema.parse({
      name,
      description,
      quantity,
      bonusQuantity,
      validityMonths,
      isActive,
    })

    // Update subscription
    const subscription = await Subscription.findByIdAndUpdate(
      id,
      { ...validatedData, updatedAt: new Date() },
      { new: true },
    ) as SubscriptionDocument | null

    if (!subscription) {
      return { success: false, error: "Subscription not found" }
    }

    revalidatePath("/dashboard/admin/subscriptions")

    const subscriptionObj = subscription.toObject()
    return { 
      success: true, 
      subscription: { 
        ...subscriptionObj,
        _id: subscriptionObj._id.toString()
      } 
    }
  } catch (error) {
    logger.error("Error updating subscription:", error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: "Failed to update subscription" }
  }
}

/**
 * Deletes a subscription
 * @param id Subscription ID
 * @returns DeleteSubscriptionResult
 */
export async function deleteSubscription(id: string): Promise<DeleteSubscriptionResult> {
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.activeRole !== "admin") {
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
 * Gets a list of subscriptions with filtering, searching, and pagination
 * @param options Filtering, searching, and pagination options
 * @returns GetSubscriptionsResult
 */
export async function getSubscriptions(options: GetSubscriptionsOptions = {}): Promise<GetSubscriptionsResult> {
  try {
    await dbConnect()

    // Build query
    const query: Record<string, unknown> = {}

    if (options.isActive !== undefined) {
      query.isActive = options.isActive
    }

    if (options.search) {
      query.$or = [
        { name: { $regex: options.search, $options: "i" } },
        { description: { $regex: options.search, $options: "i" } },
      ]
    }

    // Pagination
    const page = options.page || 1
    const limit = options.limit || 10
    const skip = (page - 1) * limit

    // Sorting
    const sort: Record<string, 1 | -1> = {}
    if (options.sort) {
      const [field, order] = options.sort.split(":")
      sort[field] = order === "desc" ? -1 : 1
    } else {
      sort.createdAt = -1
    }

    // Execute query
    const subscriptions = await Subscription.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean() as unknown as (ISubscription & { _id: Types.ObjectId })[]

    const total = await Subscription.countDocuments(query)

    return {
      success: true,
      subscriptions: subscriptions.map(sub => ({
        ...sub,
        _id: sub._id.toString(),
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  } catch (error) {
    logger.error("Error fetching subscriptions:", error)
    return { success: false, error: "Failed to fetch subscriptions" }
  }
}

/**
 * Gets a subscription by ID
 * @param id Subscription ID
 * @returns GetSubscriptionResult
 */
export async function getSubscriptionById(id: string): Promise<GetSubscriptionsResult> {
  try {
    await dbConnect()

    const subscription = await Subscription.findById(id).lean() as unknown as (ISubscription & { _id: Types.ObjectId })

    if (!subscription) {
      return { success: false, error: "Subscription not found" }
    }

    return {
      success: true,
      subscriptions: [{
        ...subscription,
        _id: subscription._id.toString(),
      }],
    }
  } catch (error) {
    logger.error("Error fetching subscription:", error)
    return { success: false, error: "Failed to fetch subscription" }
  }
}

/**
 * Toggles a subscription's active status
 * @param id Subscription ID
 * @returns UpdateSubscriptionResult
 */
export async function toggleSubscriptionStatus(id: string): Promise<UpdateSubscriptionResult> {
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.activeRole !== "admin") {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const subscription = await Subscription.findById(id) as SubscriptionDocument | null

    if (!subscription) {
      return { success: false, error: "Subscription not found" }
    }

    subscription.isActive = !subscription.isActive
    subscription.updatedAt = new Date()
    await subscription.save()

    revalidatePath("/dashboard/admin/subscriptions")

    const subscriptionObj = subscription.toObject()
    return { 
      success: true, 
      subscription: { 
        ...subscriptionObj,
        _id: subscriptionObj._id.toString()
      } 
    }
  } catch (error) {
    logger.error("Error toggling subscription status:", error)
    return { success: false, error: "Failed to toggle subscription status" }
  }
}

/**
 * Gets all active subscriptions
 * @returns GetSubscriptionsResult
 */
export async function getActiveSubscriptions(): Promise<GetSubscriptionsResult> {
  try {
    await dbConnect()

    const subscriptions = await Subscription.find({ isActive: true })
      .sort({ createdAt: -1 })
      .lean() as unknown as (ISubscription & { _id: Types.ObjectId })[]

    return {
      success: true,
      subscriptions: subscriptions.map(sub => ({
        ...sub,
        _id: sub._id.toString(),
      })),
    }
  } catch (error) {
    logger.error("Error fetching active subscriptions:", error)
    return { success: false, error: "Failed to fetch active subscriptions" }
  }
}

/**
 * Gets all active subscriptions for purchase
 * @returns GetSubscriptionsResult
 */
export async function getActiveSubscriptionsForPurchase(): Promise<GetSubscriptionsResult> {
  try {
    await dbConnect()

    const subscriptions = await Subscription.find({ isActive: true })
      .select("_id name description quantity bonusQuantity validityMonths isActive createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean() as unknown as (ISubscription & { _id: Types.ObjectId })[]

    return {
      success: true,
      subscriptions: subscriptions.map(sub => ({
        ...sub,
        _id: sub._id.toString(),
      })),
    }
  } catch (error) {
    logger.error("Error fetching active subscriptions for purchase:", error)
    return { success: false, error: "Failed to fetch active subscriptions" }
  }
}

/**
 * Gets all active treatments
 * @returns GetTreatmentsResult
 */
export async function getAllTreatments() {
  try {
    await dbConnect()

    const treatments = await Treatment.find({ isActive: true })
      .select("_id name description pricingType fixedPrice durations")
      .sort({ name: 1 })
      .lean()

    return {
      success: true,
      treatments: treatments.map(treatment => ({
        ...treatment,
        _id: treatment._id.toString(),
      })),
    }
  } catch (error) {
    logger.error("Error fetching treatments:", error)
    return { success: false, error: "Failed to fetch treatments" }
  }
} 