import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"

// Force dynamic rendering to prevent build-time database connections
export const dynamic = 'force-dynamic'


export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/login")
  }

  const activeRole = session.user?.activeRole || "member"
  const roles = session.user?.roles || []

  // Ensure activeRole is valid
  if (!roles.includes(activeRole)) {
    // fallback to first available role
    if (roles.includes("admin")) {
      redirect("/dashboard/(user)/(roles)/admin")
    } else if (roles.includes("professional")) {
      redirect("/dashboard/(user)/(roles)/professional")
    } else if (roles.includes("partner")) {
      redirect("/dashboard/(user)/(roles)/partner")
    } else {
      redirect("/dashboard/(user)/(roles)/member")
    }
  }

  // Redirect to the active role's dashboard
  redirect(`/dashboard/(user)/(roles)/${activeRole}`)
}
