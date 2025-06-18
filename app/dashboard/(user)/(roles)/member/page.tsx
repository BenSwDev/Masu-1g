import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"

// Force dynamic rendering to prevent build-time database connections
export const dynamic = 'force-dynamic'


export default async function MemberDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/login")
  }

  // Only redirect if activeRole is not member
  if (session.user.activeRole !== "member") {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Member Dashboard</h1>
        <p className="text-gray-600">Welcome, {session.user?.name || session.user?.email}!</p>
        <p className="text-sm text-gray-500 mt-2">You are viewing the member dashboard.</p>
      </div>
    </div>
  )
}
