"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import { logger } from "@/lib/logs/logger"
import { connectDB } from "@/lib/db/mongoose"
import UserSubscription, { type IUserSubscription } from "@/lib/db/models/user-subscription"
import Subscription, { type ISubscription } from "@/lib/db/models/subscription"
import Treatment, { type ITreatment } from "@/lib/db/models/treatment"
import User from "@/lib/db/models/user"
import PaymentMethod from "@/lib/db/models/payment-method"

// Helper functions to check roles
const isAdminUser = (user: { roles?: string[] } | null | undefined): boolean => !!user?.roles?.includes("admin")

export interface GetAllUserSubscriptionsOptions {
  userId?: string
  subscriptionId?: string
  treatmentId?: string
  status?: string
  search?: string
  page?: number
  limit?: number
}

export interface GetAllUserSubscriptionsResult {
  success: boolean
  userSubscriptions?: (IUserSubscription & {
    userId: Pick<User, "name" | "email"> & { _id: string }
    subscriptionId: ISubscription
    treatmentId: ITreatment
    selectedDurationDetails?: ITreatment["durations"][0]
    paymentMethodId: { _id: string; cardName?: string; cardNumber: string }
  })[]
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
  error?: string
}

/**
 * Gets a list of user subscriptions with pagination and filtering
 * @param options - Optional filters and pagination parameters
 * @returns GetAllUserSubscriptionsResult
 */
export async function getAllUserSubscriptions(
  options: GetAllUserSubscriptionsOptions = {},
): Promise<GetAllUserSubscriptionsResult> {
  const session = await getServerSession(authOptions)
  if (!session || !isAdminUser(session.user)) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await connectDB()

    const { userId, subscriptionId, treatmentId, status, search, page = 1, limit = 10 } = options

    // Build query
    const query: any = {}
    if (userId) query.userId = userId
    if (subscriptionId) query.subscriptionId = subscriptionId
    if (treatmentId) query.treatmentId = treatmentId
    if (status) query.status = status
    if (search) {
      query.$or = [
        { "userId.name": { $regex: search, $options: "i" } },
        { "userId.email": { $regex: search, $options: "i" } },
        { "subscriptionId.name": { $regex: search, $options: "i" } },
        { "treatmentId.name": { $regex: search, $options: "i" } },
      ]
    }

    // Get total count for pagination
    const total = await UserSubscription.countDocuments(query)

    // Get paginated results with populated fields
    const userSubscriptions = await UserSubscription.find(query)
      .populate("userId", "name email")
      .populate("subscriptionId")
      .populate("treatmentId")
      .populate("paymentMethodId", "cardName cardNumber")
      .sort({ purchaseDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    // Calculate total pages
    const totalPages = Math.ceil(total / limit)

    return {
      success: true,
      userSubscriptions: JSON.parse(JSON.stringify(userSubscriptions)),
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    }
  } catch (error) {
    logger.error("Error fetching user subscriptions:", error)
    return { success: false, error: "Failed to fetch user subscriptions" }
  }
}

export interface UpdateUserSubscriptionData {
  remainingQuantity?: number
  expiryDate?: string
}

export interface UpdateUserSubscriptionResult {
  success: boolean
  userSubscription?: IUserSubscription
  error?: string
}

export async function updateUserSubscription(
  id: string,
  data: UpdateUserSubscriptionData,
): Promise<UpdateUserSubscriptionResult> {
  const session = await getServerSession(authOptions)
  if (!session || !isAdminUser(session.user)) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await connectDB()

    const updateFields: any = {}
    if (data.remainingQuantity !== undefined) {
      updateFields.remainingQuantity = Number(data.remainingQuantity)
    }
    if (data.expiryDate) {
      const date = new Date(data.expiryDate)
      if (isNaN(date.getTime())) {
        return { success: false, error: "Invalid expiry date" }
      }
      updateFields.expiryDate = date
    }

    const updated = await UserSubscription.findByIdAndUpdate(id, updateFields, {
      new: true,
    })

    if (!updated) {
      return { success: false, error: "User subscription not found" }
    }

    revalidatePath("/dashboard/admin/user-subscriptions")
    revalidatePath("/dashboard/member/subscriptions")

    return {
      success: true,
      userSubscription: JSON.parse(JSON.stringify(updated)),
    }
  } catch (error) {
    logger.error("Error updating user subscription:", error)
    return { success: false, error: "Failed to update user subscription" }
  }
}
