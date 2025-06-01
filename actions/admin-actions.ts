"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import { UserQueries } from "@/lib/db/query-builders"
import User from "@/lib/db/models/user"

// Add new imports at the top
import { hashPassword, validatePassword, validateEmail, validatePhone } from "@/lib/auth/auth"
import { UserRole } from "@/lib/db/models/user" // Assuming UserRole enum is exported

/**
 * Get all users with pagination, filtering, and sorting (admin only)
 */
export async function getAllUsers(
  page = 1,
  limit = 20,
  searchTerm?: string,
  roleFilter?: string[],
  sortField = "name",
  sortDirection: "asc" | "desc" = "asc",
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, message: "notAuthenticated", users: [], total: 0 }
    }

    // Check if current user is an admin
    if (!session.user.roles.includes("admin")) {
      return { success: false, message: "notAuthorized", users: [], total: 0 }
    }

    await dbConnect()

    // Build query
    const query: any = {}

    // Add search term
    if (searchTerm) {
      query.$or = [{ name: { $regex: searchTerm, $options: "i" } }, { email: { $regex: searchTerm, $options: "i" } }]
    }

    // Add role filter
    if (roleFilter && roleFilter.length > 0) {
      query.roles = { $in: roleFilter }
    }

    // Build sort object
    const sort: any = {}
    sort[sortField] = sortDirection === "asc" ? 1 : -1

    // Execute query with pagination
    const skip = (page - 1) * limit
    const [users, total] = await Promise.all([
      User.find(query).sort(sort).skip(skip).limit(limit).lean(),
      User.countDocuments(query),
    ])

    return {
      success: true,
      users: users.map((user: any) => ({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        roles: user.roles,
        createdAt: user.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }
  } catch (error) {
    console.error("Error getting users:", error)
    return { success: false, message: "fetchFailed", users: [], total: 0 }
  }
}

/**
 * Get user statistics (admin only)
 */
export async function getUserStatistics() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, message: "notAuthenticated" }
    }

    if (!session.user.roles.includes("admin")) {
      return { success: false, message: "notAuthorized" }
    }

    await dbConnect()

    // Run analytics queries in parallel
    const [roleStats, registrationTrends, demographics] = await Promise.all([
      UserQueries.getRoleStats(),
      UserQueries.getRegistrationTrends(30),
      UserQueries.getUserDemographics(),
    ])

    return {
      success: true,
      roleStats,
      registrationTrends,
      demographics,
    }
  } catch (error) {
    console.error("Error getting statistics:", error)
    return { success: false, message: "fetchFailed" }
  }
}

/**
 * Bulk update user roles (admin only)
 */
export async function bulkUpdateUserRoles(userIds: string[], roles: string[]) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, message: "notAuthenticated" }
    }

    if (!session.user.roles.includes("admin")) {
      return { success: false, message: "notAuthorized" }
    }

    // Validate roles
    if (!roles || roles.length === 0) {
      return { success: false, message: "rolesRequired" }
    }

    const availableRoles = ["member", "admin", "professional", "partner"]
    const invalidRoles = roles.filter((role) => !availableRoles.includes(role))
    if (invalidRoles.length > 0) {
      return { success: false, message: "invalidRoles", invalidRoles }
    }

    await dbConnect()

    // Use bulk update for better performance
    const result = await UserQueries.bulkUpdateRoles(userIds, roles)

    return {
      success: true,
      message: "rolesUpdated",
      modifiedCount: result.modifiedCount,
    }
  } catch (error) {
    console.error("Error updating user roles:", error)
    return { success: false, message: "updateFailed" }
  }
}

/**
 * Update user roles (admin only)
 */
export async function updateUserRoles(userId: string, roles: string[]) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, message: "notAuthenticated" }
    }

    // Check if current user is an admin
    if (!session.user.roles.includes("admin")) {
      return { success: false, message: "notAuthorized" }
    }

    // Validate roles
    if (!roles || roles.length === 0) {
      return { success: false, message: "rolesRequired" }
    }

    // Get available roles
    const availableRoles = ["member", "admin", "professional", "partner"]

    // Check if all roles are valid
    const invalidRoles = roles.filter((role) => !availableRoles.includes(role))
    if (invalidRoles.length > 0) {
      return { success: false, message: "invalidRoles", invalidRoles }
    }

    await dbConnect()

    // Update user roles
    const updatedUser = await User.findByIdAndUpdate(userId, { roles }, { new: true, select: "roles activeRole" })

    if (!updatedUser) {
      return { success: false, message: "userNotFound" }
    }

    // If activeRole is not valid anymore, set to default
    if (!updatedUser.roles.includes(updatedUser.activeRole)) {
      const getDefaultActiveRole = (roles: string[]) => {
        if (!roles || roles.length === 0) return "member"
        if (roles.includes("admin")) return "admin"
        if (roles.includes("professional")) return "professional"
        if (roles.includes("partner")) return "partner"
        if (roles.includes("member")) return "member"
        return roles[0] || "member"
      }
      const fallback = getDefaultActiveRole(updatedUser.roles) || "member"
      await User.findByIdAndUpdate(userId, { activeRole: fallback })
    }

    return { success: true, message: "rolesUpdated" }
  } catch (error) {
    console.error("Error updating user roles:", error)
    return { success: false, message: "updateFailed" }
  }
}

/**
 * Make a user an admin (admin only)
 */
export async function makeUserAdmin(userId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, message: "notAuthenticated" }
    }

    // Check if current user is an admin
    if (!session.user.roles.includes("admin")) {
      return { success: false, message: "notAuthorized" }
    }

    await dbConnect()

    // Use atomic operation to add admin role
    const result = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { roles: "admin" } },
      { new: true, select: "roles" },
    ).lean()

    if (!result) {
      return { success: false, message: "userNotFound" }
    }

    return { success: true, message: "madeAdmin" }
  } catch (error) {
    console.error("Error making user admin:", error)
    return { success: false, message: "updateFailed" }
  }
}

/**
 * Remove admin role from a user (admin only)
 */
export async function removeAdminRole(userId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, message: "notAuthenticated" }
    }

    // Check if current user is an admin
    if (!session.user.roles.includes("admin")) {
      return { success: false, message: "notAuthorized" }
    }

    // Prevent removing admin role from self
    if (userId === session.user.id) {
      return { success: false, message: "cannotRemoveSelf" }
    }

    await dbConnect()

    // Use atomic operation to remove admin role
    const result = await User.findByIdAndUpdate(
      userId,
      {
        $pull: { roles: "admin" },
        $addToSet: { roles: "member" }, // Ensure at least member role
      },
      { new: true, select: "roles" },
    ).lean()

    if (!result) {
      return { success: false, message: "userNotFound" }
    }

    return { success: true, message: "adminRemoved" }
  } catch (error) {
    console.error("Error removing admin role:", error)
    return { success: false, message: "updateFailed" }
  }
}

/**
 * Create a new user (admin only)
 */
export async function createUserByAdmin(userData: {
  name: string
  email: string
  phone: string
  password?: string // Optional: admin might set an initial password or trigger a reset
  gender: "male" | "female" | "other"
  dateOfBirth?: string // ISO string
  roles: string[]
}) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, message: "notAuthorized" }
    }

    await dbConnect()

    // Validate inputs
    if (
      !userData.name ||
      !userData.email ||
      !userData.phone ||
      !userData.gender ||
      !userData.roles ||
      userData.roles.length === 0
    ) {
      return { success: false, message: "missingFields" }
    }
    if (!validateEmail(userData.email)) {
      return { success: false, message: "invalidEmail" }
    }
    if (!validatePhone(userData.phone)) {
      return { success: false, message: "invalidPhone" }
    }

    const existingEmail = await User.findOne({ email: userData.email.toLowerCase() })
    if (existingEmail) {
      return { success: false, message: "emailExists" }
    }
    const existingPhone = await User.findOne({ phone: userData.phone })
    if (existingPhone) {
      return { success: false, message: "phoneExists" }
    }

    let hashedPassword
    if (userData.password) {
      const passwordValidation = validatePassword(userData.password)
      if (!passwordValidation.isValid) {
        return { success: false, message: "weakPassword", errors: passwordValidation.errors }
      }
      hashedPassword = await hashPassword(userData.password)
    } else {
      // If no password, generate a secure temporary one or handle as needed
      // For now, let's require a password for creation by admin for simplicity
      return { success: false, message: "passwordRequired" }
    }

    const newUser = new User({
      name: userData.name,
      email: userData.email.toLowerCase(),
      phone: userData.phone,
      password: hashedPassword,
      gender: userData.gender,
      dateOfBirth: userData.dateOfBirth ? new Date(userData.dateOfBirth) : undefined,
      roles: userData.roles,
      activeRole: userData.roles.includes(UserRole.MEMBER) ? UserRole.MEMBER : userData.roles[0], // Default active role
      emailVerified: new Date(), // Admin created users are considered verified
      phoneVerified: new Date(), // Admin created users are considered verified
    })

    await newUser.save()

    return { success: true, message: "userCreated", userId: newUser._id.toString() }
  } catch (error) {
    console.error("Error creating user by admin:", error)
    return { success: false, message: "creationFailed" }
  }
}

/**
 * Update user details by admin (admin only)
 */
export async function updateUserByAdmin(
  userId: string,
  updateData: {
    name?: string
    email?: string
    phone?: string
    gender?: "male" | "female" | "other"
    dateOfBirth?: string | null // ISO string or null to clear
    roles?: string[]
  },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, message: "notAuthorized" }
    }

    await dbConnect()

    const userToUpdate = await User.findById(userId)
    if (!userToUpdate) {
      return { success: false, message: "userNotFound" }
    }

    // Prepare updates
    const updates: Partial<typeof userToUpdate> = {}
    if (updateData.name) updates.name = updateData.name
    if (updateData.gender) updates.gender = updateData.gender

    if (updateData.dateOfBirth === null) {
      updates.dateOfBirth = undefined
    } else if (updateData.dateOfBirth) {
      updates.dateOfBirth = new Date(updateData.dateOfBirth)
    }

    if (updateData.email && updateData.email.toLowerCase() !== userToUpdate.email) {
      if (!validateEmail(updateData.email)) return { success: false, message: "invalidEmail" }
      const existingEmail = await User.findOne({ email: updateData.email.toLowerCase(), _id: { $ne: userId } })
      if (existingEmail) return { success: false, message: "emailExists" }
      updates.email = updateData.email.toLowerCase()
      // Consider if email verification status should change
    }

    if (updateData.phone && updateData.phone !== userToUpdate.phone) {
      if (!validatePhone(updateData.phone)) return { success: false, message: "invalidPhone" }
      const existingPhone = await User.findOne({ phone: updateData.phone, _id: { $ne: userId } })
      if (existingPhone) return { success: false, message: "phoneExists" }
      updates.phone = updateData.phone
      // Consider if phone verification status should change
    }

    if (updateData.roles && updateData.roles.length > 0) {
      const availableRoles = Object.values(UserRole)
      const invalidRoles = updateData.roles.filter((role) => !availableRoles.includes(role as UserRole))
      if (invalidRoles.length > 0) {
        return { success: false, message: "invalidRoles", invalidRoles }
      }
      updates.roles = updateData.roles
      // Update activeRole if current activeRole is no longer valid
      if (userToUpdate.activeRole && !updateData.roles.includes(userToUpdate.activeRole)) {
        updates.activeRole = updateData.roles.includes(UserRole.MEMBER) ? UserRole.MEMBER : updateData.roles[0]
      } else if (!userToUpdate.activeRole && updateData.roles.length > 0) {
        updates.activeRole = updateData.roles.includes(UserRole.MEMBER) ? UserRole.MEMBER : updateData.roles[0]
      }
    }

    if (Object.keys(updates).length === 0) {
      return { success: true, message: "noChanges" }
    }

    await User.findByIdAndUpdate(userId, updates)

    return { success: true, message: "userUpdated" }
  } catch (error) {
    console.error("Error updating user by admin:", error)
    return { success: false, message: "updateFailed" }
  }
}

/**
 * Admin sets/resets a user's password (admin only)
 */
export async function adminSetUserPassword(userId: string, newPassword: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, message: "notAuthorized" }
    }

    await dbConnect()

    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.isValid) {
      return { success: false, message: "weakPassword", errors: passwordValidation.errors }
    }

    const hashedPassword = await hashPassword(newPassword)
    const result = await User.findByIdAndUpdate(userId, { password: hashedPassword })

    if (!result) {
      return { success: false, message: "userNotFound" }
    }

    return { success: true, message: "passwordSet" }
  } catch (error) {
    console.error("Error setting user password by admin:", error)
    return { success: false, message: "passwordSetFailed" }
  }
}

/**
 * Delete a user (admin only)
 */
export async function deleteUserByAdmin(userId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, message: "notAuthorized" }
    }

    // Prevent admin from deleting themselves
    if (userId === session.user.id) {
      return { success: false, message: "cannotDeleteSelf" }
    }

    await dbConnect()
    const result = await User.findByIdAndDelete(userId)

    if (!result) {
      return { success: false, message: "userNotFound" }
    }

    // TODO: Consider deleting related data (e.g., addresses, subscriptions) or handling it via schema options.

    return { success: true, message: "userDeleted" }
  } catch (error) {
    console.error("Error deleting user by admin:", error)
    return { success: false, message: "deleteFailed" }
  }
}
