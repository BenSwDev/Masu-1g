import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { TreatmentsClient } from "@/components/dashboard/admin/treatments/treatments-client"
import { requireUserSession } from "@/lib/auth/require-session"

// Force dynamic rendering to prevent build-time database connections
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Admin - Treatments",
  description: "Manage treatments",
}

export default async function TreatmentsPage() {
  const session = await requireUserSession()
  if (!session.user.roles?.includes("admin")) {
    redirect("/dashboard")
  }

  return <TreatmentsClient />
}
