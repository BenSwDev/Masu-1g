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
} from "lucide-react"

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
  const { t } = useTranslation()

  if (!voucher) return null

  const getStatusColor = (status: GiftVoucherPlain["status"]) => {
    // Simplified colors, can be expanded
    if (status === "active" || status === "sent") return "bg-green-100 text-green-800"
    if (status === "partially_used") return "bg-yellow-100 text-yellow-800"
    if (status === "expired" || status === "cancelled") return "bg-red-100 text-red-800"
    return "bg-gray-100 text-gray-800"
  }

  const DetailItem = ({
    icon: Icon,
    label,
    value,
  }: { icon: React.ElementType; label: string; value?: string | number | null }) =>
    value ? (
      <div className="flex items-start space-x-3">
        <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-sm font-medium">{String(value)}</p>
        </div>
      </div>
    ) : null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Tag className="mr-2 h-5 w-5" />
            {t("giftVouchers.myVouchers.voucherDetailsTitle")} - {voucher.code}
          </DialogTitle>
          <DialogDescription>{t("giftVouchers.myVouchers.voucherDetailsDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex justify-between items-center">
            <p className="text-lg font-semibold">
              {voucher.voucherType === "monetary"
                ? `${voucher.monetaryValue?.toFixed(2)} ${t("common.currency")}`
                : voucher.treatmentName || t("giftVouchers.types.treatment")}
            </p>
            <Badge className={getStatusColor(voucher.status)}>{t(`giftVouchers.statuses.${voucher.status}`)}</Badge>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DetailItem icon={Tag} label={t("giftVouchers.fields.code")} value={voucher.code} />
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
                />
              </>
            )}
            {voucher.voucherType === "treatment" && (
              <>
                <DetailItem icon={Info} label={t("giftVouchers.fields.treatment")} value={voucher.treatmentName} />
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
            />
            <DetailItem
              icon={voucher.isActive ? CheckCircle : XCircle}
              label={t("giftVouchers.fields.activeStatus")}
              value={voucher.isActive ? t("common.active") : t("common.inactive")}
            />
          </div>

          {voucher.isGift && (
            <>
              <Separator />
              <h4 className="font-medium">{t("giftVouchers.myVouchers.giftDetails")}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {voucher.purchaserName && voucher.purchaserUserId !== voucher.ownerUserId && (
                  <DetailItem
                    icon={User}
                    label={t("giftVouchers.myVouchers.receivedFrom")}
                    value={voucher.purchaserName}
                  />
                )}
                {voucher.recipientName && (
                  <DetailItem icon={User} label={t("giftVouchers.myVouchers.giftedTo")} value={voucher.recipientName} />
                )}
                {voucher.recipientPhone && (
                  <DetailItem
                    icon={Phone}
                    label={t("giftVouchers.fields.recipientPhone")}
                    value={voucher.recipientPhone}
                  />
                )}
                {voucher.greetingMessage && (
                  <div className="md:col-span-2 flex items-start space-x-3">
                    <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t("giftVouchers.fields.greetingMessage")}</p>
                      <p className="text-sm font-medium italic">"{voucher.greetingMessage}"</p>
                    </div>
                  </div>
                )}
                {voucher.sendDate && (
                  <DetailItem
                    icon={CalendarDays}
                    label={t("giftVouchers.fields.sendDate")}
                    value={format(parseISO(voucher.sendDate as string), "PPPp")}
                  />
                )}
              </div>
            </>
          )}

          {voucher.usageHistory && voucher.usageHistory.length > 0 && (
            <>
              <Separator />
              <h4 className="font-medium">{t("giftVouchers.myVouchers.usageHistory")}</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {voucher.usageHistory.map((item, index) => (
                  <div key={index} className="text-sm p-2 border rounded-md">
                    <p>
                      <strong>{t("giftVouchers.myVouchers.amountUsed")}:</strong> {item.amountUsed.toFixed(2)}{" "}
                      {t("common.currency")}
                    </p>
                    <p>
                      <strong>{t("giftVouchers.myVouchers.usedOn")}:</strong>{" "}
                      {format(parseISO(item.date as unknown as string), "PPPp")}
                    </p>
                    {item.orderId && (
                      <p>
                        <strong>{t("giftVouchers.myVouchers.orderId")}:</strong> {item.orderId}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
