"use client"

import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent } from "@/components/common/ui/card"

interface MemberGiftVouchersClientProps {
  giftVouchers?: any[]
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

const MemberGiftVouchersClient = ({ giftVouchers = [], pagination }: MemberGiftVouchersClientProps) => {
  const { t } = useTranslation()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("memberGiftVouchers.title")}</h1>
      <p className="text-gray-600">{t("memberGiftVouchers.description")}</p>
      <div className="grid gap-4 mt-6">
        {giftVouchers.length === 0 ? (
          <div className="text-center text-gray-500">{t("memberGiftVouchers.noGiftVouchers")}</div>
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

export default MemberGiftVouchersClient
