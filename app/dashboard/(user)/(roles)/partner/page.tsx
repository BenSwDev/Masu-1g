import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"

export default async function PartnerDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/login")
  }

  // Only redirect if activeRole is not partner
  if (session.user.activeRole !== "partner") {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Partner Dashboard</h1>
        <p className="text-gray-600">Welcome to the partner dashboard. You have access to partner features.</p>
        <p className="text-sm text-gray-500 mt-2">You are viewing the partner dashboard.</p>
      </div>
    </div>
  )
}
