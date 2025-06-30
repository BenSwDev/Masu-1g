"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import User from "@/lib/db/models/user"

export async function updateProfile(formData: FormData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, message: "notAuthenticated" }
    }

    await dbConnect()

    // Extract form data
    const name = formData.get("name") as string
    const gender = formData.get("gender") as string
    const day = formData.get("day") as string
    const month = formData.get("month") as string
    const year = formData.get("year") as string

    // Validate required fields
    if (!name) {
      return { success: false, message: "nameRequired" }
    }

    // Parse date of birth if all parts are provided
    let dateOfBirth: Date | undefined
    if (day && month && year) {
      dateOfBirth = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`)

      // Validate date
      if (isNaN(dateOfBirth.getTime())) {
        return { success: false, message: "invalidDate" }
      }
    }

    // Update user profile
    const updateData: any = {
      name: name.trim(),
    }

    if (gender) {
      updateData.gender = gender
    }

    if (dateOfBirth) {
      updateData.dateOfBirth = dateOfBirth
    }

    const updatedUser = await User.findByIdAndUpdate(session.user.id, updateData, { new: true })

    if (!updatedUser) {
      return { success: false, message: "userNotFound" }
    }

    return { success: true, message: "profileUpdated" }
  } catch (error) {
    console.error("Profile update error:", error)
    return { success: false, message: "updateFailed" }
  }
}

export async function getUserProfile() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, message: "notAuthenticated" }
    }

    await dbConnect()

    const user = (await User.findById(session.user.id).select("-password")) as {
      _id: { toString(): string }
      name: string
      email: string
      phone: string
      gender: string
      dateOfBirth: Date
      image: string
      createdAt: Date
    }

    if (!user) {
      return { success: false, message: "userNotFound" }
    }

    return {
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        image: user.image,
        createdAt: user.createdAt,
      },
    }
  } catch (error) {
    console.error("Get profile error:", error)
    return { success: false, message: "fetchFailed" }
  }
}
