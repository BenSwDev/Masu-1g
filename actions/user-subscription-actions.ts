"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import UserSubscription from "@/lib/db/models/user-subscription"
import Subscription from "@/lib/db/models/subscription"
import Treatment, { type ITreatment } from "@/lib/db/models/treatment"
import PaymentMethod from "@/lib/db/models/payment-method"
import User from "@/lib/db/models/user" // Added import
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"
import mongoose from "mongoose"
import { notificationManager } from "@/lib/notifications/notification-manager" // Added import
import type {
  PurchaseSuccessSubscriptionNotificationData,
  EmailRecipient,
  PhoneRecipient,
} from "@/lib/notifications/notification-types" // Added import

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
  let sessionData // Renamed to avoid conflict with mongoose session
  try {
    sessionData = await getServerSession(authOptions)
    if (!sessionData || !sessionData.user) {
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
    if (!paymentMethod || paymentMethod.userId.toString() !== sessionData.user.id) {
      logger.warn(`Payment method not found or not owned by user: ${paymentMethodId}, userId: ${sessionData.user.id}`)
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

    const totalPaymentAmount = subscription.quantity * singleSessionPrice
    const purchaseDate = new Date()
    const expiryDate = new Date(purchaseDate)
    expiryDate.setMonth(expiryDate.getMonth() + subscription.validityMonths)

    const newUserSubscription = new UserSubscription({
      userId: sessionData.user.id,
      subscriptionId: subscription._id,
      treatmentId: treatment._id,
      selectedDurationId:
        treatment.pricingType === "duration_based" && selectedDurationId
          ? new mongoose.Types.ObjectId(selectedDurationId)
          : undefined,
      purchaseDate,
      expiryDate,
      totalQuantity: subscription.quantity + subscription.bonusQuantity,
      remainingQuantity: subscription.quantity + subscription.bonusQuantity,
      status: "active",
      paymentMethodId: paymentMethod._id,
      paymentAmount: totalPaymentAmount,
      pricePerSession: singleSessionPrice,
    })

    await newUserSubscription.save()
    logger.info(
      `User ${sessionData.user.id} purchased subscription ${subscriptionId} for treatment ${treatmentId}. UserSubscription ID: ${newUserSubscription._id}`,
    )

    // --- Send purchase success notification ---
    try {
      const user = await User.findById(sessionData.user.id).select("name email phone notificationPreferences").lean()

      if (user) {
        const lang = user.notificationPreferences?.language || "he"
        const methods = user.notificationPreferences?.methods || ["email", "sms"]
        const userNameForNotification = user.name || (lang === "he" ? "לקוח" : "Customer")

        const subName = subscription.name || (lang === "he" ? "המנוי שלך" : "Your Subscription")
        const appBaseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"

        const notificationData: PurchaseSuccessSubscriptionNotificationData = {
          type: "PURCHASE_SUCCESS_SUBSCRIPTION",
          userName: userNameForNotification,
          subscriptionName: subName,
          purchaseDetailsLink: `${appBaseUrl}/dashboard/member/subscriptions`,
        }

        if (methods.includes("email") && user.email) {
          const emailRecipient: EmailRecipient = {
            type: "email",
            value: user.email,
            language: lang,
            name: userNameForNotification,
          }
          await notificationManager.sendNotification(emailRecipient, notificationData)
        }
        if (methods.includes("sms") && user.phone) {
          const phoneRecipient: PhoneRecipient = {
            type: "phone",
            value: user.phone,
            language: lang,
          }
          await notificationManager.sendNotification(phoneRecipient, notificationData)
        }
      } else {
        logger.warn(`User not found for notification after subscription purchase: ${sessionData.user.id}`)
      }
    } catch (notificationError) {
      logger.error("Failed to send purchase success notification for subscription:", {
        userId: sessionData.user.id,
        subscriptionId: newUserSubscription._id.toString(),
        error: notificationError instanceof Error ? notificationError.message : String(notificationError),
      })
    }
    // --- End notification sending ---

    revalidatePath("/dashboard/member/subscriptions")
    revalidatePath("/dashboard/admin/user-subscriptions")

    return { success: true, userSubscription: newUserSubscription.toObject() } // Return plain object
  } catch (error) {
    logger.error("Error purchasing subscription:", {
      error: error instanceof Error ? error.message : String(error),
      subscriptionId,
      treatmentId,
      userId: sessionData?.user?.id,
    })
    return { success: false, error: "Failed to purchase subscription" }
  }
}

export async function getUserSubscriptions() {
  let sessionData
  try {
    sessionData = await getServerSession(authOptions)
    if (!sessionData || !sessionData.user) {
      return { success: false, error: "Unauthorized", userSubscriptions: [] }
    }

    await dbConnect()

    const userSubscriptions = await UserSubscription.find({ userId: sessionData.user.id })
      .populate("subscriptionId")
      .populate({
        path: "treatmentId",
        model: Treatment,
        populate: {
          path: "durations",
        },
      })
      .populate("paymentMethodId")
      .sort({ purchaseDate: -1 })
      .lean()

    const populatedUserSubscriptions = userSubscriptions.map((sub: any) => {
      if (
        sub.treatmentId &&
        (sub.treatmentId as ITreatment).pricingType === "duration_based" &&
        sub.selectedDurationId
      ) {
        const treatmentDoc = sub.treatmentId as ITreatment
        if (treatmentDoc.durations) {
          const selectedDuration = treatmentDoc.durations.find(
            (d: any) => d._id.toString() === (sub.selectedDurationId as mongoose.Types.ObjectId).toString(),
          )
          return { ...sub, selectedDurationDetails: selectedDuration }
        }
      }
      return sub
    })

    return { success: true, userSubscriptions: populatedUserSubscriptions }
  } catch (error) {
    logger.error("Error fetching user subscriptions:", {
      error: error instanceof Error ? error.message : String(error),
      userId: sessionData?.user?.id,
    })
    return { success: false, error: "Failed to fetch subscriptions", userSubscriptions: [] }
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
    const sessionData = await getServerSession(authOptions)
    if (!sessionData?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized", userSubscriptions: [], pagination: undefined }
    }

    await dbConnect()

    const query: any = {}
    if (options.userId) query.userId = options.userId
    if (options.subscriptionId) query.subscriptionId = options.subscriptionId
    if (options.treatmentId) query.treatmentId = options.treatmentId
    if (options.status) query.status = options.status

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
          path: "durations",
        },
      })
      .populate("paymentMethodId")
      .sort({ purchaseDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const populatedUserSubscriptions = userSubscriptions.map((sub: any) => {
      if (
        sub.treatmentId &&
        (sub.treatmentId as ITreatment).pricingType === "duration_based" &&
        sub.selectedDurationId
      ) {
        const treatmentDoc = sub.treatmentId as ITreatment
        if (treatmentDoc.durations) {
          const selectedDuration = treatmentDoc.durations.find(
            (d: any) => d._id.toString() === (sub.selectedDurationId as mongoose.Types.ObjectId).toString(),
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
    logger.error("Error fetching all user subscriptions:", {
      error: error instanceof Error ? error.message : String(error),
      options,
    })
    return { success: false, error: "Failed to fetch subscriptions", userSubscriptions: [], pagination: undefined }
  }
}

export async function useSubscription(userSubscriptionId: string, quantity = 1) {
  let sessionData
  try {
    sessionData = await getServerSession(authOptions)
    if (!sessionData || !sessionData.user) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()
    const userSubscription = await UserSubscription.findById(userSubscriptionId)

    if (!userSubscription) {
      return { success: false, error: "Subscription not found" }
    }

    if (userSubscription.userId.toString() !== sessionData.user.id && !sessionData.user.roles.includes("admin")) {
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
    return { success: true, userSubscription: userSubscription.toObject() }
  } catch (error) {
    logger.error("Error using subscription:", {
      error: error instanceof Error ? error.message : String(error),
      userSubscriptionId,
      userId: sessionData?.user?.id,
    })
    return { success: false, error: "Failed to use subscription" }
  }
}

export async function cancelSubscription(userSubscriptionId: string) {
  let sessionData
  try {
    sessionData = await getServerSession(authOptions)
    if (!sessionData || !sessionData.user) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()
    const userSubscription = await UserSubscription.findById(userSubscriptionId)

    if (!userSubscription) {
      return { success: false, error: "Subscription not found" }
    }

    if (userSubscription.userId.toString() !== sessionData.user.id && !sessionData.user.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    userSubscription.status = "cancelled"
    await userSubscription.save()
    revalidatePath("/dashboard/member/subscriptions")
    revalidatePath("/dashboard/admin/user-subscriptions")
    return { success: true }
  } catch (error) {
    logger.error("Error cancelling subscription:", {
      error: error instanceof Error ? error.message : String(error),
      userSubscriptionId,
      userId: sessionData?.user?.id,
    })
    return { success: false, error: "Failed to cancel subscription" }
  }
}

export async function deleteUserSubscription(id: string) {
  let sessionData
  try {
    sessionData = await getServerSession(authOptions)
    if (!sessionData?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }
    await dbConnect()
    const result = await UserSubscription.findByIdAndDelete(id)
    if (!result) {
      return { success: false, error: "User subscription not found" }
    }
    revalidatePath("/dashboard/admin/user-subscriptions")
    revalidatePath("/dashboard/member/subscriptions")
    logger.info(`User subscription ${id} deleted by admin ${sessionData.user.id}`)
    return { success: true }
  } catch (error) {
    logger.error("Error deleting user subscription:", {
      error: error instanceof Error ? error.message : String(error),
      id,
      adminId: sessionData?.user?.id,
    })
    return { success: false, error: "Failed to delete user subscription" }
  }
}
