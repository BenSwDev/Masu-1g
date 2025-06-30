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
import type { ICoupon } from "@/lib/db/models/coupon"
import { formatDate, formatCurrency } from "@/lib/utils"
import type { TFunction } from "i18next" // Or the type from your i18n setup

interface CouponColumnsProps {
  onEdit: (coupon: ICoupon & { effectiveStatus: string }) => void
  onDelete: (couponId: string) => void
  t: TFunction // Or (key: string, options?: any) => string;
  dir: "ltr" | "rtl"
}

// Helper to get populated partner name
export const getPartnerName = (partner: any, t: TFunction): string => {
  if (!partner) return t("adminCoupons.columns.partnerNotAssigned")
  if (typeof partner === "string") return t("adminCoupons.columns.partnerLoading") // Assuming string ID means loading
  return partner.name || partner.email || t("adminCoupons.columns.partnerUnnamed")
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
          {t("adminCoupons.status.active")}
        </Badge>
      )
    case "scheduled":
      return (
        <Badge variant="outline" className="border-blue-500 text-blue-700">
          <Clock className={dir === "rtl" ? "ml-1 h-3 w-3" : "mr-1 h-3 w-3"} />{" "}
          {t("adminCoupons.status.scheduled")}
        </Badge>
      )
    case "expired":
      return (
        <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600">
          <AlertTriangle className={dir === "rtl" ? "ml-1 h-3 w-3" : "mr-1 h-3 w-3"} />{" "}
          {t("adminCoupons.status.expired")}
        </Badge>
      )
    case "inactive_manual":
      return (
        <Badge variant="secondary">
          <PowerOff className={dir === "rtl" ? "ml-1 h-3 w-3" : "mr-1 h-3 w-3"} />{" "}
          {t("adminCoupons.status.inactiveManual")}
        </Badge>
      )
    default:
      return <Badge variant="outline">{t(status) || status}</Badge> // Fallback for unknown status
  }
}

export const columns = ({
  onEdit,
  onDelete,
  t,
  dir,
}: CouponColumnsProps): ColumnDef<ICoupon & { effectiveStatus: string }>[] => [
  {
    accessorKey: "code",
    header: t("adminCoupons.columns.code"),
    cell: ({ row }) => <Badge variant="outline">{row.original.code}</Badge>,
  },
  {
    accessorKey: "description",
    header: t("adminCoupons.columns.description"),
    cell: ({ row }) => (
      <span className="truncate block max-w-xs">{row.original.description || "-"}</span>
    ),
  },
  {
    accessorKey: "discountValue",
    header: t("adminCoupons.columns.discount"),
    cell: ({ row }) => {
      const coupon = row.original
      return coupon.discountType === "percentage"
        ? `${coupon.discountValue}%`
        : formatCurrency(coupon.discountValue)
    },
  },
  {
    accessorKey: "validFrom",
    header: t("adminCoupons.columns.validFrom"),
    cell: ({ row }) => formatDate(row.original.validFrom),
  },
  {
    accessorKey: "validUntil",
    header: t("adminCoupons.columns.validUntil"),
    cell: ({ row }) => formatDate(row.original.validUntil),
  },
  {
    accessorKey: "effectiveStatus", // Changed from isActive
    header: t("adminCoupons.columns.status"),
    cell: ({ row }) => <StatusBadge status={row.original.effectiveStatus} t={t} dir={dir} />,
  },
  {
    accessorKey: "usageLimit",
    header: t("adminCoupons.columns.usage"),
    // Ensuring usageLimit is treated as a number for comparison
    cell: ({ row }) =>
      `${row.original.timesUsed} / ${Number(row.original.usageLimit) === 0 ? "∞" : row.original.usageLimit}`,
  },
  {
    accessorKey: "assignedPartnerId",
    header: t("adminCoupons.columns.assignedPartner"),
    cell: ({ row }) => getPartnerName(row.original.assignedPartnerId, t),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const coupon = row.original
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
            <DropdownMenuItem onClick={() => onEdit(coupon)}>
              <Edit className={dir === "rtl" ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"} />{" "}
              {t("common.edit")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(coupon._id.toString())}
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
