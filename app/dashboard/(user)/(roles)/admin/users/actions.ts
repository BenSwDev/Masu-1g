"use server"

import { revalidatePath } from "next/cache"
import User, { type IUser, UserRole } from "../../../../../../lib/db/models/user"
import * as bcrypt from "bcryptjs"
import { Types } from "mongoose"
import {
  requireAdminSession,
  connectToDatabase,
  AdminLogger,
  handleAdminError,
  validatePaginationOptions,
  revalidateAdminPath,
  createSuccessResult,
  createErrorResult,
  createPaginatedResult,
  serializeMongoObject,
  validateObjectId,
  buildSearchQuery,
  buildSortQuery,
  type AdminActionResult,
  type PaginatedResult,
  type AdminActionOptions
} from "../../../../../../lib/auth/admin-helpers"

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
  isActive?: boolean
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

export interface UserFilters extends AdminActionOptions {
  role?: string
  gender?: string
  emailVerified?: boolean
  phoneVerified?: boolean
  isActive?: boolean
}

export interface UserStats {
  totalUsers: number
  totalAdmins: number
  totalProfessionals: number
  totalMembers: number
  totalPartners: number
  activeUsers: number
  verifiedUsers: number
  newUsersThisMonth: number
}

/**
 * Get all users with filters and pagination
 */
export async function getAllUsers(
  filters: UserFilters = {}
): Promise<AdminActionResult<PaginatedResult<UserData>>> {
  const adminLogger = new AdminLogger("getAllUsers")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    const { page, limit, skip } = validatePaginationOptions(filters)
    const {
      role,
      gender,
      emailVerified,
      phoneVerified,
      isActive,
      search,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = filters

    adminLogger.info("Fetching users", { filters, page, limit })

    // Build query
    const query: Record<string, any> = {}

    // Search filter
    if (search) {
      const searchQuery = buildSearchQuery(search, ["name", "email", "phone"])
      Object.assign(query, searchQuery)
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

    adminLogger.info("Found users matching query", { totalUsers, query })

    // Get users with pagination and sorting
    const sortQuery = buildSortQuery(sortBy, sortOrder)
    const users = await User.find(query)
      .select("-password") // Exclude password
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .lean()

    // Serialize users
    const serializedUsers = users.map(user => ({
      ...serializeMongoObject<any>(user),
      _id: user._id.toString()
    })) as UserData[]

    adminLogger.info("Successfully fetched users", { count: serializedUsers.length })
    return createPaginatedResult(serializedUsers, totalUsers, page, limit)
  } catch (error) {
    return handleAdminError(error, "getAllUsers")
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<AdminActionResult<UserData>> {
  const adminLogger = new AdminLogger("getUserById")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(userId, "מזהה משתמש")
    
    adminLogger.info("Fetching user by ID", { userId })

    const user = await User.findById(userId).select("-password").lean()
    
    if (!user) {
      adminLogger.warn("User not found", { userId })
      return createErrorResult("משתמש לא נמצא")
    }

    const serializedUser = {
      ...serializeMongoObject<any>(user),
      _id: user._id.toString()
    } as UserData

    adminLogger.info("Successfully fetched user", { userId })
    return createSuccessResult(serializedUser)
  } catch (error) {
    return handleAdminError(error, "getUserById")
  }
}

/**
 * Create new user
 */
export async function createUser(userData: CreateUserData): Promise<AdminActionResult<UserData>> {
  const adminLogger = new AdminLogger("createUser")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    adminLogger.info("Creating new user", { phone: userData.phone, roles: userData.roles })

    // Validate required fields
    if (!userData.name?.trim()) {
      return createErrorResult("שם נדרש")
    }
    if (!userData.phone?.trim()) {
      return createErrorResult("טלפון נדרש")
    }
    if (!userData.password?.trim()) {
      return createErrorResult("סיסמה נדרשת")
    }
    if (!userData.roles?.length) {
      return createErrorResult("לפחות תפקיד אחד נדרש")
    }

    // Check if phone already exists
    const existingUser = await User.findOne({ phone: userData.phone })
    if (existingUser) {
      adminLogger.warn("User with phone already exists", { phone: userData.phone })
      return createErrorResult("משתמש עם מספר טלפון זה כבר קיים")
    }

    // Check if email already exists (if provided)
    if (userData.email) {
      const existingEmailUser = await User.findOne({ email: userData.email })
      if (existingEmailUser) {
        adminLogger.warn("User with email already exists", { email: userData.email })
        return createErrorResult("משתמש עם כתובת מייל זו כבר קיים")
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 12)

    // Create user
    const newUser = new User({
      ...userData,
      password: hashedPassword,
      isActive: true,
      activeRole: userData.roles[0] // Set first role as active
    })

    await newUser.save()
    revalidateAdminPath("/dashboard/admin/users")

    const serializedUser = {
      ...serializeMongoObject<any>(newUser.toObject()),
      _id: newUser._id.toString()
    } as UserData

    adminLogger.info("Successfully created user", { userId: newUser._id.toString() })
    return createSuccessResult(serializedUser)
  } catch (error) {
    return handleAdminError(error, "createUser")
  }
}

/**
 * Update user
 */
export async function updateUser(
  userId: string, 
  userData: UpdateUserData
): Promise<AdminActionResult<UserData>> {
  const adminLogger = new AdminLogger("updateUser")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(userId, "מזהה משתמש")
    
    adminLogger.info("Updating user", { userId, updates: Object.keys(userData) })

    const user = await User.findById(userId)
    if (!user) {
      adminLogger.warn("User not found for update", { userId })
      return createErrorResult("משתמש לא נמצא")
    }

    // Check if phone is being changed and already exists
    if (userData.phone && userData.phone !== user.phone) {
      const existingUser = await User.findOne({ phone: userData.phone, _id: { $ne: userId } })
      if (existingUser) {
        adminLogger.warn("Phone already exists for another user", { phone: userData.phone })
        return createErrorResult("מספר טלפון זה כבר קיים במערכת")
      }
    }

    // Check if email is being changed and already exists
    if (userData.email && userData.email !== user.email) {
      const existingUser = await User.findOne({ email: userData.email, _id: { $ne: userId } })
      if (existingUser) {
        adminLogger.warn("Email already exists for another user", { email: userData.email })
        return createErrorResult("כתובת מייל זו כבר קיימת במערכת")
      }
    }

    // Update user fields
    Object.keys(userData).forEach(key => {
      if (userData[key as keyof UpdateUserData] !== undefined) {
        (user as any)[key] = userData[key as keyof UpdateUserData]
      }
    })

    await user.save()
    revalidateAdminPath("/dashboard/admin/users")

    const serializedUser = {
      ...serializeMongoObject<any>(user.toObject()),
      _id: user._id.toString()
    } as UserData

    adminLogger.info("Successfully updated user", { userId })
    return createSuccessResult(serializedUser)
  } catch (error) {
    return handleAdminError(error, "updateUser")
  }
}

/**
 * Delete user
 */
export async function deleteUser(userId: string): Promise<AdminActionResult<boolean>> {
  const adminLogger = new AdminLogger("deleteUser")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(userId, "מזהה משתמש")
    
    adminLogger.info("Deleting user", { userId })

    const user = await User.findById(userId)
    if (!user) {
      adminLogger.warn("User not found for deletion", { userId })
      return createErrorResult("משתמש לא נמצא")
    }

    // Check if user has critical data that prevents deletion
    // This is where you'd add business logic checks

    await User.findByIdAndDelete(userId)
    revalidateAdminPath("/dashboard/admin/users")

    adminLogger.info("Successfully deleted user", { userId })
    return createSuccessResult(true)
  } catch (error) {
    return handleAdminError(error, "deleteUser")
  }
}

/**
 * Reset user password
 */
export async function resetUserPassword(
  userId: string, 
  newPassword: string = "User123!"
): Promise<AdminActionResult<boolean>> {
  const adminLogger = new AdminLogger("resetUserPassword")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(userId, "מזהה משתמש")
    
    if (!newPassword?.trim()) {
      return createErrorResult("סיסמה חדשה נדרשת")
    }

    adminLogger.info("Resetting user password", { userId })

    const user = await User.findById(userId)
    if (!user) {
      adminLogger.warn("User not found for password reset", { userId })
      return createErrorResult("משתמש לא נמצא")
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)
    user.password = hashedPassword
    await user.save()

    revalidateAdminPath("/dashboard/admin/users")

    adminLogger.info("Successfully reset user password", { userId })
    return createSuccessResult(true)
  } catch (error) {
    return handleAdminError(error, "resetUserPassword")
  }
}

/**
 * Toggle user role
 */
export async function toggleUserRole(
  userId: string, 
  role: string
): Promise<AdminActionResult<UserData>> {
  const adminLogger = new AdminLogger("toggleUserRole")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(userId, "מזהה משתמש")
    
    if (!role?.trim()) {
      return createErrorResult("תפקיד נדרש")
    }

    adminLogger.info("Toggling user role", { userId, role })

    const user = await User.findById(userId)
    if (!user) {
      adminLogger.warn("User not found for role toggle", { userId })
      return createErrorResult("משתמש לא נמצא")
    }

    // Toggle role
    if (user.roles.includes(role as any)) {
      // Remove role (but ensure at least one role remains)
      if (user.roles.length > 1) {
        user.roles = user.roles.filter(r => r !== role)
        // Update active role if it was the removed role
        if (user.activeRole === role) {
          user.activeRole = user.roles[0]
        }
      } else {
        adminLogger.warn("Cannot remove last role from user", { userId, role })
        return createErrorResult("לא ניתן להסיר את התפקיד האחרון של המשתמש")
      }
    } else {
      // Add role
      user.roles.push(role as any)
    }

    await user.save()
    revalidateAdminPath("/dashboard/admin/users")

    const serializedUser = {
      ...serializeMongoObject<any>(user.toObject()),
      _id: user._id.toString()
    } as UserData

    adminLogger.info("Successfully toggled user role", { userId, role })
    return createSuccessResult(serializedUser)
  } catch (error) {
    return handleAdminError(error, "toggleUserRole")
  }
}

/**
 * Get user statistics
 */
export async function getUserStats(): Promise<AdminActionResult<UserStats>> {
  const adminLogger = new AdminLogger("getUserStats")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    adminLogger.info("Fetching user statistics")

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Run all queries in parallel for better performance
    const [
      totalUsers,
      totalAdmins,
      totalProfessionals,
      totalMembers,
      totalPartners,
      activeUsers,
      verifiedUsers,
      newUsersThisMonth
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ roles: { $in: [UserRole.ADMIN] } }),
      User.countDocuments({ roles: { $in: [UserRole.PROFESSIONAL] } }),
      User.countDocuments({ roles: { $in: [UserRole.MEMBER] } }),
      User.countDocuments({ roles: { $in: [UserRole.PARTNER] } }),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ 
        $or: [
          { emailVerified: { $exists: true, $ne: null } },
          { phoneVerified: { $exists: true, $ne: null } }
        ]
      }),
      User.countDocuments({ createdAt: { $gte: startOfMonth } })
    ])

    const stats: UserStats = {
      totalUsers,
      totalAdmins,
      totalProfessionals,
      totalMembers,
      totalPartners,
      activeUsers,
      verifiedUsers,
      newUsersThisMonth
    }

    adminLogger.info("Successfully fetched user statistics", stats)
    return createSuccessResult(stats)
  } catch (error) {
    return handleAdminError(error, "getUserStats")
  }
} 