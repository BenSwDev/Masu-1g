"use client"

import { Card, CardContent, CardHeader } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Button } from "@/components/common/ui/button"
import { Separator } from "@/components/common/ui/separator"
import { useTranslation } from "@/lib/translations/i18n"
import type { GiftVoucherPlain } from "@/actions/gift-voucher-actions"
import { Gift, CreditCard, Calendar, User, MessageCircle, Phone } from "lucide-react"
import { format, parseISO } from "date-fns"

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
                  ? t("giftVouchers.fields.treatment")
                  : t("giftVouchers.fields.monetaryValue")}
              </p>
            </div>
          </div>
          <Badge className={getStatusColor(voucher.status)}>{t(`giftVouchers.status.${voucher.status}`)}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{t("giftVouchers.myVouchers.originalValue")}:</span>
            <span className="font-medium">
              {voucher.voucherType === "monetary"
                ? `${voucher.monetaryValue?.toFixed(2)} ${t("common.currency")}`
                : voucher.treatmentName}
            </span>
          </div>
          {voucher.voucherType === "monetary" && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t("giftVouchers.fields.remainingAmount")}:</span>
              <span className="font-medium">
                {voucher.remainingAmount?.toFixed(2) ?? voucher.monetaryValue?.toFixed(2)} {t("common.currency")}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{t("giftVouchers.fields.validUntil")}:</span>
            <span className="font-medium">
              {format(
                typeof voucher.validUntil === "string" ? parseISO(voucher.validUntil) : voucher.validUntil,
                "MMM d, yyyy",
              )}
            </span>
          </div>
        </div>

        {voucher.isGift && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900">{t("giftVouchers.myVouchers.giftDetails")}</p>

              {voucher.purchaserName && voucher.purchaserUserId !== voucher.ownerUserId && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  <span>
                    {t("giftVouchers.myVouchers.receivedFrom")}: {voucher.purchaserName}
                  </span>
                </div>
              )}

              {voucher.recipientName && voucher.purchaserUserId === voucher.ownerUserId && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  <span>
                    {t("giftVouchers.myVouchers.giftedTo")}: {voucher.recipientName}
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
              <p className="text-sm font-medium text-gray-900">{t("giftVouchers.myVouchers.usageHistory")}</p>
              {voucher.usageHistory.map((usage, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {format(
                      typeof usage.date === "string" ? parseISO(usage.date) : usage.date,
                      "MMM d, yyyy",
                    )}
                  </span>
                  <span className="font-medium">
                    -{usage.amount.toFixed(2)} {t("common.currency")}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="flex gap-2 pt-2">
          {onUse && voucher.status === "active" && (
            <Button
              variant="default"
              className="flex-1"
              onClick={() => onUse(voucher)}
              disabled={!voucher.isActive}
            >
              {t("giftVouchers.myVouchers.useVoucher")}
            </Button>
          )}
          {onViewDetails && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onViewDetails(voucher)}
            >
              {t("giftVouchers.myVouchers.viewDetails")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
