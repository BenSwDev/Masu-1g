import { Suspense } from "react"
import { getAdminCoupons, getPartnersForSelection } from "@/actions/coupon-actions"
import CouponsClient from "@/components/dashboard/admin/coupons/coupons-client"
import { Heading } from "@/components/common/ui/heading"
import { Skeleton } from "@/components/common/ui/skeleton"

export const metadata = {
  title: "Manage Coupons",
}

// Define a type for searchParams for clarity
interface AdminCouponsPageProps {
  searchParams: {
    page?: string
    limit?: string
    code?: string
    isActive?: string
    partnerId?: string
  }
}

export default async function AdminCouponsPage({ searchParams }: AdminCouponsPageProps) {
  const page = Number(searchParams.page) || 1
  const limit = Number(searchParams.limit) || 10
  const filters = {
    code: searchParams.code,
    isActive: searchParams.isActive ? searchParams.isActive === "true" : undefined,
    partnerId: searchParams.partnerId,
  }

  // Fetch initial data on the server
  const couponsDataPromise = getAdminCoupons(page, limit, filters)
  const partnersPromise = getPartnersForSelection()

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <Heading title="Coupons Management" description="Create and manage coupons for your platform." />
      <Suspense fallback={<CouponsLoadingSkeleton />}>
        <CouponsDataWrapper couponsDataPromise={couponsDataPromise} partnersPromise={partnersPromise} />
      </Suspense>
    </div>
  )
}

async function CouponsDataWrapper({
  couponsDataPromise,
  partnersPromise,
}: {
  couponsDataPromise: ReturnType<typeof getAdminCoupons>
  partnersPromise: ReturnType<typeof getPartnersForSelection>
}) {
  const [couponsData, partnersForSelect] = await Promise.all([couponsDataPromise, partnersPromise])
  return <CouponsClient initialData={couponsData} partnersForSelect={partnersForSelect} />
}

function CouponsLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-1/4" />
      <Skeleton className="h-12 w-full" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  )
}
