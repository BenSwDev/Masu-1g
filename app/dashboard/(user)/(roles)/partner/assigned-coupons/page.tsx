import { Suspense } from "react"
import { getAssignedPartnerCoupons } from "@/actions/coupon-actions"
import AssignedCouponsClient from "@/components/dashboard/partner/coupons/assigned-coupons-client"
// Removed Heading from here as it will be rendered in Client Component
import { Skeleton } from "@/components/common/ui/skeleton"
// Removed getTranslations from next-intl/server

// Using a static title or a key that can be translated on client if needed
// For simplicity, using a static title here.
// If dynamic title based on locale is strictly needed from server,
// the custom i18n solution needs to support server-side translation.
export const metadata = {
  title: "My Assigned Coupons", // Placeholder, actual title will be set in Client Component via useTranslation
}

interface PartnerAssignedCouponsPageProps {
  searchParams: {
    page?: string
    limit?: string
    code?: string
    isActive?: string
  }
}

export default async function PartnerAssignedCouponsPage({ searchParams }: PartnerAssignedCouponsPageProps) {
  const page = Number(searchParams.page) || 1
  const limit = Number(searchParams.limit) || 10
  const filters = {
    code: searchParams.code,
    isActive: searchParams.isActive ? searchParams.isActive === "true" : undefined,
  }

  // Fetch initial data on the server
  const couponsDataPromise = getAssignedPartnerCoupons(page, limit, filters)
  // Removed t from next-intl/server

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Heading will be rendered by AssignedCouponsClient */}
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
  // This component doesn't need translation as it's pure skeleton
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-1/3" /> {/* Placeholder for Heading */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}
