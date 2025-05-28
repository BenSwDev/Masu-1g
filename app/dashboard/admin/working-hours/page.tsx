import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { getWorkingHours } from "@/actions/working-hours-actions"
import { WorkingHoursClient } from "@/components/dashboard/admin/working-hours/working-hours-client"

export default async function AdminWorkingHoursPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/login")
  }

  if (!session.user.roles?.includes("admin")) {
    redirect("/dashboard")
  }

  const result = await getWorkingHours()

  if (!result.success) {
    throw new Error(result.error)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-4 shadow-sm mb-4">
        <h1 className="text-xl font-bold text-gray-900">ניהול שעות פעילות</h1>
        <p className="text-sm text-gray-600">הגדר שעות פעילות שבועיות ותאריכים מיוחדים עם תוספות מחיר.</p>
      </div>

      <WorkingHoursClient initialData={result.data} />
    </div>
  )
}
