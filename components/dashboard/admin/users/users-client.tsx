"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { PlusCircle } from "lucide-react"
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

  const pageFromParams = searchParams.get("page") ? Number.parseInt(searchParams.get("page") as string, 10) : 1
  const limitFromParams = searchParams.get("limit") ? Number.parseInt(searchParams.get("limit") as string, 10) : 10

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

  const columns = useMemo(
    () =>
      getUsersTableColumns({
        onEdit: handleOpenModal,
        onDelete: handleOpenAlertModal,
        t: t, // Pass t if columns need it directly
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t], // Removed users from dependency array to prevent re-render loops if columns don't depend on users data itself
  )

  return (
    <>
      <Modal
        title={selectedUser ? t("admin.users.editUserTitle") : t("admin.users.addUserTitle")}
        description={selectedUser ? t("admin.users.editUserDescription") : t("admin.users.addUserDescription")}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      >
        <UserForm
          initialData={selectedUser as IUser | null}
          onSuccess={async () => {
            handleCloseModal()
            setLoading(true)
            const data = await getUsers({ page: currentPage, limit: limitFromParams }) // Refetch current page
            if (data.success) {
              setUsers((data.users as UserColumn[]) || [])
              setTotalUsers(data.total)
              setTotalPages(data.totalPages)
            } else {
              toast.error(t(data.message || "admin.users.notifications.fetchError"))
            }
            setLoading(false)
          }}
          onCancel={handleCloseModal}
        />
      </Modal>
      <AlertModal
        isOpen={isAlertModalOpen}
        onClose={handleCloseAlertModal}
        onConfirm={handleDeleteUser}
        loading={loading}
        title={t("common.confirmation.title")}
        description={t("admin.users.deleteConfirmation", { name: selectedUser?.name || t("common.thisUser") })}
      />
      <div className="flex justify-end mb-4">
        <Button onClick={() => handleOpenModal()}>
          <PlusCircle className="mr-2 h-4 w-4" /> {t("admin.users.addUserButton")}
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={users} // users state is now more safely initialized
        searchKey="name"
        searchPlaceholder={t("admin.users.searchPlaceholder")}
        loading={loading}
        pagination={{
          currentPage,
          totalPages,
          onPageChange: handlePageChange,
        }}
      />
    </>
  )
}
