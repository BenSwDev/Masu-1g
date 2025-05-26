import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/login")
  }

  // Check if user has admin role or if their active role is admin
  if (!session.user.roles?.includes("admin") && session.user.activeRole !== "admin") {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Welcome to the admin dashboard. You have access to administrative features.</p>
        <p className="text-sm text-gray-500 mt-2">You are viewing the admin dashboard.</p>
      </div>

      {/* Admin-specific content */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">User Management</h2>
          <p className="text-gray-600">Manage users and their roles.</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">System Settings</h2>
          <p className="text-gray-600">Configure system settings and preferences.</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Analytics</h2>
          <p className="text-gray-600">View system analytics and reports.</p>
        </div>
      </div>
    </div>
  )
}
