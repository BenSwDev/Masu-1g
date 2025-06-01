import { Suspense } from "react"
import { UsersClient } from "@/components/dashboard/admin/users/users-client"
import { getUsers } from "@/actions/user-actions"
import { Heading } from "@/components/common/ui/heading"
import { RoleProtectedRoute } from "@/components/auth/role-protected-route" // Corrected import
import { UserRole } from "@/lib/db/models/user"

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  // For server-side translations, you might need a different approach if getTranslations isn't available.
  // For now, let's assume a placeholder or that you'll adapt this.
  // If useTranslation is client-side only, we can't use it directly here for t.
  // We'll pass t to Heading from a client component or use static keys for now.
  // Let's use static keys for Heading for simplicity in this server component,
  // or ensure getTranslations works as expected.
  // const { t } = await getTranslations(); // This line might need adjustment based on your i18n setup

  const page = Number(searchParams?.page) || 1
  const limit = Number(searchParams?.limit) || 10

  const initialUsersData = await getUsers({ page, limit })

  return (
    <RoleProtectedRoute requiredRole={UserRole.ADMIN}>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          {/*
            Ideally, t() would come from getTranslations() if it's set up for server components.
            If not, you might pass these strings directly or handle translation differently for Heading.
            For now, using placeholder keys.
          */}
          <Heading
            title="admin.users.pageTitle" // Placeholder key
            description="admin.users.pageDescription" // Placeholder key
          />
        </div>
        <Suspense fallback={<div>Loading users...</div>}>
          {" "}
          {/* Placeholder loading text */}
          <UsersClient initialData={initialUsersData} />
        </Suspense>
      </div>
    </RoleProtectedRoute>
  )
}
