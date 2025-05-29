"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import UserSubscription from "@/lib/db/models/user-subscription"
import Subscription from "@/lib/db/models/subscription"
import Treatment, { type ITreatment } from "@/lib/db/models/treatment"
import PaymentMethod from "@/lib/db/models/payment-method"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"
import mongoose from "mongoose"

interface PurchaseSubscriptionArgs {
  subscriptionId: string
  treatmentId: string
  paymentMethodId: string
  selectedDurationId?: string // ID of the selected duration object if treatment is duration-based
}

export async function purchaseSubscription({
  subscriptionId,
  treatmentId,
  paymentMethodId,
  selectedDurationId,
}: PurchaseSubscriptionArgs) {
  let session
  try {
    session = await getServerSession(authOptions)
    if (!session || !session.user) {
      logger.warn("Purchase attempt by unauthenticated user.")
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const subscription = await Subscription.findById(subscriptionId)
    if (!subscription || !subscription.isActive) {
      logger.warn(`Subscription not found or inactive: ${subscriptionId}`)
      return { success: false, error: "Subscription not found or inactive" }
    }

    const treatment = (await Treatment.findById(treatmentId).lean()) as ITreatment | null
    if (!treatment || !treatment.isActive) {
      logger.warn(`Treatment not found or inactive: ${treatmentId}`)
      return { success: false, error: "Treatment not found or inactive" }
    }

    const paymentMethod = await PaymentMethod.findById(paymentMethodId)
    if (!paymentMethod || paymentMethod.userId.toString() !== session.user.id) {
      logger.warn(`Payment method not found or not owned by user: ${paymentMethodId}, userId: ${session.user.id}`)
      return { success: false, error: "Payment method not found or not owned by user" }
    }

    let singleSessionPrice: number | undefined

    if (treatment.pricingType === "fixed") {
      singleSessionPrice = treatment.fixedPrice
    } else if (treatment.pricingType === "duration_based") {
      if (!selectedDurationId) {
        logger.warn(`Duration ID not provided for duration-based treatment: ${treatmentId}`)
        return { success: false, error: "Duration must be selected for this treatment" }
      }
      const duration = treatment.durations?.find((d) => d._id.toString() === selectedDurationId)
      if (!duration || !duration.isActive) {
        logger.warn(`Selected duration not found or inactive: ${selectedDurationId} for treatment ${treatmentId}`)
        return { success: false, error: "Selected duration not found or inactive" }
      }
      singleSessionPrice = duration.price
    }

    if (singleSessionPrice === undefined || singleSessionPrice < 0) {
      logger.error(`Invalid price calculated for treatment ${treatmentId}. Price: ${singleSessionPrice}`)
      return { success: false, error: "Invalid treatment price" }
    }

    // The price of the subscription package is: (number of paid sessions) * (price of one session)
    // subscription.quantity is the number of paid sessions.
    const totalPaymentAmount = subscription.quantity * singleSessionPrice

    const purchaseDate = new Date()
    const expiryDate = new Date(purchaseDate)
    expiryDate.setMonth(expiryDate.getMonth() + subscription.validityMonths)

    const newUserSubscription = new UserSubscription({
      userId: session.user.id,
      subscriptionId: subscription._id,
      treatmentId: treatment._id,
      selectedDurationId:
        treatment.pricingType === "duration_based" ? new mongoose.Types.ObjectId(selectedDurationId) : undefined,
      purchaseDate,
      expiryDate,
      totalQuantity: subscription.quantity + subscription.bonusQuantity,
      remainingQuantity: subscription.quantity + subscription.bonusQuantity,
      status: "active",
      paymentMethodId: paymentMethod._id,
      paymentAmount: totalPaymentAmount, // Total price for the package
      pricePerSession: singleSessionPrice, // Store the price per session for clarity
    })

    await newUserSubscription.save()
    logger.info(
      `User ${session.user.id} purchased subscription ${subscriptionId} for treatment ${treatmentId}. UserSubscription ID: ${newUserSubscription._id}`,
    )

    revalidatePath("/dashboard/member/subscriptions")
    revalidatePath("/dashboard/admin/user-subscriptions")

    return { success: true, userSubscription: newUserSubscription }
  } catch (error) {
    logger.error("Error purchasing subscription:", {
      error,
      subscriptionId,
      treatmentId,
      userId: session?.user?.id,
    })
    return { success: false, error: "Failed to purchase subscription" }
  }
}

export async function getUserSubscriptions() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const userSubscriptions = await UserSubscription.find({ userId: session.user.id })
      .populate("subscriptionId")
      .populate({
        path: "treatmentId",
        model: Treatment,
        populate: {
          // Populate durations within treatment if needed, though selectedDurationId is on UserSubscription
          path: "durations",
        },
      })
      .populate("paymentMethodId")
      .sort({ purchaseDate: -1 })
      .lean()

    // Manually populate selected duration details if applicable
    const populatedUserSubscriptions = userSubscriptions.map((sub) => {
      if (sub.treatmentId && (sub.treatmentId as any).pricingType === "duration_based" && sub.selectedDurationId) {
        const treatmentDoc = sub.treatmentId as any as ITreatment // Cast to ITreatment
        if (treatmentDoc.durations) {
          const selectedDuration = treatmentDoc.durations.find(
            (d) => d._id.toString() === (sub.selectedDurationId as mongoose.Types.ObjectId).toString(),
          )
          return { ...sub, selectedDurationDetails: selectedDuration }
        }
      }
      return sub
    })

    return { success: true, userSubscriptions: populatedUserSubscriptions }
  } catch (error) {
    logger.error("Error fetching user subscriptions:", { error, userId: session?.user?.id })
    return { success: false, error: "Failed to fetch subscriptions" }
  }
}

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

    // TODO: Implement search functionality if options.search is provided
    // This might involve searching across user name/email, subscription name, treatment name

    const page = options.page || 1
    const limit = options.limit || 10
    const skip = (page - 1) * limit

    const userSubscriptions = await UserSubscription.find(query)
      .populate("userId", "name email phone")
      .populate("subscriptionId")
      .populate({
        path: "treatmentId",
        model: Treatment,
        populate: {
          // Populate durations within treatment
          path: "durations",
        },
      })
      .populate("paymentMethodId")
      .sort({ purchaseDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    // Manually populate selected duration details if applicable
    const populatedUserSubscriptions = userSubscriptions.map((sub) => {
      if (sub.treatmentId && (sub.treatmentId as any).pricingType === "duration_based" && sub.selectedDurationId) {
        const treatmentDoc = sub.treatmentId as any as ITreatment // Cast to ITreatment
        if (treatmentDoc.durations) {
          const selectedDuration = treatmentDoc.durations.find(
            (d) => d._id.toString() === (sub.selectedDurationId as mongoose.Types.ObjectId).toString(),
          )
          return { ...sub, selectedDurationDetails: selectedDuration }
        }
      }
      return sub
    })

    const total = await UserSubscription.countDocuments(query)

    return {
      success: true,
      userSubscriptions: populatedUserSubscriptions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  } catch (error) {
    logger.error("Error fetching all user subscriptions:", { error, options })
    return { success: false, error: "Failed to fetch subscriptions" }
  }
}

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
    revalidatePath("/dashboard/admin/user-subscriptions")
    return { success: true, userSubscription }
  } catch (error) {
    logger.error("Error using subscription:", { error, userSubscriptionId, userId: session?.user?.id })
    return { success: false, error: "Failed to use subscription" }
  }
}

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
    revalidatePath("/dashboard/admin/user-subscriptions")
    return { success: true }
  } catch (error) {
    logger.error("Error cancelling subscription:", { error, userSubscriptionId, userId: session?.user?.id })
    return { success: false, error: "Failed to cancel subscription" }
  }
}

export async function deleteUserSubscription(id: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      // Or check if the user owns this subscription if non-admins can delete their own.
      // For now, only admin.
      return { success: false, error: "Unauthorized" }
    }
    await dbConnect()
    const result = await UserSubscription.findByIdAndDelete(id)
    if (!result) {
      return { success: false, error: "User subscription not found" }
    }
    revalidatePath("/dashboard/admin/user-subscriptions")
    revalidatePath("/dashboard/member/subscriptions") // If users can see their subscriptions being deleted
    logger.info(`User subscription ${id} deleted by admin ${session.user.id}`)
    return { success: true }
  } catch (error) {
    logger.error("Error deleting user subscription:", { error, id, adminId: session?.user?.id })
    // throw new Error("Failed to delete user subscription") // Avoid throwing, return structured error
    return { success: false, error: "Failed to delete user subscription" }
  }
}
