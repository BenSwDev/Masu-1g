import { Suspense } from "react"
import { getAllUsers, getUserStats } from "./actions"
import UserManagementClient from "@/components/dashboard/admin/user-management/user-management-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserCheck, UserX, Shield, Briefcase, User, Crown } from "lucide-react"

interface UsersPageProps {
  searchParams: {
    search?: string
    role?: string
    gender?: string
    emailVerified?: string
    phoneVerified?: string
    page?: string
    limit?: string
    sortBy?: string
    sortOrder?: string
  }
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  // Parse search params
  const filters = {
    search: searchParams.search || "",
    role: searchParams.role || "",
    gender: searchParams.gender || "",
    emailVerified:
      searchParams.emailVerified === "true"
        ? true
        : searchParams.emailVerified === "false"
          ? false
          : undefined,
    phoneVerified:
      searchParams.phoneVerified === "true"
        ? true
        : searchParams.phoneVerified === "false"
          ? false
          : undefined,
    page: parseInt(searchParams.page || "1"),
    limit: parseInt(searchParams.limit || "20"),
    sortBy: searchParams.sortBy || "createdAt",
    sortOrder: (searchParams.sortOrder as "asc" | "desc") || "desc",
  }

  // Fetch data
  const [usersResult, statsResult] = await Promise.all([getAllUsers(filters), getUserStats()])

  const stats = statsResult.success ? statsResult.data : null

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">ניהול משתמשים</h1>
        <p className="text-muted-foreground mt-2">
          ניהול כל המשתמשים במערכת - צפייה, עריכה, יצירה ומחיקה
        </p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">סך הכל משתמשים</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">מנהלים</CardTitle>
              <Crown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.roleStats.admin}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">מטפלים</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.roleStats.professional}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">חברים</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.roleStats.member}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Suspense fallback={<UserManagementSkeleton />}>
        <UserManagementClient initialData={usersResult} initialFilters={filters} stats={stats} />
      </Suspense>
    </div>
  )
}

function UserManagementSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
