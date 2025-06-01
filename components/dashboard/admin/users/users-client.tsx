"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Button } from "@/components/common/ui/button"
import { DataTable } from "@/components/common/ui/data-table"
import { getUsersTableColumns, type UserColumn } from "./users-columns" // Ensure UserColumn is correctly defined
import { UserForm } from "./user-form"
import { Modal } from "@/components/common/ui/modal"
import { AlertModal } from "@/components/common/modals/alert-modal"
import { getUsers, deleteUser, type PaginatedUsersResult } from "@/actions/user-actions"
import { useTranslation } from "@/lib/translations/i18n" // Corrected from useI18n
import { toast } from "sonner"
import type { IUser } from "@/lib/db/models/user"
import { Plus, Search } from "lucide-react"
import { Input } from "@/components/common/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Heading } from "@/components/common/ui/heading"
import { UserRole } from "@/lib/db/models/user"

interface UsersClientProps {
  initialData: PaginatedUsersResult // This should come from the server page
}

export function UsersClient({ initialData }: UsersClientProps) {
  const { t } = useTranslation() // Corrected from useI18n
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Initialize with initialData or an empty array if initialData.users is undefined/null
  const [users, setUsers] = useState<UserColumn[]>((initialData?.users as UserColumn[]) || [])
  const [totalUsers, setTotalUsers] = useState(initialData?.total || 0)
  const [totalPages, setTotalPages] = useState(initialData?.totalPages || 1)
  const [currentPage, setCurrentPage] = useState(initialData?.page || 1)

  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserColumn | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const pageFromParams = searchParams.get("page") ? Number.parseInt(searchParams.get("page") as string, 10) : 1
  const limitFromParams = searchParams.get("limit") ? Number.parseInt(searchParams.get("limit") as string, 10) : 10

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesRole = roleFilter === "all" || user.roles.includes(roleFilter)
      return matchesSearch && matchesRole
    })
  }, [users, searchTerm, roleFilter])

  // Effect to update state if initialData prop changes (e.g., after server-side navigation)
  useEffect(() => {
    setUsers((initialData?.users as UserColumn[]) || [])
    setTotalUsers(initialData?.total || 0)
    setTotalPages(initialData?.totalPages || 1)
    setCurrentPage(initialData?.page || 1)
    if (initialData && !initialData.success) {
      toast.error(t(initialData.message || "admin.users.notifications.fetchError"))
    }
  }, [initialData, t])

  // Effect to fetch data when page/limit changes in URL
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Use pageFromParams and limitFromParams for fetching
        const data = await getUsers({ page: pageFromParams, limit: limitFromParams })
        if (data.success) {
          setUsers((data.users as UserColumn[]) || [])
          setTotalUsers(data.total)
          setTotalPages(data.totalPages)
          setCurrentPage(data.page)
        } else {
          toast.error(t(data.message || "admin.users.notifications.fetchError"))
          setUsers([]) // Clear users on fetch error
        }
      } catch (error) {
        toast.error(t("admin.users.notifications.fetchError"))
        setUsers([]) // Clear users on unexpected error
      } finally {
        setLoading(false)
      }
    }

    // Fetch if params change from current state, or if it's not the initial load reflected by initialData
    if (
      pageFromParams !== currentPage ||
      limitFromParams !== (searchParams.get("limit") ? Number(limitFromParams) : 10) ||
      !initialData
    ) {
      // The condition for refetching might need refinement based on how initialData is handled.
      // This check aims to refetch if URL params differ from current state,
      // avoiding refetch on initial load if initialData is already current.
      if (initialData && pageFromParams === initialData.page && users.length > 0) {
        // Already have data for this page from initial load
      } else {
        fetchData()
      }
    } else if (
      initialData &&
      initialData.page === pageFromParams &&
      users.length === 0 &&
      initialData.users.length > 0
    ) {
      // Case where initialData was for the current page, but users state is empty (e.g., after an error clear)
      setUsers((initialData.users as UserColumn[]) || [])
      setTotalUsers(initialData.total)
      setTotalPages(initialData.totalPages)
      setCurrentPage(initialData.page)
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageFromParams, limitFromParams, t]) // Removed initialData, currentPage from deps to avoid loops, manage fetch via params

  const handlePageChange = (newPage: number) => {
    router.push(`${pathname}?page=${newPage}&limit=${limitFromParams}`)
  }

  const handleOpenModal = (user: UserColumn | null = null) => {
    setSelectedUser(user)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedUser(null)
  }

  const handleOpenAlertModal = (user: UserColumn) => {
    setSelectedUser(user)
    setIsAlertModalOpen(true)
  }

  const handleCloseAlertModal = () => {
    setIsAlertModalOpen(false)
    setSelectedUser(null)
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return
    setLoading(true)
    try {
      const result = await deleteUser(selectedUser._id) // Assuming _id is the identifier
      if (result.success) {
        toast.success(t(result.message || "admin.users.notifications.deleteSuccess"))
        // Refetch current page data
        const data = await getUsers({ page: currentPage, limit: limitFromParams })
        if (data.success) {
          setUsers((data.users as UserColumn[]) || [])
          setTotalUsers(data.total)
          setTotalPages(data.totalPages)
          // If the last item on a page was deleted, and it's not the first page, navigate to previous page
          if (data.users.length === 0 && currentPage > 1) {
            handlePageChange(currentPage - 1)
          } else if (data.users.length === 0 && data.total > 0) {
            // If all users are deleted but total indicates there should be users (cache issue?)
            // or if it's the first page and it's now empty.
            setCurrentPage(1) // Reset to page 1 or handle as appropriate
          }
        } else {
          toast.error(t(data.message || "admin.users.notifications.fetchError"))
        }
      } else {
        toast.error(t(result.message || "admin.users.notifications.deleteError"))
      }
    } catch (error) {
      toast.error(t("admin.users.notifications.deleteError"))
    } finally {
      setLoading(false)
      handleCloseAlertModal()
    }
  }

  const handleEdit = (user: UserColumn) => {
    setSelectedUser(user)
    setIsFormOpen(true)
  }

  const handleDelete = (user: UserColumn) => {
    setSelectedUser(user)
    setIsDeleteOpen(true)
  }

  const handleView = (user: UserColumn) => {
    // TODO: Implement view modal
    console.log("View user:", user)
  }

  const handleToggleRole = async (userId: string, role: string, action: "add" | "remove") => {
    // TODO: Implement role toggle
    console.log("Toggle role:", { userId, role, action })
  }

  const confirmDelete = async () => {
    if (!selectedUser) return

    setLoading(true)
    try {
      const result = await deleteUser(selectedUser._id)
      if (result.success) {
        setUsers(users.filter((user) => user._id !== selectedUser._id))
        toast.success(t("admin.users.messages.deleted"))
      } else {
        toast.error(t(result.message || "admin.users.errors.delete_failed"))
      }
    } catch (error) {
      toast.error(t("common.errors.something_went_wrong"))
    } finally {
      setLoading(false)
      setIsDeleteOpen(false)
      setSelectedUser(null)
    }
  }

  const handleFormSuccess = async () => {
    setIsFormOpen(false)
    setSelectedUser(null)
    setLoading(true)
    const data = await getUsers({ page: currentPage, limit: limitFromParams })
    if (data.success) {
      setUsers((data.users as UserColumn[]) || [])
      setTotalUsers(data.total)
      setTotalPages(data.totalPages)
    } else {
      toast.error(t(data.message || "admin.users.notifications.fetchError"))
    }
    setLoading(false)
  }

  const columns = useMemo(
    () =>
      getUsersTableColumns({
        onEdit: handleEdit,
        onDelete: handleDelete,
        onView: handleView,
        onToggleRole: handleToggleRole,
        t: t, // Pass t if columns need it directly
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t], // Removed users from dependency array to prevent re-render loops if columns don't depend on users data itself
  )

  // Stats
  const adminUsers = users.filter((user) => user.roles.includes(UserRole.ADMIN)).length
  const memberUsers = users.filter((user) => user.roles.includes(UserRole.MEMBER)).length
  const professionalUsers = users.filter((user) => user.roles.includes(UserRole.PROFESSIONAL)).length

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Heading title={t("admin.users.page_title")} description={t("admin.users.page_description")} />
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("admin.users.actions.add_user")}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.users.stats.total")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.users.stats.admins")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.users.stats.members")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{memberUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.users.stats.professionals")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{professionalUsers}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.users.filters.title")}</CardTitle>
            <CardDescription>{t("admin.users.filters.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4 md:flex-row md:space-x-4 md:space-y-0">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("admin.users.filters.search_placeholder")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[200px]">
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
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.users.table.title")}</CardTitle>
            <CardDescription>{t("admin.users.table.description", { count: filteredUsers.length })}</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={filteredUsers}
              searchKey="name"
              loading={loading}
              pagination={{
                currentPage,
                totalPages,
                onPageChange: handlePageChange,
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Form Modal */}
      <Modal
        title={selectedUser ? t("admin.users.form.edit_title") : t("admin.users.form.create_title")}
        description={selectedUser ? t("admin.users.form.edit_description") : t("admin.users.form.create_description")}
        isOpen={isFormOpen || isModalOpen}
        onClose={() => {
          setIsFormOpen(false)
          setIsModalOpen(false)
          setSelectedUser(null)
        }}
      >
        <UserForm
          initialData={selectedUser as IUser | null}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setIsFormOpen(false)
            setIsModalOpen(false)
            setSelectedUser(null)
          }}
        />
      </Modal>

      {/* Delete Modal */}
      <AlertModal
        isOpen={isDeleteOpen || isAlertModalOpen}
        onClose={() => {
          setIsDeleteOpen(false)
          handleCloseAlertModal()
        }}
        onConfirm={confirmDelete || handleDeleteUser}
        loading={loading}
        title={t("admin.users.delete.title")}
        description={t("admin.users.delete.description", { name: selectedUser?.name || t("common.thisUser") })}
      />
    </>
  )
}
