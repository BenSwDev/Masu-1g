import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"

// Force dynamic rendering to prevent build-time database connections
export const dynamic = 'force-dynamic'

export default async function ProfessionalDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/login")
  }

  // Only redirect if activeRole is not professional
  if (session.user.activeRole !== "professional") {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Professional Dashboard</h1>
        <p className="text-gray-600">
          Welcome to the professional dashboard. You have access to professional features.
        </p>
        <p className="text-sm text-gray-500 mt-2">You are viewing the professional dashboard.</p>
      </div>
    </div>
  )
}
