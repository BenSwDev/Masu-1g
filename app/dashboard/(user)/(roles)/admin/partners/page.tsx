import { requireAdminSession } from "@/lib/auth/require-admin-session"

export default async function AdminPartnersPage() {
  await requireAdminSession()

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-right">ניהול שותפים</h1>
        <p className="text-gray-600 text-right">ניהול וצפייה ברשימת השותפים במערכת.</p>
      </div>
    </div>
  )
}
