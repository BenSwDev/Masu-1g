import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth/auth"
import GiftVouchersClient from "@/components/dashboard/admin/gift-vouchers/gift-vouchers-client"

export const metadata: Metadata = {
  title: "Manage Gift Vouchers",
  description: "View and manage gift vouchers purchased by customers",
}

export const dynamic = "force-dynamic"

export default async function GiftVouchersPage({
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
  const filterRedeemed =
    searchParams.status === "redeemed" ? true : searchParams.status === "unredeemed" ? false : undefined

  return (
    <div className="container mx-auto py-6 space-y-6">
      <GiftVouchersClient
        initialSearch={search}
        initialPage={page}
        initialSortField={sortField}
        initialSortDirection={sortDirection}
        initialFilterRedeemed={filterRedeemed}
      />
    </div>
  )
}
