"use client"

import type { ICoupon } from "@/lib/db/models/coupon"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { formatDate, formatCurrency } from "@/lib/utils/utils"
import { CheckCircle, Info, Copy, Clock, AlertTriangle, PowerOff } from "lucide-react"
import { useToast } from "@/components/common/ui/use-toast"
import { Button } from "@/components/common/ui/button"
import { useTranslation } from "@/lib/translations/i18n" // Corrected import
import type React from "react"

interface AssignedCouponCardProps {
  coupon: ICoupon & { effectiveStatus: string }
}

// Extracted StatusBadge to its own component for clarity and reusability if needed elsewhere
const CouponStatusBadge = ({ statusKey }: { statusKey: string }) => {
  const { t, dir } = useTranslation()
  let text = statusKey
  let badgeVariant: "default" | "outline" | "destructive" | "secondary" = "outline"
  let IconComponent: React.ElementType | null = null
  let className = "text-xs" // Base class

  switch (statusKey) {
    case "active":
      text = t("coupons.status.active")
      badgeVariant = "default"
      IconComponent = CheckCircle
      className = "bg-green-500 hover:bg-green-600 text-xs"
      break
    case "scheduled":
      text = t("coupons.status.scheduled")
      badgeVariant = "outline"
      IconComponent = Clock
      className = "border-blue-500 text-blue-700 text-xs"
      break
    case "expired":
      text = t("coupons.status.expired")
      badgeVariant = "destructive"
      IconComponent = AlertTriangle
      className = "bg-orange-500 hover:bg-orange-600 text-xs"
      break
    case "inactive_manual": // Manually set to inactive by admin
      text = t("coupons.status.inactiveManual")
      badgeVariant = "secondary"
      IconComponent = PowerOff
      className = "text-xs"
      break
    default:
      text = statusKey // Fallback for unknown statuses
      break
  }

  const iconMarginClass = dir === "rtl" ? "ml-1" : "mr-1"

  return (
    <Badge variant={badgeVariant} className={className}>
      {IconComponent && <IconComponent className={`h-3 w-3 ${iconMarginClass}`} />}
      {text}
    </Badge>
  )
}

export default function AssignedCouponCard({ coupon }: AssignedCouponCardProps) {
  const { toast } = useToast()
  const { t, dir } = useTranslation() // Using custom hook

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
        // Consider translating this generic error too if needed
        toast({ title: "Error", description: "Failed to copy code.", variant: "destructive" })
      })
  }

  const infoIconMarginClass = dir === "rtl" ? "ml-1" : "mr-1"

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{coupon.code}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyCode}
            aria-label={t("coupons.copyCodeAriaLabel") || "Copy coupon code"}
          >
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
          <CouponStatusBadge statusKey={coupon.effectiveStatus} />
        </div>
        <div className="flex justify-between">
          <span>{t("coupons.totalUses")}:</span>
          <span className="font-semibold">
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
              <Info className={`h-3 w-3 ${infoIconMarginClass} text-sky-600`} /> {t("partnerCoupons.adminNote")}:
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
