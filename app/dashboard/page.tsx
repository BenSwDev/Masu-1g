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

  // Connect to DB to get the latest user data
  await dbConnect()
  const user = await User.findById(session.user?.id).select('activeRole roles')
  
  if (!user) {
    redirect("/auth/login")
  }

  // Get the actual active role from the database
  let activeRole = user.activeRole
  const roles = user.roles || []

  // Ensure activeRole is valid
  if (!activeRole || !roles.includes(activeRole)) {
    // Set a default active role based on priority
    if (roles.includes("admin")) {
      activeRole = "admin"
    } else if (roles.includes("professional")) {
      activeRole = "professional"
    } else if (roles.includes("partner")) {
      activeRole = "partner"
    } else {
      activeRole = "member"
    }
    
    // Update the user's active role in the database
    user.activeRole = activeRole
    await user.save()
  }

  // Redirect to the active role's dashboard
  redirect(`/dashboard/${activeRole}`)
}
