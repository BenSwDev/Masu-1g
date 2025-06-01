"use client"

import { useTranslation } from "react-i18next"
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
import type { TFunction } from "i18next"
import { formatDate, formatCurrency } from "@/lib/utils/utils"

interface CouponColumnsProps {
  onEdit: (coupon: ICoupon & { effectiveStatus: string }) => void
  onDelete: (couponId: string) => void
}

// Helper to get populated partner name
const getPartnerName = (partner: any, t: TFunction): string => {
  if (!partner) return t("common.notApplicable")
  if (typeof partner === "string") return t("common.loading") // Or a more specific "Partner loading..."
  return partner.name || partner.email || t("adminCoupons.columns.unnamedPartner")
}

const StatusBadge = ({ status, t }: { status: string; t: TFunction }) => {
  switch (status) {
    case "active":
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
          <CheckCircle className="mr-1 h-3 w-3" /> {t("adminCoupons.status.active")}
        </Badge>
      )
    case "scheduled":
      return (
        <Badge variant="outline" className="border-blue-500 text-blue-700">
          <Clock className="mr-1 h-3 w-3" /> {t("adminCoupons.status.scheduled")}
        </Badge>
      )
    case "expired":
      return (
        <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600">
          <AlertTriangle className="mr-1 h-3 w-3" /> {t("adminCoupons.status.expired")}
        </Badge>
      )
    case "inactive_manual":
      return (
        <Badge variant="secondary">
          <PowerOff className="mr-1 h-3 w-3" /> {t("adminCoupons.status.inactiveManual")}
        </Badge>
      )
    default:
      return <Badge variant="outline">{t(status, { defaultValue: status })}</Badge>
  }
}

export const columns = ({
  onEdit,
  onDelete,
}: CouponColumnsProps): ColumnDef<ICoupon & { effectiveStatus: string }>[] => {
  // It's generally better to call useTranslation at the top level of a component,
  // but since `columns` is a function that produces an array, and `cell` is a render prop,
  // we can call it inside `cell` or pass `t` down.
  // For simplicity here, we'll assume `t` is available in the scope where `columns` is used,
  // or each `cell` will call `useTranslation`. Let's make cells call it.

  return [
    {
      accessorKey: "code",
      header: ({ column }) => {
        const { t } = useTranslation()
        return t("adminCoupons.columns.code")
      },
      cell: ({ row }) => <Badge variant="outline">{row.original.code}</Badge>,
    },
    {
      accessorKey: "description",
      header: ({ column }) => {
        const { t } = useTranslation()
        return t("adminCoupons.columns.description")
      },
      cell: ({ row }) => <span className="truncate block max-w-xs">{row.original.description || "-"}</span>,
    },
    {
      accessorKey: "discountValue",
      header: ({ column }) => {
        const { t } = useTranslation()
        return t("adminCoupons.columns.discount")
      },
      cell: ({ row }) => {
        const coupon = row.original
        return coupon.discountType === "percentage" ? `${coupon.discountValue}%` : formatCurrency(coupon.discountValue)
      },
    },
    {
      accessorKey: "validFrom",
      header: ({ column }) => {
        const { t } = useTranslation()
        return t("adminCoupons.columns.validFrom")
      },
      cell: ({ row }) => formatDate(row.original.validFrom),
    },
    {
      accessorKey: "validUntil",
      header: ({ column }) => {
        const { t } = useTranslation()
        return t("adminCoupons.columns.validUntil")
      },
      cell: ({ row }) => formatDate(row.original.validUntil),
    },
    {
      accessorKey: "effectiveStatus",
      header: ({ column }) => {
        const { t } = useTranslation()
        return t("adminCoupons.columns.status")
      },
      cell: ({ row }) => {
        const { t } = useTranslation()
        return <StatusBadge status={row.original.effectiveStatus} t={t} />
      },
    },
    {
      accessorKey: "usageLimit",
      header: ({ column }) => {
        const { t } = useTranslation()
        return t("adminCoupons.columns.usage")
      },
      cell: ({ row }) =>
        `${row.original.timesUsed} / ${Number(row.original.usageLimit) === 0 ? "∞" : row.original.usageLimit}`,
    },
    {
      accessorKey: "assignedPartnerId",
      header: ({ column }) => {
        const { t } = useTranslation()
        return t("adminCoupons.columns.assignedPartner")
      },
      cell: ({ row }) => {
        const { t } = useTranslation()
        return getPartnerName(row.original.assignedPartnerId, t)
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const coupon = row.original
        const { t } = useTranslation()
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">{t("common.actions")}</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t("common.actions")}</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onEdit(coupon)}>
                <Edit className="mr-2 h-4 w-4" /> {t("common.edit")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(coupon._id.toString())}
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <Trash2 className="mr-2 h-4 w-4" /> {t("common.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
