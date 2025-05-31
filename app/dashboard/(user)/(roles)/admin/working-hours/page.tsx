import type { Metadata } from "next"
import { getCurrentUser } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import WorkingHoursClient from "@/components/dashboard/admin/working-hours/working-hours-client"
import { getTranslations } from "next-intl/server"

export const metadata: Metadata = {
  title: "Working Hours Management", // Will be translated by i18n provider
}

export default async function AdminWorkingHoursPage() {
  const currentUser = await getCurrentUser()
  const t = await getTranslations("Dashboard.Admin.WorkingHours")

  if (!currentUser || currentUser.role !== "admin") {
    redirect("/dashboard") // Or to an unauthorized page
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">{t("title")}</h1>
      <WorkingHoursClient />
    </div>
  )
}
