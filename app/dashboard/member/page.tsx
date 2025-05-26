import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"

export default async function MemberDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/login")
  }

  // Check if user has member role or if their active role is member
  if (!session.user.roles?.includes("member") && session.user.activeRole !== "member") {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Member Dashboard</h1>
        <p className="text-gray-600">Welcome, {session.user?.name || session.user?.email}!</p>
        <p className="text-sm text-gray-500 mt-2">You are viewing the member dashboard.</p>
      </div>

      {/* Member-specific content */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">My Profile</h2>
          <p className="text-gray-600">View and edit your profile information.</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Recent Activity</h2>
          <p className="text-gray-600">Your recent activities will be shown here.</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Notifications</h2>
          <p className="text-gray-600">Your notifications will be displayed here.</p>
        </div>
      </div>
    </div>
  )
}
