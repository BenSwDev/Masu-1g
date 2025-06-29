import { redirect } from "next/navigation"
import { requireUserSession } from "@/lib/auth/require-session"
import { getAllUsers, getUserStatistics } from "./actions"
import { UserManagement, type UserData } from "@/components/dashboard/admin/user-management/user-management"

export const dynamic = "force-dynamic"

export interface RoleCounts {
  members: number
  professionals: number
  partners: number
}

interface AdminUsersPageProps {
  searchParams: {
    // No longer a Promise, Next.js 13+ provides it directly
    page?: string
    search?: string
    roles?: string // For filtering, if kept
    sortField?: string
    sortDirection?: "asc" | "desc"
  }
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const session = await requireUserSession()
  if (!session.user.roles?.includes("admin")) {
    redirect("/dashboard")
  }

  const page = Number.parseInt(searchParams.page || "1")
  const search = searchParams.search
  const roleFilterParams = searchParams.roles ? searchParams.roles.split(",") : undefined
  const sortField = searchParams.sortField || "name"
  const sortDirection = searchParams.sortDirection || "asc"

  // Fetch users
  const usersResult = await getAllUsers(
    page,
    10,
    search,
    roleFilterParams,
    sortField,
    sortDirection as "asc" | "desc",
  )

  const users: UserData[] = usersResult.success ? usersResult.users : []
  const totalPages = usersResult.totalPages || 1

  // Fetch user statistics
  const statsResult = await getUserStatistics()
  const roleCounts: RoleCounts = statsResult.success && statsResult.roleCounts
    ? statsResult.roleCounts
    : { members: 0, professionals: 0, partners: 0 }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">User Management</h1>
        <p className="text-muted-foreground">Manage users, their roles, and system access.</p>
      </div>

      <UserManagement
        initialUsers={users}
        totalPages={totalPages}
        currentPage={page}
        initialSearchTerm={search}
        initialRoleFilter={roleFilterParams}
        initialSortField={sortField}
        initialSortDirection={sortDirection as "asc" | "desc"}
        roleCounts={roleCounts}
      />
    </div>
  )
}
