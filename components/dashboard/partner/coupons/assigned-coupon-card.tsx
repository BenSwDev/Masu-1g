"use client"

import type { ICoupon } from "@/lib/db/models/coupon"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { formatDate, formatCurrency } from "@/lib/utils/utils"
import { CheckCircle, Info, Copy, Clock, AlertTriangle, PowerOff } from "lucide-react"
import { useToast } from "@/components/common/ui/use-toast"
import { Button } from "@/components/common/ui/button"
import { useTranslation, type UseTranslation } from "next-intl"
import React from "react"

interface AssignedCouponCardProps {
  coupon: ICoupon & { effectiveStatus: string } // Added effectiveStatus
}

const StatusBadge = ({ status, t }: { status: string; t: UseTranslation["t"] }) => {
  const { i18n } = useTranslation()
  let text = status
  let badgeVariant: "default" | "outline" | "destructive" | "secondary" = "outline"
  let icon = null
  let className = ""

  switch (status) {
    case "active":
      text = t("coupons.status.active")
      badgeVariant = "default"
      icon = <CheckCircle className="mr-1 h-3 w-3" /> // Adjust margin with dir later
      className = "bg-green-500 hover:bg-green-600 text-xs"
      break
    case "scheduled":
      text = t("coupons.status.scheduled")
      badgeVariant = "outline"
      icon = <Clock className="mr-1 h-3 w-3" />
      className = "border-blue-500 text-blue-700 text-xs"
      break
    case "expired":
      text = t("coupons.status.expired")
      badgeVariant = "destructive"
      icon = <AlertTriangle className="mr-1 h-3 w-3" />
      className = "bg-orange-500 hover:bg-orange-600 text-xs"
      break
    case "inactive_manual":
      text = t("coupons.status.inactiveManual")
      badgeVariant = "secondary"
      icon = <PowerOff className="mr-1 h-3 w-3" />
      className = "text-xs"
      break
    default:
      text = status // Fallback for unknown statuses
      break
  }
  // Adjust icon margin based on dir
  const iconMarginClass = i18n.dir() === "rtl" ? "ml-1" : "mr-1"
  if (icon && icon.props.className) {
    icon = React.cloneElement(icon, {
      className: `${icon.props.className.replace(/mr-1|ml-1/, "")} ${iconMarginClass}`,
    })
  }

  return (
    <Badge variant={badgeVariant} className={className}>
      {icon} {text}
    </Badge>
  )
}

export default function AssignedCouponCard({ coupon }: AssignedCouponCardProps) {
  const { toast } = useToast()
  const { t, i18n } = useTranslation()
  const dir = i18n.dir()

  const handleCopyCode = () => {
    navigator.clipboard
      .writeText(coupon.code)
      .then(() => {
        toast({
          title: t("common.copied"),
          description: t("coupons.notifications.codeCopiedToClipboard", { code: coupon.code }),
        })
      })
      .catch((_err) => {
        toast({ title: "Error", description: "Failed to copy code.", variant: "destructive" })
      })
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{coupon.code}</CardTitle>
          <Button variant="ghost" size="sm" onClick={handleCopyCode} aria-label="Copy coupon code">
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription className="text-xs">{coupon.description || t("common.noDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-3 text-sm">
        <div className="flex justify-between">
          <span>{t("coupons.discount")}:</span>
          <span className="font-semibold">
            {coupon.discountType === "percentage" ? `${coupon.discountValue}%` : formatCurrency(coupon.discountValue)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>{t("coupons.validity")}:</span>
          <span className="font-semibold">
            {formatDate(coupon.validFrom)} - {formatDate(coupon.validUntil)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span>{t("coupons.status.label")}:</span>
          <StatusBadge status={coupon.effectiveStatus} t={t} />
        </div>
        <div className="flex justify-between">
          <span>{t("coupons.totalUses")}:</span>
          <span className="font-semibold">
            {/* Ensuring usageLimit is treated as a number for comparison */}
            {coupon.timesUsed} / {Number(coupon.usageLimit) === 0 ? t("common.unlimited") : coupon.usageLimit}
          </span>
        </div>
        <div className="flex justify-between">
          <span>{t("coupons.usesPerCustomer")}:</span>
          <span className="font-semibold">
            {Number(coupon.usageLimitPerUser) === 0 ? t("common.unlimited") : coupon.usageLimitPerUser}
          </span>
        </div>
        {coupon.notesForPartner && (
          <div className="pt-2">
            <p className="text-xs font-semibold text-muted-foreground flex items-center">
              <Info className={dir === "rtl" ? "ml-1 h-3 w-3" : "mr-1 h-3 w-3"} /> {t("coupons.adminNote")}
            </p>
            <p className="text-xs text-muted-foreground pl-1 bg-slate-50 dark:bg-slate-800 p-2 rounded-md">
              {coupon.notesForPartner}
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        {t("common.createdAt")}: {formatDate(coupon.createdAt as Date)}
      </CardFooter>
    </Card>
  )
}
