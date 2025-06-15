import { redirect } from "next/navigation"
import { requireUserSession } from "@/lib/auth/require-session"

export const dynamic = 'force-dynamic'

export default async function AdminClientsPage() {
  const session = await requireUserSession()
  if (!session.user.roles?.includes("admin")) {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-right">ניהול לקוחות</h1>
        <p className="text-gray-600 text-right">ניהול וצפייה ברשימת הלקוחות במערכת.</p>
      </div>
    </div>
  )
}
