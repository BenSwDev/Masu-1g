import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"

export async function createUser(data: FormData) {
  "use server"
  const session = await getServerSession(authOptions)

  if (session?.user?.role !== "admin") {
    return {
      error: "Unauthorized",
    }
  }

  const email = data.get("email") as string
  const role = data.get("role") as "admin" | "user"

  if (!email || !role) {
    return {
      error: "Missing fields",
    }
  }

  try {
    // TODO: Implement create user logic
    console.log("Creating user", { email, role })
    return {
      success: "User created",
    }
  } catch (error: any) {
    console.log(error)
    return {
      error: error.message,
    }
  }
}

export async function deleteUser(id: string) {
  "use server"
  const session = await getServerSession(authOptions)

  if (session?.user?.role !== "admin") {
    return {
      error: "Unauthorized",
    }
  }

  if (!id) {
    return {
      error: "Missing fields",
    }
  }

  try {
    // TODO: Implement delete user logic
    console.log("Deleting user", { id })
    return {
      success: "User deleted",
    }
  } catch (error: any) {
    console.log(error)
    return {
      error: error.message,
    }
  }
}

export async function updateUserRole(id: string, role: "admin" | "user") {
  "use server"
  const session = await getServerSession(authOptions)

  if (session?.user?.role !== "admin") {
    return {
      error: "Unauthorized",
    }
  }

  if (!id || !role) {
    return {
      error: "Missing fields",
    }
  }

  try {
    // TODO: Implement update user role logic
    console.log("Updating user role", { id, role })
    return {
      success: "User role updated",
    }
  } catch (error: any) {
    console.log(error)
    return {
      error: error.message,
    }
  }
}
