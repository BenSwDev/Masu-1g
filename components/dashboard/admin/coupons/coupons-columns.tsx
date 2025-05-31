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

interface CouponColumnsProps {
  onEdit: (coupon: ICoupon & { effectiveStatus: string }) => void
  onDelete: (couponId: string) => void
}

// Helper to get populated partner name
const getPartnerName = (partner: any): string => {
  if (!partner) return "N/A"
  if (typeof partner === "string") return "Loading..."
  return partner.name || partner.email || "Unnamed Partner"
}

const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "active":
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
          <CheckCircle className="mr-1 h-3 w-3" /> Active
        </Badge>
      )
    case "scheduled":
      return (
        <Badge variant="outline" className="border-blue-500 text-blue-700">
          <Clock className="mr-1 h-3 w-3" /> Scheduled
        </Badge>
      )
    case "expired":
      return (
        <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600">
          <AlertTriangle className="mr-1 h-3 w-3" /> Expired
        </Badge>
      )
    case "inactive_manual":
      return (
        <Badge variant="secondary">
          <PowerOff className="mr-1 h-3 w-3" /> Inactive
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export const columns = ({
  onEdit,
  onDelete,
}: CouponColumnsProps): ColumnDef<ICoupon & { effectiveStatus: string }>[] => [
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
      return coupon.discountType === "percentage" ? `${coupon.discountValue}%` : formatCurrency(coupon.discountValue)
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
    accessorKey: "effectiveStatus", // Changed from isActive
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.effectiveStatus} />,
  },
  {
    accessorKey: "usageLimit",
    header: "Usage",
    // Ensuring usageLimit is treated as a number for comparison
    cell: ({ row }) =>
      `${row.original.timesUsed} / ${Number(row.original.usageLimit) === 0 ? "∞" : row.original.usageLimit}`,
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
