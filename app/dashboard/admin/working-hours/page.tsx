import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { getWorkingHours } from "@/actions/working-hours-actions"
import { WorkingHoursClient } from "@/components/dashboard/admin/working-hours/working-hours-client"
import { getTranslations } from "@/lib/translations/server"

export default async function AdminWorkingHoursPage() {
  const { t, dir } = getTranslations()
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
    <div className="space-y-6" dir={dir}>
      <div className="rounded-lg bg-white p-4 shadow-sm mb-4">
        <h1 className="text-xl font-bold text-gray-900">{t("admin.workingHours.title")}</h1>
        <p className="text-sm text-gray-600">{t("admin.workingHours.description")}</p>
      </div>

      <WorkingHoursClient initialData={result.data} />
    </div>
  )
}
