"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, CheckCircle, Edit, Trash2, Clock, AlertTriangle, PowerOff } from "lucide-react"
import { Button } from "@/components/common/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/common/ui/dropdown-menu"
import { Badge } from "@/components/common/ui/badge"
import type { ICoupon } from "@/lib/db/models/coupon"
import { formatDate, formatCurrency } from "@/lib/utils/utils"
// import type { TFunction } from "i18next" // Or the correct type from next-intl

interface CouponColumnsProps {
  onEdit: (coupon: ICoupon & { effectiveStatus: string }) => void
  onDelete: (couponId: string) => void
  t: (key: string) => string // Or the specific type from next-intl
  dir: "ltr" | "rtl"
}

// Helper to get populated partner name
const getPartnerName = (partner: any, t: (key: string) => string): string => {
  if (!partner) return t("common.notApplicable")
  if (typeof partner === "string") return t("common.loading")
  return partner.name || partner.email || "Unnamed Partner"
}

const StatusBadge = ({ status, t, dir }: { status: string; t: (key: string) => string; dir: "ltr" | "rtl" }) => {
  switch (status) {
    case "active":
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
          <CheckCircle className={dir === "rtl" ? "ml-1 h-3 w-3" : "mr-1 h-3 w-3"} /> {t("coupons.status.active")}
        </Badge>
      )
    case "scheduled":
      return (
        <Badge variant="outline" className="border-blue-500 text-blue-700">
          <Clock className={dir === "rtl" ? "ml-1 h-3 w-3" : "mr-1 h-3 w-3"} /> {t("coupons.status.scheduled")}
        </Badge>
      )
    case "expired":
      return (
        <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600">
          <AlertTriangle className={dir === "rtl" ? "ml-1 h-3 w-3" : "mr-1 h-3 w-3"} /> {t("coupons.status.expired")}
        </Badge>
      )
    case "inactive_manual":
      return (
        <Badge variant="secondary">
          <PowerOff className={dir === "rtl" ? "ml-1 h-3 w-3" : "mr-1 h-3 w-3"} /> {t("coupons.status.inactive")}
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
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
    header: t("coupons.code"),
    cell: ({ row }) => <Badge variant="outline">{row.original.code}</Badge>,
  },
  {
    accessorKey: "description",
    header: t("coupons.description"),
    cell: ({ row }) => <span className="truncate block max-w-xs">{row.original.description || "-"}</span>,
  },
  {
    accessorKey: "discountValue",
    header: t("coupons.discount"),
    cell: ({ row }) => {
      const coupon = row.original
      return coupon.discountType === "percentage" ? `${coupon.discountValue}%` : formatCurrency(coupon.discountValue)
    },
  },
  {
    accessorKey: "validFrom",
    header: t("coupons.validFrom"),
    cell: ({ row }) => formatDate(row.original.validFrom),
  },
  {
    accessorKey: "validUntil",
    header: t("coupons.validUntil"),
    cell: ({ row }) => formatDate(row.original.validUntil),
  },
  {
    accessorKey: "effectiveStatus", // Changed from isActive
    header: t("coupons.status"),
    cell: ({ row }) => <StatusBadge status={row.original.effectiveStatus} t={t} dir={dir} />,
  },
  {
    accessorKey: "usageLimit",
    header: t("coupons.usage"),
    // Ensuring usageLimit is treated as a number for comparison
    cell: ({ row }) =>
      `${row.original.timesUsed} / ${Number(row.original.usageLimit) === 0 ? t("common.unlimited") : row.original.usageLimit}`,
  },
  {
    accessorKey: "assignedPartnerId",
    header: t("coupons.assignedPartner"),
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
              <Edit className={dir === "rtl" ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"} /> {t("coupons.actions.edit")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(coupon._id.toString())}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <Trash2 className={dir === "rtl" ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"} /> {t("coupons.actions.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
