"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { User } from "@/types"
import { useTranslation } from "@/lib/translations/i18n"

export const columns: ColumnDef<User>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
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
      const { t } = useTranslation()
      return t("Name")
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) => {
      const { t } = useTranslation()
      return t("Email")
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      const { t } = useTranslation()
      return t("Created At")
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"))
      const formattedDate = format(date, "PPP")
      return formattedDate
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const { t } = useTranslation()
      const user = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.email)}>
              {t("Copy email")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>{t("View profile")}</DropdownMenuItem>
            <DropdownMenuItem>{t("Edit profile")}</DropdownMenuItem>
            <DropdownMenuItem>{t("Delete")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

import { MoreHorizontal } from "lucide-react"
