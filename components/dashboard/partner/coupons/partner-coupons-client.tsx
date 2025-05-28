"use client"

import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent } from "@/components/common/ui/card"

interface PartnerCouponsClientProps {
  coupons?: any[]
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

const PartnerCouponsClient = ({ coupons = [], pagination }: PartnerCouponsClientProps) => {
  const { t } = useTranslation()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("partnerCoupons.title")}</h1>
      <p className="text-gray-600">{t("partnerCoupons.description")}</p>
      <div className="grid gap-4 mt-6">
        {coupons.length === 0 ? (
          <div className="text-center text-gray-500">{t("partnerCoupons.noCoupons")}</div>
        ) : (
          coupons.map((coupon) => (
            <Card key={coupon._id}>
              <CardContent className="p-4">
                <div>{coupon.code}</div>
                <div>{coupon.discount}</div>
                <div>{coupon.expiryDate}</div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

export default PartnerCouponsClient
