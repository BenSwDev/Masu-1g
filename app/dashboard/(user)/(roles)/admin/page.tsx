import { redirect } from "next/navigation"
import { requireUserSession } from "@/lib/auth/require-session"

export default async function AdminDashboardPage() {
  const session = await requireUserSession()
  if (!session.user.roles?.includes("admin")) {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-right">לוח בקרה למנהל</h1>
        <p className="text-gray-600 text-right">ברוכים הבאים ללוח הבקרה למנהל. יש לך גישה לתכונות ניהול המערכת.</p>
        <p className="text-sm text-gray-500 mt-2 text-right">אתה צופה בלוח הבקרה למנהל.</p>
      </div>
    </div>
  )
}
