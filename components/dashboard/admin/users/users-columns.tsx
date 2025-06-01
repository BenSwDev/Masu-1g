"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/common/ui/badge"
import { Button } from "@/components/common/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/common/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/common/ui/dropdown-menu"
import { MoreHorizontal, Edit, Trash2, Eye } from "lucide-react"

export type UserColumn = {
  _id: string
  name: string
  email: string
  phone?: string
  roles: string[]
  activeRole: string
  isVerified: boolean
  createdAt: string
  lastLogin?: string
}

interface ColumnsProps {
  onEdit: (user: UserColumn) => void
  onDelete: (user: UserColumn) => void
  onView: (user: UserColumn) => void
  onToggleRole: (userId: string, role: string, action: "add" | "remove") => void
  t: (key: string, params?: any) => string
}

export function getUsersTableColumns({
  onEdit,
  onDelete,
  onView,
  onToggleRole,
  t,
}: ColumnsProps): ColumnDef<UserColumn>[] {
  return [
    {
      accessorKey: "name",
      header: t("admin.users.table.name"),
      cell: ({ row }) => {
        const user = row.original
        return (
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={`/placeholder.svg?height=32&width=32&text=${user.name.charAt(0)}`} />
              <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{user.name}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "phone",
      header: t("admin.users.table.phone"),
      cell: ({ row }) => {
        const phone = row.getValue("phone") as string
        return phone ? (
          <span className="text-sm">{phone}</span>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        )
      },
    },
    {
      accessorKey: "roles",
      header: t("admin.users.table.roles"),
      cell: ({ row }) => {
        const roles = row.getValue("roles") as string[]
        const activeRole = row.original.activeRole

        return (
          <div className="flex flex-wrap gap-1">
            {roles.map((role) => (
              <Badge key={role} variant={role === activeRole ? "default" : "secondary"} className="text-xs">
                {t(`common.roles.${role}`)}
                {role === activeRole && " (פעיל)"}
              </Badge>
            ))}
          </div>
        )
      },
    },
    {
      accessorKey: "isVerified",
      header: t("admin.users.table.status"),
      cell: ({ row }) => {
        const isVerified = row.getValue("isVerified") as boolean
        return (
          <Badge variant={isVerified ? "default" : "destructive"}>
            {isVerified ? t("admin.users.status.verified") : t("admin.users.status.unverified")}
          </Badge>
        )
      },
    },
    {
      accessorKey: "createdAt",
      header: t("admin.users.table.created_at"),
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt"))
        return <span className="text-sm">{date.toLocaleDateString("he-IL")}</span>
      },
    },
    {
      id: "actions",
      header: t("admin.users.table.actions"),
      cell: ({ row }) => {
        const user = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">{t("admin.users.actions.open_menu")}</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t("admin.users.actions.title")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onView(user)}>
                <Eye className="mr-2 h-4 w-4" />
                {t("admin.users.actions.view")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(user)}>
                <Edit className="mr-2 h-4 w-4" />
                {t("admin.users.actions.edit")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(user)} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                {t("admin.users.actions.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
