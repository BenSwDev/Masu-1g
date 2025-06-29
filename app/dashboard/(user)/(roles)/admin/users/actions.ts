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
}

export interface UserFilters {
  search?: string
  role?: string
  gender?: string
  emailVerified?: boolean
  phoneVerified?: boolean
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
}

export interface ActionResult {
  success: boolean
  error?: string
  data?: any
}

/**
 * Get all users with filters and pagination
 */
export async function getAllUsers(filters: UserFilters = {}): Promise<GetUsersResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      throw new Error("Unauthorized: Admin access required")
    }

    await dbConnect()

    const {
      search = "",
      role = "",
      gender = "",
      emailVerified,
      phoneVerified,
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

    // Get total count
    const totalUsers = await User.countDocuments(query)
    const totalPages = Math.ceil(totalUsers / limit)

    // Get users with pagination and sorting
    const users = await User.find(query)
      .select("-password") // Exclude password
      .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
      .skip((page - 1) * limit)
        .limit(limit)
      .lean()

    return {
      users: users.map(user => ({
        ...user,
        _id: user._id.toString()
      })) as UserData[],
      totalUsers,
      totalPages,
      currentPage: page
    }
  } catch (error) {
    console.error("Error getting users:", error)
    throw new Error("Failed to get users")
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      throw new Error("Unauthorized: Admin access required")
    }

    await dbConnect()

    const user = await User.findById(userId).select("-password").lean()
    
    if (!user) {
      return { success: false, error: "User not found" }
    }

    return {
      success: true,
      data: {
        ...user,
        _id: user._id.toString()
      } as UserData
    }
  } catch (error) {
    console.error("Error getting user:", error)
    return { success: false, error: "Failed to get user" }
  }
}

/**
 * Create new user
 */
export async function createUser(userData: CreateUserData): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      throw new Error("Unauthorized: Admin access required")
    }

    await dbConnect()

    // Check if phone already exists
    const existingUser = await User.findOne({ phone: userData.phone })
    if (existingUser) {
      return { success: false, error: "User with this phone number already exists" }
    }

    // Check if email already exists (if provided)
    if (userData.email) {
      const existingEmail = await User.findOne({ email: userData.email })
      if (existingEmail) {
        return { success: false, error: "User with this email already exists" }
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 12)

    // Create user
    const newUser = new User({
      ...userData,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    const savedUser = await newUser.save()

    revalidatePath("/dashboard/admin/users")

    return {
      success: true,
      data: {
        ...savedUser.toObject(),
        _id: savedUser._id.toString()
      } as UserData
    }
  } catch (error) {
    console.error("Error creating user:", error)
    return { success: false, error: "Failed to create user" }
  }
}

/**
 * Update user
 */
export async function updateUser(userId: string, userData: UpdateUserData): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      throw new Error("Unauthorized: Admin access required")
    }

    await dbConnect()

    // Check if user exists
    const existingUser = await User.findById(userId)
    if (!existingUser) {
      return { success: false, error: "User not found" }
    }

    // Check if phone is being changed and already exists
    if (userData.phone && userData.phone !== existingUser.phone) {
      const phoneExists = await User.findOne({ 
        phone: userData.phone, 
        _id: { $ne: userId } 
      })
      if (phoneExists) {
        return { success: false, error: "Phone number already exists" }
      }
    }

    // Check if email is being changed and already exists
    if (userData.email && userData.email !== existingUser.email) {
      const emailExists = await User.findOne({ 
        email: userData.email, 
        _id: { $ne: userId } 
      })
      if (emailExists) {
        return { success: false, error: "Email already exists" }
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
    ).select("-password").lean()

    revalidatePath("/dashboard/admin/users")

    return {
      success: true,
      data: {
        ...updatedUser,
        _id: updatedUser!._id.toString()
      } as UserData
    }
  } catch (error) {
    console.error("Error updating user:", error)
    return { success: false, error: "Failed to update user" }
  }
}

/**
 * Delete user
 */
export async function deleteUser(userId: string): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      throw new Error("Unauthorized: Admin access required")
    }

    await dbConnect()

    // Check if user exists
    const user = await User.findById(userId)
    if (!user) {
      return { success: false, error: "User not found" }
    }

    // Prevent deleting admin users (safety check)
    if (user.roles.includes("admin")) {
      return { success: false, error: "Cannot delete admin users" }
    }

    // Delete user
    await User.findByIdAndDelete(userId)

    revalidatePath("/dashboard/admin/users")

    return { success: true }
  } catch (error) {
    console.error("Error deleting user:", error)
    return { success: false, error: "Failed to delete user" }
  }
}

/**
 * Reset user password to default
 */
export async function resetUserPassword(userId: string, newPassword: string = "User123!"): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      throw new Error("Unauthorized: Admin access required")
    }

    await dbConnect()

    // Check if user exists
    const user = await User.findById(userId)
    if (!user) {
      return { success: false, error: "User not found" }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Update password
    await User.findByIdAndUpdate(userId, {
      password: hashedPassword,
      updatedAt: new Date()
    })

    revalidatePath("/dashboard/admin/users")

    return { success: true, data: { newPassword } }
  } catch (error) {
    console.error("Error resetting password:", error)
    return { success: false, error: "Failed to reset password" }
  }
}

/**
 * Toggle user role
 */
export async function toggleUserRole(userId: string, role: string): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      throw new Error("Unauthorized: Admin access required")
    }

    await dbConnect()

    const user = await User.findById(userId)
    if (!user) {
      return { success: false, error: "User not found" }
    }

    // Toggle role
    const currentRoles = user.roles || []
    const hasRole = currentRoles.includes(role as any)
    
    let newRoles
    if (hasRole) {
      // Remove role
      newRoles = currentRoles.filter(r => r !== role)
    } else {
      // Add role
      newRoles = [...currentRoles, role]
    }

    // Ensure at least one role remains
    if (newRoles.length === 0) {
      newRoles = ["member"]
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        roles: newRoles,
        updatedAt: new Date()
      },
      { new: true }
    ).select("-password").lean()

    revalidatePath("/dashboard/admin/users")

    return { 
      success: true, 
      data: {
        ...updatedUser,
        _id: updatedUser!._id.toString()
      } as UserData
    }
  } catch (error) {
    console.error("Error toggling user role:", error)
    return { success: false, error: "Failed to toggle user role" }
  }
}

/**
 * Get user statistics
 */
export async function getUserStats(): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      throw new Error("Unauthorized: Admin access required")
    }

    await dbConnect()

    const [
      totalUsers,
      adminUsers,
      professionalUsers,
      memberUsers,
      partnerUsers,
      verifiedEmails,
      verifiedPhones
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ roles: { $in: ["admin"] } }),
      User.countDocuments({ roles: { $in: ["professional"] } }),
      User.countDocuments({ roles: { $in: ["member"] } }),
      User.countDocuments({ roles: { $in: ["partner"] } }),
      User.countDocuments({ emailVerified: { $exists: true, $ne: null } }),
      User.countDocuments({ phoneVerified: { $exists: true, $ne: null } })
    ])

    return {
      success: true,
      data: {
        totalUsers,
        roleStats: {
          admin: adminUsers,
          professional: professionalUsers,
          member: memberUsers,
          partner: partnerUsers
        },
        verificationStats: {
          emailVerified: verifiedEmails,
          phoneVerified: verifiedPhones
        }
      }
    }
  } catch (error) {
    console.error("Error getting user stats:", error)
    return { success: false, error: "Failed to get user statistics" }
  }
} 