"use client"

import { Edit, MoreVertical, Trash2 } from "lucide-react"
import type { TFunction } from "i18next"

import type { ICoupon } from "@/lib/db/models/coupon"
import { formatDate, formatCurrency } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { StatusBadge, getPartnerName } from "./coupons-columns" // Assuming these are exported

interface CouponCardProps {
  coupon: ICoupon & { effectiveStatus: string }
  onEdit: (coupon: ICoupon & { effectiveStatus: string }) => void
  onDelete: (couponId: string) => void
  t: TFunction
  dir: "ltr" | "rtl"
}

export function CouponCard({ coupon, onEdit, onDelete, t, dir }: CouponCardProps) {
  const cardDir = dir === "rtl" ? "rtl" : "ltr"
  const textAlign = dir === "rtl" ? "text-right" : "text-left"
  const marginStart = dir === "rtl" ? "mr-auto" : "ml-auto"
  const iconMargin = dir === "rtl" ? "ml-2" : "mr-2"

  return (
    <Card
      className={`w-full shadow-md hover:shadow-lg transition-shadow ${textAlign}`}
      dir={cardDir}
    >
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-lg font-semibold">
            {t("adminCoupons.columns.code")}:{" "}
            <Badge variant="outline" className="text-base">
              {coupon.code}
            </Badge>
          </CardTitle>
          <StatusBadge status={coupon.effectiveStatus} t={t} dir={dir} />
        </div>
        <DropdownMenu dir={dir}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className={`h-8 w-8 ${marginStart}`}>
              <MoreVertical className="h-5 w-5" />
              <span className="sr-only">{t("common.actions")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={dir === "rtl" ? "start" : "end"}>
            <DropdownMenuLabel>{t("common.actions")}</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onEdit(coupon)}>
              <Edit className={`${iconMargin} h-4 w-4`} />
              {t("common.edit")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(coupon._id.toString())}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <Trash2 className={`${iconMargin} h-4 w-4`} />
              {t("common.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {coupon.description && (
          <div>
            <p className="font-medium">{t("adminCoupons.columns.description")}:</p>
            <p className="text-muted-foreground truncate">{coupon.description}</p>
          </div>
        )}
        <div>
          <p className="font-medium">{t("adminCoupons.columns.discount")}:</p>
          <p className="text-muted-foreground">
            {coupon.discountType === "percentage"
              ? `${coupon.discountValue}%`
              : formatCurrency(coupon.discountValue)}
          </p>
        </div>
        <div>
          <p className="font-medium">{t("adminCoupons.columns.validFrom")}:</p>
          <p className="text-muted-foreground">{formatDate(coupon.validFrom)}</p>
        </div>
        <div>
          <p className="font-medium">{t("adminCoupons.columns.validUntil")}:</p>
          <p className="text-muted-foreground">{formatDate(coupon.validUntil)}</p>
        </div>
        <div>
          <p className="font-medium">{t("adminCoupons.columns.usage")}:</p>
          <p className="text-muted-foreground">
            {coupon.timesUsed} / {Number(coupon.usageLimit) === 0 ? "∞" : coupon.usageLimit}
          </p>
        </div>
        <div>
          <p className="font-medium">{t("adminCoupons.columns.assignedPartner")}:</p>
          <p className="text-muted-foreground">{getPartnerName(coupon.assignedPartnerId, t)}</p>
        </div>
      </CardContent>
    </Card>
  )
}
