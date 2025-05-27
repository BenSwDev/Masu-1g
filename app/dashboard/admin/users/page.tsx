import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { getAllUsers } from "@/actions/admin-actions"
import { UserManagement } from "@/components/dashboard/admin/user-management"

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    roles?: string
    sortField?: string
    sortDirection?: "asc" | "desc"
  }>
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/login")
  }

  // Check if user has admin role
  if (!session.user.roles?.includes("admin")) {
    redirect("/dashboard")
  }

  // Await and parse search params
  const params = await searchParams
  const page = parseInt(params.page || "1")
  const search = params.search
  const roles = params.roles ? params.roles.split(",") : undefined
  const sortField = params.sortField || "name"
  const sortDirection = params.sortDirection || "asc"

  // Fetch users with filters
  const result = await getAllUsers(page, 10, search, roles, sortField, sortDirection as "asc" | "desc")
  const users = result.success ? result.users : []

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">User Management</h1>
        <p className="text-gray-600">Manage users and their roles.</p>
      </div>

      <UserManagement 
        users={users} 
        totalPages={result.totalPages || 1}
        currentPage={page}
        searchTerm={search}
        roleFilter={roles}
        sortField={sortField}
        sortDirection={sortDirection as "asc" | "desc"}
      />
    </div>
  )
}
