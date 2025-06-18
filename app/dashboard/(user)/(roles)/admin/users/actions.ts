"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import User, { type IUser } from "@/lib/db/models/user"
import PasswordResetToken from "@/lib/db/models/password-reset-token"
import { emailService } from "@/lib/notifications/email-service"
import { revalidatePath } from "next/cache"

// Types
export interface UserData {
  id: string
  name: string | null
  email: string | null
  image?: string | null
  phone?: string | null
  roles: string[]
  activeRole?: string | null
  dateOfBirth?: string | null
  gender?: string | null
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

    // Send email
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`
    await emailService.sendPasswordResetEmail(user.email, resetLink)

    return { success: true, message: "passwordResetInitiated" }
  } catch (error) {
    console.error("Error in initiatePasswordResetByAdmin:", error)
    return { success: false, message: "passwordResetFailed" }
  }
} 