import { Suspense } from "react"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth/auth"
import { UserRole } from "@/lib/db/models/user"
import { getUsers } from "@/actions/user-actions"
import { UsersClient } from "@/components/dashboard/admin/users/users-client"
import { Card, CardContent } from "@/components/common/ui/card"
import { Skeleton } from "@/components/common/ui/skeleton"

interface UsersPageProps {
  searchParams: {
    page?: string
    limit?: string
  }
}

async function UsersContent({ searchParams }: UsersPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.roles?.includes(UserRole.ADMIN)) {
    redirect("/dashboard")
  }

  const page = Number(searchParams.page) || 1
  const limit = Number(searchParams.limit) || 10

  const initialData = await getUsers({ page, limit })

  if (!initialData.success) {
    throw new Error(initialData.message || "Failed to fetch users")
  }

  return <UsersClient initialData={initialData} />
}

function UsersLoading() {
  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </div>
            <Skeleton className="h-8 w-16 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function UsersPage({ searchParams }: UsersPageProps) {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <Suspense fallback={<UsersLoading />}>
        <UsersContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
