"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import User from "@/lib/db/models/user"
import { revalidatePath } from "next/cache"

/**
 * Get all available roles
 */
async function getAvailableRoles(): Promise<string[]> {
  // This could be fetched from a database in the future
  // For now, we'll return the hardcoded roles
  return ["member", "admin", "professional", "partner"]
}

/**
 * Switch the active role for the current user
 */
async function switchActiveRole(role: string): Promise<{
  success: boolean
  message: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, message: "notAuthenticated" }
    }

    // Check if user has the requested role
    if (!session.user.roles.includes(role)) {
      return { success: false, message: "roleNotAssigned" }
    }

    // The role switching is handled in the client side by updating the session
    // We just validate here and revalidate paths
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/admin")
    revalidatePath("/dashboard/profile")
    revalidatePath("/dashboard/account")

    return { success: true, message: "roleSwitched" }
  } catch (error) {
    console.error("Error switching role:", error)
    return { success: false, message: "switchFailed" }
  }
}

/**
 * Add a role to a user (admin only)
 */
async function addRoleToUser(
  userId: string,
  role: string,
): Promise<{
  success: boolean
  message: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, message: "notAuthenticated" }
    }

    // Check if current user is an admin
    if (!session.user.roles.includes("admin")) {
      return { success: false, message: "notAuthorized" }
    }

    // Check if role is valid
    const availableRoles = await getAvailableRoles()
    if (!availableRoles.includes(role)) {
      return { success: false, message: "invalidRole" }
    }

    await dbConnect()

    // Find user and update roles
    const user = await User.findById(userId)
    if (!user) {
      return { success: false, message: "userNotFound" }
    }

    // Add role if not already assigned
    if (!user.roles.includes(role)) {
      user.roles.push(role)
      await user.save()
    }

    return { success: true, message: "roleAdded" }
  } catch (error) {
    console.error("Error adding role:", error)
    return { success: false, message: "addFailed" }
  }
}

/**
 * Remove a role from a user (admin only)
 */
async function removeRoleFromUser(
  userId: string,
  role: string,
): Promise<{
  success: boolean
  message: string
}> {
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

    // Find user and update roles
    const user = await User.findById(userId)
    if (!user) {
      return { success: false, message: "userNotFound" }
    }

    // Don't allow removing the last role
    if (user.roles.length <= 1) {
      return { success: false, message: "cannotRemoveLastRole" }
    }

    // Remove role if assigned
    if (user.roles.includes(role)) {
      user.roles = user.roles.filter((r) => r !== role)
      await user.save()
    }

    return { success: true, message: "roleRemoved" }
  } catch (error) {
    console.error("Error removing role:", error)
    return { success: false, message: "removeFailed" }
  }
}

/**
 * Set the active role for the current user in the database
 */
export async function setActiveRole(role: string): Promise<{
  success: boolean
  message: string
  activeRole?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, message: "notAuthenticated" }
    }
    await dbConnect()
    const user = await User.findById(session.user.id)
    if (!user) {
      return { success: false, message: "userNotFound" }
    }
    // Check if user has the requested role
    if (!user.roles.includes(role)) {
      // Fallback to default role
      const fallback = user.roles.includes("admin") ? "admin"
        : user.roles.includes("professional") ? "professional"
        : user.roles.includes("partner") ? "partner"
        : "member"
      user.activeRole = fallback
      await user.save()
      
      // Revalidate dashboard paths for fallback role
      revalidatePath("/dashboard")
      revalidatePath(`/dashboard/${fallback}`)
      
      return { success: false, message: "roleNotAssigned", activeRole: fallback }
    }
    user.activeRole = role
    await user.save()
    
    // Revalidate dashboard paths to ensure UI consistency
    revalidatePath("/dashboard")
    revalidatePath(`/dashboard/${role}`)
    
    return { success: true, message: "activeRoleUpdated", activeRole: role }
  } catch (error) {
    console.error("Error setting active role:", error)
    return { success: false, message: "setActiveRoleFailed" }
  }
}
