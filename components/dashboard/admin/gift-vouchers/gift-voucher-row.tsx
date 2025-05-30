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
} from "lucide-react"
import { Button } from "@/components/common/ui/button" // Corrected import path
import { Badge } from "@/components/common/ui/badge" // Corrected import path
import type { GiftVoucherPlain } from "@/actions/gift-voucher-actions" // Corrected import path
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/common/ui/tooltip" // Corrected import path
import { useTranslation } from "@/lib/translations/i18n"

interface GiftVoucherRowProps {
  voucher: GiftVoucherPlain
  onEdit: (voucher: GiftVoucherPlain) => void
  onDelete: (id: string) => void
  // onViewDetails?: (voucher: GiftVoucherPlain) => void; // Optional: for a detailed view modal
}

const getStatusBadgeVariant = (
  status: GiftVoucherPlain["status"],
  isActive: boolean,
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

export function GiftVoucherRow({ voucher, onEdit, onDelete }: GiftVoucherRowProps) {
  const { t } = useTranslation()
  const validFromDate = typeof voucher.validFrom === "string" ? parseISO(voucher.validFrom) : voucher.validFrom
  const validUntilDate = typeof voucher.validUntil === "string" ? parseISO(voucher.validUntil) : voucher.validUntil
  const purchaseDate = typeof voucher.purchaseDate === "string" ? parseISO(voucher.purchaseDate) : voucher.purchaseDate

  const statusDisplay = t(`giftVouchers.statuses.${voucher.status}`)

  return (
    <TooltipProvider delayDuration={100}>
      <div className="grid grid-cols-1 md:grid-cols-8 gap-4 items-center p-4 border-b last:border-b-0 hover:bg-gray-50/50 transition-colors text-sm">
        <div className="font-medium truncate">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-default">{voucher.code}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {t("giftVouchers.fields.code")}: {voucher.code}
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="truncate">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                {voucher.voucherType === "monetary" ? (
                  <CircleDollarSign className="h-4 w-4 mr-1 text-green-600" />
                ) : (
                  <Tag className="h-4 w-4 mr-1 text-purple-600" />
                )}
                {voucher.voucherType === "monetary"
                  ? `${voucher.monetaryValue?.toFixed(2)} ILS (Rem: ${voucher.remainingAmount?.toFixed(2) ?? voucher.monetaryValue?.toFixed(2)})`
                  : voucher.treatmentName || "N/A"}
                {voucher.voucherType === "treatment" && voucher.selectedDurationName && (
                  <span className="text-xs text-gray-500 ml-1">({voucher.selectedDurationName})</span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {t("giftVouchers.fields.voucherType")}: {voucher.voucherType}
              </p>
              {voucher.voucherType === "monetary" && (
                <p>
                  {t("giftVouchers.fields.value")}: {voucher.monetaryValue?.toFixed(2)} ILS
                </p>
              )}
              {voucher.voucherType === "monetary" && (
                <p>
                  {t("giftVouchers.fields.remainingAmount")}:{" "}
                  {voucher.remainingAmount?.toFixed(2) ?? voucher.monetaryValue?.toFixed(2)} ILS
                </p>
              )}
              {voucher.voucherType === "treatment" && (
                <p>
                  {t("giftVouchers.fields.treatment")}: {voucher.treatmentName || "N/A"}
                </p>
              )}
              {voucher.voucherType === "treatment" && voucher.selectedDurationName && (
                <p>
                  {t("giftVouchers.fields.duration")}: {voucher.selectedDurationName}
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="truncate">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                <UserCircle className="h-4 w-4 mr-1 text-gray-600" />
                {voucher.ownerName || voucher.ownerUserId}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {t("giftVouchers.fields.owner")}: {voucher.ownerName || "N/A"}
              </p>
              <p>
                {t("giftVouchers.fields.owner")}: {voucher.ownerUserId}
              </p>
              {voucher.isGift && voucher.purchaserName && (
                <p>
                  {t("giftVouchers.fields.purchaser")}: {voucher.purchaserName}
                </p>
              )}
              {voucher.isGift && voucher.recipientName && (
                <p>
                  {t("giftVouchers.fields.recipientName")}: {voucher.recipientName}
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Purchase Date Column */}
        <div className="truncate">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                <CalendarDays className="h-4 w-4 mr-1 text-gray-600" />
                {format(purchaseDate, "dd/MM/yy")}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {t("giftVouchers.fields.purchaseDate")}: {format(purchaseDate, "MMM d, yyyy")}
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Expiry Date (Days Remaining) Column */}
        <div className="truncate">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                <CalendarDays className="h-4 w-4 mr-1 text-gray-600" />
                {format(validUntilDate, "dd/MM/yy")}
                {(() => {
                  const daysLeft = differenceInDays(validUntilDate, new Date())
                  if (daysLeft < 0) {
                    return <span className="text-xs text-red-500 ml-1">({t("giftVouchers.expiredShort")})</span>
                  }
                  if (daysLeft === 0) {
                    return (
                      <span className="text-xs text-orange-500 ml-1">
                        ({t(`giftVouchers.fields.expiresToday.${daysLeft}`)})
                      </span>
                    )
                  }
                  return (
                    <span className="text-xs text-gray-500 ml-1">
                      ({t(`giftVouchers.fields.daysRemainingShortCount.${daysLeft}`)})
                    </span>
                  )
                })()}
              </div>
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

        <div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant={getStatusBadgeVariant(voucher.status, voucher.isActive)}
                className="cursor-default flex items-center gap-1"
              >
                {getStatusIcon(voucher.status, voucher.isActive)}
                {statusDisplay}
                {!voucher.isActive && <span className="text-xs">({t("giftVouchers.adminDisabled")})</span>}
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
                    typeof voucher.sendDate === "string" ? parseISO(voucher.sendDate) : voucher.sendDate,
                    "MMM d, yyyy",
                  )}
                </p>
              )}
              <p>
                {t("giftVouchers.fields.isActive")}: {voucher.isActive ? "Yes" : "No"}
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="truncate">
          {voucher.isGift ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="cursor-default">
                  {t("giftVouchers.isGiftBadge")}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("giftVouchers.purchase.sendAsGift")}</p>
                {voucher.recipientName && (
                  <p>
                    {t("giftVouchers.myVouchers.giftedTo")}: {voucher.recipientName}
                  </p>
                )}
                {voucher.greetingMessage && (
                  <p>
                    {t("giftVouchers.fields.greetingMessage")}: {voucher.greetingMessage}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-xs text-gray-500">{t("giftVouchers.myVouchers.ownedVouchers")}</span>
          )}
        </div>

        <div className="flex justify-end space-x-1 md:space-x-2">
          {/* Optional View Details Button 
        {onViewDetails && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => onViewDetails(voucher)} title="View Details">
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>View Details</p></TooltipContent>
          </Tooltip>
        )}
        */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => onEdit(voucher)} title="Edit voucher">
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
                onClick={() => onDelete(voucher._id)}
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
