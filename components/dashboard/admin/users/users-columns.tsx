"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/common/ui/badge"
import { Button } from "@/components/common/ui/button"
import { Checkbox } from "@/components/common/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/common/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/common/ui/avatar"
import { MoreHorizontal, Edit, Trash2, Eye } from "lucide-react"
import { format } from "date-fns"
import { UserRole } from "@/lib/db/models/user"
import { useTranslation } from "@/lib/translations/i18n"

export type UserColumn = {
  id: string
  name: string
  email: string
  phone?: string
  gender?: "male" | "female" | "other"
  dateOfBirth?: Date
  image?: string
  roles: string[]
  activeRole?: string
  emailVerified?: Date
  phoneVerified?: Date
  createdAt: Date
  updatedAt: Date
}

interface UsersColumnsProps {
  onEdit: (user: UserColumn) => void
  onDelete: (user: UserColumn) => void
  onView: (user: UserColumn) => void
}

export const getUsersColumns = ({ onEdit, onDelete, onView }: UsersColumnsProps): ColumnDef<UserColumn>[] => {
  const { t } = useTranslation()

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case UserRole.ADMIN:
        return "destructive"
      case UserRole.PROFESSIONAL:
        return "default"
      case UserRole.PARTNER:
        return "secondary"
      default:
        return "outline"
    }
  }

  const getGenderDisplay = (gender?: string) => {
    switch (gender) {
      case "male":
        return t("users.gender.male")
      case "female":
        return t("users.gender.female")
      case "other":
        return t("users.gender.other")
      default:
        return "-"
    }
  }

  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={t("common.selectAll")}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t("common.selectRow")}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: t("users.fields.name"),
      cell: ({ row }) => {
        const user = row.original
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.image || "/placeholder.svg"} alt={user.name} />
              <AvatarFallback className="text-xs">
                {user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium">{user.name}</span>
              <span className="text-xs text-muted-foreground">{user.email}</span>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "phone",
      header: t("users.fields.phone"),
      cell: ({ row }) => {
        const phone = row.getValue("phone") as string
        return phone ? (
          <div className="flex flex-col">
            <span className="font-mono text-sm">{phone}</span>
            {row.original.phoneVerified && (
              <Badge variant="outline" className="w-fit text-xs">
                {t("users.verified")}
              </Badge>
            )}
          </div>
        ) : (
          "-"
        )
      },
    },
    {
      accessorKey: "gender",
      header: t("users.fields.gender"),
      cell: ({ row }) => getGenderDisplay(row.getValue("gender")),
    },
    {
      accessorKey: "dateOfBirth",
      header: t("users.fields.dateOfBirth"),
      cell: ({ row }) => {
        const date = row.getValue("dateOfBirth") as Date
        return date ? format(new Date(date), "dd/MM/yyyy") : "-"
      },
    },
    {
      accessorKey: "roles",
      header: t("users.fields.roles"),
      cell: ({ row }) => {
        const roles = row.getValue("roles") as string[]
        const activeRole = row.original.activeRole

        return (
          <div className="flex flex-wrap gap-1">
            {roles.map((role) => (
              <Badge
                key={role}
                variant={role === activeRole ? getRoleBadgeVariant(role) : "outline"}
                className="text-xs"
              >
                {t(`users.roles.${role}`)}
                {role === activeRole && " ★"}
              </Badge>
            ))}
          </div>
        )
      },
    },
    {
      accessorKey: "emailVerified",
      header: t("users.fields.emailVerified"),
      cell: ({ row }) => {
        const verified = row.getValue("emailVerified") as Date
        return verified ? (
          <Badge variant="outline" className="text-xs text-green-600">
            {t("users.verified")}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs text-red-600">
            {t("users.notVerified")}
          </Badge>
        )
      },
    },
    {
      accessorKey: "createdAt",
      header: t("users.fields.createdAt"),
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as Date
        return format(new Date(date), "dd/MM/yyyy HH:mm")
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const user = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">{t("common.openMenu")}</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t("common.actions")}</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onView(user)}>
                <Eye className="mr-2 h-4 w-4" />
                {t("common.view")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(user)}>
                <Edit className="mr-2 h-4 w-4" />
                {t("common.edit")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(user)} className="text-red-600 focus:text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                {t("common.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
