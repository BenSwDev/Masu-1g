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
  const requestId = `sub_purchase_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
  const startTime = Date.now()
  
  let sessionData // Renamed to avoid conflict with mongoose session
  try {
    logger.info(`[${requestId}] Starting subscription purchase`, {
      subscriptionId,
      treatmentId,
      hasSelectedDuration: !!selectedDurationId
    })

    sessionData = await getServerSession(authOptions)
    if (!sessionData || !sessionData.user) {
      logger.warn(`[${requestId}] Purchase attempt by unauthenticated user`)
      return { success: false, error: "Unauthorized" }
    }

    const dbConnectStart = Date.now()
    await dbConnect()
    const dbConnectTime = Date.now() - dbConnectStart
    
    logger.info(`[${requestId}] Database connected`, { 
      dbConnectTime: `${dbConnectTime}ms`,
      userId: sessionData.user.id
    })

    // Load all required data in parallel
    const dataLoadStart = Date.now()
    const [subscriptionResult, treatmentResult, paymentMethodResult] = await Promise.allSettled([
      Subscription.findById(subscriptionId),
      Treatment.findById(treatmentId).lean(),
      PaymentMethod.findById(paymentMethodId)
    ])
    const dataLoadTime = Date.now() - dataLoadStart

    // Check for failed data loads
    if (subscriptionResult.status === "rejected" || treatmentResult.status === "rejected" || paymentMethodResult.status === "rejected") {
      logger.error(`[${requestId}] Failed to load required data`, {
        dataLoadTime: `${dataLoadTime}ms`,
        subscriptionError: subscriptionResult.status === "rejected" ? subscriptionResult.reason : null,
        treatmentError: treatmentResult.status === "rejected" ? treatmentResult.reason : null,
        paymentMethodError: paymentMethodResult.status === "rejected" ? paymentMethodResult.reason : null
      })
      return { success: false, error: "Failed to load required data" }
    }

    const subscription = subscriptionResult.value
    const treatment = treatmentResult.value as ITreatment | null
    const paymentMethod = paymentMethodResult.value

    logger.info(`[${requestId}] Data loaded successfully`, {
      dataLoadTime: `${dataLoadTime}ms`,
      subscriptionFound: !!subscription,
      subscriptionActive: subscription?.isActive,
      treatmentFound: !!treatment,
      treatmentActive: treatment?.isActive,
      paymentMethodFound: !!paymentMethod
    })

    if (!subscription || !subscription.isActive) {
      logger.warn(`[${requestId}] Subscription not found or inactive`, { subscriptionId })
      return { success: false, error: "Subscription not found or inactive" }
    }

    if (!treatment || !treatment.isActive) {
      logger.warn(`[${requestId}] Treatment not found or inactive`, { treatmentId })
      return { success: false, error: "Treatment not found or inactive" }
    }

    if (!paymentMethod || paymentMethod.userId.toString() !== sessionData.user.id) {
      logger.warn(`[${requestId}] Payment method not found or not owned by user`, { 
        paymentMethodId, 
        userId: sessionData.user.id
      })
      return { success: false, error: "Payment method not found or not owned by user" }
    }

    // Price calculation
    const priceCalcStart = Date.now()
    let singleSessionPrice: number | undefined

    if (treatment.pricingType === "fixed") {
      singleSessionPrice = treatment.fixedPrice
    } else if (treatment.pricingType === "duration_based") {
      if (!selectedDurationId) {
        logger.warn(`[${requestId}] Duration ID not provided for duration-based treatment`, { treatmentId })
        return { success: false, error: "Duration must be selected for this treatment" }
      }
      const duration = treatment.durations?.find((d) => d._id.toString() === selectedDurationId)
      if (!duration || !duration.isActive) {
        logger.warn(`[${requestId}] Selected duration not found or inactive`, { 
          selectedDurationId, 
          treatmentId
        })
        return { success: false, error: "Selected duration not found or inactive" }
      }
      singleSessionPrice = duration.price
    }

    if (singleSessionPrice === undefined || singleSessionPrice < 0) {
      logger.error(`[${requestId}] Invalid price calculated for treatment`, { 
        treatmentId, 
        singleSessionPrice
      })
      return { success: false, error: "Invalid treatment price" }
    }

    const totalPaymentAmount = subscription.quantity * singleSessionPrice
    const priceCalcTime = Date.now() - priceCalcStart
    
    logger.info(`[${requestId}] Price calculation completed`, {
      priceCalcTime: `${priceCalcTime}ms`,
      singleSessionPrice,
      totalPaymentAmount
    })

    const purchaseDate = new Date()
    const expiryDate = new Date(purchaseDate)
    expiryDate.setMonth(expiryDate.getMonth() + subscription.validityMonths)

    const saveStart = Date.now()
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
    const saveTime = Date.now() - saveStart
    
    logger.info(`[${requestId}] User subscription created successfully`, {
      saveTime: `${saveTime}ms`,
      userSubscriptionId: newUserSubscription._id
    })

    // Purchase success notifications removed as per requirements

    revalidatePath("/dashboard/member/subscriptions")
    revalidatePath("/dashboard/admin/user-subscriptions")

    const totalTime = Date.now() - startTime
    logger.info(`[${requestId}] Subscription purchase completed successfully`, {
      totalTime: `${totalTime}ms`,
      userSubscriptionId: newUserSubscription._id,
      phases: {
        dbConnect: `${dbConnectTime}ms`,
        dataLoad: `${dataLoadTime}ms`,
        priceCalc: `${priceCalcTime}ms`,
        save: `${saveTime}ms`
      }
    })

    return { success: true, userSubscription: newUserSubscription.toObject() } // Return plain object
  } catch (error) {
    const totalTime = Date.now() - startTime
    logger.error(`[${requestId}] Error purchasing subscription`, {
      totalTime: `${totalTime}ms`,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5)
      } : String(error),
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

export async function purchaseGuestSubscription({
  subscriptionId,
  treatmentId,
  paymentMethodId,
  selectedDurationId,
  guestInfo,
}: PurchaseSubscriptionArgs & {
  guestInfo: {
    name: string
    email: string
    phone: string
  }
}) {
  const requestId = `guest_sub_purchase_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
  const startTime = Date.now()
  
  try {
    logger.info(`[${requestId}] Starting guest subscription purchase`, {
      subscriptionId,
      treatmentId,
      hasSelectedDuration: !!selectedDurationId,
      guestEmail: guestInfo.email
    })

    const dbConnectStart = Date.now()
    await dbConnect()
    const dbConnectTime = Date.now() - dbConnectStart
    
    logger.info(`[${requestId}] Database connected`, { 
      dbConnectTime: `${dbConnectTime}ms`,
      guestEmail: guestInfo.email
    })

    // Load all required data in parallel
    const dataLoadStart = Date.now()
    const [subscriptionResult, treatmentResult] = await Promise.allSettled([
      Subscription.findById(subscriptionId),
      Treatment.findById(treatmentId).lean(),
    ])
    const dataLoadTime = Date.now() - dataLoadStart

    // Check for failed data loads
    if (subscriptionResult.status === "rejected" || treatmentResult.status === "rejected") {
      logger.error(`[${requestId}] Failed to load required data`, {
        dataLoadTime: `${dataLoadTime}ms`,
        subscriptionError: subscriptionResult.status === "rejected" ? subscriptionResult.reason : null,
        treatmentError: treatmentResult.status === "rejected" ? treatmentResult.reason : null,
      })
      return { success: false, error: "Failed to load required data" }
    }

    const subscription = subscriptionResult.value
    const treatment = treatmentResult.value as ITreatment | null

    logger.info(`[${requestId}] Data loaded successfully`, {
      dataLoadTime: `${dataLoadTime}ms`,
      subscriptionFound: !!subscription,
      subscriptionActive: subscription?.isActive,
      treatmentFound: !!treatment,
      treatmentActive: treatment?.isActive,
    })

    if (!subscription || !subscription.isActive) {
      logger.warn(`[${requestId}] Subscription not found or inactive`, { subscriptionId })
      return { success: false, error: "Subscription not found or inactive" }
    }

    if (!treatment || !treatment.isActive) {
      logger.warn(`[${requestId}] Treatment not found or inactive`, { treatmentId })
      return { success: false, error: "Treatment not found or inactive" }
    }

    // Price calculation
    const priceCalcStart = Date.now()
    let singleSessionPrice: number | undefined

    if (treatment.pricingType === "fixed") {
      singleSessionPrice = treatment.fixedPrice
    } else if (treatment.pricingType === "duration_based") {
      if (!selectedDurationId) {
        logger.warn(`[${requestId}] Duration ID not provided for duration-based treatment`, { treatmentId })
        return { success: false, error: "Duration must be selected for this treatment" }
      }
      const duration = treatment.durations?.find((d) => d._id.toString() === selectedDurationId)
      if (!duration || !duration.isActive) {
        logger.warn(`[${requestId}] Selected duration not found or inactive`, { 
          selectedDurationId, 
          treatmentId
        })
        return { success: false, error: "Selected duration not found or inactive" }
      }
      singleSessionPrice = duration.price
    }

    if (singleSessionPrice === undefined || singleSessionPrice < 0) {
      logger.error(`[${requestId}] Invalid price calculated for treatment`, { 
        treatmentId, 
        singleSessionPrice
      })
      return { success: false, error: "Invalid treatment price" }
    }

    const totalPaymentAmount = subscription.quantity * singleSessionPrice
    const priceCalcTime = Date.now() - priceCalcStart
    
    logger.info(`[${requestId}] Price calculation completed`, {
      priceCalcTime: `${priceCalcTime}ms`,
      singleSessionPrice,
      totalPaymentAmount
    })

    const purchaseDate = new Date()
    const expiryDate = new Date(purchaseDate)
    expiryDate.setMonth(expiryDate.getMonth() + subscription.validityMonths)

    const saveStart = Date.now()
    // For guest purchases, we create a special UserSubscription record without userId
    const newUserSubscription = new UserSubscription({
      userId: null, // Guest purchase - no user association
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
      paymentMethodId: paymentMethodId ? new mongoose.Types.ObjectId(paymentMethodId) : undefined,
      paymentAmount: totalPaymentAmount,
      pricePerSession: singleSessionPrice,
      // Store guest info in the record for reference
      guestInfo: {
        name: guestInfo.name,
        email: guestInfo.email,
        phone: guestInfo.phone,
      },
    })

    await newUserSubscription.save()
    const saveTime = Date.now() - saveStart
    
    logger.info(`[${requestId}] Guest subscription created successfully`, {
      saveTime: `${saveTime}ms`,
      userSubscriptionId: newUserSubscription._id,
      guestEmail: guestInfo.email
    })

    // Guest purchase success notifications removed as per requirements

    revalidatePath("/dashboard/admin/user-subscriptions")

    const totalTime = Date.now() - startTime
    logger.info(`[${requestId}] Guest subscription purchase completed successfully`, {
      totalTime: `${totalTime}ms`,
      userSubscriptionId: newUserSubscription._id,
      guestEmail: guestInfo.email,
      phases: {
        dbConnect: `${dbConnectTime}ms`,
        dataLoad: `${dataLoadTime}ms`,
        priceCalc: `${priceCalcTime}ms`,
        save: `${saveTime}ms`
      }
    })

    return { success: true, userSubscription: newUserSubscription.toObject() }
  } catch (error) {
    const totalTime = Date.now() - startTime
    logger.error(`[${requestId}] Error purchasing guest subscription`, {
      totalTime: `${totalTime}ms`,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5)
      } : String(error),
      subscriptionId,
      treatmentId,
      guestEmail: guestInfo.email,
    })
    return { success: false, error: "Failed to purchase subscription" }
  }
}
