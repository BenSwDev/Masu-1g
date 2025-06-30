import { getServerSession } from "next-auth"
import { authOptions } from "./auth"
import { redirect } from "next/navigation"

export async function requireUserSession() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      redirect("/auth/login")
    }
    return session
  } catch (error) {
    console.error("Error fetching user session", error)
    redirect("/auth/login")
  }
}
