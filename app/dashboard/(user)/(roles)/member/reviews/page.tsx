import { Suspense } from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { Metadata } from "next"
import MemberReviewsClient from "@/components/dashboard/member/reviews/member-reviews-client"
import { BookingsTableSkeleton } from "@/components/dashboard/member/bookings/bookings-table-skeleton"

export const metadata: Metadata = {
  title: "My Reviews",
  description: "View and manage your treatment reviews",
}

export default async function MemberReviewsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect("/auth/login")
  }

  return (
    <Suspense fallback={<BookingsTableSkeleton />}>
      <MemberReviewsClient />
    </Suspense>
  )
} 