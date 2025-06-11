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

export async function getUserProfile(userId?: string) {
  try {
    let userIdToUse = userId
    
    if (!userIdToUse) {
      const session = await getServerSession(authOptions)
      if (!session?.user?.id) {
        return { success: false, message: "notAuthenticated" }
      }
      userIdToUse = session.user.id
    }

    await dbConnect()

    const user = await User.findById(userIdToUse).select("-password").lean()

    if (!user) {
      return { success: false, message: "userNotFound" }
    }

    return {
      success: true,
      user: {
        _id: user._id.toString(),
        id: user._id.toString(),
        name: user.name,
        firstName: user.name?.split(' ')[0] || '',
        lastName: user.name?.split(' ').slice(1).join(' ') || '',
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        birthDate: user.dateOfBirth,
        image: user.image,
        createdAt: user.createdAt,
        isGuest: user.isGuest,
        guestSessionId: user.guestSessionId,
        parentUserId: user.parentUserId,
        address: user.address,
        notes: user.notes,
        roles: user.roles || [],
      },
    }
  } catch (error) {
    console.error("Get profile error:", error)
    return { success: false, message: "fetchFailed" }
  }
}
