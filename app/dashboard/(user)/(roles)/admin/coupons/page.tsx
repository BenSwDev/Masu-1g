import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getAdminCoupons, getPartnersForSelection } from "./actions"

// Force dynamic rendering to prevent build-time database connections
export const dynamic = 'force-dynamic'
import CouponsClient from "@/components/dashboard/admin/coupons/coupons-client"
import { Heading } from "@/components/common/ui/heading"
import { ClientAwareCouponsLoadingSkeleton } from "@/components/dashboard/admin/coupons/client-aware-coupons-loading-skeleton"
import { requireUserSession } from "@/lib/auth/require-session"

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
  searchParams: Promise<{
    page?: string
    limit?: string
    code?: string
    isActive?: string
    partnerId?: string
  }>
}

// Improve the page's responsiveness
export default async function AdminCouponsPage({ searchParams }: AdminCouponsPageProps) {
  const session = await requireUserSession()
  if (!session.user.roles?.includes("admin")) {
    redirect("/dashboard")
  }

  const params = await searchParams
  const page = Number(params.page) || 1
  const limit = Number(params.limit) || 10
  const filters = {
    code: params.code,
    isActive: params.isActive ? params.isActive === "true" : undefined,
    partnerId: params.partnerId,
  }

  // Fetch initial data on the server
  const couponsDataPromise = getAdminCoupons(page, limit, filters)
  const partnersPromise = getPartnersForSelection()

  return (
    <div className="flex-1 space-y-4 p-2 sm:p-4 md:p-8 pt-4 sm:pt-6">
      <Heading titleKey="adminCoupons.title" descriptionKey="adminCoupons.description" />
      <Suspense fallback={<ClientAwareCouponsLoadingSkeleton />}>
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
  const [couponsData, partnersData] = await Promise.all([couponsDataPromise, partnersPromise])
  return <CouponsClient initialData={couponsData} partnersForSelect={partnersData.partners || []} />
}
