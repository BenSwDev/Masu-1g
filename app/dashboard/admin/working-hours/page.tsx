import type { Metadata } from "next"
import { WorkingHoursClient } from "@/components/dashboard/admin/working-hours/working-hours-client"
import { getWorkingHoursData } from "@/actions/working-hours-actions" // Updated import
import type { ClientWorkingHours } from "@/lib/db/models/working-hours" // Import client type

export const metadata: Metadata = {
  title: "Admin - Working Hours Management", // Updated title
  description: "Configure weekly business hours and manage special dates like holidays or events.", // Updated description
}

export default async function WorkingHoursPage() {
  // Fetch initial data on the server to pass to the client component
  // This can help with initial render and SEO if needed, though for admin pages it's less critical
  const initialDataResult = await getWorkingHoursData()
  const initialWorkingHours = initialDataResult.success ? (initialDataResult.data as ClientWorkingHours) : null
  const initialError = initialDataResult.success ? null : initialDataResult.error

  return <WorkingHoursClient initialWorkingHours={initialWorkingHours} initialError={initialError} />
}
