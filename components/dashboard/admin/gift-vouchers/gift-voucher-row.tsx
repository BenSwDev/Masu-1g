"use client"

import { format, parseISO, differenceInDays } from "date-fns"
import {
  Edit,
  Trash2,
  UserCircle,
  Tag,
  CalendarDays,
  CircleDollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Send,
  Gift,
} from "lucide-react"
import { Button } from "@/components/ui/button" // Corrected import path
import { Badge } from "@/components/ui/badge" // Corrected import path
import type { GiftVoucherPlain } from "@/types/core" // Corrected import path
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip" // Corrected import path
import { useTranslation } from "@/lib/translations/i18n"
import { formatPhoneForDisplay } from "@/lib/utils/phone-utils"

interface GiftVoucherRowProps {
  voucher: GiftVoucherPlain
  onEdit: (voucher: GiftVoucherPlain) => void
  onDelete: (id: string) => void
  onViewDetails?: (voucher: GiftVoucherPlain) => void
}

const getStatusBadgeVariant = (
  status: GiftVoucherPlain["status"],
  isActive: boolean
): "default" | "secondary" | "destructive" | "outline" => {
  if (!isActive) return "secondary" // Overriding status if not active by admin
  switch (status) {
    case "active":
    case "sent":
      return "default" // Green in many themes
    case "partially_used":
      return "default" // Could be a different color like blue
    case "pending_payment":
    case "pending_send":
      return "default" // Changed from warning to default
    case "fully_used":
      return "secondary" // Grey / Success variant
    case "expired":
    case "cancelled":
      return "destructive" // Red
    default:
      return "outline"
  }
}

const getStatusIcon = (status: GiftVoucherPlain["status"], isActive: boolean) => {
  if (!isActive) return <XCircle className="h-4 w-4 text-gray-500" />
  switch (status) {
    case "active":
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case "sent":
      return <Send className="h-4 w-4 text-blue-500" />
    case "partially_used":
      return <CheckCircle className="h-4 w-4 text-blue-500" />
    case "pending_payment":
      return <Clock className="h-4 w-4 text-yellow-500" />
    case "pending_send":
      return <Clock className="h-4 w-4 text-orange-500" />
    case "fully_used":
      return <CheckCircle className="h-4 w-4 text-gray-700" />
    case "expired":
      return <AlertCircle className="h-4 w-4 text-red-500" />
    case "cancelled":
      return <XCircle className="h-4 w-4 text-red-500" />
    default:
      return <AlertCircle className="h-4 w-4 text-gray-400" />
  }
}

export function GiftVoucherRow({ voucher, onEdit, onDelete, onViewDetails }: GiftVoucherRowProps) {
  const { t } = useTranslation()
  const validFromDate =
    typeof voucher.validFrom === "string" ? parseISO(voucher.validFrom) : voucher.validFrom
  const validUntilDate =
    typeof voucher.validUntil === "string" ? parseISO(voucher.validUntil) : voucher.validUntil
  const purchaseDate =
    typeof voucher.purchaseDate === "string" ? parseISO(voucher.purchaseDate) : voucher.purchaseDate

  const statusDisplay = t(`giftVouchers.statuses.${voucher.status}`)

  return (
    <TooltipProvider>
      <div
        className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={() => onViewDetails?.(voucher)}
      >
        {/* Code */}
        <div className="col-span-1">
          <div className="font-mono text-sm font-medium">{voucher.code}</div>
        </div>

        {/* Voucher Type */}
        <div className="col-span-1">
          <Badge variant={voucher.voucherType === "treatment" ? "default" : "secondary"}>
            {voucher.voucherType === "treatment"
              ? t("giftVouchers.treatmentVoucher")
              : t("giftVouchers.monetaryVoucher")}
          </Badge>
        </div>

        {/* Owner */}
        <div className="col-span-2">
          <div className="space-y-1">
            <div className="font-medium text-sm">
              {voucher.ownerName || t("giftVouchers.noOwner")}
            </div>
            {voucher.ownerUserId && (
              <div className="text-xs text-gray-500">
                ID: {voucher.ownerUserId.toString().slice(-6)}
              </div>
            )}
          </div>
        </div>

        {/* Guest Info */}
        <div className="col-span-2">
          <div className="space-y-1">
            {voucher.purchaserName && (
              <div className="text-sm font-medium">{voucher.purchaserName}</div>
            )}
            {voucher.guestInfo && (
              <div className="text-xs text-gray-600 space-y-1">
                <div>📧 {voucher.guestInfo.email || t("common.notProvided")}</div>
                <div>📱 {formatPhoneForDisplay(voucher.guestInfo.phone || "")}</div>
              </div>
            )}
            {voucher.isGift && (
              <div className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                🎁 מתנה
                {voucher.recipientName && <div>ל: {voucher.recipientName}</div>}
              </div>
            )}
          </div>
        </div>

        {/* Amount */}
        <div className="col-span-1">
          <div className="text-sm font-medium">₪{voucher.amount || voucher.monetaryValue || 0}</div>
          {voucher.voucherType === "treatment" && voucher.treatmentName && (
            <div className="text-xs text-gray-500">{voucher.treatmentName}</div>
          )}
          {voucher.remainingAmount !== undefined && voucher.remainingAmount !== voucher.amount && (
            <div className="text-xs text-orange-600">נותר: ₪{voucher.remainingAmount}</div>
          )}
        </div>

        {/* Purchase Date */}
        <div className="col-span-1">
          <div className="text-sm">
            {format(
              typeof voucher.purchaseDate === "string"
                ? parseISO(voucher.purchaseDate)
                : voucher.purchaseDate,
              "dd/MM/yy"
            )}
          </div>
          <div className="text-xs text-gray-500">
            {format(
              typeof voucher.purchaseDate === "string"
                ? parseISO(voucher.purchaseDate)
                : voucher.purchaseDate,
              "HH:mm"
            )}
          </div>
        </div>

        {/* Valid Until */}
        <div className="col-span-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-sm">{format(validUntilDate, "dd/MM/yy")}</div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {t("giftVouchers.fields.validUntil")}: {format(validUntilDate, "MMM d, yyyy")}
              </p>
              <p>
                {t("giftVouchers.fields.validFrom")}: {format(validFromDate, "MMM d, yyyy")}
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Status */}
        <div className="col-span-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant={getStatusBadgeVariant(voucher.status, voucher.isActive)}
                className="cursor-default flex items-center gap-1"
              >
                {getStatusIcon(voucher.status, voucher.isActive)}
                {statusDisplay}
                {!voucher.isActive && (
                  <span className="text-xs">({t("giftVouchers.adminDisabled")})</span>
                )}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {t("giftVouchers.fields.status")}: {statusDisplay}
              </p>
              {voucher.isGift && voucher.sendDate && (
                <p>
                  {t("giftVouchers.fields.sendDate")}:{" "}
                  {format(
                    typeof voucher.sendDate === "string"
                      ? parseISO(voucher.sendDate)
                      : voucher.sendDate,
                    "MMM d, yyyy"
                  )}
                </p>
              )}
              <p>
                {t("giftVouchers.fields.isActive")}: {voucher.isActive ? "Yes" : "No"}
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Gift Info */}
        <div className="col-span-1">
          {voucher.isGift ? (
            <div className="space-y-1">
              <Badge variant="outline" className="text-purple-600 border-purple-200">
                <Gift className="h-3 w-3 mr-1" />
                מתנה
              </Badge>
              {voucher.greetingMessage && (
                <div className="text-xs text-gray-500 truncate" title={voucher.greetingMessage}>
                  💌 {voucher.greetingMessage}
                </div>
              )}
            </div>
          ) : (
            <span className="text-xs text-gray-400">לא מתנה</span>
          )}
        </div>

        {/* Actions */}
        <div className="col-span-1 flex justify-end space-x-1 md:space-x-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={e => {
                  e.stopPropagation()
                  onEdit(voucher)
                }}
                title="Edit voucher"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("giftVouchers.editVoucher")}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={e => {
                  e.stopPropagation()
                  onDelete(voucher._id)
                }}
                title="Delete voucher"
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("common.delete")}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  )
}
