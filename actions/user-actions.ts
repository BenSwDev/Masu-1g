import User from "@/lib/db/models/user"
import dbConnect from "@/lib/db/mongoose"
import { sendSuccess, sendError } from "@/lib/utils/utils"

export async function getUsers() {
  try {
    await dbConnect()
    const users = await User.find({})
    return sendSuccess("Users retrieved successfully", users)
  } catch (error: any) {
    return sendError("Failed to retrieve users", error.message)
  }
}

export async function getUserById(id: string) {
  try {
    await dbConnect()
    const user = await User.findById(id)
    if (!user) {
      return sendError("User not found")
    }
    return sendSuccess("User retrieved successfully", user)
  } catch (error: any) {
    return sendError("Failed to retrieve user", error.message)
  }
}

export async function createUser(userData: any) {
  try {
    await dbConnect()

    const existingUser = await User.findOne({ email: userData.email })

    if (existingUser) {
      return sendError("User with this email already exists")
    }

    const newUser = new User(userData)
    await newUser.save()

    return sendSuccess("User created successfully", newUser)
  } catch (error: any) {
    return sendError("Failed to create user", error.message)
  }
}

export async function updateUser(id: string, userData: any) {
  try {
    await dbConnect()

    const user = await User.findById(id)

    if (!user) {
      return sendError("User not found")
    }

    const existingUserWithEmail = await User.findOne({
      email: userData.email,
      _id: { $ne: id },
    })

    if (existingUserWithEmail) {
      return sendError("Email already in use by another user")
    }

    const updatedUser = await User.findByIdAndUpdate(id, userData, {
      new: true,
      runValidators: true,
    })

    if (!updatedUser) {
      return sendError("Failed to update user")
    }

    return sendSuccess("User updated successfully", updatedUser)
  } catch (error: any) {
    return sendError("Failed to update user", error.message)
  }
}

export async function deleteUser(id: string) {
  try {
    await dbConnect()

    const user = await User.findByIdAndDelete(id)

    if (!user) {
      return sendError("User not found")
    }

    return sendSuccess("User deleted successfully")
  } catch (error: any) {
    return sendError("Failed to delete user", error.message)
  }
}
