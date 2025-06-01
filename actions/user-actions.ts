"use server"

import { revalidatePath } from "next/cache"
import User, { type IUser, type UserRole } from "@/lib/db/models/user" // Assuming User is default export, IUser and UserRole are named
import dbConnect from "@/lib/db/mongoose" // Assuming dbConnect is the default or named export for connecting
import type { CreateUserSchemaType, UpdateUserFormSchemaType } from "@/lib/validation/user-schemas" // Assuming these types are defined
import bcrypt from "bcryptjs"
// Assuming sendError and sendSuccess are utility functions you have defined elsewhere
// For this fix, getUsers will directly return the PaginatedUsersResult or throw an error for the page to catch.
// If you prefer sendSuccess/sendError, ensure they wrap the PaginatedUsersResult structure.

export interface PaginatedUsersResult {
  users: Partial<IUser>[] // Use Partial<IUser> or a more specific DTO if UserColumn is different
  total: number
  page: number
  totalPages: number
  success: boolean // Added to indicate status
  message?: string // Optional message
}

/**
 * Fetches a paginated list of users.
 * @param page - The page number to fetch.
 * @param limit - The number of users per page.
 * @param filter - Optional filter criteria (not implemented in this basic version).
 * @returns A promise that resolves to the paginated list of users.
 */
export async function getUsers({
  page = 1,
  limit = 10,
  filter, // filter is not used in this simplified example but kept for signature consistency
}: {
  page?: number
  limit?: number
  filter?: any
}): Promise<PaginatedUsersResult> {
  try {
    await dbConnect()

    const skip = (page - 1) * limit
    const totalUsers = await User.countDocuments(filter || {}) // Apply filter if provided
    const usersData = await User.find(filter || {}) // Apply filter if provided
      .sort({ createdAt: -1 }) // Example sort
      .skip(skip)
      .limit(limit)
      .lean() // Use .lean() for plain JS objects, faster for read-only
      .exec()

    const totalPages = Math.ceil(totalUsers / limit)

    // Ensure the returned user objects are serializable and match what UserColumn expects.
    // .lean() helps, but explicit mapping or ensuring IUser is serializable is good.
    // For simplicity, we assume .lean() provides sufficiently serializable objects.
    // If User model has methods or virtuals not present in lean(), adjust accordingly.
    const mappedUsers = usersData.map((user) => {
      const { password, ...userWithoutPassword } = user // Exclude password
      return JSON.parse(JSON.stringify(userWithoutPassword)) // Ensure serializability
    }) as Partial<IUser>[]

    return {
      users: mappedUsers,
      total: totalUsers,
      page,
      totalPages,
      success: true,
    }
  } catch (error) {
    console.error("Error fetching users:", error)
    // Return the expected structure with an empty users array on error
    return {
      users: [],
      total: 0,
      page: 1,
      totalPages: 1,
      success: false,
      message: "Failed to fetch users", // Or a more specific error message
    }
  }
}

// --- Other actions (createUser, updateUser, deleteUser) ---
// Ensure these actions also handle their return types consistently.
// For brevity, only getUsers is fully shown for this specific fix.

/**
 * Fetches a single user by ID.
 * @param userId - The ID of the user to fetch.
 * @returns A promise that resolves to the user object or null if not found.
 */
export async function getUserById(
  userId: string,
): Promise<{ user: Partial<IUser> | null; success: boolean; message?: string }> {
  try {
    await dbConnect()
    const userDoc = await User.findById(userId).lean().exec()
    if (!userDoc) {
      return { user: null, success: false, message: "User not found" }
    }
    const { password, ...userWithoutPassword } = userDoc
    return { user: JSON.parse(JSON.stringify(userWithoutPassword)), success: true }
  } catch (error) {
    console.error(`Error fetching user by ID ${userId}:`, error)
    return { user: null, success: false, message: "Failed to fetch user" }
  }
}

export async function createUser(data: CreateUserSchemaType) {
  try {
    await dbConnect()
    const existingEmail = await User.findOne({ email: data.email.toLowerCase() })
    if (existingEmail) {
      return { success: false, message: "validation.email.exists" }
    }
    if (data.phone) {
      const existingPhone = await User.findOne({ phone: data.phone })
      if (existingPhone) {
        return { success: false, message: "validation.phone.exists" }
      }
    }
    const hashedPassword = await bcrypt.hash(data.password, 10)
    const newUser = new User({
      ...data,
      email: data.email.toLowerCase(),
      password: hashedPassword,
      emailVerified: new Date(), // Or implement verification flow
      isActive: true,
    })
    await newUser.save()
    revalidatePath("/dashboard/admin/users")
    return {
      success: true,
      message: "admin.users.notifications.createSuccess",
      user: JSON.parse(JSON.stringify(newUser)),
    }
  } catch (error) {
    console.error("Error creating user:", error)
    return { success: false, message: "admin.users.notifications.createError" }
  }
}

export async function updateUser(userId: string, data: UpdateUserFormSchemaType) {
  try {
    await dbConnect()
    const user = await User.findById(userId)
    if (!user) {
      return { success: false, message: "admin.users.notifications.notFound" }
    }

    if (data.email && data.email.toLowerCase() !== user.email) {
      const existingEmail = await User.findOne({ email: data.email.toLowerCase(), _id: { $ne: userId } })
      if (existingEmail) {
        return { success: false, message: "validation.email.exists" }
      }
      user.email = data.email.toLowerCase()
    }
    if (data.phone && data.phone !== user.phone) {
      const existingPhone = await User.findOne({ phone: data.phone, _id: { $ne: userId } })
      if (existingPhone) {
        return { success: false, message: "validation.phone.exists" }
      }
      user.phone = data.phone
    }

    user.name = data.name
    if (data.gender) user.gender = data.gender as "male" | "female" | "other" | "prefer_not_to_say"
    if (data.dateOfBirth) user.dateOfBirth = data.dateOfBirth
    user.roles = data.roles as UserRole[]

    if (data.newPassword) {
      user.password = await bcrypt.hash(data.newPassword, 10)
    }

    await user.save()
    revalidatePath("/dashboard/admin/users")
    return { success: true, message: "admin.users.notifications.updateSuccess", user: JSON.parse(JSON.stringify(user)) }
  } catch (error) {
    console.error(`Error updating user ${userId}:`, error)
    return { success: false, message: "admin.users.notifications.updateError" }
  }
}

export async function deleteUser(userId: string) {
  try {
    await dbConnect()
    const result = await User.findByIdAndDelete(userId)
    if (!result) {
      return { success: false, message: "admin.users.notifications.notFound" }
    }
    revalidatePath("/dashboard/admin/users")
    return { success: true, message: "admin.users.notifications.deleteSuccess" }
  } catch (error) {
    console.error(`Error deleting user ${userId}:`, error)
    return { success: false, message: "admin.users.notifications.deleteError" }
  }
}
