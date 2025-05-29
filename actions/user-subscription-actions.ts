"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import UserSubscription from "@/lib/db/models/user-subscription"
import Subscription from "@/lib/db/models/subscription"
import Treatment from "@/lib/db/models/treatment"
import PaymentMethod from "@/lib/db/models/payment-method"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"

interface PurchaseSubscriptionParams {
  subscriptionId: string
  treatmentId: string
  paymentMethodId: string
  selectedDurationMinutes?: number // Optional: for duration-based treatments
}

export async function purchaseSubscription({
  subscriptionId,
  treatmentId,
  paymentMethodId,
  selectedDurationMinutes,
}: PurchaseSubscriptionParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const subscription = await Subscription.findById(subscriptionId)
    if (!subscription || !subscription.isActive) {
      return { success: false, error: "Subscription package not found or inactive" }
    }

    const treatment = await Treatment.findById(treatmentId).lean() // Use .lean() for plain JS object
    if (!treatment || !treatment.isActive) {
      return { success: false, error: "Treatment not found or inactive" }
    }

    const paymentMethod = await PaymentMethod.findById(paymentMethodId)
    if (!paymentMethod || paymentMethod.userId.toString() !== session.user.id) {
      return { success: false, error: "Payment method not found or not owned by user" }
    }

    let actualTreatmentSessionPrice: number
    let durationToStore: number | undefined = undefined

    if (treatment.pricingType === "fixed") {
      if (typeof treatment.fixedPrice !== "number") {
        return { success: false, error: "Treatment fixed price is not configured correctly." }
      }
      actualTreatmentSessionPrice = treatment.fixedPrice
    } else if (treatment.pricingType === "duration_based") {
      if (typeof selectedDurationMinutes !== "number") {
        return { success: false, error: "A duration must be selected for this type of treatment." }
      }
      const durationOption = treatment.durations?.find((d) => d.minutes === selectedDurationMinutes && d.isActive)
      if (!durationOption || typeof durationOption.price !== "number") {
        return { success: false, error: "Selected duration is invalid, not active, or price is not configured." }
      }
      actualTreatmentSessionPrice = durationOption.price
      durationToStore = selectedDurationMinutes
    } else {
      return { success: false, error: "Invalid treatment pricing type." }
    }

    const paidTreatmentsCount = Math.max(0, subscription.quantity - subscription.bonusQuantity)

    // If paidTreatmentsCount is 0, the subscription might be entirely free or a misconfiguration.
    // For now, if paidTreatmentsCount is 0, paymentAmount will be 0.
    // Consider if a minimum paidTreatmentsCount > 0 should be enforced at subscription package creation.
    if (paidTreatmentsCount === 0 && subscription.quantity > 0) {
      logger.warn(
        `Subscription ${subscription.name} (ID: ${subscription._id}) results in 0 paid treatments (quantity: ${subscription.quantity}, bonus: ${subscription.bonusQuantity}). Payment amount will be 0.`,
      )
    }

    const paymentAmount = actualTreatmentSessionPrice * paidTreatmentsCount

    const purchaseDate = new Date()
    const expiryDate = new Date(purchaseDate)
    expiryDate.setMonth(expiryDate.getMonth() + subscription.validityMonths)

    const newUserSubscription = new UserSubscription({
      userId: session.user.id,
      subscriptionId: subscription._id,
      treatmentId: treatment._id,
      selectedTreatmentDurationMinutes: durationToStore,
      purchaseDate,
      expiryDate,
      totalQuantity: subscription.quantity + subscription.bonusQuantity, // Total uses
      remainingQuantity: subscription.quantity + subscription.bonusQuantity, // Initially, all uses are remaining
      status: "active",
      paymentMethodId: paymentMethod._id,
      paymentAmount: paymentAmount,
    })

    await newUserSubscription.save()

    revalidatePath("/dashboard/member/subscriptions")

    return { success: true, userSubscription: newUserSubscription }
  } catch (error) {
    logger.error("Error purchasing subscription:", {
      error,
      subscriptionId,
      treatmentId,
      paymentMethodId,
      selectedDurationMinutes,
    })
    const errorMessage = error instanceof Error ? error.message : "Failed to purchase subscription"
    return { success: false, error: errorMessage }
  }
}

// קבלת מנויים של משתמש
export async function getUserSubscriptions() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const userSubscriptions = await UserSubscription.find({ userId: session.user.id })
      .populate({ path: "subscriptionId", model: Subscription })
      .populate({ path: "treatmentId", model: Treatment })
      .populate({ path: "paymentMethodId", model: PaymentMethod })
      .sort({ purchaseDate: -1 })
      .lean()

    return { success: true, userSubscriptions }
  } catch (error) {
    logger.error("Error fetching user subscriptions:", error)
    return { success: false, error: "Failed to fetch subscriptions" }
  }
}

// קבלת כל מנויי המשתמשים (לאדמין)
export async function getAllUserSubscriptions(
  options: {
    userId?: string
    subscriptionId?: string
    treatmentId?: string
    status?: string
    search?: string
    page?: number
    limit?: number
  } = {},
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const query: any = {}
    if (options.userId) query.userId = options.userId
    if (options.subscriptionId) query.subscriptionId = options.subscriptionId
    if (options.treatmentId) query.treatmentId = options.treatmentId
    if (options.status) query.status = options.status
    // Add search functionality later if needed for treatment name or user name

    const page = options.page || 1
    const limit = options.limit || 10
    const skip = (page - 1) * limit

    const userSubscriptions = await UserSubscription.find(query)
      .populate({ path: "userId", select: "name email phone", model: "User" }) // Assuming 'User' is the model name
      .populate({ path: "subscriptionId", model: Subscription })
      .populate({ path: "treatmentId", model: Treatment })
      .populate({ path: "paymentMethodId", model: PaymentMethod })
      .sort({ purchaseDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const total = await UserSubscription.countDocuments(query)

    return {
      success: true,
      userSubscriptions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  } catch (error) {
    logger.error("Error fetching all user subscriptions:", error)
    return { success: false, error: "Failed to fetch subscriptions" }
  }
}

// עדכון ניצול מנוי (הפחתת כמות)
export async function useSubscription(userSubscriptionId: string, quantity = 1) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const userSubscription = await UserSubscription.findById(userSubscriptionId)

    if (!userSubscription) {
      return { success: false, error: "Subscription not found" }
    }

    if (userSubscription.userId.toString() !== session.user.id && !session.user.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    if (userSubscription.status !== "active") {
      return { success: false, error: "Subscription is not active" }
    }

    if (userSubscription.remainingQuantity < quantity) {
      return { success: false, error: "Insufficient remaining quantity" }
    }

    userSubscription.remainingQuantity -= quantity
    if (userSubscription.remainingQuantity <= 0) {
      userSubscription.status = "depleted"
    }

    await userSubscription.save()
    revalidatePath("/dashboard/member/subscriptions")
    if (session.user.roles.includes("admin")) {
      revalidatePath("/dashboard/admin/user-subscriptions")
    }
    return { success: true, userSubscription }
  } catch (error) {
    logger.error("Error using subscription:", error)
    return { success: false, error: "Failed to use subscription" }
  }
}

// ביטול מנוי
export async function cancelSubscription(userSubscriptionId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()
    const userSubscription = await UserSubscription.findById(userSubscriptionId)

    if (!userSubscription) {
      return { success: false, error: "Subscription not found" }
    }

    if (userSubscription.userId.toString() !== session.user.id && !session.user.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    userSubscription.status = "cancelled"
    await userSubscription.save()

    revalidatePath("/dashboard/member/subscriptions")
    if (session.user.roles.includes("admin")) {
      revalidatePath("/dashboard/admin/user-subscriptions")
    }
    return { success: true }
  } catch (error) {
    logger.error("Error cancelling subscription:", error)
    return { success: false, error: "Failed to cancel subscription" }
  }
}

export async function deleteUserSubscription(id: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }
    await dbConnect()
    await UserSubscription.findByIdAndDelete(id)
    revalidatePath("/dashboard/admin/user-subscriptions")
    return { success: true }
  } catch (error) {
    logger.error("Error deleting user subscription:", error)
    return { success: false, error: "Failed to delete user subscription" }
  }
}
