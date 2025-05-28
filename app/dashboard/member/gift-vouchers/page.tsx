import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth/auth"
import MemberGiftVouchersClient from "@/components/dashboard/member/gift-vouchers/member-gift-vouchers-client"

export const metadata: Metadata = {
  title: "Gift Vouchers",
  description: "Purchase, send and redeem gift vouchers",
}

export const dynamic = "force-dynamic"

export default async function MemberGiftVouchersPage({
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
  const type = typeof searchParams.type === "string" ? (searchParams.type as "purchased" | "received" | "all") : "all"

  return (
    <div className="container mx-auto py-6 space-y-6">
      <MemberGiftVouchersClient
        initialSearch={search}
        initialPage={page}
        initialSortField={sortField}
        initialSortDirection={sortDirection}
        initialType={type}
      />
    </div>
  )
}
