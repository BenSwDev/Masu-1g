import type { Metadata } from "next"
import { redirect } from "next/navigation"
import WorkingHoursClient from "@/components/dashboard/admin/working-hours/working-hours-client"
import { requireUserSession } from "@/lib/auth/require-session"

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Working Hours Management",
  description: "Manage working hours and special dates",
}

export default async function WorkingHoursPage() {
  const session = await requireUserSession()
  if (!session.user.roles?.includes("admin")) {
    redirect("/dashboard")
  }

  return <WorkingHoursClient />
}
