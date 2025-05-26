"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import { UserQueries } from "@/lib/db/query-builders"
import User from "@/lib/db/models/user"

/**
 * Get all users with pagination, filtering, and sorting (admin only)
 */
export async function getAllUsers(
  page = 1,
  limit = 20,
  searchTerm?: string,
  roleFilter?: string[],
  sortField: string = "name",
  sortDirection: "asc" | "desc" = "asc"
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
      query.$or = [
        { name: { $regex: searchTerm, $options: "i" } },
        { email: { $regex: searchTerm, $options: "i" } }
      ]
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
      User.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query)
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
      totalPages: Math.ceil(total / limit)
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
    const updatedUser = await User.findByIdAndUpdate(userId, { roles }, { new: true, select: "roles" }).lean()

    if (!updatedUser) {
      return { success: false, message: "userNotFound" }
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
