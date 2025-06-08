"use client"

import { Card, CardContent, CardHeader } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Button } from "@/components/common/ui/button"
import { Separator } from "@/components/common/ui/separator"
import { useTranslation } from "@/lib/translations/i18n"
import type { GiftVoucherPlain } from "@/actions/gift-voucher-actions"
import { Gift, CreditCard, Calendar, User, MessageCircle, Phone, Clock, Eye, ShoppingBag } from "lucide-react"
import { format, parseISO } from "date-fns"
import { cn } from "@/lib/utils/utils"

interface MemberGiftVoucherCardProps {
  voucher: GiftVoucherPlain
  onUse?: (voucher: GiftVoucherPlain) => void
  onViewDetails?: (voucher: GiftVoucherPlain) => void
}

export default function MemberGiftVoucherCard({ voucher, onUse, onViewDetails }: MemberGiftVoucherCardProps) {
  const { t, dir } = useTranslation()

  const getStatusColor = (status: GiftVoucherPlain["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200"
      case "partially_used":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "fully_used":
        return "bg-gray-100 text-gray-800 border-gray-200"
      case "expired":
        return "bg-red-100 text-red-800 border-red-200"
      case "pending_send":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "sent":
        return "bg-purple-100 text-purple-800 border-purple-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const isUsable = ["active", "partially_used"].includes(voucher.status) && new Date(voucher.validUntil) > new Date()
  const isExpired = new Date(voucher.validUntil) < new Date()

  return (
    <Card
      className={cn(
        "h-full transition-all duration-200 hover:shadow-lg border-2",
        isExpired ? "opacity-75" : "hover:border-primary/20",
      )}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", voucher.voucherType === "treatment" ? "bg-blue-100" : "bg-green-100")}>
              {voucher.voucherType === "treatment" ? (
                <Gift className="h-6 w-6 text-blue-600" />
              ) : (
                <CreditCard className="h-6 w-6 text-green-600" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-lg truncate">{voucher.code}</h3>
              <p className="text-sm text-muted-foreground">
                {voucher.voucherType === "treatment"
                  ? t("giftVouchers.fields.treatment")
                  : t("giftVouchers.fields.monetaryValue")}
              </p>
            </div>
          </div>
          <Badge className={cn("border", getStatusColor(voucher.status))}>
            {t(`giftVouchers.status.${voucher.status}`)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Value Information */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{t("giftVouchers.myVouchers.originalValue")}:</span>
            <span className="font-semibold">
              {voucher.voucherType === "monetary"
                ? `${voucher.monetaryValue?.toFixed(2)} ${t("common.currency")}`
                : voucher.treatmentName}
            </span>
          </div>

          {voucher.voucherType === "monetary" && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t("giftVouchers.fields.remainingAmount")}:</span>
              <span className="font-semibold text-primary">
                {voucher.remainingAmount?.toFixed(2) ?? voucher.monetaryValue?.toFixed(2)} {t("common.currency")}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {t("giftVouchers.fields.validUntil")}:
            </span>
            <span className={cn("font-medium text-sm", isExpired ? "text-destructive" : "text-foreground")}>
              {format(
                typeof voucher.validUntil === "string" ? parseISO(voucher.validUntil) : voucher.validUntil,
                "MMM d, yyyy",
              )}
            </span>
          </div>
        </div>

        {/* Gift Details */}
        {voucher.isGift && (
          <>
            <Separator />
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <Gift className="w-4 h-4 text-primary" />
                {t("giftVouchers.myVouchers.giftDetails")}
              </p>

              {voucher.purchaserName && voucher.purchaserUserId !== voucher.ownerUserId && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>
                    {t("giftVouchers.myVouchers.receivedFrom")}:{" "}
                    <span className="font-medium">{voucher.purchaserName}</span>
                  </span>
                </div>
              )}

              {voucher.recipientName && voucher.purchaserUserId === voucher.ownerUserId && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>
                    {t("giftVouchers.myVouchers.giftedTo")}:{" "}
                    <span className="font-medium">{voucher.recipientName}</span>
                  </span>
                </div>
              )}

              {voucher.recipientPhone && voucher.purchaserUserId === voucher.ownerUserId && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span className="font-medium">{voucher.recipientPhone}</span>
                </div>
              )}

              {voucher.greetingMessage && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-start gap-2 text-sm">
                    <MessageCircle className="h-3 w-3 mt-0.5 text-muted-foreground" />
                    <span className="italic text-muted-foreground">"{voucher.greetingMessage}"</span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Usage History for Monetary Vouchers */}
        {voucher.voucherType === "monetary" && voucher.usageHistory && voucher.usageHistory.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                {t("giftVouchers.myVouchers.usageHistory")}
              </p>
              <div className="space-y-2 max-h-24 overflow-y-auto">
                {voucher.usageHistory.slice(0, 3).map((usage, index) => (
                  <div key={index} className="flex justify-between text-xs bg-muted/30 p-2 rounded">
                    <span className="text-muted-foreground">
                      {format(typeof usage.date === "string" ? parseISO(usage.date) : usage.date, "MMM d")}
                    </span>
                    <span className="font-medium text-destructive">
                      -{usage.amountUsed?.toFixed(2) ?? "0.00"} {t("common.currency")}
                    </span>
                  </div>
                ))}
                {voucher.usageHistory.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{voucher.usageHistory.length - 3} {t("common.more")}
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          {onUse && isUsable && (
            <Button
              variant="default"
              className="flex-1 h-10"
              onClick={() => onUse(voucher)}
              disabled={!voucher.isActive}
            >
              <ShoppingBag className={cn("w-4 h-4", dir === "rtl" ? "ml-2" : "mr-2")} />
              {t("giftVouchers.myVouchers.useVoucher")}
            </Button>
          )}
          {onViewDetails && (
            <Button
              variant="outline"
              className={cn("h-10", onUse && isUsable ? "flex-none px-3" : "flex-1")}
              onClick={() => onViewDetails(voucher)}
            >
              <Eye className={cn("w-4 h-4", !onUse || !isUsable ? (dir === "rtl" ? "ml-2" : "mr-2") : "")} />
              {(!onUse || !isUsable) && t("giftVouchers.myVouchers.viewDetails")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
