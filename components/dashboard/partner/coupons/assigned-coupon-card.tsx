"use client"

import { useTranslation } from "react-i18next"
import type { ICoupon } from "@/lib/db/models/coupon"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { formatDate, formatCurrency } from "@/lib/utils/utils"
import { CheckCircle, Info, Copy, Clock, AlertTriangle, PowerOff } from "lucide-react"
import { useToast } from "@/components/common/ui/use-toast"
import { Button } from "@/components/common/ui/button"

interface AssignedCouponCardProps {
  coupon: ICoupon & { effectiveStatus: string } // Added effectiveStatus
}

const StatusBadge = ({ status, t }: { status: string; t: ReturnType<typeof useTranslation>["t"] }) => {
  switch (status) {
    case "active":
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-xs">
          <CheckCircle className="mr-1 h-3 w-3" /> {t("partnerCoupons.status.active")}
        </Badge>
      )
    case "scheduled":
      return (
        <Badge variant="outline" className="border-blue-500 text-blue-700 text-xs">
          <Clock className="mr-1 h-3 w-3" /> {t("partnerCoupons.status.scheduled")}
        </Badge>
      )
    case "expired":
      return (
        <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600 text-xs">
          <AlertTriangle className="mr-1 h-3 w-3" /> {t("partnerCoupons.status.expired")}
        </Badge>
      )
    case "inactive_manual": // Manually set to inactive by admin
      return (
        <Badge variant="secondary" className="text-xs">
          <PowerOff className="mr-1 h-3 w-3" /> {t("partnerCoupons.status.inactiveManual")}
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="text-xs">
          {t(status, { defaultValue: status })}
        </Badge>
      )
  }
}

export default function AssignedCouponCard({ coupon }: AssignedCouponCardProps) {
  const { t, dir } = useTranslation()
  const { toast } = useToast()

  const handleCopyCode = () => {
    navigator.clipboard
      .writeText(coupon.code)
      .then(() => {
        toast({
          title: t("partnerCoupons.card.copiedToastTitle"),
          description: t("partnerCoupons.card.copiedToastDescription", { code: coupon.code }),
        })
      })
      .catch((_err) => {
        toast({
          title: t("common.error"),
          description: t("partnerCoupons.card.copyErrorToastDescription"),
          variant: "destructive",
        })
      })
  }

  return (
    <Card className="flex flex-col" dir={dir}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{coupon.code}</CardTitle>
          <Button variant="ghost" size="sm" onClick={handleCopyCode} aria-label="Copy coupon code">
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription className="text-xs">
          {coupon.description || t("partnerCoupons.card.noDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-3 text-sm">
        <div className="flex justify-between">
          <span>{t("partnerCoupons.card.discountLabel")}</span>
          <span className="font-semibold">
            {coupon.discountType === "percentage" ? `${coupon.discountValue}%` : formatCurrency(coupon.discountValue)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>{t("partnerCoupons.card.validLabel")}</span>
          <span className="font-semibold">
            {formatDate(coupon.validFrom)} - {formatDate(coupon.validUntil)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span>{t("partnerCoupons.card.statusLabel")}</span>
          <StatusBadge status={coupon.effectiveStatus} t={t} />
        </div>
        <div className="flex justify-between">
          <span>{t("partnerCoupons.card.totalUsesLabel")}</span>
          <span className="font-semibold">
            {/* Ensuring usageLimit is treated as a number for comparison */}
            {coupon.timesUsed} /{" "}
            {Number(coupon.usageLimit) === 0 ? t("partnerCoupons.card.unlimitedUses") : coupon.usageLimit}
          </span>
        </div>
        <div className="flex justify-between">
          <span>{t("partnerCoupons.card.usesPerCustomerLabel")}</span>
          <span className="font-semibold">
            {Number(coupon.usageLimitPerUser) === 0
              ? t("partnerCoupons.card.unlimitedUsesPerCustomer")
              : coupon.usageLimitPerUser}
          </span>
        </div>
        {coupon.notesForPartner && (
          <div className="pt-2">
            <p className="text-xs font-semibold text-muted-foreground flex items-center">
              <Info className="h-3 w-3 mr-1 text-sky-600" /> {t("partnerCoupons.card.adminNoteLabel")}
            </p>
            <p className="text-xs text-muted-foreground pl-1 bg-slate-50 dark:bg-slate-800 p-2 rounded-md">
              {coupon.notesForPartner}
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        {t("partnerCoupons.card.createdLabel")} {formatDate(coupon.createdAt as Date)}
      </CardFooter>
    </Card>
  )
}
