import { redirect } from "next/navigation"
import { requireUserSession } from "@/lib/auth/require-session"
import { getUserById } from "../../actions"
import { UserEditForm } from "@/components/dashboard/admin/user-management/user-edit-form"

interface UserEditPageProps {
  params: {
    userId: string
  }
}

export default async function UserEditPage({ params }: UserEditPageProps) {
  const session = await requireUserSession()
  if (!session.user.roles?.includes("admin")) {
    redirect("/dashboard")
  }

  const userResult = await getUserById(params.userId)
  
  if (!userResult.success || !userResult.user) {
    redirect("/dashboard/admin/users")
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          עריכת משתמש
        </h1>
        <p className="text-muted-foreground">
          עריכת פרטי המשתמש {userResult.user.name || userResult.user.email}
        </p>
      </div>

      <UserEditForm user={userResult.user} />
    </div>
  )
} 