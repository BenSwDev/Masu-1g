import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"

export default async function PartnerDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/login")
  }

  // Check if user has partner role or if their active role is partner
  if (!session.user.roles?.includes("partner") && session.user.activeRole !== "partner") {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Partner Dashboard</h1>
        <p className="text-gray-600">Welcome to the partner dashboard. You have access to partner features.</p>
        <p className="text-sm text-gray-500 mt-2">You are viewing the partner dashboard.</p>
      </div>

      {/* Partner-specific content */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Partnership Program</h2>
          <p className="text-gray-600">View your partnership program details.</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Referrals</h2>
          <p className="text-gray-600">Track your referrals and commissions.</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Marketing Materials</h2>
          <p className="text-gray-600">Access marketing materials and resources.</p>
        </div>
      </div>
    </div>
  )
}
