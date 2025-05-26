import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/login")
  }

  const activeRole = session.user?.activeRole || "member"
  const roles = session.user?.roles || []

  // Redirect to role-specific dashboard
  if (roles.includes("admin")) {
    redirect("/dashboard/admin")
  } else if (roles.includes("professional")) {
    redirect("/dashboard/professional")
  } else if (roles.includes("partner")) {
    redirect("/dashboard/partner")
  } else {
    redirect("/dashboard/member")
  }

  // This part won't be reached due to redirects, but TypeScript needs it
  return null
}
