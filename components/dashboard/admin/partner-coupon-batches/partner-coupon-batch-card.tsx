"use client"

import { Edit, MoreVertical, Trash2, Eye } from "lucide-react"
import type { TFunction } from "i18next"

import type { IPartnerCouponBatch } from "@/lib/db/models/partner-coupon-batch"
import { formatDate, formatCurrency } from "@/lib/utils/utils"
import { Badge } from "@/components/common/ui/badge"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/common/ui/dropdown-menu"
import { StatusBadge, getPartnerName } from "./partner-coupon-batches-columns"

interface PartnerCouponBatchCardProps {
  batch: IPartnerCouponBatch & { _id: string; effectiveStatus: string; activeCouponsCount: number }
  onEdit: (batch: IPartnerCouponBatch & { _id: string; effectiveStatus: string; activeCouponsCount: number }) => void
  onDelete: (batchId: string) => void
  onViewCoupons: (batch: IPartnerCouponBatch & { _id: string; effectiveStatus: string; activeCouponsCount: number }) => void
  t: TFunction
  dir: string
}

export function PartnerCouponBatchCard({ batch, onEdit, onDelete, onViewCoupons, t, dir }: PartnerCouponBatchCardProps) {
  const cardDir = dir === "rtl" ? "rtl" : "ltr"
  const textAlign = dir === "rtl" ? "text-right" : "text-left"
  const marginStart = dir === "rtl" ? "mr-auto" : "ml-auto"
  const iconMargin = dir === "rtl" ? "ml-2" : "mr-2"

  return (
    <Card className={`w-full shadow-md hover:shadow-lg transition-shadow ${textAlign}`} dir={cardDir}>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-lg font-semibold">
            {batch.name}
            <div className="text-sm text-muted-foreground font-normal">
              {batch.codePrefix}-XXX
            </div>
          </CardTitle>
          <StatusBadge status={batch.effectiveStatus} t={t} dir={dir} />
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
            <DropdownMenuItem onClick={() => onViewCoupons(batch)}>
              <Eye className={`${iconMargin} h-4 w-4`} />
              {t("adminPartnerCouponBatches.viewCoupons")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(batch)}>
              <Edit className={`${iconMargin} h-4 w-4`} />
              {t("common.edit")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(batch._id)}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <Trash2 className={`${iconMargin} h-4 w-4`} />
              {t("common.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {batch.description && (
          <div>
            <p className="font-medium">{t("adminPartnerCouponBatches.columns.description")}:</p>
            <p className="text-muted-foreground truncate">{batch.description}</p>
          </div>
        )}
        <div>
          <p className="font-medium">{t("adminPartnerCouponBatches.columns.couponCount")}:</p>
          <p className="text-muted-foreground">
            {batch.couponCount} {t("adminPartnerCouponBatches.columns.total")} ({batch.activeCouponsCount} {t("adminPartnerCouponBatches.columns.active")})
          </p>
        </div>
        <div>
          <p className="font-medium">{t("adminPartnerCouponBatches.columns.discount")}:</p>
          <p className="text-muted-foreground">
            {batch.discountType === "percentage" ? `${batch.discountValue}%` : formatCurrency(batch.discountValue)}
          </p>
        </div>
        <div>
          <p className="font-medium">{t("adminPartnerCouponBatches.columns.validFrom")}:</p>
          <p className="text-muted-foreground">{formatDate(batch.validFrom)}</p>
        </div>
        <div>
          <p className="font-medium">{t("adminPartnerCouponBatches.columns.validUntil")}:</p>
          <p className="text-muted-foreground">{formatDate(batch.validUntil)}</p>
        </div>
        <div>
          <p className="font-medium">{t("adminPartnerCouponBatches.columns.assignedPartner")}:</p>
          <p className="text-muted-foreground">{getPartnerName(batch.assignedPartnerId, t)}</p>
        </div>
      </CardContent>
    </Card>
  )
} 