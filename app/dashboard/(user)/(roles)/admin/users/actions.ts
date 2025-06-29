"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import User, { type IUser } from "@/lib/db/models/user"
import PasswordResetToken from "@/lib/db/models/password-reset-token"
import { emailService } from "@/lib/notifications/email-service"
import { revalidatePath } from "next/cache"
import crypto from "crypto"
import bcrypt from "bcryptjs"

// Types
export interface UserData {
  id: string
  name: string | null
  email: string | null
  image?: string | null
  phone?: string | null
  roles: ("admin" | "professional" | "member" | "partner")[]
  activeRole?: string | null
  dateOfBirth?: string | null
  gender?: "male" | "female" | "other" | null
  createdAt: string
}

export interface GetAllUsersResult {
  success: boolean
  message?: string
  users: UserData[]
  total: number
  page: number
  totalPages: number
}

export interface GetUserStatisticsResult {
  success: boolean
  message?: string
  roleCounts: {
    members: number
    professionals: number
    partners: number
  } | null
}

export interface DeleteUserResult {
  success: boolean
  message: string
}

export interface InitiatePasswordResetResult {
  success: boolean
  message: string
}

export interface ResetPasswordToDefaultResult {
  success: boolean
  message: string
}

export interface GetUserByIdResult {
  success: boolean
  message?: string
  user?: UserData
}

// Helper function to sanitize user object
const sanitizeUser = (userDoc: any): Omit<IUser, "password" | "_id"> & { id: string } => {
  const userObject = userDoc.toObject ? userDoc.toObject() : { ...userDoc }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, _id, __v, ...rest } = userObject
  return { ...rest, id: _id.toString() }
}

/**
 * Fetches a paginated list of users with optional filtering and sorting
 * @param page - Page number (1-based)
 * @param limit - Number of items per page
 * @param searchTerm - Optional search term for name, email, or phone
 * @param roleFilter - Optional array of roles to filter by
 * @param sortField - Field to sort by
 * @param sortDirection - Sort direction (asc/desc)
 * @returns Promise<GetAllUsersResult>
 */
export async function getAllUsers(
  page = 1,
  limit = 10,
  searchTerm?: string,
  roleFilter?: string[],
  sortField = "name",
  sortDirection: "asc" | "desc" = "asc",
): Promise<GetAllUsersResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, message: "notAuthorized", users: [], total: 0, totalPages: 0, page }
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
        .lean(),
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
    console.error("Error in getAllUsers:", error)
    return { success: false, message: "fetchFailed", users: [], total: 0, totalPages: 0, page }
  }
}

/**
 * Fetches a single user by ID
 * @param userId - ID of the user to fetch
 * @returns Promise<GetUserByIdResult>
 */
export async function getUserById(userId: string): Promise<GetUserByIdResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, message: "notAuthorized" }
    }

    await dbConnect()

    const userFromDb = await User.findById(userId)
      .select("name email phone image roles dateOfBirth gender createdAt")
      .lean()

    if (!userFromDb) {
      return { success: false, message: "userNotFound" }
    }

    const user: UserData = {
      id: userFromDb._id.toString(),
      name: userFromDb.name,
      email: userFromDb.email,
      phone: userFromDb.phone,
      image: userFromDb.image,
      roles: userFromDb.roles,
      dateOfBirth: userFromDb.dateOfBirth ? new Date(userFromDb.dateOfBirth).toISOString() : null,
      gender: userFromDb.gender,
      createdAt: new Date(userFromDb.createdAt).toISOString(),
    }

    return {
      success: true,
      user
    }
  } catch (error) {
    console.error("Error in getUserById:", error)
    return { success: false, message: "fetchFailed" }
  }
}

/**
 * Fetches statistics about user roles
 * @returns Promise<GetUserStatisticsResult>
 */
export async function getUserStatistics(): Promise<GetUserStatisticsResult> {
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
    console.error("Error in getUserStatistics:", error)
    return { success: false, message: "fetchFailed", roleCounts: null }
  }
}

/**
 * Deletes a user by ID
 * @param userId - ID of the user to delete
 * @returns Promise<DeleteUserResult>
 */
export async function deleteUserByAdmin(userId: string): Promise<DeleteUserResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, message: "notAuthorized" }
    }

    await dbConnect()

    const user = await User.findById(userId)
    if (!user) {
      return { success: false, message: "userNotFound" }
    }

    // Prevent deleting the last admin
    if (user.roles.includes("admin")) {
      const adminCount = await User.countDocuments({ roles: "admin" })
      if (adminCount <= 1) {
        return { success: false, message: "cannotDeleteLastAdmin" }
      }
    }

    await User.findByIdAndDelete(userId)
    revalidatePath("/dashboard/admin/users")
    return { success: true, message: "userDeleted" }
  } catch (error) {
    console.error("Error in deleteUserByAdmin:", error)
    return { success: false, message: "deleteFailed" }
  }
}

/**
 * Initiates a password reset for a user
 * @param userId - ID of the user to reset password for
 * @returns Promise<InitiatePasswordResetResult>
 */
export async function initiatePasswordResetByAdmin(userId: string): Promise<InitiatePasswordResetResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, message: "notAuthorized" }
    }

    await dbConnect()

    const user = await User.findById(userId)
    if (!user) {
      return { success: false, message: "userNotFound" }
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString("hex")
    const hashedToken = await bcrypt.hash(token, 10)

    // Save token to database
    await PasswordResetToken.create({
      userId: user._id,
      token: hashedToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    })

    // Send email using the centralized notification system
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`

    const notificationData: NotificationData = {
      type: "password-reset",
      resetUrl: resetLink,
      expiresIn: 60 * 24, // 24 hours
    }

    const emailResult = await emailService.sendNotification(
      { value: user.email, name: user.name || user.email, language: "en" },
      notificationData,
    )

    if (!emailResult.success) {
      console.error("Failed to send password reset email:", emailResult.error)
      return { success: false, message: "passwordResetFailed" }
    }

    return { success: true, message: "passwordResetInitiated" }
  } catch (error) {
    console.error("Error in initiatePasswordResetByAdmin:", error)
    return { success: false, message: "passwordResetFailed" }
  }
}

/**
 * Creates a new user
 * @param formData - Form data containing user information
 * @returns Promise<{ success: boolean; message: string; user?: any }>
 */
export async function createUserByAdmin(formData: FormData): Promise<{ success: boolean; message: string; user?: any }> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, message: "Not authorized" }
    }

    await dbConnect()

    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const phone = formData.get("phone") as string
    const password = formData.get("password") as string
    const gender = formData.get("gender") as string
    const dateOfBirth = formData.get("dateOfBirth") as string
    const roles = formData.getAll("roles[]") as string[]

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return { success: false, message: "User with this email already exists" }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const newUser = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      gender,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      roles,
      activeRole: roles[0],
      emailVerified: new Date(), // Auto-verify admin created users
    })

    await newUser.save()

    revalidatePath("/dashboard/admin/users")

    return { 
      success: true, 
      message: "User created successfully",
      user: sanitizeUser(newUser)
    }
  } catch (error) {
    console.error("Error creating user:", error)
    return { success: false, message: "Failed to create user" }
  }
}

/**
 * Updates an existing user
 * @param userId - ID of the user to update
 * @param formData - Form data containing updated user information
 * @returns Promise<{ success: boolean; message: string; user?: any }>
 */
export async function updateUserByAdmin(userId: string, formData: FormData): Promise<{ success: boolean; message: string; user?: any }> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, message: "Not authorized" }
    }

    await dbConnect()

    const user = await User.findById(userId)
    if (!user) {
      return { success: false, message: "User not found" }
    }

    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const phone = formData.get("phone") as string
    const gender = formData.get("gender") as string
    const dateOfBirth = formData.get("dateOfBirth") as string
    const roles = formData.getAll("roles[]") as string[]

    // Check if email is taken by another user
    if (email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } })
      if (existingUser) {
        return { success: false, message: "Email is already taken by another user" }
      }
    }

    // Update user
    user.name = name
    user.email = email
    user.phone = phone || undefined
    user.gender = gender
    user.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : undefined
    user.roles = roles
    
    // Update active role if current one is not in new roles
    if (!roles.includes(user.activeRole || "")) {
      user.activeRole = roles[0]
    }

    await user.save()

    revalidatePath("/dashboard/admin/users")

    return { 
      success: true, 
      message: "User updated successfully",
      user: sanitizeUser(user)
    }
  } catch (error) {
    console.error("Error updating user:", error)
    return { success: false, message: "Failed to update user" }
  }
}

/**
 * Resets a user's password to the default password "User123!"
 * @param userId - ID of the user to reset password for
 * @returns Promise<ResetPasswordToDefaultResult>
 */
export async function resetPasswordToDefault(userId: string): Promise<ResetPasswordToDefaultResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, message: "Not authorized" }
    }

    await dbConnect()

    const user = await User.findById(userId)
    if (!user) {
      return { success: false, message: "User not found" }
    }

    // Hash the default password "User123!"
    const defaultPassword = "User123!"
    const hashedPassword = await bcrypt.hash(defaultPassword, 12)

    // Update user's password
    user.password = hashedPassword
    await user.save()

    revalidatePath("/dashboard/admin/users")

    return { 
      success: true, 
      message: `Password reset to default for user ${user.name || user.email}. New password: ${defaultPassword}`
    }
  } catch (error) {
    console.error("Error resetting password to default:", error)
    return { success: false, message: "Failed to reset password" }
  }
} 