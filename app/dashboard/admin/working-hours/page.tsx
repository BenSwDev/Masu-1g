import type { Metadata } from "next"
import { WorkingHoursClient } from "@/components/dashboard/admin/working-hours/working-hours-client"

export const metadata: Metadata = {
  title: "Admin - Working Hours",
  description: "Manage working hours and special dates",
}

export default function WorkingHoursPage() {
  return <WorkingHoursClient />
}
