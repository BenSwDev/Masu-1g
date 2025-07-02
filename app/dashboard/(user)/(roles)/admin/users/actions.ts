"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import User, { type IUser, UserRole } from "@/lib/db/models/user"
import bcrypt from "bcryptjs"
import { Types } from "mongoose"

// Types for user management
export interface UserData {
  _id: string
  name: string
  email?: string
  phone: string
  gender: "male" | "female" | "other"
  dateOfBirth?: Date
  roles: ("admin" | "professional" | "member" | "partner")[]
  activeRole?: string
  emailVerified?: Date
  phoneVerified?: Date
  createdAt: Date
  updatedAt: Date
  isActive: boolean
}

export interface CreateUserData {
  name: string
  email?: string
  phone: string
  password: string
  gender: "male" | "female" | "other"
  dateOfBirth?: Date
  roles: ("admin" | "professional" | "member" | "partner")[]
}

export interface UpdateUserData {
  name?: string
  email?: string
  phone?: string
  gender?: "male" | "female" | "other"
  dateOfBirth?: Date
  roles?: ("admin" | "professional" | "member" | "partner")[]
  activeRole?: string
  isActive?: boolean
}

export interface UserFilters {
  search?: string
  role?: string
  gender?: string
  emailVerified?: boolean
  phoneVerified?: boolean
  isActive?: boolean
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

export interface GetUsersResult {
  users: UserData[]
  totalUsers: number
  totalPages: number
  currentPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface ActionResult {
  success: boolean
  error?: string
  data?: any
}

export interface UserStats {
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  verifiedUsers: number
  unverifiedUsers: number
  roleStats: {
    admin: number
    professional: number
    member: number
    partner: number
    guest: number
  }
  genderStats: {
    male: number
    female: number
    other: number
  }
  recentRegistrations: number // Last 30 days
}

/**
 * Check if user has admin privileges
 */
async function requireAdminAuth() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.roles?.includes("admin")) {
    throw new Error("Unauthorized: Admin access required")
  }
  return session
}

/**
 * Get all users with filters and pagination
 */
export async function getAllUsers(filters: UserFilters = {}): Promise<GetUsersResult> {
  try {
    await requireAdminAuth()
    await dbConnect()

    const {
      search = "",
      role = "",
      gender = "",
      emailVerified,
      phoneVerified,
      isActive,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = filters

    // Build query
    const query: any = {}

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } }
      ]
    }

    // Role filter
    if (role) {
      query.roles = { $in: [role] }
    }

    // Gender filter
    if (gender) {
      query.gender = gender
    }

    // Email verification filter
    if (emailVerified !== undefined) {
      query.emailVerified = emailVerified ? { $exists: true, $ne: null } : { $exists: false }
    }

    // Phone verification filter
    if (phoneVerified !== undefined) {
      query.phoneVerified = phoneVerified ? { $exists: true, $ne: null } : { $exists: false }
    }

    // Active status filter
    if (isActive !== undefined) {
      query.isActive = isActive
    }

    // Get total count
    const totalUsers = await User.countDocuments(query)
    const totalPages = Math.ceil(totalUsers / limit)
    const skip = (page - 1) * limit

    // Get users with pagination and sorting
    const users = await User.find(query)
      .select("-password") // Exclude password
      .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
      .skip(skip)
      .limit(limit)
      .lean()

    return {
      users: users.map(user => ({
        ...user,
        _id: user._id.toString(),
        isActive: user.isActive ?? true // Default to true if not set
      })) as UserData[],
      totalUsers,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  } catch (error) {
    console.error("Error getting users:", error)
    throw new Error(error instanceof Error ? error.message : "Failed to get users")
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<ActionResult> {
  try {
    await requireAdminAuth()
    await dbConnect()

    if (!Types.ObjectId.isValid(userId)) {
      return { success: false, error: "Invalid user ID" }
    }

    const user = await User.findById(userId).select("-password").lean()
    
    if (!user) {
      return { success: false, error: "User not found" }
    }

    return {
      success: true,
      data: {
        ...user,
        _id: user._id.toString(),
        isActive: user.isActive ?? true
      } as UserData
    }
  } catch (error) {
    console.error("Error getting user:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to get user" }
  }
}

/**
 * Create new user
 */
export async function createUser(userData: CreateUserData): Promise<ActionResult> {
  try {
    await requireAdminAuth()
    await dbConnect()

    // Validate required fields
    if (!userData.name || !userData.phone || !userData.password) {
      return { success: false, error: "Missing required fields" }
    }

    // Check if phone already exists
    const existingUser = await User.findOne({ phone: userData.phone })
    if (existingUser) {
      return { success: false, error: "משתמש עם מספר טלפון זה כבר קיים במערכת" }
    }

    // Check if email already exists (if provided)
    if (userData.email) {
      const existingEmail = await User.findOne({ email: userData.email })
      if (existingEmail) {
        return { success: false, error: "משתמש עם כתובת מייל זו כבר קיים במערכת" }
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 12)

    // Create user
    const user = new User({
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      password: hashedPassword,
      gender: userData.gender,
      dateOfBirth: userData.dateOfBirth,
      roles: userData.roles,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    await user.save()

    revalidatePath("/dashboard/admin/users")

    return {
      success: true,
      data: {
        ...user.toObject(),
        _id: user._id.toString(),
        password: undefined // Don't return password
      }
    }
  } catch (error) {
    console.error("Error creating user:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to create user" }
  }
}

/**
 * Update user
 */
export async function updateUser(userId: string, userData: UpdateUserData): Promise<ActionResult> {
  try {
    await requireAdminAuth()
    await dbConnect()

    if (!Types.ObjectId.isValid(userId)) {
      return { success: false, error: "Invalid user ID" }
    }

    const user = await User.findById(userId)
    if (!user) {
      return { success: false, error: "User not found" }
    }

    // Check if phone is being changed and already exists
    if (userData.phone && userData.phone !== user.phone) {
      const existingUser = await User.findOne({ phone: userData.phone, _id: { $ne: userId } })
      if (existingUser) {
        return { success: false, error: "משתמש עם מספר טלפון זה כבר קיים במערכת" }
      }
    }

    // Check if email is being changed and already exists
    if (userData.email && userData.email !== user.email) {
      const existingEmail = await User.findOne({ email: userData.email, _id: { $ne: userId } })
      if (existingEmail) {
        return { success: false, error: "משתמש עם כתובת מייל זו כבר קיים במערכת" }
      }
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        ...userData,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).select("-password")

    revalidatePath("/dashboard/admin/users")

    return {
      success: true,
      data: {
        ...updatedUser?.toObject(),
        _id: updatedUser?._id.toString()
      }
    }
  } catch (error) {
    console.error("Error updating user:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to update user" }
  }
}

/**
 * Delete user (soft delete by setting isActive to false)
 */
export async function deleteUser(userId: string): Promise<ActionResult> {
  try {
    await requireAdminAuth()
    await dbConnect()

    if (!Types.ObjectId.isValid(userId)) {
      return { success: false, error: "Invalid user ID" }
    }

    const user = await User.findById(userId)
    if (!user) {
      return { success: false, error: "User not found" }
    }

    // Don't allow deleting admin users
    if (user.roles.includes("admin")) {
      return { success: false, error: "לא ניתן למחוק משתמש מנהל" }
    }

    // Soft delete by setting isActive to false
    await User.findByIdAndUpdate(userId, { 
      isActive: false,
      updatedAt: new Date()
    })

    revalidatePath("/dashboard/admin/users")

    return { success: true }
  } catch (error) {
    console.error("Error deleting user:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete user" }
  }
}

/**
 * Permanently delete user (use with caution)
 */
export async function permanentlyDeleteUser(userId: string): Promise<ActionResult> {
  try {
    await requireAdminAuth()
    await dbConnect()

    if (!Types.ObjectId.isValid(userId)) {
      return { success: false, error: "Invalid user ID" }
    }

    const user = await User.findById(userId)
    if (!user) {
      return { success: false, error: "User not found" }
    }

    // Don't allow deleting admin users
    if (user.roles.includes("admin")) {
      return { success: false, error: "לא ניתן למחוק משתמש מנהל" }
    }

    await User.findByIdAndDelete(userId)

    revalidatePath("/dashboard/admin/users")

    return { success: true }
  } catch (error) {
    console.error("Error permanently deleting user:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to permanently delete user" }
  }
}

/**
 * Reset user password
 */
export async function resetUserPassword(userId: string, newPassword: string = "User123!"): Promise<ActionResult> {
  try {
    await requireAdminAuth()
    await dbConnect()

    if (!Types.ObjectId.isValid(userId)) {
      return { success: false, error: "Invalid user ID" }
    }

    const user = await User.findById(userId)
    if (!user) {
      return { success: false, error: "User not found" }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)
    
    await User.findByIdAndUpdate(userId, { 
      password: hashedPassword,
      updatedAt: new Date()
    })

    revalidatePath("/dashboard/admin/users")

    return {
      success: true,
      data: { newPassword }
    }
  } catch (error) {
    console.error("Error resetting password:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to reset password" }
  }
}

/**
 * Toggle user role
 */
export async function toggleUserRole(userId: string, role: string): Promise<ActionResult> {
  try {
    await requireAdminAuth()
    await dbConnect()

    if (!Types.ObjectId.isValid(userId)) {
      return { success: false, error: "Invalid user ID" }
    }

    const user = await User.findById(userId)
    if (!user) {
      return { success: false, error: "User not found" }
    }

    const hasRole = user.roles.includes(role as any)
    let updatedRoles = [...user.roles]

    if (hasRole) {
      // Remove role
      updatedRoles = updatedRoles.filter(r => r !== role)
      
      // Ensure user has at least one role
      if (updatedRoles.length === 0) {
        updatedRoles = ["member"]
      }
    } else {
      // Add role
      updatedRoles.push(role as any)
    }

    await User.findByIdAndUpdate(userId, { 
      roles: updatedRoles,
      updatedAt: new Date()
    })

    revalidatePath("/dashboard/admin/users")

    return { success: true, data: { roles: updatedRoles } }
  } catch (error) {
    console.error("Error toggling user role:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to toggle user role" }
  }
}

/**
 * Toggle user active status
 */
export async function toggleUserStatus(userId: string): Promise<ActionResult> {
  try {
    await requireAdminAuth()
    await dbConnect()

    if (!Types.ObjectId.isValid(userId)) {
      return { success: false, error: "Invalid user ID" }
    }

    const user = await User.findById(userId)
    if (!user) {
      return { success: false, error: "User not found" }
    }

    // Don't allow deactivating admin users
    if (user.roles.includes("admin")) {
      return { success: false, error: "לא ניתן לבטל הפעלה של משתמש מנהל" }
    }

    const newStatus = !user.isActive
    
    await User.findByIdAndUpdate(userId, { 
      isActive: newStatus,
      updatedAt: new Date()
    })

    revalidatePath("/dashboard/admin/users")

    return { success: true, data: { isActive: newStatus } }
  } catch (error) {
    console.error("Error toggling user status:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to toggle user status" }
  }
}

/**
 * Get user statistics
 */
export async function getUserStats(): Promise<ActionResult> {
  try {
    await requireAdminAuth()
    await dbConnect()

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [
      totalUsers,
      activeUsers,
      verifiedEmailUsers,
      verifiedPhoneUsers,
      recentUsers,
      roleStats,
      genderStats
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ isActive: { $ne: false } }),
      User.countDocuments({ emailVerified: { $exists: true, $ne: null } }),
      User.countDocuments({ phoneVerified: { $exists: true, $ne: null } }),
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      User.aggregate([
        { $unwind: "$roles" },
        { $group: { _id: "$roles", count: { $sum: 1 } } }
      ]),
      User.aggregate([
        { $group: { _id: "$gender", count: { $sum: 1 } } }
      ])
    ])

    // Process role stats
    const roleStatsMap = {
      admin: 0,
      professional: 0,
      member: 0,
      partner: 0,
      guest: 0
    }
    roleStats.forEach((stat: any) => {
      if (stat._id in roleStatsMap) {
        roleStatsMap[stat._id as keyof typeof roleStatsMap] = stat.count
      }
    })

    // Process gender stats
    const genderStatsMap = {
      male: 0,
      female: 0,
      other: 0
    }
    genderStats.forEach((stat: any) => {
      if (stat._id in genderStatsMap) {
        genderStatsMap[stat._id as keyof typeof genderStatsMap] = stat.count
      }
    })

    const stats: UserStats = {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      verifiedUsers: Math.max(verifiedEmailUsers, verifiedPhoneUsers),
      unverifiedUsers: totalUsers - Math.max(verifiedEmailUsers, verifiedPhoneUsers),
      roleStats: roleStatsMap,
      genderStats: genderStatsMap,
      recentRegistrations: recentUsers
    }

    return { success: true, data: stats }
  } catch (error) {
    console.error("Error getting user stats:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to get user stats" }
  }
} 