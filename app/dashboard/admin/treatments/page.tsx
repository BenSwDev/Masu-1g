import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { TreatmentsClient } from "@/components/dashboard/admin/treatments/treatments-client"
import { useTranslation } from "@/lib/translations/i18n"

export default async function AdminTreatmentsPage() {
  const session = await getServerSession(authOptions)
  const { t } = await useTranslation()

  if (!session) {
    redirect("/auth/login")
  }

  if (session.user.activeRole !== "admin") {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("admin.treatments.title")}</h1>
        <p className="text-gray-600">{t("admin.treatments.description")}</p>
      </div>

      <TreatmentsClient />
    </div>
  )
}
