"use client"

import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Button } from "@/components/common/ui/button"
import type { GiftVoucherPlain } from "@/actions/gift-voucher-actions"
import { Gift, Wallet, Calendar, Clock, CreditCard, Tag, Info, ShoppingBag } from "lucide-react"

interface MemberGiftVoucherCardProps {
  voucher: GiftVoucherPlain
  onViewDetails: () => void
  onRedeem?: () => void
  showRedeemButton?: boolean
}

const MemberGiftVoucherCard = ({
  voucher,
  onViewDetails,
  onRedeem,
  showRedeemButton = false,
}: MemberGiftVoucherCardProps) => {
  const { t } = useTranslation()

  // Determine if voucher is active and can be redeemed
  const isActive =
    voucher.isActive &&
    voucher.status !== "fully_used" &&
    voucher.status !== "expired" &&
    voucher.status !== "cancelled" &&
    new Date() <= new Date(voucher.validUntil) &&
    new Date() >= new Date(voucher.validFrom)

  // Calculate days until expiry
  const daysUntilExpiry = Math.ceil(
    (new Date(voucher.validUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
  )

  return (
    <Card className={`overflow-hidden ${!isActive ? "opacity-75" : ""}`}>
      <div className={`h-2 ${voucher.voucherType === "treatment" ? "bg-purple-500" : "bg-emerald-500"}`}></div>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="flex items-center text-lg">
            {voucher.voucherType === "treatment" ? (
              <ShoppingBag className="h-5 w-5 mr-2 text-purple-500" />
            ) : (
              <CreditCard className="h-5 w-5 mr-2 text-emerald-500" />
            )}
            {voucher.voucherType === "treatment" ? voucher.treatmentName : `₪${voucher.monetaryValue?.toFixed(2)}`}
          </CardTitle>
          <Badge
            variant={
              voucher.status === "active"
                ? "default"
                : voucher.status === "partially_used"
                  ? "secondary"
                  : voucher.status === "fully_used"
                    ? "outline"
                    : "destructive"
            }
            className="ml-2"
          >
            {t(`giftVouchers.status.${voucher.status}`)}
          </Badge>
        </div>
        <div className="text-sm font-mono text-muted-foreground">{voucher.code}</div>
      </CardHeader>

      <CardContent className="pb-3 space-y-3">
        {voucher.voucherType === "treatment" ? (
          <div className="flex items-center text-sm">
            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>
              {voucher.selectedDurationMinutes
                ? `${voucher.selectedDurationMinutes} ${t("common.minutes")}`
                : t("giftVouchers.noSpecificDuration")}
            </span>
          </div>
        ) : (
          <div className="flex items-center text-sm">
            <Wallet className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>
              {t("giftVouchers.remainingBalance")}: ₪{voucher.remainingAmount?.toFixed(2)}
            </span>
          </div>
        )}

        <div className="flex items-center text-sm">
          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
          <span>
            {daysUntilExpiry > 0 ? t("giftVouchers.expiresIn", { days: daysUntilExpiry }) : t("giftVouchers.expired")}
          </span>
        </div>

        {voucher.isGift && (
          <div className="flex items-center text-sm">
            <Gift className="h-4 w-4 mr-2 text-muted-foreground" />
            {voucher.purchaserUserId === voucher.ownerUserId ? (
              <span>
                {t("giftVouchers.giftFor")}: {voucher.recipientName}
              </span>
            ) : (
              <span>
                {t("giftVouchers.giftFrom")}: {voucher.purchaserName}
              </span>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0 flex justify-between">
        <Button variant="outline" size="sm" onClick={onViewDetails}>
          <Info className="h-4 w-4 mr-2" />
          {t("giftVouchers.details")}
        </Button>

        {showRedeemButton && isActive && onRedeem && (
          <Button size="sm" onClick={onRedeem}>
            <Tag className="h-4 w-4 mr-2" />
            {t("giftVouchers.useVoucher")}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

export default MemberGiftVoucherCard
