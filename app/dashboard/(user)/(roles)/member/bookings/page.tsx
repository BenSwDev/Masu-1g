import { Suspense } from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import MemberBookingsClient from "@/components/dashboard/member/bookings/member-bookings-client"
import { BookingsTableSkeleton } from "@/components/dashboard/member/bookings/bookings-table-skeleton"

export default async function MemberBookingsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect("/auth/login")
  }

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 lg:px-8">
      <Suspense fallback={<BookingsTableSkeleton />}>
        <MemberBookingsClient userId={session.user.id} />
      </Suspense>
    </div>
  )
}
