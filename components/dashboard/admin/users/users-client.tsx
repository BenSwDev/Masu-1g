"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, Filter, Users } from "lucide-react"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/ui/card"
import { DataTable } from "@/components/common/ui/data-table"
import { AlertModal } from "@/components/common/modals/alert-modal"
import { UserForm } from "./user-form"
import { UserDetailsModal } from "./user-details-modal"
import { createUsersColumns, type UserColumn } from "./users-columns"
import { useTranslation } from "@/lib/translations/i18n"
import { UserRole } from "@/lib/db/models/user"
import { getUsers, deleteUser, toggleUserRole } from "@/actions/user-management-actions"
import { toast } from "sonner"
import { useDebounce } from "@/hooks/use-debounce"

interface UsersClientProps {
  initialData: {
    users: UserColumn[]
    total: number
    page: number
    totalPages: number
  }
}

export function UsersClient({ initialData }: UsersClientProps) {
  const { t } = useTranslation()
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<UserColumn | null>(null)
  const [viewingUser, setViewingUser] = useState<UserColumn | null>(null)
  const [deletingUser, setDeletingUser] = useState<UserColumn | null>(null)

  const debouncedSearch = useDebounce(search, 500)

  const fetchUsers = useCallback(
    async (page = 1, searchTerm = "", role = "all") => {
      setLoading(true)
      try {
        const result = await getUsers(page, 20, searchTerm, role)
        if (result.success && result.data) {
          setData(result.data)
          setCurrentPage(page)
        } else {
          toast.error(t(result.error || "admin.users.errors.fetch_failed"))
        }
      } catch (error) {
        toast.error(t("common.errors.something_went_wrong"))
      } finally {
        setLoading(false)
      }
    },
    [t],
  )

  // Fetch users when search or filter changes
  useEffect(() => {
    fetchUsers(1, debouncedSearch, roleFilter)
  }, [debouncedSearch, roleFilter, fetchUsers])

  const handleEdit = (user: UserColumn) => {
    setEditingUser(user)
    setShowForm(true)
  }

  const handleDelete = async () => {
    if (!deletingUser) return

    try {
      const result = await deleteUser(deletingUser._id)
      if (result.success) {
        toast.success(t("admin.users.messages.deleted"))
        fetchUsers(currentPage, debouncedSearch, roleFilter)
      } else {
        toast.error(t(result.error || "admin.users.errors.delete_failed"))
      }
    } catch (error) {
      toast.error(t("common.errors.something_went_wrong"))
    } finally {
      setDeletingUser(null)
    }
  }

  const handleToggleRole = async (userId: string, role: string, action: "add" | "remove") => {
    try {
      const result = await toggleUserRole(userId, role, action)
      if (result.success) {
        toast.success(t("admin.users.messages.role_updated"))
        fetchUsers(currentPage, debouncedSearch, roleFilter)
      } else {
        toast.error(t(result.error || "admin.users.errors.role_update_failed"))
      }
    } catch (error) {
      toast.error(t("common.errors.something_went_wrong"))
    }
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingUser(null)
    fetchUsers(currentPage, debouncedSearch, roleFilter)
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingUser(null)
  }

  const columns = createUsersColumns(
    handleEdit,
    (user) => setDeletingUser(user),
    (user) => setViewingUser(user),
    handleToggleRole,
    t,
  )

  if (showForm) {
    return <UserForm user={editingUser} onSuccess={handleFormSuccess} onCancel={handleFormCancel} />
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("admin.users.title")}</h1>
            <p className="text-muted-foreground">{t("admin.users.description")}</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="w-full md:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            {t("admin.users.actions.add_user")}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.users.stats.total_users")}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.total}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("admin.users.filters.title")}</CardTitle>
            <CardDescription>{t("admin.users.filters.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4 md:flex-row md:space-x-4 md:space-y-0">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t("admin.users.filters.search_placeholder")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full md:w-48">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder={t("admin.users.filters.role_placeholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("admin.users.filters.all_roles")}</SelectItem>
                    {Object.values(UserRole).map((role) => (
                      <SelectItem key={role} value={role}>
                        {t(`common.roles.${role}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <DataTable columns={columns} data={data.users} searchKey="name" />
          </CardContent>
        </Card>

        {/* Pagination */}
        {data.totalPages > 1 && (
          <div className="flex items-center justify-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchUsers(currentPage - 1, debouncedSearch, roleFilter)}
              disabled={currentPage <= 1 || loading}
            >
              {t("common.pagination.previous")}
            </Button>
            <span className="text-sm text-muted-foreground">
              {t("common.pagination.page_of", { current: currentPage, total: data.totalPages })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchUsers(currentPage + 1, debouncedSearch, roleFilter)}
              disabled={currentPage >= data.totalPages || loading}
            >
              {t("common.pagination.next")}
            </Button>
          </div>
        )}
      </div>

      {/* Modals */}
      <UserDetailsModal user={viewingUser} isOpen={!!viewingUser} onClose={() => setViewingUser(null)} />

      <AlertModal
        isOpen={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        onConfirm={handleDelete}
        loading={loading}
        title={t("admin.users.delete.title")}
        description={t("admin.users.delete.description", { name: deletingUser?.name })}
      />
    </>
  )
}
