"use client"

import { useState } from "react"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { DataTable } from "@/components/common/ui/data-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Dialog, DialogContent } from "@/components/common/ui/dialog"
import { AlertModal } from "@/components/common/modals/alert-modal"
import { UserForm } from "./user-form"
import { UserDetailsModal } from "./user-details-modal"
import { getUsersColumns, type UserColumn } from "./users-columns"
import { getUsers, deleteUser, bulkDeleteUsers } from "@/actions/user-actions"
import { useTranslation } from "@/lib/translations/i18n"
import { toast } from "sonner"
import { Plus, Search, Trash2, Users, UserCheck, UserX, RefreshCw } from "lucide-react"

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
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  // Modals state
  const [showUserForm, setShowUserForm] = useState(false)
  const [showUserDetails, setShowUserDetails] = useState(false)
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)
  const [showBulkDeleteAlert, setShowBulkDeleteAlert] = useState(false)

  // Selected data
  const [selectedUser, setSelectedUser] = useState<UserColumn | null>(null)
  const [selectedUsers, setSelectedUsers] = useState<UserColumn[]>([])

  const fetchUsers = async (page = 1, search = "") => {
    setLoading(true)
    try {
      const result = await getUsers(page, 20, search)
      if (result.success && result.data) {
        setData(result.data)
        setCurrentPage(page)
      }
    } catch (error) {
      toast.error(t("common.error"))
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    fetchUsers(1, value)
  }

  const handleRefresh = () => {
    fetchUsers(currentPage, searchTerm)
  }

  const handleAddUser = () => {
    setSelectedUser(null)
    setShowUserForm(true)
  }

  const handleEditUser = (user: UserColumn) => {
    setSelectedUser(user)
    setShowUserForm(true)
  }

  const handleViewUser = (user: UserColumn) => {
    setSelectedUser(user)
    setShowUserDetails(true)
  }

  const handleDeleteUser = (user: UserColumn) => {
    setSelectedUser(user)
    setShowDeleteAlert(true)
  }

  const handleBulkDelete = () => {
    if (selectedUsers.length === 0) {
      toast.error(t("users.messages.noUsersSelected"))
      return
    }
    setShowBulkDeleteAlert(true)
  }

  const confirmDelete = async () => {
    if (!selectedUser) return

    try {
      const result = await deleteUser(selectedUser.id)
      if (result.success) {
        toast.success(t("users.messages.deleteSuccess"))
        handleRefresh()
      } else {
        toast.error(result.error || t("common.error"))
      }
    } catch (error) {
      toast.error(t("common.error"))
    } finally {
      setShowDeleteAlert(false)
      setSelectedUser(null)
    }
  }

  const confirmBulkDelete = async () => {
    try {
      const userIds = selectedUsers.map((user) => user.id)
      const result = await bulkDeleteUsers(userIds)
      if (result.success) {
        toast.success(t("users.messages.bulkDeleteSuccess", { count: result.deletedCount }))
        setSelectedUsers([])
        handleRefresh()
      } else {
        toast.error(result.error || t("common.error"))
      }
    } catch (error) {
      toast.error(t("common.error"))
    } finally {
      setShowBulkDeleteAlert(false)
    }
  }

  const handleFormSuccess = () => {
    setShowUserForm(false)
    setSelectedUser(null)
    handleRefresh()
  }

  const columns = getUsersColumns({
    onEdit: handleEditUser,
    onDelete: handleDeleteUser,
    onView: handleViewUser,
  })

  // Statistics
  const stats = {
    total: data.total,
    verified: data.users.filter((user) => user.emailVerified).length,
    unverified: data.users.filter((user) => !user.emailVerified).length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 text-right">{t("users.title")}</h1>
          <p className="text-gray-600 text-right">{t("users.description")}</p>
        </div>
        <Button onClick={handleAddUser} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          {t("users.addUser")}
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("users.stats.totalUsers")}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("users.stats.verifiedUsers")}</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("users.stats.unverifiedUsers")}</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.unverified}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder={t("users.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {selectedUsers.length > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{t("users.selectedCount", { count: selectedUsers.length })}</Badge>
                  <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("common.delete")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="pt-6">
          <DataTable columns={columns} data={data.users} searchKey="name" />
        </CardContent>
      </Card>

      {/* User Form Modal */}
      <Dialog open={showUserForm} onOpenChange={setShowUserForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <UserForm user={selectedUser} onSuccess={handleFormSuccess} onCancel={() => setShowUserForm(false)} />
        </DialogContent>
      </Dialog>

      {/* User Details Modal */}
      <UserDetailsModal user={selectedUser} open={showUserDetails} onOpenChange={setShowUserDetails} />

      {/* Delete Confirmation */}
      <AlertModal
        isOpen={showDeleteAlert}
        onClose={() => setShowDeleteAlert(false)}
        onConfirm={confirmDelete}
        loading={false}
        title={t("users.deleteConfirmTitle")}
        description={t("users.deleteConfirmDescription", { name: selectedUser?.name })}
      />

      {/* Bulk Delete Confirmation */}
      <AlertModal
        isOpen={showBulkDeleteAlert}
        onClose={() => setShowBulkDeleteAlert(false)}
        onConfirm={confirmBulkDelete}
        loading={false}
        title={t("users.bulkDeleteConfirmTitle")}
        description={t("users.bulkDeleteConfirmDescription", { count: selectedUsers.length })}
      />
    </div>
  )
}
