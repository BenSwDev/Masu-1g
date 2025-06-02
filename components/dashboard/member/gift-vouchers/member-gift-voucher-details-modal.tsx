"use client"

import type React from "react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/common/ui/dialog"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { Separator } from "@/components/common/ui/separator"
import { ScrollArea } from "@/components/common/ui/scroll-area"
import type { GiftVoucherPlain } from "@/actions/gift-voucher-actions"
import { useTranslation } from "@/lib/translations/i18n"
import { format, parseISO } from "date-fns"
import {
  CalendarDays,
  CheckCircle,
  Clock,
  CreditCard,
  GiftIcon,
  Info,
  MessageSquare,
  Phone,
  Tag,
  User,
  XCircle,
  Receipt,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils/utils"

interface MemberGiftVoucherDetailsModalProps {
  voucher: GiftVoucherPlain | null
  isOpen: boolean
  onClose: () => void
}

export default function MemberGiftVoucherDetailsModal({
  voucher,
  isOpen,
  onClose,
}: MemberGiftVoucherDetailsModalProps) {
  const { t, dir } = useTranslation()

  if (!voucher) return null

  const getStatusColor = (status: GiftVoucherPlain["status"]) => {
    switch (status) {
      case "active":
      case "sent":
        return "bg-green-100 text-green-800 border-green-200"
      case "partially_used":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "expired":
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200"
      case "fully_used":
        return "bg-gray-100 text-gray-800 border-gray-200"
      case "pending_send":
        return "bg-blue-100 text-blue-800 border-blue-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const DetailItem = ({
    icon: Icon,
    label,
    value,
    highlight = false,
  }: {
    icon: React.ElementType
    label: string
    value?: string | number | null
    highlight?: boolean
  }) =>
    value ? (
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg mt-0.5", highlight ? "bg-primary/10" : "bg-muted/50")}>
          <Icon className={cn("h-4 w-4", highlight ? "text-primary" : "text-muted-foreground")} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className={cn("text-sm font-medium break-words", highlight && "text-primary")}>{String(value)}</p>
        </div>
      </div>
    ) : null

  const isExpired = new Date(voucher.validUntil) < new Date()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Tag className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span>{voucher.code}</span>
                <Badge className={cn("border", getStatusColor(voucher.status))}>
                  {t(`giftVouchers.status.${voucher.status}`)}
                </Badge>
              </div>
            </div>
          </DialogTitle>
          <DialogDescription className="text-base">
            {t("giftVouchers.myVouchers.voucherDetailsDescription")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-6">
          <div className="space-y-6 pb-6">
            {/* Value Summary */}
            <div
              className={cn(
                "p-4 rounded-lg border-2",
                isExpired ? "bg-red-50 border-red-200" : "bg-primary/5 border-primary/20",
              )}
            >
              <div className="text-center">
                <div className="text-2xl font-bold mb-1">
                  {voucher.voucherType === "monetary"
                    ? `${voucher.monetaryValue?.toFixed(2)} ${t("common.currency")}`
                    : voucher.treatmentName || t("giftVouchers.types.treatment")}
                </div>
                <p className="text-sm text-muted-foreground">
                  {voucher.voucherType === "monetary"
                    ? t("giftVouchers.types.monetary")
                    : t("giftVouchers.types.treatment")}
                </p>
              </div>
            </div>

            {/* Basic Information */}
            <div className="space-y-4">
              <h4 className="font-semibold text-base flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                {t("giftVouchers.myVouchers.basicInfo")}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailItem icon={Tag} label={t("giftVouchers.fields.code")} value={voucher.code} highlight />
                <DetailItem
                  icon={voucher.voucherType === "monetary" ? CreditCard : GiftIcon}
                  label={t("giftVouchers.fields.voucherType")}
                  value={t(`giftVouchers.types.${voucher.voucherType}`)}
                />

                {voucher.voucherType === "monetary" && (
                  <>
                    <DetailItem
                      icon={CreditCard}
                      label={t("giftVouchers.myVouchers.originalValue")}
                      value={`${voucher.originalAmount?.toFixed(2)} ${t("common.currency")}`}
                    />
                    <DetailItem
                      icon={CreditCard}
                      label={t("giftVouchers.fields.remainingAmount")}
                      value={`${voucher.remainingAmount?.toFixed(2)} ${t("common.currency")}`}
                      highlight
                    />
                  </>
                )}

                {voucher.voucherType === "treatment" && (
                  <>
                    <DetailItem
                      icon={GiftIcon}
                      label={t("giftVouchers.fields.treatment")}
                      value={voucher.treatmentName}
                    />
                    {voucher.selectedDurationName && (
                      <DetailItem
                        icon={Clock}
                        label={t("giftVouchers.fields.duration")}
                        value={voucher.selectedDurationName}
                      />
                    )}
                  </>
                )}

                <DetailItem
                  icon={CalendarDays}
                  label={t("giftVouchers.fields.purchaseDate")}
                  value={format(parseISO(voucher.purchaseDate as string), "PPP")}
                />
                <DetailItem
                  icon={CalendarDays}
                  label={t("giftVouchers.fields.validFrom")}
                  value={format(parseISO(voucher.validFrom as string), "PPP")}
                />
                <DetailItem
                  icon={CalendarDays}
                  label={t("giftVouchers.fields.validUntil")}
                  value={format(parseISO(voucher.validUntil as string), "PPP")}
                  highlight={isExpired}
                />
                <DetailItem
                  icon={voucher.isActive ? CheckCircle : XCircle}
                  label={t("giftVouchers.fields.activeStatus")}
                  value={voucher.isActive ? t("common.active") : t("common.inactive")}
                />
              </div>
            </div>

            {/* Gift Details */}
            {voucher.isGift && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h4 className="font-semibold text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    {t("giftVouchers.myVouchers.giftDetails")}
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {voucher.purchaserName && voucher.purchaserUserId !== voucher.ownerUserId && (
                      <DetailItem
                        icon={User}
                        label={t("giftVouchers.myVouchers.receivedFrom")}
                        value={voucher.purchaserName}
                        highlight
                      />
                    )}
                    {voucher.recipientName && (
                      <DetailItem
                        icon={User}
                        label={t("giftVouchers.myVouchers.giftedTo")}
                        value={voucher.recipientName}
                        highlight
                      />
                    )}
                    {voucher.recipientPhone && (
                      <DetailItem
                        icon={Phone}
                        label={t("giftVouchers.fields.recipientPhone")}
                        value={voucher.recipientPhone}
                      />
                    )}
                    {voucher.sendDate && (
                      <DetailItem
                        icon={CalendarDays}
                        label={t("giftVouchers.fields.sendDate")}
                        value={format(parseISO(voucher.sendDate as string), "PPPp")}
                      />
                    )}
                  </div>

                  {voucher.greetingMessage && (
                    <div className="p-4 bg-muted/30 rounded-lg border">
                      <div className="flex items-start gap-3">
                        <MessageSquare className="h-4 w-4 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">
                            {t("giftVouchers.fields.greetingMessage")}
                          </p>
                          <p className="text-sm font-medium italic">"{voucher.greetingMessage}"</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Usage History */}
            {voucher.usageHistory && voucher.usageHistory.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h4 className="font-semibold text-base flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-primary" />
                    {t("giftVouchers.myVouchers.usageHistory")}
                  </h4>

                  <div className="space-y-3">
                    {voucher.usageHistory.map((item, index) => (
                      <div key={index} className="p-3 border rounded-lg bg-muted/20">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-sm">
                            {t("giftVouchers.myVouchers.amountUsed")}: {item.amountUsed.toFixed(2)}{" "}
                            {t("common.currency")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(item.date as unknown as string), "PPP")}
                          </span>
                        </div>
                        {item.orderId && (
                          <p className="text-xs text-muted-foreground">
                            {t("giftVouchers.myVouchers.orderId")}: {item.orderId}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 pt-0">
          <Button variant="outline" onClick={onClose} className="px-8">
            {t("common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
