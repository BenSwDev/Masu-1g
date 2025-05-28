"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/common/ui/button"
import { Checkbox } from "@/components/common/ui/checkbox"
import { Badge } from "@/components/common/ui/badge"

export type BundleColumn = {
  _id: string
  name: string
  category: string
  isActive: boolean
  quantity: number
  validityMonths: number
  treatments: { treatment: string; count: number }[]
  createdAt: string
}

export const columns: ColumnDef<BundleColumn>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => <div className="capitalize">{row.getValue("category")}</div>,
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.getValue("isActive") ? "default" : "secondary"}>
        {row.getValue("isActive") ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    accessorKey: "quantity",
    header: "Quantity",
  },
  {
    accessorKey: "validityMonths",
    header: "Validity (Months)",
  },
]
