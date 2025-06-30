"use client"

import type { ICoupon } from "@/lib/db/models/coupon"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate, formatCurrency } from "@/lib/utils"
import { CheckCircle, Info, Copy, Clock, AlertTriangle, PowerOff } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/lib/translations/i18n"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface AssignedCouponCardProps {
  coupon: ICoupon & { effectiveStatus: string } // Added effectiveStatus
}

const StatusBadge = ({ status }: { status: string }) => {
  const { t, dir } = useTranslation()

  switch (status) {
    case "active":
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-xs">
          <CheckCircle className={dir === "rtl" ? "ml-1 h-3 w-3" : "mr-1 h-3 w-3"} />{" "}
          {t("adminCoupons.status.active")}
        </Badge>
      )
    case "scheduled":
      return (
        <Badge variant="outline" className="border-blue-500 text-blue-700 text-xs">
          <Clock className="mr-1 h-3 w-3" /> {t("adminCoupons.status.scheduled")}
        </Badge>
      )
    case "expired":
      return (
        <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600 text-xs">
          <AlertTriangle className="mr-1 h-3 w-3" /> {t("adminCoupons.status.expired")}
        </Badge>
      )
    case "inactive_manual": // Manually set to inactive by admin
      return (
        <Badge variant="secondary" className="text-xs">
          <PowerOff className="mr-1 h-3 w-3" /> {t("adminCoupons.status.inactive")}
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="text-xs">
          {status}
        </Badge>
      )
  }
}

export default function AssignedCouponCard({ coupon }: AssignedCouponCardProps) {
  const { toast } = useToast()
  const { t, dir } = useTranslation()

  const handleCopyCode = () => {
    navigator.clipboard
      .writeText(coupon.code)
      .then(() => {
        toast({
          title: t("partnerAssignedCoupons.toast.copySuccessTitle"),
          description: t("partnerAssignedCoupons.toast.copySuccessDescription") + " " + coupon.code,
        })
      })
      .catch(_err => {
        toast({
          title: t("common.error"),
          description: t("partnerAssignedCoupons.toast.copyErrorDescription"),
          variant: "destructive",
        })
      })
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{coupon.code}</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyCode}
                  aria-label={t("partnerAssignedCoupons.card.copyCodeTooltip")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("partnerAssignedCoupons.card.copyCodeTooltip")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription className="text-xs">
          {coupon.description || t("partnerAssignedCoupons.card.noDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-3 text-sm">
        <div className="flex justify-between">
          <span>{t("partnerAssignedCoupons.card.discountLabel")}</span>
          <span className="font-semibold">
            {coupon.discountType === "percentage"
              ? `${coupon.discountValue}%`
              : formatCurrency(coupon.discountValue)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>{t("partnerAssignedCoupons.card.validLabel")}</span>
          <span className="font-semibold">
            {formatDate(coupon.validFrom)} - {formatDate(coupon.validUntil)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span>{t("partnerAssignedCoupons.card.statusLabel")}</span>
          <StatusBadge status={coupon.effectiveStatus} />
        </div>
        <div className="flex justify-between">
          <span>{t("partnerAssignedCoupons.card.totalUsesLabel")}</span>
          <span className="font-semibold">
            {/* Ensuring usageLimit is treated as a number for comparison */}
            {coupon.timesUsed} /{" "}
            {Number(coupon.usageLimit) === 0 ? t("common.unlimited") : coupon.usageLimit}
          </span>
        </div>
        <div className="flex justify-between">
          <span>{t("partnerAssignedCoupons.card.usesPerCustomerLabel")}</span>
          <span className="font-semibold">
            {Number(coupon.usageLimitPerUser) === 0
              ? t("common.unlimited")
              : coupon.usageLimitPerUser}
          </span>
        </div>
        {coupon.notesForPartner && (
          <div className="pt-2">
            <p className="text-xs font-semibold text-muted-foreground flex items-center">
              <Info className={dir === "rtl" ? "ml-1 h-3 w-3" : "mr-1 h-3 w-3"} />{" "}
              {t("partnerAssignedCoupons.card.adminNoteLabel")}
            </p>
            <p className="text-xs text-muted-foreground pl-1 bg-slate-50 dark:bg-slate-800 p-2 rounded-md">
              {coupon.notesForPartner}
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        {t("partnerAssignedCoupons.card.createdLabel")} {formatDate(coupon.createdAt as Date)}
      </CardFooter>
    </Card>
  )
}
