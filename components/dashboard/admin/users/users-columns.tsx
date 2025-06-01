"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, Edit, Trash2, Eye, UserPlus, UserMinus } from "lucide-react"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/common/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/common/ui/dropdown-menu"
import { useTranslation } from "@/lib/translations/i18n"
import { UserRole } from "@/lib/db/models/user"

export interface UserColumn {
  _id: string
  name: string
  email: string
  phone: string
  roles: string[]
  createdAt: string
  image?: string
  gender?: string
}

interface ActionsProps {
  user: UserColumn
  onEdit: (user: UserColumn) => void
  onDelete: (user: UserColumn) => void
  onView: (user: UserColumn) => void
  onToggleRole: (userId: string, role: string, action: "add" | "remove") => void
}

const ActionsCell = ({ user, onEdit, onDelete, onView, onToggleRole }: ActionsProps) => {
  const { t } = useTranslation()

  const availableRoles = Object.values(UserRole).filter((role) => !user.roles.includes(role))
  const removableRoles = user.roles.filter((role) => role !== UserRole.MEMBER || user.roles.length > 1)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">{t("common.actions.open_menu")}</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{t("common.actions.title")}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => onView(user)}>
          <Eye className="mr-2 h-4 w-4" />
          {t("common.actions.view")}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => onEdit(user)}>
          <Edit className="mr-2 h-4 w-4" />
          {t("common.actions.edit")}
        </DropdownMenuItem>

        {availableRoles.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t("admin.users.actions.add_roles")}</DropdownMenuLabel>
            {availableRoles.map((role) => (
              <DropdownMenuItem key={role} onClick={() => onToggleRole(user._id, role, "add")}>
                <UserPlus className="mr-2 h-4 w-4" />
                {t(`common.roles.${role}`)}
              </DropdownMenuItem>
            ))}
          </>
        )}

        {removableRoles.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t("admin.users.actions.remove_roles")}</DropdownMenuLabel>
            {removableRoles.map((role) => (
              <DropdownMenuItem key={role} onClick={() => onToggleRole(user._id, role, "remove")}>
                <UserMinus className="mr-2 h-4 w-4" />
                {t(`common.roles.${role}`)}
              </DropdownMenuItem>
            ))}
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onDelete(user)} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          {t("common.actions.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export const createUsersColumns = (
  onEdit: (user: UserColumn) => void,
  onDelete: (user: UserColumn) => void,
  onView: (user: UserColumn) => void,
  onToggleRole: (userId: string, role: string, action: "add" | "remove") => void,
  t: (key: string) => string,
): ColumnDef<UserColumn>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          {t("admin.users.table.name")}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const user = row.original
      return (
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.image || "/placeholder.svg"} alt={user.name} />
            <AvatarFallback>
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm">{user.name}</div>
            <div className="text-xs text-muted-foreground md:hidden">{user.email}</div>
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold hidden md:flex"
        >
          {t("admin.users.table.email")}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div className="hidden md:block text-sm">{row.getValue("email")}</div>,
  },
  {
    accessorKey: "phone",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold hidden lg:flex"
        >
          {t("admin.users.table.phone")}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div className="hidden lg:block text-sm">{row.getValue("phone")}</div>,
  },
  {
    accessorKey: "roles",
    header: t("admin.users.table.roles"),
    cell: ({ row }) => {
      const roles = row.getValue("roles") as string[]
      return (
        <div className="flex flex-wrap gap-1">
          {roles.map((role) => (
            <Badge key={role} variant="secondary" className="text-xs">
              {t(`common.roles.${role}`)}
            </Badge>
          ))}
        </div>
      )
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold hidden xl:flex"
        >
          {t("admin.users.table.created_at")}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"))
      return <div className="hidden xl:block text-sm">{date.toLocaleDateString()}</div>
    },
  },
  {
    id: "actions",
    header: t("common.actions.title"),
    cell: ({ row }) => (
      <ActionsCell
        user={row.original}
        onEdit={onEdit}
        onDelete={onDelete}
        onView={onView}
        onToggleRole={onToggleRole}
      />
    ),
  },
]
