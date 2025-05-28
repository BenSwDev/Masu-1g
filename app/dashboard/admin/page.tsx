import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/login")
  }

  // Only redirect if activeRole is not admin
  if (session.user.activeRole !== "admin") {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 rtl:text-right">Admin Dashboard</h1>
        <p className="text-gray-600 rtl:text-right">
          Welcome to the admin dashboard. You have access to administrative features.
        </p>
        <p className="text-sm text-gray-500 mt-2 rtl:text-right">You are viewing the admin dashboard.</p>
      </div>
    </div>
  )
}
