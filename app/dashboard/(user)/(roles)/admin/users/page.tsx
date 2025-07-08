import { Suspense } from "react"
import { redirect } from "next/navigation"
import { requireUserSession } from "@/lib/auth/require-session"
import { getAllUsers, getUserStats, type UserFilters } from "./actions"
import UserManagementClient from "@/components/dashboard/admin/user-management/user-management-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Skeleton } from "@/components/common/ui/skeleton"
import { Users, UserCheck, UserX, Shield, Briefcase, User, Crown, Activity, Calendar } from "lucide-react"

// Force dynamic rendering since we use authentication
export const dynamic = 'force-dynamic'

interface UsersPageProps {
  searchParams: Promise<{
    search?: string
    role?: string
    gender?: string
    emailVerified?: string
    phoneVerified?: string
    isActive?: string
    page?: string
    limit?: string
    sortBy?: string
    sortOrder?: string
  }>
}

// Loading component for stats
function StatsLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Stats component
async function UserStats() {
  try {
    const statsResult = await getUserStats()
    
    if (!statsResult.success || !statsResult.data) {
      return (
        <div className="text-center p-4 text-muted-foreground">
          שגיאה בטעינת הסטטיסטיקות
        </div>
      )
    }

    const stats = statsResult.data

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">סך הכל משתמשים</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              כל המשתמשים במערכת
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">משתמשים פעילים</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.inactiveUsers} לא פעילים
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">משתמשים מאומתים</CardTitle>
            <UserCheck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.verifiedUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.unverifiedUsers} לא מאומתים
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">הרשמות חדשות</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.recentRegistrations.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              ב-30 הימים האחרונים
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">מנהלים</CardTitle>
            <Crown className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.roleStats.admin}</div>
            <p className="text-xs text-muted-foreground">
              משתמשי מנהל
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">מטפלים</CardTitle>
            <Briefcase className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.roleStats.professional}</div>
            <p className="text-xs text-muted-foreground">
              מטפלים רשומים
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">חברים</CardTitle>
            <User className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.roleStats.member}</div>
            <p className="text-xs text-muted-foreground">
              חברים רשומים
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">שותפים</CardTitle>
            <Shield className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{stats.roleStats.partner}</div>
            <p className="text-xs text-muted-foreground">
              שותפים עסקיים
            </p>
          </CardContent>
        </Card>
      </div>
    )
  } catch (error) {
    console.error('Error loading user stats:', error)
    return (
      <div className="text-center p-4 text-muted-foreground">
        שגיאה בטעינת הסטטיסטיקות
      </div>
    )
  }
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  try {
    // Check authentication and admin role
    const session = await requireUserSession()
    if (!session.user.roles?.includes('admin')) {
      redirect("/dashboard")
    }

    // Parse search params
    const params = await searchParams
    const filters: UserFilters = {
      search: params.search || "",
      role: params.role || "all",
      gender: params.gender || "all",
      emailVerified: params.emailVerified ? params.emailVerified === "true" : undefined,
      phoneVerified: params.phoneVerified ? params.phoneVerified === "true" : undefined,
      isActive: params.isActive ? params.isActive === "true" : undefined,
      page: params.page ? parseInt(params.page) : 1,
      limit: params.limit ? parseInt(params.limit) : 20,
      sortBy: params.sortBy || "createdAt",
      sortOrder: (params.sortOrder as "asc" | "desc") || "desc"
    }

    // Get users data
    const usersData = await getAllUsers(filters)

    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ניהול משתמשים</h1>
          <p className="text-muted-foreground mt-2">
            ניהול כל המשתמשים במערכת - צפייה, עריכה, יצירה וניהול סטטוס
          </p>
        </div>

        {/* Statistics Cards */}
        <Suspense fallback={<StatsLoading />}>
          <UserStats />
        </Suspense>

        {/* Users Management */}
        <UserManagementClient 
          initialData={usersData}
          initialFilters={filters}
        />
      </div>
    )
  } catch (error) {
    console.error('Error in users page:', error)
    
    // If it's an auth error, redirect
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      redirect("/dashboard")
    }

    // Otherwise show error page
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ניהול משתמשים</h1>
          <p className="text-muted-foreground mt-2">
            ניהול כל המשתמשים במערכת
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center p-8">
              <UserX className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">שגיאה בטעינת העמוד</h3>
              <p className="text-muted-foreground mb-4">
                אירעה שגיאה בטעינת נתוני המשתמשים. אנא נסה לרענן את העמוד או פנה למנהל המערכת.
              </p>
              <p className="text-xs text-muted-foreground">
                שגיאה: {error instanceof Error ? error.message : 'Unknown error'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
} 