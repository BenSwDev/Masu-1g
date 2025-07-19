import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import dbConnect from "@/lib/db/mongoose"
import User from "@/lib/db/models/user"

// Force dynamic rendering to prevent build-time database connections
export const dynamic = 'force-dynamic'


export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/login")
  }

  const activeRole = session.user?.activeRole || "member"
  const roles = session.user?.roles || ["member"]

  // Ensure activeRole is valid and roles array exists
  if (!roles.length || !roles.includes(activeRole)) {
    // Fallback to first available role based on priority
    let fallbackRole = "member"
    if (roles.includes("admin")) {
      fallbackRole = "admin"
    } else if (roles.includes("professional")) {
      fallbackRole = "professional"
    } else if (roles.includes("partner")) {
      fallbackRole = "partner"
    }
    
    // If we had to fallback, update the user's activeRole in the database
    if (fallbackRole !== activeRole) {
      try {
        await dbConnect()
        await User.findByIdAndUpdate(session.user.id, { activeRole: fallbackRole })
      } catch (error) {
        console.error("Error updating activeRole fallback:", error)
      }
    }
    
    redirect(`/dashboard/${fallbackRole}`)
  }

  // Redirect to the active role's dashboard
  redirect(`/dashboard/${activeRole}`)
}
