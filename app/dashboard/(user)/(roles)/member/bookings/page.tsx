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
    <div className="h-full">
      <Suspense fallback={<BookingsTableSkeleton />}>
        <MemberBookingsClient userId={session.user.id} />
      </Suspense>
    </div>
  )
}
