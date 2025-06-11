import { Suspense } from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { Metadata } from "next"
import AdminReviewsClient from "@/components/dashboard/admin/reviews/admin-reviews-client"
import { BookingsTableSkeleton } from "@/components/dashboard/member/bookings/bookings-table-skeleton"

export const metadata: Metadata = {
  title: "Reviews Management",
  description: "Manage customer reviews and ratings",
}

export default async function AdminReviewsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.roles.includes("admin")) {
    redirect("/auth/login")
  }

  return (
    <div className="h-full">
      <Suspense fallback={<BookingsTableSkeleton />}>
        <AdminReviewsClient />
      </Suspense>
    </div>
  )
} 