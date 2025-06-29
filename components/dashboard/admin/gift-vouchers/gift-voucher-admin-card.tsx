"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { format, differenceInDays, parseISO } from "date-fns"
import { he } from "date-fns/locale"
import {
  Trash2,
  Edit,
  Eye,
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
  Loader2,
  Copy,
  QrCode,
} from "lucide-react"
import { deleteGiftVoucher, type GiftVoucherPlain } from "@/actions/gift-voucher-actions"
import { useTranslation } from "@/lib/translations/i18n"
import AdminGiftVoucherDetailsModal from "./admin-gift-voucher-details-modal"
import { formatPhoneForDisplay } from "@/lib/phone-utils"

interface GiftVoucherAdminCardProps {
  voucher: GiftVoucherPlain
  onVoucherUpdate: () => void
  onEdit: (voucher: GiftVoucherPlain) => void
}

export default function GiftVoucherAdminCard({
  voucher,
  onVoucherUpdate,
  onEdit,
}: GiftVoucherAdminCardProps) {
  const { t } = useTranslation()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteGiftVoucher(voucher._id)
      if (result.success) {
        toast.success(t("giftVouchers.notifications.deleteSuccess"))
        onVoucherUpdate()
      } else {
        toast.error(result.error || t("giftVouchers.notifications.deleteError"))
      }
    } catch (error) {
      toast.error(t("giftVouchers.notifications.deleteError"))
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const handleEdit = () => {
    onEdit(voucher)
  }

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
    <TooltipProvider>
      <Card className="shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              {/* Owner/User Info */}
              {voucher.ownerName ? (
                <>
                  <CardTitle className="text-lg mb-1 flex items-center gap-2">
                    {voucher.ownerName}
                    {voucher.isGift && (
                      <Badge variant="outline" className="text-xs">
                        <Gift className="h-3 w-3 mr-1" />
                        {t("giftVouchers.purchase.gift")}
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{voucher.ownerUserId}</p>
                </>
              ) : (voucher as any).guestInfo ? (
                <>
                  <CardTitle className="text-lg mb-1 flex items-center gap-2">
                    {(voucher as any).guestInfo.name}
                    <Badge variant="outline" className="text-xs">
                      {t("userSubscriptions.guest")}
                    </Badge>
                    {voucher.isGift && (
                      <Badge variant="outline" className="text-xs">
                        <Gift className="h-3 w-3 mr-1" />
                        {t("giftVouchers.purchase.gift")}
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{(voucher as any).guestInfo.email}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatPhoneForDisplay((voucher as any).guestInfo.phone || "")}</p>
                </>
              ) : (
                <CardTitle className="text-lg mb-1">{t("common.unknownUser")}</CardTitle>
              )}

              {/* Gift Info */}
              {voucher.isGift && voucher.recipientName && (
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                  {t("giftVouchers.fields.recipientName")}: {voucher.recipientName}
                </p>
              )}
            </div>
            <Badge className={`${statusInfo.className} font-medium flex items-center gap-1`}>
              <StatusIcon className={`h-3.5 w-3.5 ${statusInfo.iconColor}`} />
              {statusInfo.label}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 text-sm">
          {/* Voucher Code */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2">
              <QrCode className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <span className="font-mono font-bold text-lg">{voucher.code}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyCode}
              className="h-8 w-8 p-0"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>

          {/* Voucher Type & Value */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              {voucher.voucherType === "monetary" ? (
                <CircleDollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <Tag className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              )}
              <span className="font-medium">
                {voucher.voucherType === "monetary" 
                  ? `${voucher.monetaryValue?.toFixed(2)} ₪`
                  : voucher.treatmentName || "N/A"
                }
              </span>
            </div>
            
            {voucher.voucherType === "treatment" && voucher.selectedDurationName && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-xs">
                <Clock className="h-3 w-3" />
                <span>{voucher.selectedDurationName}</span>
              </div>
            )}
          </div>

          {/* Usage Progress for Monetary Vouchers */}
          {voucher.voucherType === "monetary" && voucher.monetaryValue && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span>{t("giftVouchers.fields.remainingAmount")}</span>
                <span className="font-medium">
                  {(voucher.remainingAmount || voucher.monetaryValue).toFixed(2)} / {voucher.monetaryValue.toFixed(2)} ₪
                </span>
              </div>
              <Progress value={100 - usagePercentage} className="h-2" />
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Calendar className="h-3 w-3" />
              <span>{t("giftVouchers.fields.purchaseDate")}</span>
            </div>
            <div className="text-right font-mono">
              {purchaseDate ? formatDate(purchaseDate) : "N/A"}
            </div>
            
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Calendar className="h-3 w-3" />
              <span>{t("giftVouchers.fields.validUntil")}</span>
            </div>
            <div className="text-right font-mono">
              {validUntilDate ? formatDate(validUntilDate) : "N/A"}
            </div>
          </div>

          {/* Expiry Warning */}
          {daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry >= 0 && (
            <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-yellow-800 dark:text-yellow-200 text-xs">
              <AlertTriangle className="h-3 w-3" />
              <span>
                {daysUntilExpiry === 0 
                  ? t("giftVouchers.expiringToday")
                  : `${t("giftVouchers.expiringIn")} ${daysUntilExpiry} ימים`
                }
              </span>
            </div>
          )}
        </CardContent>

        {/* Actions */}
        <CardFooter className="flex justify-end gap-2 pt-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetailsModal(true)}
                className="h-8 w-8 p-0"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("common.viewDetails")}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEdit}
                className="h-8 w-8 p-0"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("common.edit")}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("common.delete")}</p>
            </TooltipContent>
          </Tooltip>
        </CardFooter>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("giftVouchers.deleteConfirm")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("giftVouchers.deleteConfirmDescription")}
                <br />
                <strong>{t("giftVouchers.fields.code")}: {voucher.code}</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                {t("common.cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("common.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Details Modal */}
        <AdminGiftVoucherDetailsModal
          voucher={voucher}
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
        />
      </Card>
    </TooltipProvider>
  )
} 
