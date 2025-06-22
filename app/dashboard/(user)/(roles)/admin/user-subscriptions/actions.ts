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
import mongoose from "mongoose"

// Helper functions to check roles
const isAdminUser = (user: { roles?: string[] } | null | undefined): boolean => !!user?.roles?.includes("admin")

// Helper function to generate unique subscription code
async function generateUniqueSubscriptionCode(): Promise<string> {
  await connectDB()
  for (let attempt = 0; attempt < 5; attempt++) {
    // Generate SB + 6 random alphanumeric characters
    const code = 'SB' + Array.from({ length: 6 }, () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      return chars.charAt(Math.floor(Math.random() * chars.length))
    }).join('')
    
    const exists = await UserSubscription.exists({ code })
    if (!exists) return code
  }
  throw new Error("Failed to generate unique subscription code")
}

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
export interface CreateUserSubscriptionResult {
  success: boolean
  userSubscription?: any
  error?: string
}

/**
 * Creates a new user subscription (admin only)
 */
export async function createUserSubscription(formData: FormData): Promise<CreateUserSubscriptionResult> {
  const session = await getServerSession(authOptions)
  if (!session || !isAdminUser(session.user)) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await connectDB()

    const userId = formData.get("userId") as string
    const subscriptionId = formData.get("subscriptionId") as string
    const treatmentId = formData.get("treatmentId") as string
    const selectedDurationId = formData.get("selectedDurationId") as string
    const remainingQuantity = Number.parseInt(formData.get("remainingQuantity") as string)
    const expiryDateRaw = formData.get("expiryDate") as string

    // Validations
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return { success: false, error: "Valid user ID is required" }
    }
    if (!subscriptionId || !mongoose.Types.ObjectId.isValid(subscriptionId)) {
      return { success: false, error: "Valid subscription ID is required" }
    }
    if (!treatmentId || !mongoose.Types.ObjectId.isValid(treatmentId)) {
      return { success: false, error: "Valid treatment ID is required" }
    }
    if (Number.isNaN(remainingQuantity) || remainingQuantity < 0) {
      return { success: false, error: "Invalid remaining quantity" }
    }

    const expiryDate = new Date(expiryDateRaw)
    if (isNaN(expiryDate.getTime())) {
      return { success: false, error: "Invalid expiry date" }
    }

    // Check if user, subscription, and treatment exist
    const [user, subscription, treatment] = await Promise.all([
      User.findById(userId),
      Subscription.findById(subscriptionId),
      Treatment.findById(treatmentId)
    ])

    if (!user) return { success: false, error: "User not found" }
    if (!subscription) return { success: false, error: "Subscription not found" }
    if (!treatment) return { success: false, error: "Treatment not found" }

    // Generate unique code
    const code = await generateUniqueSubscriptionCode()

    // Create user subscription
    const userSubscription = new UserSubscription({
      code,
      userId: new mongoose.Types.ObjectId(userId),
      subscriptionId: new mongoose.Types.ObjectId(subscriptionId),
      treatmentId: new mongoose.Types.ObjectId(treatmentId),
      selectedDurationId: selectedDurationId ? new mongoose.Types.ObjectId(selectedDurationId) : undefined,
      totalQuantity: remainingQuantity,
      remainingQuantity,
      expiryDate,
      status: "active",
      purchaseDate: new Date(),
      paymentAmount: 0, // Admin created, no payment
      isGuestSubscription: false
    })

    await userSubscription.save()

    revalidatePath("/dashboard/admin/user-subscriptions")
    return { 
      success: true, 
      userSubscription: JSON.parse(JSON.stringify(userSubscription))
    }
  } catch (error) {
    logger.error("Error creating user subscription", error)
    return { success: false, error: "Failed to create user subscription" }
  }
}

export interface UpdateUserSubscriptionResult {
  success: boolean
  error?: string
}

/**
 * Updates a user subscription (admin only)
 */
export async function updateUserSubscription(id: string, formData: FormData): Promise<UpdateUserSubscriptionResult> {
  const session = await getServerSession(authOptions)
  if (!session || !isAdminUser(session.user)) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await connectDB()

    const remainingQuantityRaw = formData.get("remainingQuantity") as string
    const expiryDateRaw = formData.get("expiryDate") as string

    const remainingQuantity = Number.parseInt(remainingQuantityRaw)
    if (Number.isNaN(remainingQuantity) || remainingQuantity < 0) {
      return { success: false, error: "Invalid remaining quantity" }
    }

    const expiryDate = new Date(expiryDateRaw)
    if (isNaN(expiryDate.getTime())) {
      return { success: false, error: "Invalid expiry date" }
    }

    const updated = await UserSubscription.findByIdAndUpdate(
      id,
      { remainingQuantity, expiryDate },
      { new: true },
    )

    if (!updated) {
      return { success: false, error: "User subscription not found" }
    }

    revalidatePath("/dashboard/admin/user-subscriptions")
    return { success: true }
  } catch (error) {
    logger.error("Error updating user subscription", error)
    return { success: false, error: "Failed to update user subscription" }
  }
}
