"use client"

import { useState, useMemo, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent } from "@/components/common/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/ui/table"
import { Badge } from "@/components/common/ui/badge"
import { Dialog } from "@/components/common/ui/dialog"
import { Shield, ShieldCheck, User, Briefcase, Handshake, PlusCircle, Edit, Trash2 } from "lucide-react"
import { useTranslation } from "@/lib/translations/i18n"
import { Input } from "@/components/common/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Pagination, PaginationContent, PaginationItem } from "@/components/common/ui/pagination"
import { ArrowUpDown } from "lucide-react"
import { UserForm } from "./user-form" // Adjust path if needed
import { DeleteUserConfirmationModal } from "./delete-user-confirmation-modal" // Adjust path if needed

interface UserData {
  id: string
  name: string
  email: string
  phone?: string
  roles: string[]
  createdAt: string
  gender?: "male" | "female" | "other"
  dateOfBirth?: string // Or Date
}

interface UserManagementProps {
  users: UserData[]
  totalPages: number
  currentPage: number
  searchTerm?: string
  roleFilter?: string[]
  sortField: string
  sortDirection: "asc" | "desc"
}

export function UserManagement({
  users: initialUsers,
  totalPages: initialTotalPages,
  currentPage: initialPage,
  searchTerm: initialSearchTerm,
  roleFilter: initialRoleFilter,
  sortField: initialSortField,
  sortDirection: initialSortDirection,
}: UserManagementProps) {
  const { t } = useTranslation()
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({})
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm || "")
  const [roleFilter, setRoleFilter] = useState<string[]>(initialRoleFilter || [])
  const [sortField, setSortField] = useState<string>(initialSortField)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(initialSortDirection)
  const [localUsers, setLocalUsers] = useState<UserData[]>(initialUsers)
  const [isUserFormOpen, setIsUserFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const itemsPerPage = 10

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (currentPage > 1) params.set("page", currentPage.toString())
    if (searchTerm) params.set("search", searchTerm)
    if (roleFilter.length > 0) params.set("roles", roleFilter.join(","))
    if (sortField !== "name") params.set("sortField", sortField)
    if (sortDirection !== "asc") params.set("sortDirection", sortDirection)

    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`
    window.history.pushState({}, "", newUrl)
  }, [currentPage, searchTerm, roleFilter, sortField, sortDirection])

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    let result = [...localUsers]

    // Apply search
    if (searchTerm) {
      result = result.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Apply role filter
    if (roleFilter.length > 0) {
      result = result.filter((user) => roleFilter.some((role) => user.roles.includes(role)))
    }

    // Apply sorting
    result.sort((a, b) => {
      const aValue = a[sortField as keyof UserData]
      const bValue = b[sortField as keyof UserData]

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      }
      return 0
    })

    return result
  }, [localUsers, searchTerm, roleFilter, sortField, sortDirection])

  // Calculate pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  // Handle sort
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  // Get role icon
  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <ShieldCheck className="h-4 w-4" />
      case "professional":
        return <Briefcase className="h-4 w-4" />
      case "partner":
        return <Handshake className="h-4 w-4" />
      case "member":
        return <User className="h-4 w-4" />
      default:
        return <Shield className="h-4 w-4" />
    }
  }

  // Get role color
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 hover:bg-red-200"
      case "professional":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200"
      case "partner":
        return "bg-green-100 text-green-800 hover:bg-green-200"
      case "member":
        return "bg-gray-100 text-gray-800 hover:bg-gray-200"
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200"
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString()
  }

  const handleAddUser = () => {
    setEditingUser(null)
    setIsUserFormOpen(true)
  }

  const handleEditUser = (user: UserData) => {
    setEditingUser(user)
    setIsUserFormOpen(true)
  }

  const handleDeleteUser = (user: UserData) => {
    setUserToDelete(user)
    setIsDeleteConfirmOpen(true)
  }

  const refreshUsers = async () => {
    // This function should ideally re-fetch users or update local state
    // For simplicity, we can rely on revalidatePath from server actions
    // and potentially a page refresh or a more sophisticated state update.
    // For now, a simple way is to force a re-render or use router.refresh()
    // This is a placeholder for a more robust data refresh strategy.
    // Example: window.location.reload(); // Or use Next.js router to refresh server components
    // A better approach would be to update localUsers state based on action results.
    // For now, we'll update localUsers directly after successful operations.
  }

  const onUserFormSubmit = (updatedUser?: UserData, isNew?: boolean) => {
    if (isNew && updatedUser) {
      setLocalUsers((prev) => [updatedUser, ...prev])
    } else if (updatedUser) {
      setLocalUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)))
    } else {
      // Fallback to reload if no user data is returned (e.g. after delete)
      // Or implement a proper re-fetch mechanism
      window.location.reload() // Or router.refresh() if in a client component that can do so
    }
    setIsUserFormOpen(false)
  }

  const onUserDeleted = () => {
    if (userToDelete) {
      setLocalUsers((prev) => prev.filter((u) => u.id !== userToDelete.id))
    }
    setIsDeleteConfirmOpen(false)
  }

  return (
    <Card>
      <CardContent className="p-6">
        {/* Search and Filters */}
        <div className="mb-4 flex justify-between items-center">
          {/* Search and Filters on the left */}
          <div className="flex gap-4">
            <Input
              placeholder={t("admin.users.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Select
              value={roleFilter.join(",")}
              onValueChange={(value) => setRoleFilter(value === "all" ? [] : value.split(","))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("admin.users.filterByRole")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.users.allRoles")}</SelectItem>
                <SelectItem value="admin">{t("roles.admin")}</SelectItem>
                <SelectItem value="professional">{t("roles.professional")}</SelectItem>
                <SelectItem value="partner">{t("roles.partner")}</SelectItem>
                <SelectItem value="member">{t("roles.member")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAddUser} className="bg-turquoise-500 hover:bg-turquoise-600 text-white">
            <PlusCircle className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" /> {t("admin.users.addUser")}
          </Button>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort("name")} className="flex items-center gap-1">
                  {t("admin.users.name")}
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort("email")} className="flex items-center gap-1">
                  {t("admin.users.email")}
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>{t("admin.users.roles")}</TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort("createdAt")} className="flex items-center gap-1">
                  {t("admin.users.created")}
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>{t("admin.users.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map((role) => (
                      <Badge key={role} variant="outline" className={getRoleBadgeColor(role)}>
                        <span className="flex items-center gap-1">
                          {getRoleIcon(role)}
                          {role}
                        </span>
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>{formatDate(user.createdAt)}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditUser(user)}
                      className="text-turquoise-600 border-turquoise-600 hover:bg-turquoise-50"
                    >
                      <Edit className="h-4 w-4 mr-1 rtl:ml-1 rtl:mr-0" /> {t("admin.users.edit")}
                    </Button>
                    {user.id !== session?.user?.id && ( // Prevent deleting self
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUser(user)}
                        className="text-red-600 border-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-1 rtl:ml-1 rtl:mr-0" /> {t("admin.users.delete")}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    {t("common.previous")}
                  </Button>
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <Button
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    {t("common.next")}
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

        <Dialog open={isUserFormOpen} onOpenChange={setIsUserFormOpen}>
          {isUserFormOpen && ( // Conditionally render to re-mount and reset form state if needed
            <UserForm
              userToEdit={editingUser}
              onFormSubmit={onUserFormSubmit} // Use the new callback
              setOpen={setIsUserFormOpen}
            />
          )}
        </Dialog>

        <DeleteUserConfirmationModal // This component already manages its Dialog wrapper
          userToDelete={userToDelete}
          isOpen={isDeleteConfirmOpen}
          setOpen={setIsDeleteConfirmOpen}
          onUserDeleted={onUserDeleted}
        />
      </CardContent>
    </Card>
  )
}
