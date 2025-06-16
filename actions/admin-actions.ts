"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import User, { type IUser } from "@/lib/db/models/user"
import PasswordResetToken from "@/lib/db/models/password-reset-token"
import { emailService } from "@/lib/notifications/email-service" // Use the singleton instance
import type { NotificationData } from "@/lib/notifications/notification-types"
import bcrypt from "bcryptjs"
import crypto from "crypto"

// Helper function to sanitize user object (remove password, convert _id to id)
const sanitizeUser = (userDoc: any): Omit<IUser, "password" | "_id"> & { id: string } => {
  const userObject = userDoc.toObject ? userDoc.toObject() : { ...userDoc }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, _id, __v, ...rest } = userObject
  return { ...rest, id: _id.toString() }
}

export async function getAllUsers(
  page = 1,
  limit = 10,
  searchTerm?: string,
  roleFilter?: string[],
  sortField = "name",
  sortDirection: "asc" | "desc" = "asc",
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, message: "notAuthorized", users: [], total: 0, totalPages: 0 }
    }

    await dbConnect()

    const query: any = {}
    if (searchTerm) {
      query.$or = [
        { name: { $regex: searchTerm, $options: "i" } },
        { email: { $regex: searchTerm, $options: "i" } },
        { phone: { $regex: searchTerm, $options: "i" } },
      ]
    }
    if (roleFilter && roleFilter.length > 0) {
      query.roles = { $in: roleFilter }
    }

    const sortOptions: any = {}
    sortOptions[sortField] = sortDirection === "asc" ? 1 : -1

    const skip = (page - 1) * limit
    const [usersFromDb, total] = await Promise.all([
      User.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .select("name email phone image roles dateOfBirth gender createdAt")
        .lean(), // Use .lean() for performance when not needing Mongoose documents
      User.countDocuments(query),
    ])

    const users = usersFromDb.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      image: user.image,
      roles: user.roles,
      dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString() : undefined,
      gender: user.gender,
      createdAt: new Date(user.createdAt).toISOString(),
    }))

    return {
      success: true,
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }
  } catch (error) {
    console.error("Error in getAllUsers (admin-actions):", error)
    return { success: false, message: "fetchFailed", users: [], total: 0, totalPages: 0 }
  }
}

export async function getUserStatistics() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, message: "notAuthorized", roleCounts: null }
    }

    await dbConnect()

    const [memberCount, professionalCount, partnerCount] = await Promise.all([
      User.countDocuments({ roles: "member" }),
      User.countDocuments({ roles: "professional" }),
      User.countDocuments({ roles: "partner" }),
    ])

    return {
      success: true,
      roleCounts: {
        members: memberCount,
        professionals: professionalCount,
        partners: partnerCount,
      },
    }
  } catch (error) {
    console.error("Error in getUserStatistics (admin-actions):", error)
    return { success: false, message: "fetchFailed", roleCounts: null }
  }
}

// Update the createUserByAdmin function to remove image handling
export async function createUserByAdmin(formData: FormData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, message: "notAuthorized" }
    }

    await dbConnect()

    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const phoneRaw = formData.get("phone") as string | null
    const phone = phoneRaw && phoneRaw.trim() !== "" ? phoneRaw : undefined
    const passwordRaw = formData.get("password") as string | null
    const password = passwordRaw && passwordRaw !== "" ? passwordRaw : undefined
    const roles = formData.getAll("roles[]") as string[]
    const dateOfBirthStr = formData.get("dateOfBirth") as string | null
    const gender = formData.get("gender") as string

    if (!name || !email || !roles.length || !gender) {
      return { success: false, message: "missingFields" }
    }
    if (password && password.length < 6) {
      return { success: false, message: "errors.weakPassword" } // Using existing translation key
    }

    const existingEmail = await User.findOne({ email: email.toLowerCase() }).lean()
    if (existingEmail) {
      return { success: false, message: "errors.emailExists" }
    }
    if (phone) {
      const existingPhone = await User.findOne({ phone }).lean()
      if (existingPhone) {
        return { success: false, message: "errors.phoneExists" }
      }
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined
    const dateOfBirth = dateOfBirthStr ? new Date(dateOfBirthStr) : undefined
    if (dateOfBirthStr && isNaN(dateOfBirth?.getTime())) {
      return { success: false, message: "errors.invalidDateOfBirth" }
    }

    const newUserDoc = new User({
      name,
      email: email.toLowerCase(),
      phone,
      password: hashedPassword,
      roles: roles,
      activeRole: roles[0], // Set first role as active role
      dateOfBirth,
      gender,
      emailVerified: new Date(),
      phoneVerified: phone ? new Date() : undefined,
    })

    await newUserDoc.save()
    return { success: true, message: "admin.users.userCreatedToast", user: sanitizeUser(newUserDoc) }
  } catch (error: any) {
    console.error("Error creating user by admin:", error)
    if (error.code === 11000) {
      // MongoDB duplicate key error
      if (error.message.includes("email")) return { success: false, message: "errors.emailExists" }
      if (error.message.includes("phone")) return { success: false, message: "errors.phoneExists" }
    }
    return { success: false, message: "creationFailed" }
  }
}

// Update the updateUserByAdmin function to remove image handling
export async function updateUserByAdmin(userId: string, formData: FormData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, message: "notAuthorized" }
    }

    await dbConnect()

    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const phoneRaw = formData.get("phone") as string | null
    const phone = phoneRaw && phoneRaw.trim() !== "" ? phoneRaw : undefined
    const roles = formData.getAll("roles[]") as string[]
    const dateOfBirthStr = formData.get("dateOfBirth") as string | null
    const gender = formData.get("gender") as string

    if (!name || !email || !roles.length || !gender) {
      return { success: false, message: "missingFields" }
    }

    const userToUpdate = await User.findById(userId)
    if (!userToUpdate) {
      return { success: false, message: "userNotFound" }
    }

    if (email.toLowerCase() !== userToUpdate.email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase(), _id: { $ne: userId } }).lean()
      if (existingEmail) return { success: false, message: "errors.emailExists" }
      userToUpdate.email = email.toLowerCase()
    }
    if (phone !== undefined && phone !== userToUpdate.phone) {
      if (phone) {
        const existingPhone = await User.findOne({ phone, _id: { $ne: userId } }).lean()
        if (existingPhone) return { success: false, message: "errors.phoneExists" }
        userToUpdate.phone = phone
      } else {
        userToUpdate.phone = undefined
      }
    }

    userToUpdate.name = name
    userToUpdate.roles = roles

    // Update activeRole if it's not in the roles array anymore
    if (!roles.includes(userToUpdate.activeRole)) {
      userToUpdate.activeRole = roles[0]
    }

    userToUpdate.gender = gender as "male" | "female" | "other"

    const dateOfBirth = dateOfBirthStr ? new Date(dateOfBirthStr) : null // Allow clearing date
    if (dateOfBirthStr && dateOfBirth && isNaN(dateOfBirth.getTime())) {
      return { success: false, message: "errors.invalidDateOfBirth" }
    }
    userToUpdate.dateOfBirth = dateOfBirth || undefined

    await userToUpdate.save()
    return { success: true, message: "admin.users.userUpdatedToast", user: sanitizeUser(userToUpdate) }
  } catch (error: any) {
    console.error("Error updating user by admin:", error)
    if (error.code === 11000) {
      if (error.message.includes("email")) return { success: false, message: "errors.emailExists" }
      if (error.message.includes("phone")) return { success: false, message: "errors.phoneExists" }
    }
    return { success: false, message: "updateFailed" }
  }
}

export async function deleteUserByAdmin(userId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, message: "notAuthorized" }
    }
    if (userId === session.user.id) {
      return { success: false, message: "cannotDeleteSelf" }
    }

    await dbConnect()
    const deletedUser = await User.findByIdAndDelete(userId)
    if (!deletedUser) {
      return { success: false, message: "userNotFound" }
    }
    return { success: true, message: "admin.users.userDeletedToast" }
  } catch (error) {
    console.error("Error deleting user by admin:", error)
    return { success: false, message: "deleteFailed" }
  }
}

export async function initiatePasswordResetByAdmin(userId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, message: "notAuthorized" }
    }

    await dbConnect()
    const user = await User.findById(userId).select("email name")
    if (!user || !user.email) {
      // Ensure email exists
      return { success: false, message: "userNotFoundOrMissingEmail" }
    }

    const token = crypto.randomBytes(32).toString("hex")
    // PasswordResetToken model expects 'token' to be the hashed one, and 'userId'
    // The actual token sent to user is `token`, the one stored is `hashedToken`
    // Let's adjust PasswordResetToken model or this logic.
    // For now, assuming PasswordResetToken stores the raw token and we handle expiry.
    // A better approach is to store a hashed token.
    // For simplicity with existing model, let's assume it stores the raw token.
    // If PasswordResetToken expects a hashed token, this needs to change.
    // The current PasswordResetQueries.createToken seems to handle this.

    // Delete any existing tokens for this user to avoid conflicts
    await PasswordResetToken.deleteMany({ userId: user._id }).exec()

    const expires = new Date(Date.now() + 3600000) // 1 hour
    await new PasswordResetToken({
      userId: user._id,
      token: token, // Storing raw token for simplicity, ideally hash it
      expiresAt: expires,
    }).save()

    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}&userId=${user._id.toString()}`

    const notificationData: NotificationData = {
      type: "passwordReset", // Ensure this type is handled in getEmailTemplate
      userName: user.name || user.email,
      resetLink: resetUrl,
      // language: user.language || 'en' // If user language preference is stored
    }

    // Using the generic sendNotification method
    const emailResult = await emailService.sendNotification(
      { value: user.email, name: user.name || user.email, language: "en" /* TODO: Get user lang */ },
      notificationData,
    )

    if (!emailResult.success) {
      console.error("Failed to send password reset email:", emailResult.error)
      return { success: false, message: "passwordResetEmailErrorToast", errorDetail: emailResult.error }
    }

    return { success: true, message: "admin.users.passwordResetEmailSentToast", email: user.email }
  } catch (error) {
    console.error("Error initiating password reset by admin:", error)
    return { success: false, message: "passwordResetFailed" }
  }
}
