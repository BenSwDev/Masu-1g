import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth/auth"
import MemberCouponsClient from "@/components/dashboard/member/coupons/member-coupons-client"

export const metadata: Metadata = {
  title: "Available Coupons",
  description: "View and use discount coupons for your treatments",
}

export const dynamic = "force-dynamic"

export default async function MemberCouponsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/login")
  }

  // Get search and filter parameters
  const search = typeof searchParams.search === "string" ? searchParams.search : ""
  const page = typeof searchParams.page === "string" ? Number.parseInt(searchParams.page) : 1
  const sortField = typeof searchParams.sortField === "string" ? searchParams.sortField : "createdAt"
  const sortDirection =
    typeof searchParams.sortDirection === "string" ? (searchParams.sortDirection as "asc" | "desc") : "desc"

  return (
    <div className="container mx-auto py-6 space-y-6">
      <MemberCouponsClient
        initialSearch={search}
        initialPage={page}
        initialSortField={sortField}
        initialSortDirection={sortDirection}
      />
    </div>
  )
}
