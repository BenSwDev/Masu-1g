import { Suspense } from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import AdminBookingsClient from "@/components/dashboard/admin/bookings/admin-bookings-client"
import { BookingsTableSkeleton } from "@/components/dashboard/member/bookings/bookings-table-skeleton"

export default async function AdminBookingsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.roles.includes("admin")) {
    redirect("/auth/login")
  }

  return (
    <div className="h-full">
      <Suspense fallback={<BookingsTableSkeleton />}>
        <AdminBookingsClient />
      </Suspense>
    </div>
  )
} 