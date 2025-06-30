"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { format, differenceInDays, parseISO } from "date-fns"
import { he } from "date-fns/locale"
import {
  Gift,
  User,
  Calendar,
  CreditCard,
  Tag,
  CircleDollarSign,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Ban,
  Copy,
  QrCode,
  MapPin,
  Phone,
  Mail,
  Package,
  Receipt,
  Info,
  Link
} from "lucide-react"
import { useTranslation } from "@/lib/translations/i18n"
import { toast } from "sonner"
import type { GiftVoucherPlain } from "@/types/core"
import { formatPhoneForDisplay } from "@/lib/utils/phone-utils"

interface AdminGiftVoucherDetailsModalProps {
  voucher: GiftVoucherPlain | null
  isOpen: boolean
  onClose: () => void
}

export default function AdminGiftVoucherDetailsModal({
  voucher,
  isOpen,
  onClose,
}: AdminGiftVoucherDetailsModalProps) {
  const { t } = useTranslation()

  if (!voucher) return null

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(voucher.code)
      toast.success(t("giftVouchers.notifications.codeCopied"))
    } catch (error) {
      toast.error(t("giftVouchers.notifications.copyError"))
    }
  }

  const getStatusInfo = (status: string) => {
    const statusConfig = {
      active: {
        label: t("giftVouchers.statuses.active"),
        Icon: CheckCircle,
        className: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
        iconColor: "text-green-600 dark:text-green-400",
      },
      sent: {
        label: t("giftVouchers.statuses.sent"),
        Icon: Send,
        className: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
        iconColor: "text-blue-600 dark:text-blue-400",
      },
      partially_used: {
        label: t("giftVouchers.statuses.partially_used"),
        Icon: CheckCircle,
        className: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400",
        iconColor: "text-cyan-600 dark:text-cyan-400",
      },
      pending_payment: {
        label: t("giftVouchers.statuses.pending_payment"),
        Icon: Clock,
        className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
        iconColor: "text-yellow-600 dark:text-yellow-400",
      },
      pending_send: {
        label: t("giftVouchers.statuses.pending_send"),
        Icon: Clock,
        className: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400",
        iconColor: "text-orange-600 dark:text-orange-400",
      },
      fully_used: {
        label: t("giftVouchers.statuses.fully_used"),
        Icon: CheckCircle,
        className: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400",
        iconColor: "text-gray-600 dark:text-gray-400",
      },
      expired: {
        label: t("giftVouchers.statuses.expired"),
        Icon: AlertTriangle,
        className: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
        iconColor: "text-red-600 dark:text-red-400",
      },
      cancelled: {
        label: t("giftVouchers.statuses.cancelled"),
        Icon: Ban,
        className: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
        iconColor: "text-red-600 dark:text-red-400",
      },
    }
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.cancelled
  }

  const statusInfo = getStatusInfo(voucher.status)
  const StatusIcon = statusInfo.Icon

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === "string" ? parseISO(date) : date
    return format(dateObj, "dd/MM/yyyy HH:mm", { locale: he })
  }

  const formatDateShort = (date: Date | string) => {
    const dateObj = typeof date === "string" ? parseISO(date) : date
    return format(dateObj, "dd/MM/yy", { locale: he })
  }

  const validFromDate = typeof voucher.validFrom === "string" ? parseISO(voucher.validFrom) : voucher.validFrom
  const validUntilDate = typeof voucher.validUntil === "string" ? parseISO(voucher.validUntil) : voucher.validUntil
  const purchaseDate = typeof voucher.purchaseDate === "string" ? parseISO(voucher.purchaseDate) : voucher.purchaseDate

  // Calculate usage percentage for monetary vouchers
  const usagePercentage = voucher.voucherType === "monetary" && voucher.monetaryValue 
    ? ((voucher.monetaryValue - (voucher.remainingAmount || voucher.monetaryValue)) / voucher.monetaryValue) * 100
    : voucher.voucherType === "treatment" && voucher.status === "fully_used" ? 100 : 0

  // Days until expiry
  const daysUntilExpiry = validUntilDate ? differenceInDays(validUntilDate, new Date()) : null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Gift className="h-6 w-6 text-purple-600" />
            {t("giftVouchers.details.title")} - {voucher.code}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Status & Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    {t("giftVouchers.details.basicInfo")}
                  </span>
                  <Badge className={`${statusInfo.className} font-medium flex items-center gap-1`}>
                    <StatusIcon className={`h-3.5 w-3.5 ${statusInfo.iconColor}`} />
                    {statusInfo.label}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Voucher Code */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <QrCode className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <span className="font-mono font-bold text-xl">{voucher.code}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyCode}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>

                {/* Voucher Type & Value */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {voucher.voucherType === "monetary" ? (
                        <CircleDollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <Tag className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      )}
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {t("giftVouchers.fields.voucherType")}
                      </span>
                    </div>
                    <span className="font-medium">
                      {t(`giftVouchers.types.${voucher.voucherType}`)}
                    </span>
                  </div>

                  {voucher.voucherType === "monetary" ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {t("giftVouchers.fields.value")}
                        </span>
                        <span className="font-bold text-lg text-green-600">
                          {voucher.monetaryValue?.toFixed(2)} ₪
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {t("giftVouchers.fields.remainingAmount")}
                        </span>
                        <span className="font-medium">
                          {(voucher.remainingAmount || voucher.monetaryValue)?.toFixed(2)} ₪
                        </span>
                      </div>
                      <Progress value={100 - usagePercentage} className="h-2" />
                      <div className="text-xs text-center text-gray-500">
                        {(100 - usagePercentage).toFixed(1)}% {t("giftVouchers.remaining")}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {t("giftVouchers.fields.treatment")}
                        </span>
                        <span className="font-medium">{voucher.treatmentName || "N/A"}</span>
                      </div>
                      {voucher.selectedDurationName && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {t("giftVouchers.fields.duration")}
                          </span>
                          <span className="font-medium">{voucher.selectedDurationName}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Expiry Warning */}
                {daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry >= 0 && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-yellow-800 dark:text-yellow-200">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">
                      {daysUntilExpiry === 0 
                        ? t("giftVouchers.expiringToday")
                        : t("giftVouchers.expiringIn")
                      }
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Owner Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t("giftVouchers.details.ownerInfo")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {voucher.ownerName ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {t("giftVouchers.fields.owner")}
                      </span>
                      <span className="font-medium">{voucher.ownerName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {t("common.userId")}
                      </span>
                      <span className="font-mono text-sm">{voucher.ownerUserId}</span>
                    </div>
                  </>
                ) : (voucher as any).guestInfo ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {t("common.name")}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{(voucher as any).guestInfo.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {t("userSubscriptions.guest")}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {t("common.email")}
                      </span>
                      <span className="font-medium">{(voucher as any).guestInfo.email}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {t("common.phone")}
                      </span>
                      <span className="font-medium">{formatPhoneForDisplay((voucher as any).guestInfo.phone || "")}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    {t("common.unknownUser")}
                  </div>
                )}

                {/* Gift Information */}
                {voucher.isGift && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                        <Gift className="h-4 w-4" />
                        <span className="font-medium">{t("giftVouchers.purchase.giftInfo")}</span>
                      </div>
                      {voucher.purchaserName && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {t("giftVouchers.fields.purchaser")}
                          </span>
                          <span className="font-medium">{voucher.purchaserName}</span>
                        </div>
                      )}
                      {voucher.recipientName && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {t("giftVouchers.fields.recipientName")}
                          </span>
                          <span className="font-medium">{voucher.recipientName}</span>
                        </div>
                      )}
                      {voucher.recipientEmail && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {t("giftVouchers.fields.recipientEmail")}
                          </span>
                          <span className="font-medium">{voucher.recipientEmail}</span>
                        </div>
                      )}
                      {voucher.greetingMessage && (
                        <div className="pt-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400 block mb-1">
                            {t("giftVouchers.fields.giftMessage")}
                          </span>
                          <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded text-sm">
                            {voucher.greetingMessage}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Usage History */}
            {voucher.usageHistory && voucher.usageHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    {t("giftVouchers.details.usageHistory")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {voucher.usageHistory.map((usage, index) => (
                    <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {usage.description || "שימוש בשובר"}
                        </span>
                        <span className="text-sm font-bold text-green-600">
                          ₪{usage.amountUsed.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(usage.date), "dd/MM/yyyy HH:mm")}
                        </div>
                        {usage.orderId && (
                          <div className="flex items-center gap-1">
                            <Link className="h-3 w-3" />
                            <span>הזמנה: {usage.orderId}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Remaining balance display */}
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        {t("giftVouchers.details.remainingBalance")}
                      </span>
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        ₪{voucher.remainingAmount?.toFixed(2) || "0.00"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Dates & Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {t("giftVouchers.details.timeline")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {t("giftVouchers.fields.purchaseDate")}
                    </span>
                    <span className="font-medium font-mono">
                      {purchaseDate ? formatDate(purchaseDate) : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {t("giftVouchers.fields.validFrom")}
                    </span>
                    <span className="font-medium font-mono">
                      {validFromDate ? formatDate(validFromDate) : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {t("giftVouchers.fields.validUntil")}
                    </span>
                    <span className="font-medium font-mono">
                      {validUntilDate ? formatDate(validUntilDate) : "N/A"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Information */}
            {(voucher.paymentAmount || voucher.paymentMethodId || voucher.transactionId) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    {t("giftVouchers.details.paymentInfo")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {voucher.paymentAmount && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {t("giftVouchers.fields.paymentAmount")}
                      </span>
                      <span className="font-bold text-lg">{voucher.paymentAmount.toFixed(2)} ₪</span>
                    </div>
                  )}
                  {voucher.paymentMethodId && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {t("giftVouchers.fields.paymentMethod")}
                      </span>
                      <span className="font-medium">{voucher.paymentMethodId}</span>
                    </div>
                  )}
                  {voucher.transactionId && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {t("giftVouchers.fields.transactionId")}
                      </span>
                      <span className="font-mono text-sm">{voucher.transactionId}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Admin Notes & Extra Info */}
            {(voucher.notes || voucher.isActive !== undefined) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    {t("giftVouchers.details.adminInfo")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {voucher.isActive !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {t("giftVouchers.fields.isActive")}
                      </span>
                      <Badge variant={voucher.isActive ? "default" : "secondary"}>
                        {voucher.isActive ? t("common.active") : t("common.inactive")}
                      </Badge>
                    </div>
                  )}
                  {voucher.notes && (
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 block mb-2">
                        {t("giftVouchers.fields.notes")}
                      </span>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                        {voucher.notes}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
