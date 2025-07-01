"use client"

import type { ColumnDef } from "@tanstack/react-table"
import {
  MoreHorizontal,
  CheckCircle,
  Edit,
  Trash2,
  Clock,
  AlertTriangle,
  PowerOff,
  Eye,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import type { IPartnerCouponBatch } from "@/lib/db/models/partner-coupon-batch"
import { formatDate, formatCurrency } from "@/lib/utils"
import type { TFunction } from "i18next"

interface PartnerCouponBatchColumnsProps {
  onEdit: (
    batch: IPartnerCouponBatch & { effectiveStatus: string; activeCouponsCount: number }
  ) => void
  onDelete: (batchId: string) => void
  onViewCoupons: (
    batch: IPartnerCouponBatch & { effectiveStatus: string; activeCouponsCount: number }
  ) => void
  t: TFunction
  dir: "ltr" | "rtl"
}

// Helper to get populated partner name
export const getPartnerName = (partner: any, t: TFunction): string => {
  if (!partner) return t("adminPartnerCouponBatches.columns.partnerNotAssigned")
  if (typeof partner === "string") return t("adminPartnerCouponBatches.columns.partnerLoading")
  return partner.name || partner.email || t("adminPartnerCouponBatches.columns.partnerUnnamed")
}

export const StatusBadge = ({
  status,
  t,
  dir,
}: {
  status: string
  t: TFunction
  dir: "ltr" | "rtl"
}) => {
  switch (status) {
    case "active":
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
          <CheckCircle className={dir === "rtl" ? "ml-1 h-3 w-3" : "mr-1 h-3 w-3"} />{" "}
          {t("adminPartnerCouponBatches.status.active")}
        </Badge>
      )
    case "scheduled":
      return (
        <Badge variant="outline" className="border-blue-500 text-blue-700">
          <Clock className={dir === "rtl" ? "ml-1 h-3 w-3" : "mr-1 h-3 w-3"} />{" "}
          {t("adminPartnerCouponBatches.status.scheduled")}
        </Badge>
      )
    case "expired":
      return (
        <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600">
          <AlertTriangle className={dir === "rtl" ? "ml-1 h-3 w-3" : "mr-1 h-3 w-3"} />{" "}
          {t("adminPartnerCouponBatches.status.expired")}
        </Badge>
      )
    case "inactive_manual":
      return (
        <Badge variant="secondary">
          <PowerOff className={dir === "rtl" ? "ml-1 h-3 w-3" : "mr-1 h-3 w-3"} />{" "}
          {t("adminPartnerCouponBatches.status.inactiveManual")}
        </Badge>
      )
    default:
      return <Badge variant="outline">{t(status) || status}</Badge>
  }
}

export const columns = ({
  onEdit,
  onDelete,
  onViewCoupons,
  t,
  dir,
}: PartnerCouponBatchColumnsProps): ColumnDef<
  IPartnerCouponBatch & { effectiveStatus: string; activeCouponsCount: number }
>[] => [
  {
    accessorKey: "name",
    header: t("adminPartnerCouponBatches.columns.name"),
    cell: ({ row }) => (
      <div className="font-medium">
        {row.original.name}
        <div className="text-sm text-muted-foreground">{row.original.codePrefix}-XXX</div>
      </div>
    ),
  },
  {
    accessorKey: "description",
    header: t("adminPartnerCouponBatches.columns.description"),
    cell: ({ row }) => (
      <span className="truncate block max-w-xs">{row.original.description || "-"}</span>
    ),
  },
  {
    accessorKey: "couponCount",
    header: t("adminPartnerCouponBatches.columns.couponCount"),
    cell: ({ row }) => (
      <div className="text-center">
        <div className="font-medium">{row.original.couponCount}</div>
        <div className="text-sm text-muted-foreground">
          {row.original.activeCouponsCount} {t("adminPartnerCouponBatches.columns.active")}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "discountValue",
    header: t("adminPartnerCouponBatches.columns.discount"),
    cell: ({ row }) => {
      const batch = row.original
      return batch.discountType === "percentage"
        ? `${batch.discountValue}%`
        : formatCurrency(batch.discountValue)
    },
  },
  {
    accessorKey: "validFrom",
    header: t("adminPartnerCouponBatches.columns.validFrom"),
    cell: ({ row }) => formatDate(row.original.validFrom),
  },
  {
    accessorKey: "validUntil",
    header: t("adminPartnerCouponBatches.columns.validUntil"),
    cell: ({ row }) => formatDate(row.original.validUntil),
  },
  {
    accessorKey: "effectiveStatus",
    header: t("adminPartnerCouponBatches.columns.status"),
    cell: ({ row }) => <StatusBadge status={row.original.effectiveStatus} t={t} dir={dir} />,
  },
  {
    accessorKey: "assignedPartnerId",
    header: t("adminPartnerCouponBatches.columns.assignedPartner"),
    cell: ({ row }) => getPartnerName(row.original.assignedPartnerId, t),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const batch = row.original
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("common.actions")}</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onViewCoupons(batch)}>
              <Eye className={dir === "rtl" ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"} />{" "}
              {t("adminPartnerCouponBatches.viewCoupons")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(batch)}>
              <Edit className={dir === "rtl" ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"} />{" "}
              {t("common.edit")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(batch._id.toString?.() || '')}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <Trash2 className={dir === "rtl" ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"} />{" "}
              {t("common.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
