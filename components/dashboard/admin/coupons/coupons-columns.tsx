"use client"

import type { ColumnDef, Row } from "@tanstack/react-table"
import { MoreHorizontal, Edit, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { ICoupon } from "@/types"
import { useTranslation } from "react-i18next"

interface CouponsColumnsProps {
  onEdit: (coupon: ICoupon) => void
  onDelete: (id: string) => void
  dir: string
}

export const columns = ({ onEdit, onDelete, dir }: CouponsColumnsProps): ColumnDef<ICoupon>[] => {
  const { t } = useTranslation()

  return [
    {
      accessorKey: "code",
      header: t("adminCoupons.columns.code"),
    },
    {
      accessorKey: "description",
      header: t("adminCoupons.columns.description"),
      cell: ({ row }: { row: Row<ICoupon> }) => (
        <span className="truncate block max-w-[150px] md:max-w-[250px]">
          {row.original.description || t("adminCoupons.card.noDescription")}
        </span>
      ),
      meta: {
        className: "hidden md:table-cell",
      },
    },
    {
      accessorKey: "discount",
      header: t("adminCoupons.columns.discount"),
      cell: ({ row }) => `${row.original.discount}%`,
    },
    {
      accessorKey: "assignedPartnerId",
      header: t("adminCoupons.columns.assignedPartner"),
      cell: ({ row }: { row: Row<ICoupon> }) => {
        // This cell might need to fetch partner name if only ID is available
        // For now, assuming partner name is part of a populated field or handled by a selector
        const partnerName = row.original.assignedPartner?.name || t("adminCoupons.columns.partnerNotAssigned")
        return <span className="truncate block max-w-[100px] md:max-w-[150px]">{partnerName}</span>
      },
      meta: {
        className: "hidden lg:table-cell",
      },
    },
    {
      accessorKey: "usageCount",
      header: t("adminCoupons.columns.usage"),
      cell: ({ row }: { row: Row<ICoupon> }) =>
        `${row.original.usageCount} / ${row.original.usageLimit === 0 ? t("common.unlimited") : row.original.usageLimit}`,
      meta: {
        className: "hidden sm:table-cell",
      },
    },
    {
      id: "actions",
      cell: ({ row }: { row: Row<ICoupon> }) => {
        const coupon = row.original
        return (
          <DropdownMenu dir={dir}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">{t("common.actions")}</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={dir === "rtl" ? "start" : "end"}>
              <DropdownMenuItem onClick={() => onEdit(coupon)}>
                <Edit className={dir === "rtl" ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"} />
                {t("common.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(coupon._id.toString())} className="text-destructive">
                <Trash2 className={dir === "rtl" ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"} />
                {t("common.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
