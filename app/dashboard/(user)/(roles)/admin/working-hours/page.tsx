import type { Metadata } from "next"
import WorkingHoursClient from "@/components/dashboard/admin/working-hours/working-hours-client"
import { requireAdminSession } from "@/lib/auth/require-admin-session"

export const metadata: Metadata = {
  title: "Working Hours Management",
  description: "Manage working hours and special dates",
}

export default async function WorkingHoursPage() {
  await requireAdminSession()

  return <WorkingHoursClient />
}
