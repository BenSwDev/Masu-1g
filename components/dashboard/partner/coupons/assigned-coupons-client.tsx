"use client"

import * as React from "react"
import { useRouter } from "next/navigation" // Removed useSearchParams as it's not used
import type { ICoupon } from "@/lib/db/models/coupon"
import type { getAssignedPartnerCoupons } from "@/actions/coupon-actions"
import AssignedCouponCard from "./assigned-coupon-card"
import { Button } from "@/components/common/ui/button"
import { useTranslation } from "@/lib/translations/i18n" // Corrected import
import { Heading } from "@/components/common/ui/heading" // Added Heading import

interface AssignedCouponsClientProps {
  initialData: Awaited<ReturnType<typeof getAssignedPartnerCoupons>>
}

export default function AssignedCouponsClient({ initialData }: AssignedCouponsClientProps) {
  const router = useRouter()
  // const searchParams = useSearchParams(); // Not used in the current logic

  const [coupons, setCoupons] = React.useState<ICoupon[]>(initialData.coupons)
  const [pagination, setPagination] = React.useState({
    totalPages: initialData.totalPages,
    currentPage: initialData.currentPage,
    totalCoupons: initialData.totalCoupons,
  })
  const [loading, setLoading] = React.useState(false) // Keep for potential future use (e.g., client-side filtering)

  const { t, dir } = useTranslation() // Using custom hook

  // Update document title dynamically on the client
  React.useEffect(() => {
    if (t) {
      document.title = t("partnerCoupons.myAssignedTitle")
    }
  }, [t])

  if (loading && coupons.length === 0) {
    return <p>{t("partnerCoupons.loading")}</p>
  }

  return (
    <>
      <Heading
        title={t("partnerCoupons.myAssignedHeading")}
        description={t("partnerCoupons.myAssignedDescription")}
        dir={dir}
      />
      {coupons.length === 0 && !loading && <p>{t("partnerCoupons.noneAssigned")}</p>}

      {coupons.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
          {coupons.map((coupon) => (
            <AssignedCouponCard key={coupon._id.toString()} coupon={coupon} />
          ))}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="mt-8 flex justify-center space-x-2">
          <Button
            onClick={() => router.push(`/dashboard/partner/assigned-coupons?page=${pagination.currentPage - 1}`)}
            disabled={pagination.currentPage <= 1 || loading}
          >
            {t("common.previousPage")}
          </Button>
          <span className="p-2">
            {t("common.pageOutOf", { currentPage: pagination.currentPage, totalPages: pagination.totalPages })}
          </span>
          <Button
            onClick={() => router.push(`/dashboard/partner/assigned-coupons?page=${pagination.currentPage + 1}`)}
            disabled={pagination.currentPage >= pagination.totalPages || loading}
          >
            {t("common.nextPage")}
          </Button>
        </div>
      )}
      <p className="text-sm text-muted-foreground mt-4 text-center">
        {t("partnerCoupons.totalAssigned", { count: pagination.totalCoupons })}
      </p>
    </>
  )
}
