"use client"

import { useTranslation } from "react-i18next"
import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import type { ICoupon } from "@/lib/db/models/coupon"
import type { getAssignedPartnerCoupons } from "@/actions/coupon-actions"
import AssignedCouponCard from "./assigned-coupon-card"
import { Button } from "@/components/common/ui/button" // For pagination if needed
// import { Input } from '@/components/common/ui/input'; // For filters if needed

interface AssignedCouponsClientProps {
  initialData: Awaited<ReturnType<typeof getAssignedPartnerCoupons>>
}

export default function AssignedCouponsClient({ initialData }: AssignedCouponsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t, dir } = useTranslation()

  const [coupons, setCoupons] = React.useState<ICoupon[]>(initialData.coupons)
  const [pagination, setPagination] = React.useState({
    totalPages: initialData.totalPages,
    currentPage: initialData.currentPage,
    totalCoupons: initialData.totalCoupons,
  })
  const [loading, setLoading] = React.useState(false)

  // Add filtering or pagination logic here if needed, similar to admin client

  if (loading && coupons.length === 0) {
    return <p dir={dir}>{t("partnerCoupons.client.loadingCoupons")}</p>
  }

  if (!loading && coupons.length === 0) {
    return <p dir={dir}>{t("partnerCoupons.client.noCouponsAssigned")}</p>
  }

  return (
    <div dir={dir}>
      {/* Add Filters here if needed */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {coupons.map((coupon) => (
          <AssignedCouponCard key={coupon._id.toString()} coupon={coupon} />
        ))}
      </div>
      {/* Add Pagination controls here if totalPages > 1 */}
      {pagination.totalPages > 1 && (
        <div className="mt-8 flex justify-center space-x-2">
          <Button
            onClick={() => router.push(`/dashboard/partner/assigned-coupons?page=${pagination.currentPage - 1}`)}
            disabled={pagination.currentPage <= 1 || loading}
          >
            {t("common.previous")}
          </Button>
          <span className="p-2">
            {t("partnerCoupons.client.paginationPageInfo", {
              currentPage: pagination.currentPage,
              totalPages: pagination.totalPages,
            })}
          </span>
          <Button
            onClick={() => router.push(`/dashboard/partner/assigned-coupons?page=${pagination.currentPage + 1}`)}
            disabled={pagination.currentPage >= pagination.totalPages || loading}
          >
            {t("common.next")}
          </Button>
        </div>
      )}
      <p className="text-sm text-muted-foreground mt-4 text-center">
        {t("partnerCoupons.client.totalAssignedCouponsLabel")} {pagination.totalCoupons}
      </p>
    </div>
  )
}
