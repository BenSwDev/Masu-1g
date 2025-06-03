"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import User, { type ITreatmentPreferences, type INotificationPreferences, type IUser } from "@/lib/db/models/user"
import { revalidatePath } from "next/cache"

const defaultTreatmentPreferences: ITreatmentPreferences = {
  therapistGender: "any",
}

const defaultNotificationPreferences: INotificationPreferences = {
  methods: ["email", "sms"],
  language: "he",
}

export async function getUserPreferences(): Promise<{
  success: boolean
  treatmentPreferences?: ITreatmentPreferences
  notificationPreferences?: INotificationPreferences
  message?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, message: "Not Authenticated" }
    }

    await dbConnect()
    const user = (await User.findById(session.user.id)
      .select("treatmentPreferences notificationPreferences")
      .lean()) as IUser | null

    if (!user) {
      return { success: false, message: "User not found" }
    }

    const treatmentPreferences = user.treatmentPreferences || defaultTreatmentPreferences
    const notificationPreferences = user.notificationPreferences || defaultNotificationPreferences

    // Ensure individual fields have defaults if the main object exists but fields are missing
    // This is more robust if schema defaults somehow didn't apply or for older documents
    const finalTreatmentPreferences: ITreatmentPreferences = {
      therapistGender: treatmentPreferences.therapistGender ?? defaultTreatmentPreferences.therapistGender,
    }

    const finalNotificationPreferences: INotificationPreferences = {
      methods:
        notificationPreferences.methods && notificationPreferences.methods.length > 0
          ? notificationPreferences.methods
          : defaultNotificationPreferences.methods,
      language: notificationPreferences.language ?? defaultNotificationPreferences.language,
    }

    return {
      success: true,
      treatmentPreferences: finalTreatmentPreferences,
      notificationPreferences: finalNotificationPreferences,
    }
  } catch (error) {
    console.error("Error fetching user preferences:", error)
    return { success: false, message: "Failed to fetch preferences" }
  }
}

export async function updateTreatmentPreferences(
  preferences: Partial<ITreatmentPreferences>,
): Promise<{ success: boolean; message: string; treatmentPreferences?: ITreatmentPreferences }> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, message: "Not Authenticated" }
    }

    if (!preferences.therapistGender || !["male", "female", "any"].includes(preferences.therapistGender)) {
      return { success: false, message: "Invalid therapist gender preference" }
    }

    await dbConnect()
    const updatedUser = (await User.findByIdAndUpdate(
      session.user.id,
      { $set: { "treatmentPreferences.therapistGender": preferences.therapistGender } },
      { new: true, runValidators: true, upsert: true },
    ).select("treatmentPreferences")) as IUser | null

    if (!updatedUser) {
      return { success: false, message: "User not found or update failed" }
    }

    revalidatePath("/dashboard", "layout") // Revalidate relevant paths

    return {
      success: true,
      message: "Treatment preferences updated successfully",
      treatmentPreferences: updatedUser.treatmentPreferences || defaultTreatmentPreferences,
    }
  } catch (error) {
    console.error("Error updating treatment preferences:", error)
    return { success: false, message: "Failed to update treatment preferences" }
  }
}

export async function updateNotificationPreferences(
  preferences: Partial<INotificationPreferences>,
): Promise<{ success: boolean; message: string; notificationPreferences?: INotificationPreferences }> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, message: "Not Authenticated" }
    }

    if (!preferences.methods || preferences.methods.length === 0) {
      return { success: false, message: "At least one notification method is required" }
    }
    if (!preferences.methods.every((method) => ["email", "sms"].includes(method))) {
      return { success: false, message: "Invalid notification method(s)" }
    }
    if (!preferences.language || !["he", "en", "ru"].includes(preferences.language)) {
      return { success: false, message: "Invalid notification language" }
    }

    await dbConnect()
    const updatedUser = (await User.findByIdAndUpdate(
      session.user.id,
      {
        $set: {
          "notificationPreferences.methods": preferences.methods,
          "notificationPreferences.language": preferences.language,
        },
      },
      { new: true, runValidators: true, upsert: true },
    ).select("notificationPreferences")) as IUser | null

    if (!updatedUser) {
      return { success: false, message: "User not found or update failed" }
    }

    revalidatePath("/dashboard", "layout") // Revalidate relevant paths

    return {
      success: true,
      message: "Notification preferences updated successfully",
      notificationPreferences: updatedUser.notificationPreferences || defaultNotificationPreferences,
    }
  } catch (error) {
    console.error("Error updating notification preferences:", error)
    return { success: false, message: "Failed to update notification preferences" }
  }
}
