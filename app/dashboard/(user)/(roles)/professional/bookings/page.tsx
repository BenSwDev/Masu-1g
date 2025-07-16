import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import ProfessionalBookingsClient from "@/components/dashboard/professional/bookings/professional-bookings-client"
import { BookingsTableSkeleton } from "@/components/dashboard/member/bookings/bookings-table-skeleton"

export default async function ProfessionalBookingsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect("/auth/login")
  }

  // Only allow professionals to access this page
  if (!session.user.roles?.includes("professional")) {
    redirect("/dashboard")
  }

  return (
    <div className="h-full">
      <Suspense fallback={<BookingsTableSkeleton />}>
        <ProfessionalBookingsClient professionalId={session.user.id} />
      </Suspense>
    </div>
  )
} 