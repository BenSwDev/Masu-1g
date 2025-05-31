"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { connectDB } from "@/lib/db/mongoose"
import User, { UserRole } from "@/lib/db/models/user"
import { UserQueries } from "@/lib/db/query-builders"
import bcrypt from "bcryptjs"
import { z } from "zod"

// Validation schemas
const userFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone must be at least 10 characters"),
  gender: z.enum(["male", "female", "other"]),
  dateOfBirth: z.string().optional(),
  roles: z.array(z.enum([UserRole.MEMBER, UserRole.PROFESSIONAL, UserRole.PARTNER, UserRole.ADMIN])),
  activeRole: z.enum([UserRole.MEMBER, UserRole.PROFESSIONAL, UserRole.PARTNER, UserRole.ADMIN]).optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
})

const updateUserSchema = userFormSchema.extend({
  id: z.string(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
})

type UserFormData = z.infer<typeof userFormSchema>
type UpdateUserData = z.infer<typeof updateUserSchema>

export async function createUser(data: UserFormData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.activeRole !== "admin") {
      return { success: false, error: "Unauthorized" }
    }

    await connectDB()

    // Validate input
    const validatedData = userFormSchema.parse(data)

    // Check if email exists
    const emailExists = await UserQueries.emailExists(validatedData.email)
    if (emailExists) {
      return { success: false, error: "Email already exists" }
    }

    // Check if phone exists
    const phoneExists = await UserQueries.phoneExists(validatedData.phone)
    if (phoneExists) {
      return { success: false, error: "Phone number already exists" }
    }

    // Hash password
    const hashedPassword = validatedData.password
      ? await bcrypt.hash(validatedData.password, 12)
      : await bcrypt.hash("123456", 12) // Default password

    // Create user
    const userData = {
      ...validatedData,
      password: hashedPassword,
      dateOfBirth: validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : undefined,
      activeRole: validatedData.activeRole || validatedData.roles[0],
    }

    const user = await User.create(userData)

    revalidatePath("/dashboard/admin/users")
    return { success: true, data: user.toObject() }
  } catch (error) {
    console.error("Create user error:", error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: "Failed to create user" }
  }
}

export async function updateUser(data: UpdateUserData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.activeRole !== "admin") {
      return { success: false, error: "Unauthorized" }
    }

    await connectDB()

    // Validate input
    const validatedData = updateUserSchema.parse(data)

    // Check if email exists (excluding current user)
    const emailExists = await UserQueries.emailExists(validatedData.email, validatedData.id)
    if (emailExists) {
      return { success: false, error: "Email already exists" }
    }

    // Find user
    const user = await User.findById(validatedData.id)
    if (!user) {
      return { success: false, error: "User not found" }
    }

    // Prepare update data
    const updateData: any = {
      name: validatedData.name,
      email: validatedData.email,
      phone: validatedData.phone,
      gender: validatedData.gender,
      roles: validatedData.roles,
      activeRole: validatedData.activeRole || validatedData.roles[0],
    }

    if (validatedData.dateOfBirth) {
      updateData.dateOfBirth = new Date(validatedData.dateOfBirth)
    }

    // Hash password if provided
    if (validatedData.password) {
      updateData.password = await bcrypt.hash(validatedData.password, 12)
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(validatedData.id, updateData, { new: true, select: "-password" })

    revalidatePath("/dashboard/admin/users")
    return { success: true, data: updatedUser?.toObject() }
  } catch (error) {
    console.error("Update user error:", error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: "Failed to update user" }
  }
}

export async function deleteUser(userId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.activeRole !== "admin") {
      return { success: false, error: "Unauthorized" }
    }

    await connectDB()

    // Don't allow deleting self
    if (userId === session.user.id) {
      return { success: false, error: "Cannot delete your own account" }
    }

    // Find and delete user
    const user = await User.findByIdAndDelete(userId)
    if (!user) {
      return { success: false, error: "User not found" }
    }

    revalidatePath("/dashboard/admin/users")
    return { success: true }
  } catch (error) {
    console.error("Delete user error:", error)
    return { success: false, error: "Failed to delete user" }
  }
}

export async function getUsers(page = 1, limit = 20, search?: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.activeRole !== "admin") {
      return { success: false, error: "Unauthorized" }
    }

    await connectDB()

    let filter = {}
    if (search) {
      filter = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
        ],
      }
    }

    const result = await UserQueries.findForAdmin(page, limit, filter)

    return { success: true, data: result }
  } catch (error) {
    console.error("Get users error:", error)
    return { success: false, error: "Failed to fetch users" }
  }
}

export async function getUserById(userId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.activeRole !== "admin") {
      return { success: false, error: "Unauthorized" }
    }

    await connectDB()

    const user = await User.findById(userId).select("-password").lean()
    if (!user) {
      return { success: false, error: "User not found" }
    }

    return { success: true, data: user }
  } catch (error) {
    console.error("Get user error:", error)
    return { success: false, error: "Failed to fetch user" }
  }
}

export async function bulkDeleteUsers(userIds: string[]) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.activeRole !== "admin") {
      return { success: false, error: "Unauthorized" }
    }

    await connectDB()

    // Don't allow deleting self
    const filteredIds = userIds.filter((id) => id !== session.user.id)

    if (filteredIds.length === 0) {
      return { success: false, error: "No valid users to delete" }
    }

    const result = await User.deleteMany({ _id: { $in: filteredIds } })

    revalidatePath("/dashboard/admin/users")
    return { success: true, deletedCount: result.deletedCount }
  } catch (error) {
    console.error("Bulk delete users error:", error)
    return { success: false, error: "Failed to delete users" }
  }
}
