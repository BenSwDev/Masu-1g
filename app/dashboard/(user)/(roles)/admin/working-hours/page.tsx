import type { Metadata } from "next"
import { WorkingHoursClient } from "@/components/dashboard/admin/working-hours/working-hours-client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"

// This function cannot be async directly if used for metadata generation in this way.
// We'll set a static title or fetch translations differently for metadata.
// For simplicity, using a static title here.
export const metadata: Metadata = {
  title: "Admin - Working Hours", // Fallback title
  description: "Manage business working hours and special dates.",
}

export default async function AdminWorkingHoursPage() {
  const session = await getServerSession(authOptions)

  if (!session || !session.user.roles.includes("admin")) {
    redirect("/dashboard")
  }

  // The actual translation for the page title inside the component will be handled by WorkingHoursClient
  return <WorkingHoursClient />
}
