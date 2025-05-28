import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth/auth"
import PartnerCouponsClient from "@/components/dashboard/partner/coupons/partner-coupons-client"

export const metadata: Metadata = {
  title: "My Coupons",
  description: "View and manage your discount coupons",
}

export const dynamic = "force-dynamic"

export default async function PartnerCouponsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "partner") {
    redirect("/auth/login")
  }

  // Get search and filter parameters
  const search = typeof searchParams.search === "string" ? searchParams.search : ""
  const page = typeof searchParams.page === "string" ? Number.parseInt(searchParams.page) : 1
  const sortField = typeof searchParams.sortField === "string" ? searchParams.sortField : "createdAt"
  const sortDirection =
    typeof searchParams.sortDirection === "string" ? (searchParams.sortDirection as "asc" | "desc") : "desc"
  const filterActive = searchParams.status === "active" ? true : searchParams.status === "inactive" ? false : undefined

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PartnerCouponsClient
        initialSearch={search}
        initialPage={page}
        initialSortField={sortField}
        initialSortDirection={sortDirection}
        initialFilterActive={filterActive}
      />
    </div>
  )
}
