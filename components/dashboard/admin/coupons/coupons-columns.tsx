"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, CheckCircle, XCircle, Edit, Trash2 } from "lucide-react"
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
import type { ICoupon } from "@/lib/db/models/coupon" // Ensure this path is correct
import { formatDate, formatCurrency } from "@/lib/utils/utils" // Assuming you have these utils

interface CouponColumnsProps {
  onEdit: (coupon: ICoupon) => void
  onDelete: (couponId: string) => void
}

// Helper to get populated partner name
const getPartnerName = (partner: any): string => {
  if (!partner) return "N/A"
  if (typeof partner === "string") return "Loading..." // Or fetch if only ID
  return partner.name || partner.email || "Unnamed Partner"
}

export const columns = ({ onEdit, onDelete }: CouponColumnsProps): ColumnDef<ICoupon>[] => [
  {
    accessorKey: "code",
    header: "Code",
    cell: ({ row }) => <Badge variant="outline">{row.original.code}</Badge>,
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => <span className="truncate block max-w-xs">{row.original.description || "-"}</span>,
  },
  {
    accessorKey: "discountValue",
    header: "Discount",
    cell: ({ row }) => {
      const coupon = row.original
      return coupon.discountType === "percentage" ? `${coupon.discountValue}%` : formatCurrency(coupon.discountValue) // Assuming currency is default or from settings
    },
  },
  {
    accessorKey: "validFrom",
    header: "Valid From",
    cell: ({ row }) => formatDate(row.original.validFrom),
  },
  {
    accessorKey: "validUntil",
    header: "Valid Until",
    cell: ({ row }) => formatDate(row.original.validUntil),
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) =>
      row.original.isActive ? (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
          <CheckCircle className="mr-1 h-3 w-3" /> Active
        </Badge>
      ) : (
        <Badge variant="destructive">
          <XCircle className="mr-1 h-3 w-3" /> Inactive
        </Badge>
      ),
  },
  {
    accessorKey: "usageLimit",
    header: "Usage",
    cell: ({ row }) => `${row.original.timesUsed} / ${row.original.usageLimit === 0 ? "∞" : row.original.usageLimit}`,
  },
  {
    accessorKey: "assignedPartnerId",
    header: "Assigned Partner",
    cell: ({ row }) => getPartnerName(row.original.assignedPartnerId),
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
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onEdit(coupon)}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(coupon._id.toString())}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
