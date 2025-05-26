import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"

export default async function ProfessionalDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/login")
  }

  // Check if user has professional role or if their active role is professional
  if (!session.user.roles?.includes("professional") && session.user.activeRole !== "professional") {
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

      {/* Professional-specific content */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Services</h2>
          <p className="text-gray-600">Manage your professional services.</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Appointments</h2>
          <p className="text-gray-600">View and manage your appointments.</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Reviews</h2>
          <p className="text-gray-600">See reviews from your clients.</p>
        </div>
      </div>
    </div>
  )
}
