import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { getAllUsers } from "@/actions/admin-actions"
import { UserManagement } from "@/components/dashboard/admin/user-management"

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/login")
  }

  // Check if user has admin role
  if (!session.user.roles?.includes("admin")) {
    redirect("/dashboard")
  }

  // Fetch all users
  const result = await getAllUsers()
  const users = result.success ? result.users : []

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">User Management</h1>
        <p className="text-gray-600">Manage users and their roles.</p>
      </div>

      <UserManagement users={users} />
    </div>
  )
}
