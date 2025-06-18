import { redirect } from "next/navigation"
import { requireUserSession } from "@/lib/auth/require-session"

// Force dynamic rendering to prevent build-time database connections
export const dynamic = 'force-dynamic'

export default async function AdminPartnersPage() {
  const session = await requireUserSession()
  if (!session.user.roles?.includes("admin")) {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-right">ניהול שותפים</h1>
        <p className="text-gray-600 text-right">ניהול וצפייה ברשימת השותפים במערכת.</p>
      </div>
    </div>
  )
}
