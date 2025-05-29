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

// רכישת מנוי - גרסת דמה שתמיד מצליחה
export async function purchaseSubscription(subscriptionId: string, treatmentId: string, paymentMethodId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    // שליפת המנוי
    const subscription = await Subscription.findById(subscriptionId)
    if (!subscription || !subscription.isActive) {
      return { success: false, error: "Subscription not found or inactive" }
    }

    // שליפת הטיפול
    const treatment = await Treatment.findById(treatmentId)
    if (!treatment || !treatment.isActive) {
      return { success: false, error: "Treatment not found or inactive" }
    }

    // שליפת אמצעי התשלום
    const paymentMethod = await PaymentMethod.findById(paymentMethodId)
    if (!paymentMethod || paymentMethod.userId.toString() !== session.user.id) {
      return { success: false, error: "Payment method not found or not owned by user" }
    }

    // חישוב תאריך תפוגה
    const purchaseDate = new Date()
    const expiryDate = new Date(purchaseDate)
    expiryDate.setMonth(expiryDate.getMonth() + subscription.validityMonths)

    // יצירת רשומת מנוי למשתמש
    const userSubscription = new UserSubscription({
      userId: session.user.id,
      subscriptionId: subscription._id,
      treatmentId: treatment._id,
      purchaseDate,
      expiryDate,
      totalQuantity: subscription.quantity + subscription.bonusQuantity,
      remainingQuantity: subscription.quantity + subscription.bonusQuantity,
      status: "active",
      paymentMethodId: paymentMethod._id,
      paymentAmount: treatment.price * subscription.quantity, // Price is treatment_price * base_subscription_quantity
    })

    await userSubscription.save()

    revalidatePath("/dashboard/member/subscriptions")

    return { success: true, userSubscription }
  } catch (error) {
    logger.error("Error purchasing subscription:", error)
    return { success: false, error: "Failed to purchase subscription" }
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
      .populate("subscriptionId")
      .populate("treatmentId")
      .populate("paymentMethodId")
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

    // בניית שאילתה
    const query: any = {}

    if (options.userId) query.userId = options.userId
    if (options.subscriptionId) query.subscriptionId = options.subscriptionId
    if (options.treatmentId) query.treatmentId = options.treatmentId
    if (options.status) query.status = options.status

    // עימוד
    const page = options.page || 1
    const limit = options.limit || 10
    const skip = (page - 1) * limit

    // ביצוע השאילתה
    const userSubscriptions = await UserSubscription.find(query)
      .populate("userId", "name email phone")
      .populate("subscriptionId")
      .populate("treatmentId")
      .populate("paymentMethodId")
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

    // שליפת המנוי
    const userSubscription = await UserSubscription.findById(userSubscriptionId)

    if (!userSubscription) {
      return { success: false, error: "Subscription not found" }
    }

    // בדיקה שהמנוי שייך למשתמש או שהמשתמש הוא אדמין
    if (userSubscription.userId.toString() !== session.user.id && !session.user.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    // בדיקת סטטוס ויתרה
    if (userSubscription.status !== "active") {
      return { success: false, error: "Subscription is not active" }
    }

    if (userSubscription.remainingQuantity < quantity) {
      return { success: false, error: "Insufficient remaining quantity" }
    }

    // עדכון כמות נותרת
    userSubscription.remainingQuantity -= quantity

    // עדכון סטטוס אם נגמרה הכמות
    if (userSubscription.remainingQuantity <= 0) {
      userSubscription.status = "depleted"
    }

    await userSubscription.save()

    revalidatePath("/dashboard/member/subscriptions")

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

    // שליפת המנוי
    const userSubscription = await UserSubscription.findById(userSubscriptionId)

    if (!userSubscription) {
      return { success: false, error: "Subscription not found" }
    }

    // בדיקה שהמנוי שייך למשתמש או שהמשתמש הוא אדמין
    if (userSubscription.userId.toString() !== session.user.id && !session.user.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    // עדכון סטטוס
    userSubscription.status = "cancelled"
    await userSubscription.save()

    revalidatePath("/dashboard/member/subscriptions")

    return { success: true }
  } catch (error) {
    logger.error("Error cancelling subscription:", error)
    return { success: false, error: "Failed to cancel subscription" }
  }
}

export async function deleteUserSubscription(id: string) {
  try {
    await dbConnect()
    await UserSubscription.findByIdAndDelete(id)
    revalidatePath("/dashboard/admin/user-subscriptions")
  } catch (error) {
    console.error("Error deleting user subscription:", error)
    throw new Error("Failed to delete user subscription")
  }
}
