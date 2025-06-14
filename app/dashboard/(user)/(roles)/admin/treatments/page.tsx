import type { Metadata } from "next"
import { TreatmentsClient } from "@/components/dashboard/admin/treatments/treatments-client"
import { requireAdminSession } from "@/lib/auth/require-admin-session"

export const metadata: Metadata = {
  title: "Admin - Treatments",
  description: "Manage treatments",
}

export default async function TreatmentsPage() {
  await requireAdminSession()

  return <TreatmentsClient />
}
