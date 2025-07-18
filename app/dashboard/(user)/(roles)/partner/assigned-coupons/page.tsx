import { Suspense } from "react"
import { getAssignedPartnerCoupons } from "@/actions/coupon-actions"
import AssignedCouponsClient from "@/components/dashboard/partner/coupons/assigned-coupons-client"
import { Heading } from "@/components/common/ui/heading"
import { Skeleton } from "@/components/common/ui/skeleton"

export const metadata = {
  title: "My Assigned Coupons", // Placeholder for translation
}

// Force dynamic rendering to prevent build-time static generation
export const dynamic = 'force-dynamic'

interface PartnerAssignedCouponsPageProps {
  searchParams: Promise<{
    page?: string
    limit?: string
    code?: string
    isActive?: string
  }>
}

export default async function PartnerAssignedCouponsPage({ searchParams }: PartnerAssignedCouponsPageProps) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const limit = Number(params.limit) || 10
  const filters = {
    code: params.code,
    isActive: params.isActive ? params.isActive === "true" : undefined,
  }

  // Fetch initial data on the server
  const couponsDataPromise = getAssignedPartnerCoupons(page, limit, filters)

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <Heading titleKey="partnerAssignedCoupons.title" descriptionKey="partnerAssignedCoupons.description" />
      <Suspense fallback={<AssignedCouponsLoadingSkeleton />}>
        <AssignedCouponsDataWrapper couponsDataPromise={couponsDataPromise} />
      </Suspense>
    </div>
  )
}

async function AssignedCouponsDataWrapper({
  couponsDataPromise,
}: { couponsDataPromise: ReturnType<typeof getAssignedPartnerCoupons> }) {
  const couponsData = await couponsDataPromise
  return <AssignedCouponsClient initialData={couponsData} />
}

function AssignedCouponsLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-1/3" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}
