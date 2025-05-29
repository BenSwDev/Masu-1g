"use client"

import { Card, CardContent, CardHeader } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Button } from "@/components/common/ui/button"
import { Separator } from "@/components/common/ui/separator"
import { useTranslation } from "@/lib/translations/i18n"
import type { GiftVoucherPlain } from "@/actions/gift-voucher-actions"
import { Gift, CreditCard, Calendar, User, MessageCircle, Phone } from "lucide-react"
import { format } from "date-fns"

interface MemberGiftVoucherCardProps {
  voucher: GiftVoucherPlain
  onUse?: (voucher: GiftVoucherPlain) => void
  onViewDetails?: (voucher: GiftVoucherPlain) => void
}

export default function MemberGiftVoucherCard({ voucher, onUse, onViewDetails }: MemberGiftVoucherCardProps) {
  const { t } = useTranslation()

  const getStatusColor = (status: GiftVoucherPlain["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "partially_used":
        return "bg-yellow-100 text-yellow-800"
      case "fully_used":
        return "bg-gray-100 text-gray-800"
      case "expired":
        return "bg-red-100 text-red-800"
      case "pending_send":
        return "bg-blue-100 text-blue-800"
      case "sent":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: GiftVoucherPlain["status"]) => {
    return t(`giftVoucher.status.${status}`)
  }

  const isUsable = ["active", "partially_used"].includes(voucher.status) && new Date(voucher.validUntil) > new Date()

  const isExpired = new Date(voucher.validUntil) < new Date()

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {voucher.voucherType === "treatment" ? (
              <Gift className="h-5 w-5 text-blue-600" />
            ) : (
              <CreditCard className="h-5 w-5 text-green-600" />
            )}
            <div>
              <h3 className="font-semibold text-lg">{voucher.code}</h3>
              <p className="text-sm text-gray-600">
                {voucher.voucherType === "treatment"
                  ? t("giftVoucher.treatmentVoucher")
                  : t("giftVoucher.monetaryVoucher")}
              </p>
            </div>
          </div>
          <Badge className={getStatusColor(voucher.status)}>{getStatusText(voucher.status)}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Voucher Value/Treatment */}
        <div>
          {voucher.voucherType === "treatment" ? (
            <div>
              <p className="font-medium text-gray-900">{voucher.treatmentName}</p>
              {voucher.selectedDurationName && <p className="text-sm text-gray-600">{voucher.selectedDurationName}</p>}
              <p className="text-lg font-bold text-blue-600">₪{voucher.monetaryValue}</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600">{t("giftVoucher.originalAmount")}</p>
              <p className="text-lg font-bold text-green-600">₪{voucher.originalAmount}</p>
              {voucher.status === "partially_used" && (
                <p className="text-sm text-orange-600">
                  {t("giftVoucher.remaining")}: ₪{voucher.remainingAmount}
                </p>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Validity */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-gray-500" />
          <span className={isExpired ? "text-red-600" : "text-gray-600"}>
            {t("giftVoucher.validUntil")}: {format(new Date(voucher.validUntil), "dd/MM/yyyy")}
          </span>
        </div>

        {/* Gift Information */}
        {voucher.isGift && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900">{t("giftVoucher.giftInfo")}</p>

              {voucher.purchaserName && voucher.purchaserUserId !== voucher.ownerUserId && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  <span>
                    {t("giftVoucher.from")}: {voucher.purchaserName}
                  </span>
                </div>
              )}

              {voucher.recipientName && voucher.purchaserUserId === voucher.ownerUserId && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  <span>
                    {t("giftVoucher.to")}: {voucher.recipientName}
                  </span>
                </div>
              )}

              {voucher.recipientPhone && voucher.purchaserUserId === voucher.ownerUserId && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>{voucher.recipientPhone}</span>
                </div>
              )}

              {voucher.greetingMessage && (
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <MessageCircle className="h-4 w-4 mt-0.5" />
                  <span className="italic">"{voucher.greetingMessage}"</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Usage History for Monetary Vouchers */}
        {voucher.voucherType === "monetary" && voucher.usageHistory && voucher.usageHistory.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900">{t("giftVoucher.usageHistory")}</p>
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {voucher.usageHistory.map((usage, index) => (
                  <div key={index} className="flex justify-between text-xs text-gray-600">
                    <span>{format(new Date(usage.date), "dd/MM/yyyy")}</span>
                    <span>-₪{usage.amountUsed}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {isUsable && onUse && (
            <Button onClick={() => onUse(voucher)} className="flex-1">
              {t("giftVoucher.useVoucher")}
            </Button>
          )}
          {onViewDetails && (
            <Button variant="outline" onClick={() => onViewDetails(voucher)} className="flex-1">
              {t("giftVoucher.viewDetails")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
