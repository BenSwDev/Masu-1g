import { redirect } from "next/navigation"
import { requireUserSession } from "./require-session"

export async function requireAdminSession() {
  try {
    const session = await requireUserSession()
    if (!session.user.roles.includes("admin")) {
      redirect("/dashboard")
    }
    return session
  } catch (error) {
    console.error("Error fetching admin session", error)
    redirect("/auth/login")
  }
}
