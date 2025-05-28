import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { getTreatments } from "@/actions/treatment-actions"
import { TreatmentsClient } from "@/components/dashboard/admin/treatments/treatments-client"
import { getTranslations } from "@/lib/translations/server"

export default async function AdminTreatmentsPage() {
  const { t, dir } = getTranslations()
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/login")
  }

  if (!session.user.roles?.includes("admin")) {
    redirect("/dashboard")
  }

  const result = await getTreatments()

  if (!result.success) {
    throw new Error(result.error)
  }

  return (
    <div className="space-y-6" dir={dir}>
      <div className="rounded-lg bg-white p-4 shadow-sm mb-4">
        <h1 className="text-xl font-bold text-gray-900">{t("admin.treatments.title")}</h1>
        <p className="text-sm text-gray-600">{t("admin.treatments.description")}</p>
      </div>

      <TreatmentsClient initialData={result.data} />
    </div>
  )
}
