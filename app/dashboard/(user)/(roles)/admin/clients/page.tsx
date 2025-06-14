import { requireAdminSession } from "@/lib/auth/require-admin-session"

export default async function AdminClientsPage() {
  await requireAdminSession()

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-right">ניהול לקוחות</h1>
        <p className="text-gray-600 text-right">ניהול וצפייה ברשימת הלקוחות במערכת.</p>
      </div>
    </div>
  )
}
