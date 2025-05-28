"use client"

import { Card, CardContent } from "@/components/common/ui/card"
import { useTranslation } from "@/lib/translations/i18n"

interface CouponsClientProps {
  coupons?: any[]
  pagination?: any
}

const CouponsClient = ({ coupons = [], pagination }: CouponsClientProps) => {
  const { t } = useTranslation()
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("coupons.title")}</h1>
      <div className="grid gap-4 mt-6">
        {coupons.length === 0 ? (
          <div className="text-center text-gray-500">{t("coupons.noCoupons")}</div>
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

export default CouponsClient
