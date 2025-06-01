"use client"

import type React from "react"

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
  let statusConfig: {
    textKey: string
    icon: React.ElementType
    badgeVariant: React.ComponentProps<typeof Badge>["variant"]
    badgeClassName?: string
  } | null = null

  switch (status) {
    case "active":
      statusConfig = {
        textKey: "coupons.status.active",
        icon: CheckCircle,
        badgeVariant: "default",
        badgeClassName: "bg-green-500 hover:bg-green-600",
      }
      break
    case "scheduled":
      statusConfig = {
        textKey: "coupons.status.scheduled",
        icon: Clock,
        badgeVariant: "outline",
        badgeClassName: "border-blue-500 text-blue-700",
      }
      break
    case "expired":
      statusConfig = {
        textKey: "coupons.status.expired",
        icon: AlertTriangle,
        badgeVariant: "destructive",
        badgeClassName: "bg-orange-500 hover:bg-orange-600",
      }
      break
    case "inactive_manual":
      statusConfig = {
        textKey: "coupons.status.inactiveManual",
        icon: PowerOff,
        badgeVariant: "secondary",
        badgeClassName: "", // No specific class override, default secondary
      }
      break
  }

  if (statusConfig) {
    const IconComponent = statusConfig.icon
    let displayText = status // Default to the raw status key

    // Attempt to get the translation
    const translatedValue = t(statusConfig.textKey)

    if (typeof translatedValue === "string" && translatedValue !== statusConfig.textKey) {
      // Use translation if it's a string and not the key itself (i.e., translation found)
      displayText = translatedValue
    } else if (typeof translatedValue !== "string") {
      // Log a warning if translation returned an object or unexpected type
      console.warn(
        `[StatusBadge] Translation for key "${statusConfig.textKey}" returned type "${typeof translatedValue}" instead of string. Falling back to raw status key. Value:`,
        translatedValue,
      )
      // displayText remains the raw status key as set initially
    }
    // If translatedValue is the key itself, it means translation was not found, so we also fallback to raw status key.

    return (
      <Badge variant={statusConfig.badgeVariant} className={statusConfig.badgeClassName}>
        <IconComponent className={dir === "rtl" ? "ml-1 h-3 w-3" : "mr-1 h-3 w-3"} /> {displayText}
      </Badge>
    )
  }

  // Fallback for unknown statuses
  return <Badge variant="outline">{status}</Badge>
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
