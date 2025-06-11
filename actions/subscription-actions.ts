"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import Subscription from "@/lib/db/models/subscription"
import Treatment from "@/lib/db/models/treatment"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"
import { z } from "zod"

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
