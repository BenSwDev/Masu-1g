import { Suspense } from "react"
import { getAdminCoupons, getPartnersForSelection } from "@/actions/coupon-actions"
import CouponsClient from "@/components/dashboard/admin/coupons/coupons-client"
import { Heading } from "@/components/common/ui/heading"
import { Skeleton } from "@/components/common/ui/skeleton" // Assuming you have Skeleton

// For metadata, it's often done by fetching translations in a server component or using a dedicated i18n setup for metadata.
// Assuming a simple approach for now:
// Replace:
// export const metadata = {
// title: "Manage Coupons", // Placeholder for translation
// }
// With (this is a conceptual change, actual implementation might vary based on how you handle server-side translations for metadata):
// For now, we'll assume the title is passed to a client component that uses useTranslation, or we translate it directly if possible.
// Let's assume Heading component will handle translation via props.

export const metadata = {
  title: "Manage Coupons", // Placeholder for translation
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
      <Heading titleKey="adminCoupons.title" descriptionKey="adminCoupons.description" />
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
