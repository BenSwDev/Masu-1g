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
    <div className="container mx-auto px-4 py-8 md:px-6 lg:px-8">
      <Suspense fallback={<BookingsTableSkeleton />}>
        <AdminBookingsClient />
      </Suspense>
    </div>
  )
} 