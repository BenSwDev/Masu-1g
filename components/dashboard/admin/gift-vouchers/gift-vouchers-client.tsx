"use client"

import { Card, CardContent } from "@/components/common/ui/card"
import { useTranslation } from "@/lib/translations/i18n"

interface GiftVouchersClientProps {
  giftVouchers?: any[]
  pagination?: any
}

const GiftVouchersClient = ({ giftVouchers = [], pagination }: GiftVouchersClientProps) => {
  const { t } = useTranslation()
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("giftVouchers.title")}</h1>
      <div className="grid gap-4 mt-6">
        {giftVouchers.length === 0 ? (
          <div className="text-center text-gray-500">{t("giftVouchers.noGiftVouchers")}</div>
        ) : (
          giftVouchers.map((gv) => (
            <Card key={gv._id}>
              <CardContent className="p-4">
                <div>{gv.code}</div>
                <div>{gv.amount}</div>
                <div>{gv.expiryDate}</div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

export default GiftVouchersClient
