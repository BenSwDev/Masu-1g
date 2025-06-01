"use server"

import { getServerSession } from "next-auth/next"
import { authOptions, hashPassword, validatePassword, validateEmail, validatePhone } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import User from "@/lib/db/models/user"
import { UserQueries } from "@/lib/db/query-builders"
import { logger } from "@/lib/logs/logger"
import { revalidatePath } from "next/cache"

// Existing functions (makeUserAdmin, removeAdminRole) are assumed to be here.
// If not, they should be added or this file created.

export async function makeUserAdmin(userId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.roles?.includes("admin")) {
    return { success: false, message: "notAuthorized" }
  }

  try {
    await dbConnect()
    const user = await User.findById(userId)
    if (!user) {
      return { success: false, message: "userNotFound" }
    }
    if (!user.roles.includes("admin")) {
      user.roles.push("admin")
      await user.save()
    }
    revalidatePath("/dashboard/admin/users")
    return { success: true, message: "userPromotedToAdmin" }
  } catch (error) {
    logger.error(`[admin-actions] Error making user admin: ${userId}`, error)
    return { success: false, message: "operationFailed" }
  }
}

export async function removeAdminRole(userId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.roles?.includes("admin")) {
    return { success: false, message: "notAuthorized" }
  }
  // Prevent admin from removing their own admin role if they are the only admin or through this specific action
  if (session.user.id === userId) {
    // Add logic here to check if they are the sole admin if necessary
    // For now, let's prevent self-demotion via this simple action.
    // They can manage roles via the edit user form.
    return { success: false, message: "cannotRemoveOwnAdminRoleHere" }
  }

  try {
    await dbConnect()
    const user = await User.findById(userId)
    if (!user) {
      return { success: false, message: "userNotFound" }
    }
    if (user.roles.includes("admin")) {
      // Ensure user always has at least one role, default to 'member' if 'admin' is the only one.
      if (user.roles.length === 1 && user.roles[0] === "admin") {
        user.roles = ["member"] // Or return error: "cannotRemoveLastRole"
      } else {
        user.roles = user.roles.filter((role) => role !== "admin")
      }
      await user.save()
    }
    revalidatePath("/dashboard/admin/users")
    return { success: true, message: "adminRoleRemoved" }
  } catch (error) {
    logger.error(`[admin-actions] Error removing admin role: ${userId}`, error)
    return { success: false, message: "operationFailed" }
  }
}

export async function adminAddUser(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.roles?.includes("admin")) {
    return { success: false, message: "notAuthorized" }
  }

  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const phone = formData.get("phone") as string | undefined
  const password = formData.get("password") as string
  const gender = formData.get("gender") as string | undefined
  const roles = formData.getAll("roles") as string[]

  const day = formData.get("day") as string
  const month = formData.get("month") as string
  const year = formData.get("year") as string
  let dateOfBirth: Date | undefined
  if (day && month && year) {
    dateOfBirth = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`)
    if (isNaN(dateOfBirth.getTime())) {
      return { success: false, message: "invalidDateOfBirth" }
    }
  }

  if (!name || !email || !password) {
    return { success: false, message: "missingRequiredFields" }
  }
  if (!validateEmail(email)) {
    return { success: false, message: "invalidEmail" }
  }
  if (phone && !validatePhone(phone)) {
    // Validate phone only if provided
    return { success: false, message: "invalidPhone" }
  }
  const passwordValidation = validatePassword(password)
  if (!passwordValidation.isValid) {
    return { success: false, message: "weakPassword", errors: passwordValidation.errors }
  }
  if (roles.length === 0) {
    return { success: false, message: "rolesRequired" }
  }

  try {
    await dbConnect()
    const emailExists = await UserQueries.emailExists(email)
    if (emailExists) {
      return { success: false, message: "emailExists" }
    }
    if (phone) {
      const phoneExists = await UserQueries.phoneExists(phone)
      if (phoneExists) {
        return { success: false, message: "phoneExists" }
      }
    }

    const hashedPassword = await hashPassword(password)
    const newUser = new User({
      name,
      email: email.toLowerCase(),
      phone: phone || undefined, // Store as undefined if empty
      password: hashedPassword,
      gender: gender || undefined,
      dateOfBirth,
      roles,
      activeRole: roles.includes("member") ? "member" : roles[0], // Default active role
    })
    await newUser.save()
    revalidatePath("/dashboard/admin/users")
    return { success: true, message: "userAddedSuccessfully", user: JSON.parse(JSON.stringify(newUser)) }
  } catch (error) {
    logger.error("[admin-actions] Error adding user:", error)
    return { success: false, message: "operationFailed" }
  }
}

export async function adminEditUser(userId: string, formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.roles?.includes("admin")) {
    return { success: false, message: "notAuthorized" }
  }

  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const phone = formData.get("phone") as string | undefined
  const password = formData.get("password") as string | undefined
  const gender = formData.get("gender") as string | undefined
  const roles = formData.getAll("roles") as string[]

  const day = formData.get("day") as string
  const month = formData.get("month") as string
  const year = formData.get("year") as string
  let dateOfBirth: Date | null = null // Use null for potential clearing
  if (day && month && year) {
    dateOfBirth = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`)
    if (isNaN(dateOfBirth.getTime())) {
      return { success: false, message: "invalidDateOfBirth" }
    }
  }

  if (!name || !email) {
    return { success: false, message: "missingRequiredFields" }
  }
  if (!validateEmail(email)) {
    return { success: false, message: "invalidEmail" }
  }
  if (phone && !validatePhone(phone)) {
    return { success: false, message: "invalidPhone" }
  }
  if (password) {
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      return { success: false, message: "weakPassword", errors: passwordValidation.errors }
    }
  }
  if (roles.length === 0) {
    return { success: false, message: "rolesRequired" }
  }

  try {
    await dbConnect()
    const user = await User.findById(userId)
    if (!user) {
      return { success: false, message: "userNotFound" }
    }

    // Check for email conflict
    if (email.toLowerCase() !== user.email) {
      const emailExists = await UserQueries.emailExists(email, userId)
      if (emailExists) {
        return { success: false, message: "emailExists" }
      }
      user.email = email.toLowerCase()
    }

    // Check for phone conflict
    if (phone && phone !== user.phone) {
      const phoneExists = await UserQueries.phoneExists(phone) // UserQueries.phoneExists should handle exclusion if needed or be adapted
      if (phoneExists) {
        const conflictingUser = await User.findOne({ phone: phone })
        if (conflictingUser && conflictingUser._id.toString() !== userId) {
          return { success: false, message: "phoneExists" }
        }
      }
      user.phone = phone
    } else if (!phone && user.phone) {
      user.phone = undefined
    }

    user.name = name
    user.gender = gender || undefined
    user.dateOfBirth = dateOfBirth === null ? undefined : dateOfBirth

    if (password) {
      user.password = await hashPassword(password)
    }

    // Roles update
    user.roles = roles
    // Update activeRole if current activeRole is no longer in roles list
    if (user.activeRole && !roles.includes(user.activeRole)) {
      user.activeRole = roles.includes("member") ? "member" : roles[0]
    } else if (!user.activeRole) {
      user.activeRole = roles.includes("member") ? "member" : roles[0]
    }

    await user.save()
    revalidatePath("/dashboard/admin/users")
    return { success: true, message: "userUpdatedSuccessfully", user: JSON.parse(JSON.stringify(user)) }
  } catch (error) {
    logger.error(`[admin-actions] Error editing user: ${userId}`, error)
    return { success: false, message: "operationFailed" }
  }
}

export async function adminDeleteUser(userId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.roles?.includes("admin")) {
    return { success: false, message: "notAuthorized" }
  }
  if (session.user.id === userId) {
    return { success: false, message: "cannotDeleteSelf" }
  }

  try {
    await dbConnect()
    const user = await User.findById(userId)
    if (!user) {
      return { success: false, message: "userNotFound" }
    }
    await User.findByIdAndDelete(userId)
    revalidatePath("/dashboard/admin/users")
    return { success: true, message: "userDeletedSuccessfully" }
  } catch (error) {
    logger.error(`[admin-actions] Error deleting user: ${userId}`, error)
    return { success: false, message: "operationFailed" }
  }
}

export async function updateUserRoles(userId: string, roles: string[]) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.roles?.includes("admin")) {
    return { success: false, message: "notAuthorized" }
  }

  if (roles.length === 0) {
    return { success: false, message: "rolesRequired" }
  }
  // Prevent admin from removing their own admin role if they are the only admin or through this specific action
  if (session.user.id === userId && !roles.includes("admin")) {
    // Add logic here to check if they are the sole admin if necessary
    // For now, let's prevent self-demotion of admin role.
    const userToUpdate = await User.findById(userId)
    if (userToUpdate?.roles.includes("admin")) {
      // if user was admin
      return { success: false, message: "cannotRemoveOwnAdminRoleHere" }
    }
  }

  try {
    await dbConnect()
    const user = await User.findById(userId)
    if (!user) {
      return { success: false, message: "userNotFound" }
    }

    user.roles = roles
    // Update activeRole if current activeRole is no longer in roles list
    if (user.activeRole && !roles.includes(user.activeRole)) {
      user.activeRole = roles.includes("member") ? "member" : roles[0]
    } else if (!user.activeRole) {
      user.activeRole = roles.includes("member") ? "member" : roles[0]
    }

    await user.save()
    revalidatePath("/dashboard/admin/users")
    return { success: true, message: "userRolesUpdated" }
  } catch (error) {
    logger.error(`[admin-actions] Error updating user roles: ${userId}`, error)
    return { success: false, message: "operationFailed" }
  }
}

// Add the getAllUsers function here
export async function getAllUsers(
  page = 1,
  limit = 10,
  search?: string,
  roles?: string[],
  sortField = "name",
  sortDirection: "asc" | "desc" = "asc",
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.roles?.includes("admin")) {
    logger.warn("[admin-actions] Unauthorized attempt to getAllUsers by user:", session?.user?.email)
    return { success: false, message: "notAuthorized", users: [], totalPages: 0, count: 0 }
  }

  try {
    await dbConnect()

    const query: any = {}
    if (search) {
      const searchRegex = { $regex: search, $options: "i" }
      query.$or = [{ name: searchRegex }, { email: searchRegex }, { phone: searchRegex }]
    }
    if (roles && roles.length > 0) {
      query.roles = { $in: roles }
    }

    const sortOptions: any = {}
    if (sortField && sortDirection) {
      sortOptions[sortField] = sortDirection === "asc" ? 1 : -1
    } else {
      sortOptions["createdAt"] = -1 // Default sort
    }

    const count = await User.countDocuments(query)
    const usersData = await User.find(query)
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(limit)
      .select("-password") // Exclude password
      .lean() // Use lean for better performance

    return {
      success: true,
      users: JSON.parse(JSON.stringify(usersData)), // Ensure plain objects for serialization
      totalPages: Math.ceil(count / limit),
      count: count,
    }
  } catch (error) {
    logger.error("[admin-actions] Error fetching all users:", error)
    return { success: false, message: "operationFailed", users: [], totalPages: 0, count: 0 }
  }
}
