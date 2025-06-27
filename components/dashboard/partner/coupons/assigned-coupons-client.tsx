"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import type { ICoupon } from "@/lib/db/models/coupon"
import type { getAssignedPartnerCoupons } from "@/actions/coupon-actions"
import AssignedCouponCard from "./assigned-coupon-card"
import { Button } from "@/components/common/ui/button" // For pagination if needed
// import { Input } from '@/components/common/ui/input'; // For filters if needed
import { useTranslation } from "@/lib/translations/i18n"

interface AssignedCouponsClientProps {
  initialData: Awaited<ReturnType<typeof getAssignedPartnerCoupons>>
}

export default function AssignedCouponsClient({ initialData }: AssignedCouponsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t, dir } = useTranslation()

  const [coupons, setCoupons] = React.useState<ICoupon[]>(initialData?.coupons || [])
  const [pagination, setPagination] = React.useState({
    totalPages: initialData?.totalPages || 1,
    currentPage: initialData?.currentPage || 1,
    totalCoupons: initialData?.totalCoupons || 0,
  })
  const [loading, setLoading] = React.useState(false)

  // Add filtering or pagination logic here if needed, similar to admin client

  if (loading && coupons.length === 0) {
    // Could show a more specific loading state for the list
    return <p>{t("partnerAssignedCoupons.loading")}</p>
  }

  if (!loading && coupons.length === 0) {
    return <p>{t("partnerAssignedCoupons.noCoupons")}</p>
  }

  return (
    <div>
      {/* Add Filters here if needed */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {coupons.map((coupon) => (
          <AssignedCouponCard 
            key={String(coupon._id)} 
            coupon={coupon as any} 
          />
        ))}
      </div>
      {/* Add Pagination controls here if totalPages > 1 */}
      {pagination.totalPages > 1 && (
        <div className="mt-8 flex justify-center space-x-2">
          <Button
            onClick={() => router.push(`/dashboard/partner/assigned-coupons?page=${pagination.currentPage - 1}`)}
            disabled={pagination.currentPage <= 1 || loading}
          >
            {t("partnerAssignedCoupons.pagination.previous")}
          </Button>
          <span className="p-2">
            {t("partnerAssignedCoupons.pagination.pageInfo")} - {t("common.page")}: {pagination.currentPage}, {t("common.totalPages")}: {pagination.totalPages}
          </span>
          <Button
            onClick={() => router.push(`/dashboard/partner/assigned-coupons?page=${pagination.currentPage + 1}`)}
            disabled={pagination.currentPage >= pagination.totalPages || loading}
          >
            {t("partnerAssignedCoupons.pagination.next")}
          </Button>
        </div>
      )}
      <p className="text-sm text-muted-foreground mt-4 text-center">
        {t("partnerAssignedCoupons.totalAssigned")}: {pagination.totalCoupons}
      </p>
    </div>
  )
}
