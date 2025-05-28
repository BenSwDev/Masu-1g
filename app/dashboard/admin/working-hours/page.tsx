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
      <div className="rounded-lg bg-white p-6 shadow-sm mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">ניהול שעות פעילות</h1>
        <p className="text-gray-600">הגדר שעות פעילות שבועיות ותאריכים מיוחדים עם תוספות מחיר.</p>
      </div>

      <WorkingHoursClient initialData={result.data} />
    </div>
  )
}
