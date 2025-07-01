import { BookingStatus } from '@/lib/db/models/booking';
"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import UserSubscription from "@/lib/db/models/user-subscription"
import Subscription from "@/lib/db/models/subscription"
import Treatment, { type ITreatment } from "@/lib/db/models/treatment"
import PaymentMethod from "@/lib/db/models/payment-method"
import User from "@/lib/db/models/user"
import SubscriptionPurchase from "@/lib/db/models/subscription-purchase"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"
import mongoose from "mongoose"
import { unifiedNotificationService } from "@/lib/notifications/unified-notification-service"
import type { EmailRecipient, PhoneRecipient } from "@/lib/notifications/notification-types"

// Helper function to generate unique subscription code
async function generateUniqueSubscriptionCode(): Promise<string> {
  await dbConnect()
  for (let attempt = 0; attempt < 5; attempt++) {
    // Generate SB + 6 random alphanumeric characters
    const code =
      "SB" +
      Array.from({ length: 6 }, () => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        return chars.charAt(Math.floor(Math.random() * chars.length))
      }).join("")

    const exists = await UserSubscription.exists({ code })
    if (!exists) return code
  }
  throw new Error("Failed to generate unique subscription code")
}

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; firstRequest: number }>()

// Rate limiting function
function checkRateLimit(
  identifier: string,
  maxRequests = 5,
  windowMs = 60000
): { allowed: boolean; remainingTime?: number } {
  const now = Date.now()
  const key = identifier
  const record = rateLimitStore.get(key)

  if (!record) {
    rateLimitStore.set(key, { count: 1, firstRequest: now })
    return { allowed: true }
  }

  const timeElapsed = now - record.firstRequest

  if (timeElapsed > windowMs) {
    // Reset window
    rateLimitStore.set(key, { count: 1, firstRequest: now })
    return { allowed: true }
  }

  if (record.count >= maxRequests) {
    const remainingTime = windowMs - timeElapsed
    return { allowed: false, remainingTime }
  }

  record.count++
  return { allowed: true }
}

// Enhanced input validation
function validateGuestInfo(guestInfo: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!guestInfo || typeof guestInfo !== "object") {
    errors.push("Guest info is required")
    return { valid: false, errors }
  }

  // Name validation
  if (!guestInfo.name || typeof guestInfo.name !== "string") {
    errors.push("Name is required")
  } else if (guestInfo.name.trim().length < 2) {
    errors.push("Name must be at least 2 characters")
  } else if (guestInfo.name.length > 100) {
    errors.push("Name must be less than 100 characters")
  } else if (!/^[a-zA-Z\u0590-\u05FF\s'-]+$/.test(guestInfo.name)) {
    errors.push("Name contains invalid characters")
  }

  // Email validation (optional now)
  if (guestInfo.email && typeof guestInfo.email === "string") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(guestInfo.email)) {
      errors.push("Invalid email format")
    } else if (guestInfo.email.length > 254) {
      errors.push("Email is too long")
    }
  }

  // Phone validation
  if (!guestInfo.phone || typeof guestInfo.phone !== "string") {
    errors.push("Phone is required")
  } else {
    // Use centralized phone validation
    const { validatePhoneNumber } = require("@/lib/phone-utils")
    if (!validatePhoneNumber(guestInfo.phone)) {
      errors.push("Invalid phone number format")
    }
  }

  return { valid: errors.length === 0, errors }
}

// Sanitize input to prevent injection
function sanitizeInput(input: string): string {
  if (typeof input !== "string") return ""
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .substring(0, 1000) // Limit length
}

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

  let sessionData
  try {
    logger.info(`[${requestId}] Starting subscription purchase`, {
      subscriptionId,
      treatmentId,
      hasSelectedDuration: !!selectedDurationId,
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
      userId: sessionData.user.id,
    })

    // Load all required data in parallel
    const dataLoadStart = Date.now()
    const [subscriptionResult, treatmentResult, paymentMethodResult] = await Promise.allSettled([
      Subscription.findById(subscriptionId),
      Treatment.findById(treatmentId).lean(),
      PaymentMethod.findById(paymentMethodId),
    ])
    const dataLoadTime = Date.now() - dataLoadStart

    // Check for failed data loads
    if (
      subscriptionResult.status === "rejected" ||
      treatmentResult.status === "rejected" ||
      paymentMethodResult.status === "rejected"
    ) {
      logger.error(`[${requestId}] Failed to load required data`, {
        dataLoadTime: `${dataLoadTime}ms`,
        subscriptionError:
          subscriptionResult.status === "rejected" ? subscriptionResult.reason : null,
        treatmentError: treatmentResult.status === "rejected" ? treatmentResult.reason : null,
        paymentMethodError:
          paymentMethodResult.status === "rejected" ? paymentMethodResult.reason : null,
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
    })

    if (!subscription || !subscription.isActive) {
      logger.warn(`[${requestId}] Subscription not found or inactive`, { subscriptionId })
      return { success: false, error: "Subscription not found or inactive" }
    }

    if (!treatment || !treatment.isActive) {
      logger.warn(`[${requestId}] Treatment not found or inactive`, { treatmentId })
      return { success: false, error: "Treatment not found or inactive" }
    }

    if (!paymentMethod || paymentMethod.userId.toString?.() || '' !== sessionData.user.id) {
      logger.warn(`[${requestId}] Payment method not found or not owned by user`, {
        paymentMethodId,
        userId: sessionData.user.id,
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
        logger.warn(`[${requestId}] Duration ID not provided for duration-based treatment`, {
          treatmentId,
        })
        return { success: false, error: "Duration must be selected for this treatment" }
      }
      const duration = treatment.durations?.find(d => d._id.toString?.() || '' === selectedDurationId)
      if (!duration || !duration.isActive) {
        logger.warn(`[${requestId}] Selected duration not found or inactive`, {
          selectedDurationId,
          treatmentId,
        })
        return { success: false, error: "Selected duration not found or inactive" }
      }
      singleSessionPrice = duration.price
    }

    if (singleSessionPrice === undefined || singleSessionPrice < 0) {
      logger.error(`[${requestId}] Invalid price calculated for treatment`, {
        treatmentId,
        singleSessionPrice,
      })
      return { success: false, error: "Invalid treatment price" }
    }

    const totalPaymentAmount = subscription.quantity * singleSessionPrice
    const priceCalcTime = Date.now() - priceCalcStart

    logger.info(`[${requestId}] Price calculation completed`, {
      priceCalcTime: `${priceCalcTime}ms`,
      singleSessionPrice,
      totalPaymentAmount,
    })

    const purchaseDate = new Date()
    const expiryDate = new Date(purchaseDate)
    expiryDate.setMonth(expiryDate.getMonth() + subscription.validityMonths)

    const saveStart = Date.now()
    const code = await generateUniqueSubscriptionCode()
    const newUserSubscription = new UserSubscription({
      code,
      userId: sessionData.user.id,
      subscriptionId: subscription._id,
      treatmentId: treatment._id,
      selectedDurationId:
        treatment.pricingType === "duration_based" &&
        selectedDurationId &&
        mongoose.Types.ObjectId.isValid(selectedDurationId)
          ? new mongoose.Types.ObjectId(selectedDurationId)
          : undefined,
      purchaseDate,
      expiryDate,
      totalQuantity: subscription.quantity + subscription.bonusQuantity,
      remainingQuantity: subscription.quantity + subscription.bonusQuantity,
      status: "pending_payment", // Wait for payment confirmation
      paymentMethodId: paymentMethod._id,
      paymentAmount: totalPaymentAmount,
      pricePerSession: singleSessionPrice,
    })

    await newUserSubscription.save()
    const saveTime = Date.now() - saveStart

    logger.info(`[${requestId}] User subscription created successfully`, {
      saveTime: `${saveTime}ms`,
      userSubscriptionId: newUserSubscription._id,
    })

    try {
      const purchaser = await User.findById(sessionData.user.id)
        .select("name email phone notificationPreferences")
        .lean()
      if (purchaser) {
        const lang = purchaser.notificationPreferences?.language || "he"
        const methods = purchaser.notificationPreferences?.methods || ["sms", "email"]
        const appBaseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
        const summaryLink = `${appBaseUrl}/dashboard/member/purchase-history`
        const messageHe = `תודה על רכישתך! קוד המנוי שלך: ${newUserSubscription.code}\nלהזמנת טיפול עם המנוי הזן את הקוד.`
        const messageEn = `Thank you for your purchase! Your subscription code: ${newUserSubscription.code}\nUse this code to book treatments.`
        const data = {
          type: "purchase-success" as const,
          message: lang === "he" ? messageHe : messageEn,
        }
        const recipients = []
        if (methods.includes("email") && purchaser.email) {
          recipients.push({
            type: "email" as const,
            value: purchaser.email,
            name: purchaser.name,
            language: lang as any,
          })
        }
        if (methods.includes("sms") && purchaser.phone) {
          recipients.push({ type: "phone" as const, value: purchaser.phone, language: lang as any })
        }

        if (recipients.length > 0) {
          await unifiedNotificationService.sendPurchaseSuccess(recipients, data.message)
        }
      }
    } catch (notificationError) {
      logger.error("Failed to send subscription purchase notification", {
        error: notificationError,
      })
    }

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
        save: `${saveTime}ms`,
      },
    })

    return { success: true, userSubscription: newUserSubscription.toObject() } // Return plain object
  } catch (error) {
    const totalTime = Date.now() - startTime
    logger.error(`[${requestId}] Error purchasing subscription`, {
      totalTime: `${totalTime}ms`,
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack?.split("\n").slice(0, 5),
            }
          : String(error),
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
            (d: any) =>
              d._id.toString?.() || '' === (sub.selectedDurationId as mongoose.Types.ObjectId).toString?.() || ''
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
  } = {}
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

    // Add search functionality for guest purchases
    if (options.search) {
      const searchRegex = new RegExp(options.search, "i")
      query.$or = [
        { "guestInfo.name": searchRegex },
        { "guestInfo.email": searchRegex },
        { "guestInfo.phone": searchRegex },
      ]
    }

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
      // Handle duration details for duration-based treatments
      if (
        sub.treatmentId &&
        (sub.treatmentId as ITreatment).pricingType === "duration_based" &&
        sub.selectedDurationId
      ) {
        const treatmentDoc = sub.treatmentId as ITreatment
        if (treatmentDoc.durations) {
          const selectedDuration = treatmentDoc.durations.find(
            (d: any) =>
              d._id.toString?.() || '' === (sub.selectedDurationId as mongoose.Types.ObjectId).toString?.() || ''
          )
          return { ...sub, selectedDurationDetails: selectedDuration }
        }
      }
      return sub
    })

    const total = await UserSubscription.countDocuments(query)
    const totalPages = Math.ceil(total / limit)

    return {
      success: true,
      userSubscriptions: populatedUserSubscriptions,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    }
  } catch (error) {
    logger.error("Error fetching all user subscriptions:", {
      error: error instanceof Error ? error.message : String(error),
      options,
    })
    return {
      success: false,
      error: "Failed to fetch user subscriptions",
      userSubscriptions: [],
      pagination: undefined,
    }
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

    if (
      userSubscription.userId &&
      userSubscription.userId.toString?.() || '' !== sessionData.user.id &&
      !sessionData.user.roles.includes("admin")
    ) {
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

    if (
      userSubscription.userId &&
      userSubscription.userId.toString?.() || '' !== sessionData.user.id &&
      !sessionData.user.roles.includes("admin")
    ) {
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

// Add initiate function for guest subscription purchases
export async function initiateGuestSubscriptionPurchase(data: {
  subscriptionId: string
  treatmentId: string
  selectedDurationId?: string
  guestInfo: {
    name: string
    email?: string
    phone: string
  }
}): Promise<{ success: boolean; userSubscriptionId?: string; amount?: number; error?: string }> {
  const requestId = `guest_sub_init_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`

  try {
    logger.info(`[${requestId}] Starting guest subscription purchase initiation`, {
      subscriptionId: data.subscriptionId,
      treatmentId: data.treatmentId,
      hasSelectedDuration: !!data.selectedDurationId,
      guestEmail: data.guestInfo.email,
    })

    await dbConnect()

    const { subscriptionId, treatmentId, selectedDurationId, guestInfo } = data

    // Validate guest info
    if (!guestInfo || !guestInfo.name || !guestInfo.phone) {
      return { success: false, error: "Guest information (name, phone) is required." }
    }

    // Validate email format if provided
    if (guestInfo.email && guestInfo.email.trim() !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(guestInfo.email)) {
        return {
          success: false,
          error: "Valid email address format is required when email is provided.",
        }
      }
    }

    // Validate phone format
    if (guestInfo.phone.trim().length < 10) {
      return { success: false, error: "Valid phone number is required." }
    }

    // Load subscription and treatment
    const subscription = (await Subscription.findById(subscriptionId).lean()) as any
    if (!subscription || !subscription.isActive) {
      return { success: false, error: "Subscription not found or inactive" }
    }

    const treatment = (await Treatment.findById(treatmentId).lean()) as ITreatment | null
    if (!treatment || !treatment.isActive) {
      return { success: false, error: "Treatment not found or inactive" }
    }

    // Calculate pricing
    let treatmentPrice = 0
    if (treatment.pricingType === "fixed") {
      treatmentPrice = treatment.fixedPrice || 0
    } else if (treatment.pricingType === "duration_based" && selectedDurationId) {
      const selectedDuration = treatment.durations?.find(
        (d: any) => d._id.toString?.() || '' === selectedDurationId
      )
      if (!selectedDuration) {
        return { success: false, error: "Selected duration not found" }
      }
      treatmentPrice = selectedDuration.price || 0
    }

    const totalPrice = subscription.price
    const totalPaymentAmount =
      treatmentPrice > 0 ? subscription.quantity * treatmentPrice : totalPrice

    // Find or create user by phone
    const { findOrCreateUserByPhone } = await import("@/actions/auth-actions")
    const userResult = await findOrCreateUserByPhone(guestInfo.phone, {
      name: guestInfo.name,
      email: guestInfo.email,
    })

    if (!userResult.success) {
      return { success: false, error: "Failed to create or find user" }
    }

    // Generate unique code and calculate dates
    const code = await generateUniqueSubscriptionCode()
    const purchaseDate = new Date()
    const expiryDate = new Date(purchaseDate)
    expiryDate.setMonth(expiryDate.getMonth() + subscription.validityMonths)

    // Create subscription with pending_payment status
    const newUserSubscription = new UserSubscription({
      code,
      userId: new mongoose.Types.ObjectId(userResult.userId),
      subscriptionId: new mongoose.Types.ObjectId(subscriptionId),
      treatmentId: new mongoose.Types.ObjectId(treatmentId),
      selectedDurationId: selectedDurationId
        ? new mongoose.Types.ObjectId(selectedDurationId)
        : undefined,
      purchaseDate,
      expiryDate,
      remainingQuantity: subscription.quantity + (subscription.bonusQuantity || 0),
      totalQuantity: subscription.quantity + (subscription.bonusQuantity || 0),
      status: "pending_payment", // Start with pending payment
      paymentAmount: totalPaymentAmount,
      pricePerSession: treatmentPrice,
      guestInfo: {
        name: guestInfo.name,
        email: guestInfo.email,
        phone: guestInfo.phone,
      },
      // Payment will be set when confirmed
    })

    await newUserSubscription.save()

    logger.info(`[${requestId}] Successfully initiated guest subscription purchase`, {
      userSubscriptionId: newUserSubscription._id,
      userId: userResult.userId,
      totalPrice,
      guestEmail: guestInfo.email,
    })

    return {
      success: true,
      userSubscriptionId: (newUserSubscription._id as any).toString?.() || '',
      amount: totalPaymentAmount,
    }
  } catch (error) {
    logger.error(`[${requestId}] Error initiating guest subscription purchase`, {
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack?.split("\n").slice(0, 5),
            }
          : String(error),
      subscriptionId: data.subscriptionId,
      treatmentId: data.treatmentId,
      guestEmail: data.guestInfo.email,
    })

    return { success: false, error: "Failed to initiate subscription purchase. Please try again." }
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
    email?: string
    phone: string
  }
}) {
  const requestId = `guest_sub_purchase_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
  const startTime = Date.now()

  try {
    // Rate limiting check
    const rateLimitKey = guestInfo.email + ":subscription_purchase"
    const rateLimit = checkRateLimit(rateLimitKey, 3, 300000) // 3 attempts per 5 minutes

    if (!rateLimit.allowed) {
      logger.warn(`Rate limit exceeded for guest subscription purchase`, {
        email: guestInfo.email,
        remainingTime: rateLimit.remainingTime,
      })
      return {
        success: false,
        error: `Too many purchase attempts. Please try again in ${Math.ceil((rateLimit.remainingTime || 0) / 60000)} minutes.`,
      }
    }

    // Enhanced input validation
    const guestValidation = validateGuestInfo(guestInfo)
    if (!guestValidation.valid) {
      logger.warn(`Invalid guest info for subscription purchase`, {
        errors: guestValidation.errors,
        email: guestInfo.email,
      })
      return { success: false, error: `Invalid input: ${guestValidation.errors.join(", ")}` }
    }

    // Sanitize inputs
    const sanitizedGuestInfo = {
      name: sanitizeInput(guestInfo.name),
      email: guestInfo.email ? sanitizeInput(guestInfo.email).toLowerCase() : undefined,
      phone: sanitizeInput(guestInfo.phone),
    }

    // Validate IDs format
    if (!mongoose.Types.ObjectId.isValid(subscriptionId)) {
      return { success: false, error: "Invalid subscription ID format" }
    }
    if (!mongoose.Types.ObjectId.isValid(treatmentId)) {
      return { success: false, error: "Invalid treatment ID format" }
    }
    if (selectedDurationId && !mongoose.Types.ObjectId.isValid(selectedDurationId)) {
      return { success: false, error: "Invalid duration ID format" }
    }

    logger.info(`[${requestId}] Starting guest subscription purchase`, {
      subscriptionId,
      treatmentId,
      hasSelectedDuration: !!selectedDurationId,
      guestEmail: sanitizedGuestInfo.email,
    })

    const dbConnectStart = Date.now()
    await dbConnect()
    const dbConnectTime = Date.now() - dbConnectStart

    logger.info(`[${requestId}] Database connected`, {
      dbConnectTime: `${dbConnectTime}ms`,
      guestEmail: guestInfo.email,
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
        subscriptionError:
          subscriptionResult.status === "rejected" ? subscriptionResult.reason : null,
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
        logger.warn(`[${requestId}] Duration ID not provided for duration-based treatment`, {
          treatmentId,
        })
        return { success: false, error: "Duration must be selected for this treatment" }
      }
      const duration = treatment.durations?.find(d => d._id.toString?.() || '' === selectedDurationId)
      if (!duration || !duration.isActive) {
        logger.warn(`[${requestId}] Selected duration not found or inactive`, {
          selectedDurationId,
          treatmentId,
        })
        return { success: false, error: "Selected duration not found or inactive" }
      }
      singleSessionPrice = duration.price
    }

    if (singleSessionPrice === undefined || singleSessionPrice < 0) {
      logger.error(`[${requestId}] Invalid price calculated for treatment`, {
        treatmentId,
        singleSessionPrice,
      })
      return { success: false, error: "Invalid treatment price" }
    }

    const totalPaymentAmount = subscription.quantity * singleSessionPrice
    const priceCalcTime = Date.now() - priceCalcStart

    logger.info(`[${requestId}] Price calculation completed`, {
      priceCalcTime: `${priceCalcTime}ms`,
      singleSessionPrice,
      totalPaymentAmount,
    })

    const purchaseDate = new Date()
    const expiryDate = new Date(purchaseDate)
    expiryDate.setMonth(expiryDate.getMonth() + subscription.validityMonths)

    // Find or create user by phone
    const { findOrCreateUserByPhone } = await import("@/actions/auth-actions")
    const userResult = await findOrCreateUserByPhone(sanitizedGuestInfo.phone, {
      name: sanitizedGuestInfo.name,
      email: sanitizedGuestInfo.email,
    })

    if (!userResult.success || !userResult.userId) {
      logger.error(`[${requestId}] Failed to find or create user`, { error: userResult.error })
      return { success: false, error: userResult.error || "Failed to create user" }
    }

    const userId = userResult.userId
    logger.info(`[${requestId}] User ${userResult.isNewUser ? "created" : "found"}`, {
      userId,
      userType: userResult.userType,
    })

    const saveStart = Date.now()
    const code = await generateUniqueSubscriptionCode()
    // Create UserSubscription with pending_payment status - waiting for payment confirmation
    const newUserSubscription = new UserSubscription({
      code,
      userId: new mongoose.Types.ObjectId(userId),
      subscriptionId: subscription._id,
      treatmentId: treatment._id,
      selectedDurationId:
        treatment.pricingType === "duration_based" &&
        selectedDurationId &&
        mongoose.Types.ObjectId.isValid(selectedDurationId)
          ? new mongoose.Types.ObjectId(selectedDurationId)
          : undefined,
      purchaseDate,
      expiryDate,
      totalQuantity: subscription.quantity + subscription.bonusQuantity,
      remainingQuantity: subscription.quantity + subscription.bonusQuantity,
      status: "pending_payment", // Wait for payment confirmation
      paymentMethodId:
        paymentMethodId && mongoose.Types.ObjectId.isValid(paymentMethodId)
          ? new mongoose.Types.ObjectId(paymentMethodId)
          : undefined,
      paymentAmount: totalPaymentAmount,
      pricePerSession: singleSessionPrice,
      guestInfo: {
        name: sanitizedGuestInfo.name,
        email: sanitizedGuestInfo.email,
        phone: sanitizedGuestInfo.phone,
      },
    })

    await newUserSubscription.save()
    const saveTime = Date.now() - saveStart

    logger.info(`[${requestId}] Guest subscription created with pending payment status`, {
      saveTime: `${saveTime}ms`,
      userSubscriptionId: newUserSubscription._id,
      guestEmail: guestInfo.email,
      status: "pending_payment",
    })

    // DO NOT send notifications or mark as active until payment is confirmed

    revalidatePath("/dashboard/admin/user-subscriptions")

    const totalTime = Date.now() - startTime
    logger.info(`[${requestId}] Guest subscription purchase initiated successfully`, {
      totalTime: `${totalTime}ms`,
      userSubscriptionId: newUserSubscription._id,
      guestEmail: guestInfo.email,
      phases: {
        dbConnect: `${dbConnectTime}ms`,
        dataLoad: `${dataLoadTime}ms`,
        priceCalc: `${priceCalcTime}ms`,
        save: `${saveTime}ms`,
      },
    })

    return {
      success: true,
      userSubscription: newUserSubscription.toObject(),
      requiresPaymentConfirmation: true,
    }
  } catch (error) {
    const totalTime = Date.now() - startTime
    logger.error(`[${requestId}] Error purchasing guest subscription`, {
      totalTime: `${totalTime}ms`,
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack?.split("\n").slice(0, 5),
            }
          : String(error),
      subscriptionId,
      treatmentId,
      guestEmail: guestInfo.email,
    })
    return { success: false, error: "Failed to purchase subscription" }
  }
}

export async function saveAbandonedSubscriptionPurchase(
  userId: string,
  formData: {
    guestInfo?: any
    purchaseOptions?: any
    currentStep: number
  }
): Promise<{ success: boolean; purchaseId?: string; error?: string }> {
  try {
    await dbConnect()
    const existing = await SubscriptionPurchase.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      status: "abandoned_pending_payment",
    }).sort({ createdAt: -1 })

    if (existing) {
      existing.formState = {
        currentStep: formData.currentStep,
        guestInfo: formData.guestInfo,
        purchaseOptions: formData.purchaseOptions,
        savedAt: new Date(),
      }
      await existing.save()
      return { success: true, purchaseId: (existing._id as mongoose.Types.ObjectId).toString?.() || '' }
    }

    const purchase = new SubscriptionPurchase({
      userId: new mongoose.Types.ObjectId(userId),
      status: "abandoned_pending_payment",
      formState: {
        currentStep: formData.currentStep,
        guestInfo: formData.guestInfo,
        purchaseOptions: formData.purchaseOptions,
        savedAt: new Date(),
      },
    })
    await purchase.save()
    return { success: true, purchaseId: (purchase._id as mongoose.Types.ObjectId).toString?.() || '' }
  } catch (error) {
    return { success: false, error: "Failed to save abandoned subscription" }
  }
}

export async function getAbandonedSubscriptionPurchase(
  userId: string
): Promise<{ success: boolean; purchase?: any; error?: string }> {
  try {
    await dbConnect()
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const purchase = await SubscriptionPurchase.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      status: "abandoned_pending_payment",
      createdAt: { $gte: twentyFourHoursAgo },
    })
      .sort({ createdAt: -1 })
      .lean()

    if (!purchase) {
      return { success: false, error: "No recent abandoned purchase" }
    }
    return { success: true, purchase }
  } catch (error) {
    return { success: false, error: "Failed to get abandoned purchase" }
  }
}

export async function getUserSubscriptionById(id: string) {
  let sessionData
  try {
    sessionData = await getServerSession(authOptions)
    await dbConnect()
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid ID" }
    }
    const sub = await UserSubscription.findById(id)
      .populate("subscriptionId")
      .populate({ path: "treatmentId", model: "Treatment" })
      .lean()

    if (!sub) return { success: false, error: "Subscription not found" }

    const isGuest = !sub.userId
    const isOwner =
      sub.userId && sessionData?.user?.id && (sub.userId.toString?.() || '') === sessionData.user.id
    const isAdmin = !!(sessionData?.user?.roles?.includes("admin"))

    if (!isGuest && !isOwner && !isAdmin) {
      return { success: false, error: "Unauthorized" }
    }

    return { success: true, subscription: JSON.parse(JSON.stringify(sub)) }
  } catch (error) {
    logger.error("Failed to fetch user subscription", { error })
    return { success: false, error: "Failed to fetch subscription" }
  }
}

// Add confirmation function for guest subscription purchases
export async function confirmGuestSubscriptionPurchase(data: {
  subscriptionId: string
  paymentId: string
  success: boolean
  guestInfo: {
    name: string
    email?: string
    phone: string
  }
}): Promise<{ success: boolean; subscription?: any; error?: string }> {
  const requestId = `guest_sub_confirm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`

  try {
    if (!mongoose.Types.ObjectId.isValid(data.subscriptionId)) {
      return { success: false, error: "Invalid subscription ID format." }
    }

    await dbConnect()
    const { subscriptionId, paymentId, success: paymentSuccess, guestInfo } = data

    const userSubscription = await UserSubscription.findById(subscriptionId)
    if (!userSubscription) {
      return { success: false, error: "Subscription not found" }
    }

    if (userSubscription.status !== "pending_payment") {
      // If already active, it might be a duplicate callback
      if (userSubscription.status === "active") {
        logger.info(
          `[${requestId}] Guest subscription ${subscriptionId} already processed. Status: ${userSubscription.status}`
        )
        return { success: true, subscription: userSubscription.toObject() }
      }
      return {
        success: false,
        error:
          "Subscription not awaiting payment or already processed with a non-successful status.",
      }
    }

    if (paymentSuccess) {
      // Payment successful - activate subscription
      userSubscription.status = "active"
      userSubscription.paymentId = paymentId
      await userSubscription.save()

      logger.info(`[${requestId}] Guest subscription activated successfully`, {
        subscriptionId,
        code: userSubscription.code,
        guestEmail: guestInfo.email,
      })

      // Send success notifications
      try {
        const lang = "he"
        const message = `תודה על רכישתך! קוד המנוי שלך: ${userSubscription.code}\nלהזמנת טיפול עם המנוי הזן את הקוד בשלב בחירת הטיפול.`
        const recipients = []
        if (guestInfo.email) {
          recipients.push({
            type: "email" as const,
            value: guestInfo.email,
            name: guestInfo.name,
            language: lang as any,
          })
        }
        if (guestInfo.phone) {
          recipients.push({ type: "phone" as const, value: guestInfo.phone, language: lang as any })
        }

        if (recipients.length > 0) {
          await unifiedNotificationService.sendPurchaseSuccess(recipients, message)
        }
      } catch (notificationError) {
        logger.error(`[${requestId}] Failed to send guest subscription purchase notification`, {
          error: notificationError,
          subscriptionId,
        })
      }

      revalidatePath("/dashboard/admin/user-subscriptions")
      return {
        success: true,
        subscription: userSubscription.toObject(),
      }
    } else {
      // Payment failed - cancel subscription
      userSubscription.status = "cancelled"
      userSubscription.paymentId = paymentId
      await userSubscription.save()

      logger.info(`[${requestId}] Guest subscription cancelled due to payment failure`, {
        subscriptionId,
        guestEmail: guestInfo.email,
      })

      return { success: false, error: "Payment failed. Subscription not activated." }
    }
  } catch (error) {
    logger.error(`[${requestId}] Error confirming guest subscription purchase:`, {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      details: error,
      subscriptionId: data.subscriptionId,
    })
    return { success: false, error: "Failed to confirm purchase. Please contact support." }
  }
}

