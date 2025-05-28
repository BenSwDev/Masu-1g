import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth/auth"
import CouponsClient from "@/components/dashboard/admin/coupons/coupons-client"
import { getTreatmentsForCouponForm, getPartnersForCouponForm } from "@/actions/coupon-actions"

export const metadata: Metadata = {
  title: "Manage Coupons",
  description: "Create and manage discount coupons for your customers",
}

export const dynamic = "force-dynamic"

export default async function CouponsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "admin") {
    redirect("/auth/login")
  }

  // Get search and filter parameters
  const search = typeof searchParams.search === "string" ? searchParams.search : ""
  const page = typeof searchParams.page === "string" ? Number.parseInt(searchParams.page) : 1
  const sortField = typeof searchParams.sortField === "string" ? searchParams.sortField : "createdAt"
  const sortDirection =
    typeof searchParams.sortDirection === "string" ? (searchParams.sortDirection as "asc" | "desc") : "desc"
  const filterActive = searchParams.status === "active" ? true : searchParams.status === "inactive" ? false : undefined

  // Get treatments and partners for the form
  const treatmentsResponse = await getTreatmentsForCouponForm()
  const partnersResponse = await getPartnersForCouponForm()

  return (
    <div className="container mx-auto py-6 space-y-6">
      <CouponsClient
        initialSearch={search}
        initialPage={page}
        initialSortField={sortField}
        initialSortDirection={sortDirection}
        initialFilterActive={filterActive}
        treatments={treatmentsResponse.success ? treatmentsResponse.treatments : []}
        partners={partnersResponse.success ? partnersResponse.partners : []}
      />
    </div>
  )
}
