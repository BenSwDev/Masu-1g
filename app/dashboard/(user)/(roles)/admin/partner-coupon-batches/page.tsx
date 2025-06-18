import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getPartnerCouponBatches, getPartnersForSelection, type GetPartnersForSelectionResult } from "./actions"

// Force dynamic rendering to prevent build-time database connections
export const dynamic = 'force-dynamic'
import PartnerCouponBatchesClient from "@/components/dashboard/admin/partner-coupon-batches/partner-coupon-batches-client"
import { Heading } from "@/components/common/ui/heading"
import { ClientAwarePartnerCouponBatchesLoadingSkeleton } from "@/components/dashboard/admin/partner-coupon-batches/client-aware-partner-coupon-batches-loading-skeleton"
import { requireUserSession } from "@/lib/auth/require-session"

export const metadata = {
  title: "Manage Partner Coupon Batches",
}

interface AdminPartnerCouponBatchesPageProps {
  searchParams: {
    page?: string
    limit?: string
    name?: string
    isActive?: string
    partnerId?: string
    effectiveStatus?: string
  }
}

export default async function AdminPartnerCouponBatchesPage({ searchParams }: AdminPartnerCouponBatchesPageProps) {
  const session = await requireUserSession()
  if (!session.user.roles?.includes("admin")) {
    redirect("/dashboard")
  }

  const page = Number(searchParams.page) || 1
  const limit = Number(searchParams.limit) || 10
  const filters = {
    name: searchParams.name,
    isActive: searchParams.isActive ? searchParams.isActive === "true" : undefined,
    partnerId: searchParams.partnerId,
    effectiveStatus: searchParams.effectiveStatus,
  }

  // Fetch initial data on the server
  const batchesDataPromise = getPartnerCouponBatches(page, limit, filters)
  const partnersPromise = getPartnersForSelection()

  return (
    <div className="flex-1 space-y-4 p-2 sm:p-4 md:p-8 pt-4 sm:pt-6">
      <Heading titleKey="adminPartnerCouponBatches.title" descriptionKey="adminPartnerCouponBatches.description" />
      <Suspense fallback={<ClientAwarePartnerCouponBatchesLoadingSkeleton />}>
        <PartnerCouponBatchesDataWrapper batchesDataPromise={batchesDataPromise} partnersPromise={partnersPromise} />
      </Suspense>
    </div>
  )
}

async function PartnerCouponBatchesDataWrapper({
  batchesDataPromise,
  partnersPromise,
}: {
  batchesDataPromise: ReturnType<typeof getPartnerCouponBatches>
  partnersPromise: Promise<GetPartnersForSelectionResult>
}) {
  const [batchesData, partnersResult] = await Promise.all([batchesDataPromise, partnersPromise])
  if (!partnersResult.success) {
    throw new Error(partnersResult.error || "Failed to fetch partners")
  }
  return <PartnerCouponBatchesClient initialData={batchesData} partnersForSelect={partnersResult.partners || []} />
} 