import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { getTreatments } from "@/actions/treatment-actions"
import { TreatmentsClient } from "@/components/dashboard/admin/treatments/treatments-client"

export default async function AdminTreatmentsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/login")
  }

  if (session.user.activeRole !== "admin") {
    redirect("/dashboard")
  }

  const result = await getTreatments()
  const treatments = result.success ? result.treatments : []

  return <TreatmentsClient initialTreatments={treatments} />
}
