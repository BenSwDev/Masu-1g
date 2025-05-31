import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { getUsers } from "@/actions/user-actions"
import { UsersClient } from "@/components/dashboard/admin/users/users-client"

export default async function AdminClientsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/login")
  }

  if (session.user.activeRole !== "admin") {
    redirect("/dashboard")
  }

  // Fetch initial users data
  const result = await getUsers(1, 20)

  if (!result.success) {
    throw new Error(result.error || "Failed to fetch users")
  }

  return <UsersClient initialData={result.data} />
}
