import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { getAllUsers, getUserStatistics } from "@/actions/admin-actions"
import { UserManagement } from "@/components/dashboard/admin/user-management/user-management"

export const dynamic = "force-dynamic"

// Define a more specific type for the user data expected by UserManagement
// This can be co-located or defined where UserManagement expects it.
// For now, keeping it here for clarity of what the page provides.
export interface PageUserData {
  id: string
  name: string | null
  email: string | null
  image?: string | null
  phone?: string | null
  roles: string[]
  activeRole?: string | null
  dateOfBirth?: string | null // ISO string
  gender?: string | null
  createdAt: string // ISO string
  // Add other fields if UserManagement needs them
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
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/login")
  }

  if (!session.user.roles?.includes("admin")) {
    redirect("/dashboard")
  }

  const page = Number.parseInt(searchParams.page || "1")
  const search = searchParams.search
  // const roleFilterParams = searchParams.roles ? searchParams.roles.split(",") : undefined; // If role filter is kept
  const sortField = searchParams.sortField || "name"
  const sortDirection = searchParams.sortDirection || "asc"

  // Fetch users
  const usersResult = await getAllUsers(
    page,
    10,
    search,
    undefined, // roleFilterParams - temporarily undefined as per new reqs
    sortField,
    sortDirection as "asc" | "desc",
  )

  const users: PageUserData[] = usersResult.success
    ? usersResult.users.map((u) => ({
        ...u,
        name: u.name || null,
        email: u.email || null,
        image: u.image || null,
        phone: u.phone || null,
        dateOfBirth: u.dateOfBirth || null,
        gender: u.gender || null,
        createdAt: u.createdAt, // Already an ISO string from the action
      }))
    : []
  const totalPages = usersResult.totalPages || 1

  // Fetch user statistics
  const statsResult = await getUserStatistics()
  const roleCounts = statsResult.success ? statsResult.roleCounts : { members: 0, professionals: 0, partners: 0 }

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
        // initialRoleFilter={roleFilterParams} // If role filter is kept
        initialSortField={sortField}
        initialSortDirection={sortDirection as "asc" | "desc"}
        roleCounts={roleCounts}
      />
    </div>
  )
}
