"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import Subscription from "@/lib/db/models/subscription"
import Treatment from "@/lib/db/models/treatment"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"
import { z } from "zod"
import mongoose from "mongoose"
import UserSubscription from "@/lib/db/models/userSubscription"
import User from "@/lib/db/models/user"
import NotificationManager from "@/lib/notifications/NotificationManager"
import { PurchaseSuccessSubscriptionNotificationData } from "@/lib/notifications/types"
import { EmailRecipient, PhoneRecipient } from "@/lib/notifications/types"
import PaymentMethod from "@/lib/db/models/paymentMethod"

// סכמת בדיקת תקינות למנוי
const subscriptionSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  description: z.string().min(5, { message: "Description must be at least 5 characters" }),
  quantity: z.number().int().min(1, { message: "Quantity must be at least 1" }),
  bonusQuantity: z.number().int().min(0, { message: "Bonus quantity must be at least 0" }),
  validityMonths: z.number().int().min(1, { message: "Validity must be at least 1 month" }),
  isActive: z.boolean().default(true),
})

// יצירת מנוי חדש
export async function createSubscription(formData: FormData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    // פירוק הנתונים מהטופס
    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const quantity = Number.parseInt(formData.get("quantity") as string)
    const bonusQuantity = Number.parseInt(formData.get("bonusQuantity") as string)
    const validityMonths = Number.parseInt(formData.get("validityMonths") as string)
    const isActive = formData.get("isActive") === "true"

    // בדיקת תקינות
    const validatedData = subscriptionSchema.parse({
      name,
      description,
      quantity,
      bonusQuantity,
      validityMonths,
      isActive,
    })

    // יצירת מנוי חדש
    const subscription = new Subscription(validatedData)
    await subscription.save()

    revalidatePath("/dashboard/admin/subscriptions")

    return { success: true, subscription }
  } catch (error) {
    logger.error("Error creating subscription:", error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: "Failed to create subscription" }
  }
}

// עדכון מנוי קיים
export async function updateSubscription(id: string, formData: FormData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    // פירוק הנתונים מהטופס
    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const quantity = Number.parseInt(formData.get("quantity") as string)
    const bonusQuantity = Number.parseInt(formData.get("bonusQuantity") as string)
    const validityMonths = Number.parseInt(formData.get("validityMonths") as string)
    const isActive = formData.get("isActive") === "true"

    // בדיקת תקינות
    const validatedData = subscriptionSchema.parse({
      name,
      description,
      quantity,
      bonusQuantity,
      validityMonths,
      isActive,
    })

    // עדכון המנוי
    const subscription = await Subscription.findByIdAndUpdate(
      id,
      { ...validatedData, updatedAt: new Date() },
      { new: true },
    )

    if (!subscription) {
      return { success: false, error: "Subscription not found" }
    }

    revalidatePath("/dashboard/admin/subscriptions")

    return { success: true, subscription }
  } catch (error) {
    logger.error("Error updating subscription:", error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: "Failed to update subscription" }
  }
}

// מחיקת מנוי
export async function deleteSubscription(id: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
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

// קבלת רשימת מנויים
export async function getSubscriptions(
  options: {
    isActive?: boolean
    search?: string
    sort?: string
    page?: number
    limit?: number
  } = {},
) {
  try {
    await dbConnect()

    // בניית שאילתה
    const query: any = {}

    if (options.isActive !== undefined) {
      query.isActive = options.isActive
    }

    if (options.search) {
      query.$or = [
        { name: { $regex: options.search, $options: "i" } },
        { description: { $regex: options.search, $options: "i" } },
      ]
    }

    // עימוד
    const page = options.page || 1
    const limit = options.limit || 10
    const skip = (page - 1) * limit

    // מיון
    const sort: any = {}
    if (options.sort) {
      const [field, order] = options.sort.split(":")
      sort[field] = order === "desc" ? -1 : 1
    } else {
      sort.createdAt = -1
    }

    // ביצוע השאילתה
    const subscriptions = await Subscription.find(query).sort(sort).skip(skip).limit(limit).lean()

    const total = await Subscription.countDocuments(query)

    // Serialize the subscriptions to plain objects
    const serializedSubscriptions = subscriptions.map((sub) => ({
      ...sub,
      _id: sub._id.toString(),
    }))

    return {
      success: true,
      subscriptions: serializedSubscriptions,
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

// קבלת מנוי לפי מזהה
export async function getSubscriptionById(id: string) {
  try {
    await dbConnect()

    const subscription = await Subscription.findById(id).lean()

    if (!subscription) {
      return { success: false, error: "Subscription not found" }
    }

    // Serialize the subscription to a plain object
    const serializedSubscription = {
      ...subscription,
      _id: subscription._id.toString(),
    }

    return { success: true, subscription: serializedSubscription }
  } catch (error) {
    logger.error("Error fetching subscription:", error)
    return { success: false, error: "Failed to fetch subscription" }
  }
}

// הפעלה/השבתה של מנוי
export async function toggleSubscriptionStatus(id: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const subscription = await Subscription.findById(id)

    if (!subscription) {
      return { success: false, error: "Subscription not found" }
    }

    subscription.isActive = !subscription.isActive
    subscription.updatedAt = new Date()
    await subscription.save()

    revalidatePath("/dashboard/admin/subscriptions")

    return { success: true, subscription }
  } catch (error) {
    logger.error("Error toggling subscription status:", error)
    return { success: false, error: "Failed to toggle subscription status" }
  }
}

// קבלת כל הטיפולים (לשימוש בטופס המנוי)
export async function getAllTreatments() {
  try {
    await dbConnect()

    const treatments = await Treatment.find({ isActive: true })
      .select("_id name price category duration")
      .sort({ name: 1 })
      .lean()

    // Serialize the treatments to plain objects
    const serializedTreatments = treatments.map((treatment) => ({
      ...treatment,
      _id: treatment._id.toString(),
    }))

    return { success: true, treatments: serializedTreatments }
  } catch (error) {
    logger.error("Error fetching treatments:", error)
    return { success: false, error: "Failed to fetch treatments" }
  }
}

// קבלת רשימת מנויים פעילים (לשימוש בדף רכישת מנויים)
export async function getActiveSubscriptions() {
  try {
    await dbConnect()

    const subscriptions = await Subscription.find({ isActive: true }).sort({ createdAt: -1 }).lean()

    // Serialize the subscriptions to plain objects
    const serializedSubscriptions = subscriptions.map((sub) => ({
      ...sub,
      _id: sub._id.toString(),
    }))

    return { success: true, subscriptions: serializedSubscriptions }
  } catch (error) {
    logger.error("Error fetching active subscriptions:", error)
    return { success: false, error: "Failed to fetch active subscriptions" }
  }
}

export async function getActiveSubscriptionsForPurchase() {
  try {
    await dbConnect()

    const subscriptions = await Subscription.find({ isActive: true })
      .select("_id name description quantity bonusQuantity validityMonths")
      .sort({ createdAt: -1 })
      .lean()

    // Serialize the subscriptions to plain objects
    const serializedSubscriptions = subscriptions.map((sub) => ({
      ...sub,
      _id: sub._id.toString(),
    }))

    return { success: true, subscriptions: serializedSubscriptions }
  } catch (error) {
    logger.error("Error fetching active subscriptions for purchase:", error)
    return { success: false, error: "Failed to fetch active subscriptions" }
  }
}

export async function getSubscriptionsForSelection() {
  try {
    await dbConnect()

    const subscriptions = await Subscription.find({ isActive: true })
      .select("_id name description quantity bonusQuantity validityMonths")
      .sort({ createdAt: -1 })
      .lean()

    // Serialize the subscriptions to plain objects
    const serializedSubscriptions = subscriptions.map((sub) => ({
      ...sub,
      _id: sub._id.toString(),
    }))

    return { success: true, subscriptions: serializedSubscriptions }
  } catch (error) {
    logger.error("Error fetching subscriptions for selection:", error)
    return { success: false, error: "Failed to fetch subscriptions" }
  }
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
      paymentMethodFound: !!paymentMethod,
      paymentMethodOwnership: paymentMethod?.userId.toString() === sessionData.user.id
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
        userId: sessionData.user.id,
        paymentMethodOwner: paymentMethod?.userId.toString()
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
          treatmentId,
          availableDurations: treatment.durations?.map(d => d._id.toString()) 
        })
        return { success: false, error: "Selected duration not found or inactive" }
      }
      singleSessionPrice = duration.price
    }

    if (singleSessionPrice === undefined || singleSessionPrice < 0) {
      logger.error(`[${requestId}] Invalid price calculated for treatment`, { 
        treatmentId, 
        singleSessionPrice,
        treatmentPricingType: treatment.pricingType
      })
      return { success: false, error: "Invalid treatment price" }
    }

    const totalPaymentAmount = subscription.quantity * singleSessionPrice
    const priceCalcTime = Date.now() - priceCalcStart
    
    logger.info(`[${requestId}] Price calculation completed`, {
      priceCalcTime: `${priceCalcTime}ms`,
      singleSessionPrice,
      subscriptionQuantity: subscription.quantity,
      totalPaymentAmount
    })

    // Create subscription purchase
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
      userSubscriptionId: newUserSubscription._id,
      totalQuantity: newUserSubscription.totalQuantity,
      expiryDate
    })

    // --- Send purchase success notification ---
    try {
      const notificationStart = Date.now()
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
        
        const notificationTime = Date.now() - notificationStart
        logger.info(`[${requestId}] Notifications sent successfully`, {
          notificationTime: `${notificationTime}ms`,
          emailSent: methods.includes("email") && !!user.email,
          smsSent: methods.includes("sms") && !!user.phone
        })
      } else {
        logger.warn(`[${requestId}] User not found for notification after subscription purchase`, { 
          userId: sessionData.user.id 
        })
      }
    } catch (notificationError) {
      logger.error(`[${requestId}] Failed to send purchase success notification for subscription`, {
        userId: sessionData.user.id,
        subscriptionId: newUserSubscription._id.toString(),
        error: notificationError instanceof Error ? notificationError.message : String(notificationError),
      })
    }
    // --- End notification sending ---

    revalidatePath("/dashboard/member/subscriptions")
    revalidatePath("/dashboard/admin/user-subscriptions")

    const totalTime = Date.now() - startTime
    logger.info(`[${requestId}] Subscription purchase completed successfully`, {
      totalTime: `${totalTime}ms`,
      phases: {
        dbConnect: `${dbConnectTime}ms`,
        dataLoad: `${dataLoadTime}ms`,
        priceCalc: `${priceCalcTime}ms`,
        save: `${saveTime}ms`
      },
      userSubscriptionId: newUserSubscription._id
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
